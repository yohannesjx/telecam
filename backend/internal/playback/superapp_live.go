package playback

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/audit"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
)

// LiveForSuperAppParent issues a signed live HLS URL for a Super App-authenticated
// parent who has an active parent_superapp_links record.
//
// Authorization differences from the legacy Live path:
//   - No school-camera device check (Super App users have no school device records).
//   - parentID comes from the verified link, not from the JWT user.
//   - Returns ErrSubscriptionRequired (not ErrAccessDenied) for missing subscription,
//     so the handler can surface the SUBSCRIPTION_REQUIRED error code.
//
// Security guarantees:
//   - encrypted_rtsp_url is never read or returned.
//   - signed HLS URL is returned in the LiveResult but never written to any log.
func (s *Service) LiveForSuperAppParent(
	ctx context.Context,
	superAppUserID, parentID, schoolID, cameraID uuid.UUID,
	qualityParam string,
) (*LiveResult, error) {
	cam, err := s.q.GetCameraWithSchoolClassroom(ctx, cameraID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, deny("camera_not_found")
	}
	if err != nil {
		return nil, err
	}

	if cam.CameraStatus != "ACTIVE" {
		return nil, deny("camera_not_active")
	}
	if cam.SchoolStatus != "ACTIVE" {
		return nil, deny("school_not_active")
	}
	if !cam.ClassroomID.Valid {
		return nil, deny("camera_no_classroom")
	}
	if cam.ClassroomStatus.Valid && cam.ClassroomStatus.String != "ACTIVE" {
		return nil, deny("classroom_not_active")
	}

	// Security: camera must belong to the school from the verified parent link.
	// This prevents a linked parent from probing cameras at other schools.
	if cam.SchoolID != schoolID {
		return nil, deny("camera_school_mismatch")
	}

	// Parent must have a child enrolled in the camera's classroom.
	canAccess, err := s.q.ParentCanAccessCamera(ctx, sqlc.ParentCanAccessCameraParams{
		ParentID: parentID,
		ID:       cameraID,
	})
	if err != nil {
		return nil, err
	}
	if !canAccess {
		return nil, deny("parent_child_classroom_mismatch")
	}

	// Subscription / trial check.
	_, err = s.q.GetActiveSubscriptionForParentSchool(ctx, sqlc.GetActiveSubscriptionForParentSchoolParams{
		ParentID: parentID,
		SchoolID: cam.SchoolID,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, &ErrSubscriptionRequired{}
	}
	if err != nil {
		return nil, err
	}

	// School schedule / live availability check.
	if err := s.ensureLiveAvailable(ctx, cameraID, cam.SchoolID); err != nil {
		return nil, err
	}

	// Quality resolution.
	requested, err := hls.ResolveQuality(qualityParam)
	if err != nil {
		return nil, fmt.Errorf("invalid quality: %w", err)
	}
	effective, err := hls.ResolveQualityOrDefault(requested, cam.DefaultQuality)
	if err != nil {
		return nil, fmt.Errorf("invalid quality: %w", err)
	}

	// Live playlist resolution — identical to the legacy path.
	fallback := false
	playlistKey, found, err := s.resolveLivePlaylistKey(ctx, cam.R2LivePath, effective)
	if err != nil {
		return nil, err
	}
	if !found && requested != "" && effective != cam.DefaultQuality {
		fallback = true
		effective = cam.DefaultQuality
		playlistKey, found, err = s.resolveLivePlaylistKey(ctx, cam.R2LivePath, effective)
		if err != nil {
			return nil, err
		}
	}
	if !found {
		playlistKey, found, err = s.resolveLegacyLivePlaylistKey(ctx, cam.R2LivePath)
		if err != nil {
			return nil, err
		}
		if found && requested != "" && effective != cam.DefaultQuality {
			fallback = true
			effective = cam.DefaultQuality
		}
	}
	if !found {
		return nil, &ErrNotFound{InternalReason: "live_playlist_not_available"}
	}

	// Sign the URL — must NOT be logged.
	expiry := s.cfg.LivePlaybackURLTTL
	signed, err := s.storage.PresignGetObject(ctx, playlistKey, expiry)
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().UTC().Add(expiry)

	// Audit event — signed URL is excluded from metadata.
	cameraIDCopy := cameraID
	auditMeta := map[string]any{
		"super_app_user_id": superAppUserID.String(),
		"parent_id":         parentID.String(),
		"school_id":         cam.SchoolID.String(),
		"camera_id":         cameraID.String(),
		"quality":           effective,
		"type":              "live",
	}
	if fallback {
		auditMeta["fallback"] = true
	}
	if requested != "" {
		auditMeta["requested_quality"] = requested
	}
	s.audit.Event(ctx, audit.EventParams{
		Action:   "SUPERAPP_LIVE_REQUESTED",
		UserID:   &superAppUserID,
		CameraID: &cameraIDCopy,
		Metadata: auditMeta,
	})

	return &LiveResult{
		CameraID:         cam.ID.String(),
		CameraName:       cam.Name,
		SchoolID:         cam.SchoolID.String(),
		SchoolName:       cam.SchoolName,
		ClassroomID:      uuidStr(cam.ClassroomID),
		ClassroomName:    textStr(cam.ClassroomName),
		Quality:          effective,
		RequestedQuality: requested,
		Fallback:         fallback,
		Type:             "live",
		SignedHLSURL:     signed,
		ExpiresAt:        expiresAt.Format(time.RFC3339),
		DelaySeconds:     s.cfg.LiveDelaySeconds,
	}, nil
}
