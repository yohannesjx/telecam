package playback

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// RequestMeta carries authenticated user and HTTP context for playback authorization.
type RequestMeta struct {
	UserID    uuid.UUID
	DeviceID  uuid.UUID
	Role      string
	Status    string
	IPAddress string
	UserAgent string
}

// AuthorizeResult is returned when playback authorization succeeds.
type AuthorizeResult struct {
	Camera  sqlc.GetCameraWithSchoolClassroomRow
	ChildID *uuid.UUID
}

func deny(reason string) error {
	return &ErrAccessDenied{InternalReason: reason}
}

// authorizeStore is the database surface required for playback authorization.
type authorizeStore interface {
	GetDeviceByIDForUser(ctx context.Context, arg sqlc.GetDeviceByIDForUserParams) (sqlc.Device, error)
	UpdateDeviceLastSeenByID(ctx context.Context, arg sqlc.UpdateDeviceLastSeenByIDParams) error
	GetCameraWithSchoolClassroom(ctx context.Context, id uuid.UUID) (sqlc.GetCameraWithSchoolClassroomRow, error)
	ParentCanAccessCamera(ctx context.Context, arg sqlc.ParentCanAccessCameraParams) (bool, error)
	GetParentChildIDForCamera(ctx context.Context, arg sqlc.GetParentChildIDForCameraParams) (uuid.UUID, error)
	GetActiveSubscriptionForParentSchool(ctx context.Context, arg sqlc.GetActiveSubscriptionForParentSchoolParams) (sqlc.Subscription, error)
}

// AuthorizeParentPlayback enforces parent, device, camera, and subscription checks.
func (s *Service) AuthorizeParentPlayback(ctx context.Context, meta RequestMeta, cameraID uuid.UUID) (*AuthorizeResult, error) {
	return authorizeParentPlayback(ctx, s.q, meta, cameraID)
}

func authorizeParentPlayback(ctx context.Context, store authorizeStore, meta RequestMeta, cameraID uuid.UUID) (*AuthorizeResult, error) {
	if meta.Role != "PARENT" {
		return nil, deny("parent_role_required")
	}
	if meta.Status != "ACTIVE" {
		return nil, deny("user_not_active")
	}
	if meta.DeviceID == uuid.Nil {
		return nil, deny("device_id_missing")
	}

	device, err := store.GetDeviceByIDForUser(ctx, sqlc.GetDeviceByIDForUserParams{
		ID:     meta.DeviceID,
		UserID: meta.UserID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, deny("device_not_found")
		}
		return nil, err
	}
	if err := validateDeviceStatus(device); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if err := store.UpdateDeviceLastSeenByID(ctx, sqlc.UpdateDeviceLastSeenByIDParams{
		ID:         meta.DeviceID,
		LastSeenAt: database.TimestamptzFromTime(now),
		UserID:     meta.UserID,
	}); err != nil {
		return nil, err
	}

	cam, err := store.GetCameraWithSchoolClassroom(ctx, cameraID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, deny("camera_not_found")
		}
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

	canAccess, err := store.ParentCanAccessCamera(ctx, sqlc.ParentCanAccessCameraParams{
		ParentID: meta.UserID,
		ID:       cameraID,
	})
	if err != nil {
		return nil, err
	}
	if !canAccess {
		return nil, deny("parent_child_classroom_mismatch")
	}

	childID, err := store.GetParentChildIDForCamera(ctx, sqlc.GetParentChildIDForCameraParams{
		ParentID: meta.UserID,
		ID:       cameraID,
	})
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	var childPtr *uuid.UUID
	if err == nil {
		childPtr = &childID
	}

	_, err = store.GetActiveSubscriptionForParentSchool(ctx, sqlc.GetActiveSubscriptionForParentSchoolParams{
		ParentID: meta.UserID,
		SchoolID: cam.SchoolID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, deny("subscription_inactive_or_expired")
		}
		return nil, err
	}

	return &AuthorizeResult{
		Camera:  cam,
		ChildID: childPtr,
	}, nil
}

func validateDeviceStatus(device sqlc.Device) error {
	switch device.Status {
	case "ACTIVE":
		return nil
	case "BLOCKED":
		return deny("device_blocked")
	case "DISABLED":
		return deny("device_disabled")
	default:
		return deny("device_not_active")
	}
}
