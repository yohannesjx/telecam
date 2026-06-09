// Package playback implements parent authorization and signed URL issuance for HLS.
package playback

import (
	"context"
	"errors"
	"fmt"
	"path"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/audit"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
	"github.com/school-camera-platform/school-camera-platform/internal/schoolschedule"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"
)

// auditEmitter records playback audit events (implemented by audit.Logger).
type auditEmitter interface {
	Event(ctx context.Context, p audit.EventParams)
}

// objectStore is the storage surface required for signed URL playback.
type objectStore interface {
	ObjectExists(ctx context.Context, key string) (bool, error)
	PresignGetObject(ctx context.Context, key string, expiry time.Duration) (string, error)
	PutObject(ctx context.Context, key string, body []byte, contentType string) error
}

// playbackStore is the database surface required by the playback service.
type playbackStore interface {
	authorizeStore
	GetCameraStreamState(ctx context.Context, cameraID uuid.UUID) (sqlc.CameraStreamState, error)
	ListRecordingSegmentsByCameraDate(ctx context.Context, arg sqlc.ListRecordingSegmentsByCameraDateParams) ([]sqlc.RecordingSegment, error)
	ListRecordingSegmentsByCameraRange(ctx context.Context, arg sqlc.ListRecordingSegmentsByCameraRangeParams) ([]sqlc.RecordingSegment, error)
}

// Service authorizes parent playback and issues signed URLs.
type Service struct {
	cfg       *appconfig.Config
	q         playbackStore
	storage   objectStore
	audit     auditEmitter
	schedule  *Schedule
	schedEval *schoolschedule.Evaluator
	limiter   *RateLimiter
}

// NewService constructs a playback service.
func NewService(
	cfg *appconfig.Config,
	q *sqlc.Queries,
	s3 *storage.Client,
	auditLog *audit.Logger,
	rdb *redis.Client,
) (*Service, error) {
	sched, err := NewSchedule(cfg)
	if err != nil {
		return nil, err
	}
	return &Service{
		cfg:       cfg,
		q:         q,
		storage:   s3,
		audit:     auditLog,
		schedule:  sched,
		schedEval: schoolschedule.NewEvaluator(q, schoolschedule.DefaultsFromConfig(cfg)),
		limiter:   NewRateLimiter(rdb, cfg.PlaybackRateLimitPerMinute),
	}, nil
}

// LiveResult is the response payload for live playback.
type LiveResult struct {
	CameraID          string `json:"camera_id"`
	CameraName        string `json:"camera_name"`
	SchoolID          string `json:"school_id"`
	SchoolName        string `json:"school_name"`
	ClassroomID       string `json:"classroom_id"`
	ClassroomName     string `json:"classroom_name"`
	Quality           string `json:"quality"`
	RequestedQuality  string `json:"requested_quality,omitempty"`
	Fallback          bool   `json:"fallback,omitempty"`
	Type              string `json:"type"`
	SignedHLSURL      string `json:"signed_hls_url"`
	ExpiresAt         string `json:"expires_at"`
	DelaySeconds      int    `json:"delay_seconds"`
}

// TimelineSegment is one raw segment entry (optional in timeline response).
type TimelineSegment struct {
	StartTime       string `json:"start_time"`
	EndTime         string `json:"end_time"`
	Quality         string `json:"quality"`
	DurationSeconds int    `json:"duration_seconds"`
}

// TimelineBlockDTO is a grouped continuous recording window for parents.
type TimelineBlockDTO struct {
	StartTime       string `json:"start_time"`
	EndTime         string `json:"end_time"`
	DurationSeconds int    `json:"duration_seconds"`
	SegmentCount    int    `json:"segment_count"`
}

// TimelineResult is the timeline response payload.
type TimelineResult struct {
	CameraID            string             `json:"camera_id"`
	CameraName          string             `json:"camera_name"`
	Date                string             `json:"date"`
	Quality             string             `json:"quality"`
	Timezone            string             `json:"timezone"`
	Blocks              []TimelineBlockDTO `json:"blocks"`
	TotalSegments       int                `json:"total_segments"`
	TotalDurationSeconds int               `json:"total_duration_seconds"`
	Segments            []TimelineSegment  `json:"segments,omitempty"`
}

// PlaybackResult is the recording playback response payload.
type PlaybackResult struct {
	CameraID     string   `json:"camera_id"`
	CameraName   string   `json:"camera_name"`
	Type         string   `json:"type"`
	Quality      string   `json:"quality"`
	Start        string   `json:"start"`
	End          string   `json:"end"`
	SignedHLSURL string   `json:"signed_hls_url"`
	ExpiresAt    string   `json:"expires_at"`
	SegmentCount int      `json:"segment_count"`
	Warnings     []string `json:"warnings,omitempty"`
}

// Live issues a signed URL for the camera live HLS playlist at the requested quality.
func (s *Service) Live(ctx context.Context, meta RequestMeta, cameraID uuid.UUID, qualityParam string) (*LiveResult, error) {
	if err := s.checkRate(ctx, meta); err != nil {
		return nil, err
	}

	authz, err := s.AuthorizeParentPlayback(ctx, meta, cameraID)
	if err != nil {
		s.auditDenied(ctx, meta, cameraID, "PLAYBACK_LIVE_REQUESTED", err, nil)
		return nil, err
	}
	cam := authz.Camera

	if err := s.ensureLiveAvailable(ctx, cameraID, cam.SchoolID); err != nil {
		if IsLiveOutsideSchoolHours(err) {
			s.auditLiveOutsideDenied(ctx, meta, cameraID, err)
		} else {
			s.auditDenied(ctx, meta, cameraID, "PLAYBACK_LIVE_REQUESTED", err, nil)
		}
		return nil, err
	}

	requested, err := hls.ResolveQuality(qualityParam)
	if err != nil {
		return nil, fmt.Errorf("invalid quality: %w", err)
	}

	effective, err := hls.ResolveQualityOrDefault(requested, cam.DefaultQuality)
	if err != nil {
		return nil, fmt.Errorf("invalid quality: %w", err)
	}

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
		err := deny("live_playlist_not_available")
		s.auditDenied(ctx, meta, cameraID, "PLAYBACK_LIVE_REQUESTED", err, nil)
		return nil, err
	}

	expiry := s.cfg.LivePlaybackURLTTL
	signed, err := s.storage.PresignGetObject(ctx, playlistKey, expiry)
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().UTC().Add(expiry)

	auditMeta := map[string]any{
		"camera_id": cameraID.String(),
		"type":      "live",
		"quality":   effective,
	}
	if requested != "" {
		auditMeta["requested_quality"] = requested
	}
	if fallback {
		auditMeta["fallback"] = true
	}
	s.auditOK(ctx, meta, authz, "PLAYBACK_LIVE_REQUESTED", auditMeta)

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

func (s *Service) resolveLivePlaylistKey(ctx context.Context, r2LivePath, quality string) (string, bool, error) {
	key := hls.LivePlaylistKey(r2LivePath, quality)
	exists, err := s.storage.ObjectExists(ctx, key)
	if err != nil {
		return "", false, fmt.Errorf("check live playlist: %w", err)
	}
	if exists {
		return key, true, nil
	}
	return "", false, nil
}

// resolveLegacyLivePlaylistKey supports pre-Phase-7 paths without a quality folder.
func (s *Service) resolveLegacyLivePlaylistKey(ctx context.Context, r2LivePath string) (string, bool, error) {
	legacy := hls.LivePlaylistKey(hls.LiveBasePrefix(r2LivePath), hls.DefaultQuality)
	if legacy == r2LivePath {
		legacy = r2LivePath
	}
	flat := path.Join(hls.LiveBasePrefix(r2LivePath), "index.m3u8")
	for _, key := range []string{r2LivePath, legacy, flat} {
		if key == "" {
			continue
		}
		exists, err := s.storage.ObjectExists(ctx, key)
		if err != nil {
			return "", false, fmt.Errorf("check live playlist: %w", err)
		}
		if exists {
			return key, true, nil
		}
	}
	return "", false, nil
}

// Timeline returns grouped recording blocks for a calendar date in school timezone.
func (s *Service) Timeline(ctx context.Context, meta RequestMeta, cameraID uuid.UUID, date, qualityParam string, includeSegments bool) (*TimelineResult, error) {
	if err := s.checkRate(ctx, meta); err != nil {
		return nil, err
	}

	authz, err := s.AuthorizeParentPlayback(ctx, meta, cameraID)
	if err != nil {
		s.auditDenied(ctx, meta, cameraID, "PLAYBACK_TIMELINE_REQUESTED", err, map[string]any{"date": date})
		return nil, err
	}
	cam := authz.Camera

	requestedQuality, _ := hls.ResolveQuality(qualityParam)
	quality, err := hls.ResolveQualityOrDefault(qualityParam, cam.DefaultQuality)
	if err != nil {
		return nil, fmt.Errorf("invalid quality: %w", err)
	}

	dayStart, dayEnd, err := s.parseDateInSchoolTZ(date)
	if err != nil {
		return nil, err
	}

	rows, err := s.q.ListRecordingSegmentsByCameraDate(ctx, sqlc.ListRecordingSegmentsByCameraDateParams{
		CameraID:    cameraID,
		StartTime:   pgTimestamptz(dayStart),
		StartTime_2: pgTimestamptz(dayEnd),
		Column4:     quality,
	})
	if err != nil {
		return nil, err
	}

	gap := time.Duration(s.cfg.TimelineSegmentGapSeconds) * time.Second
	if gap <= 0 {
		gap = 30 * time.Second
	}

	spans := spansFromRecordingRows(rows)
	blocks := GroupTimelineBlocks(spans, gap)

	blockDTOs := make([]TimelineBlockDTO, 0, len(blocks))
	totalDuration := 0
	for _, b := range blocks {
		blockDTOs = append(blockDTOs, TimelineBlockDTO{
			StartTime:       b.StartTime.UTC().Format(time.RFC3339),
			EndTime:         b.EndTime.UTC().Format(time.RFC3339),
			DurationSeconds: b.DurationSeconds,
			SegmentCount:    b.SegmentCount,
		})
		totalDuration += b.DurationSeconds
	}

	result := &TimelineResult{
		CameraID:             cameraID.String(),
		CameraName:           cam.Name,
		Date:                 date,
		Quality:              quality,
		Timezone:             s.cfg.SchoolTimezone,
		Blocks:               blockDTOs,
		TotalSegments:        len(rows),
		TotalDurationSeconds: totalDuration,
	}

	if includeSegments {
		segments := make([]TimelineSegment, 0, len(rows))
		for _, seg := range rows {
			segments = append(segments, TimelineSegment{
				StartTime:       seg.StartTime.Time.UTC().Format(time.RFC3339),
				EndTime:         seg.EndTime.Time.UTC().Format(time.RFC3339),
				Quality:         seg.Quality,
				DurationSeconds: int(seg.DurationSeconds),
			})
		}
		result.Segments = segments
	}

	auditMeta := map[string]any{
		"camera_id":      cameraID.String(),
		"date":           date,
		"quality":        quality,
		"block_count":    len(blockDTOs),
		"segment_count":  len(rows),
		"include_segments": includeSegments,
	}
	if requestedQuality != "" {
		auditMeta["requested_quality"] = requestedQuality
	}
	s.auditOK(ctx, meta, authz, "PLAYBACK_TIMELINE_REQUESTED", auditMeta)

	return result, nil
}

// Playback builds a temporary VOD playlist and returns a signed URL.
func (s *Service) Playback(
	ctx context.Context,
	meta RequestMeta,
	cameraID uuid.UUID,
	start, end time.Time,
	quality string,
) (*PlaybackResult, error) {
	if err := s.checkRate(ctx, meta); err != nil {
		return nil, err
	}

	authz, err := s.AuthorizeParentPlayback(ctx, meta, cameraID)
	if err != nil {
		s.auditDenied(ctx, meta, cameraID, "PLAYBACK_RECORDING_REQUESTED", err, map[string]any{
			"start": start.Format(time.RFC3339),
			"end":   end.Format(time.RFC3339),
		})
		return nil, err
	}
	cam := authz.Camera

	if err := s.schedule.ValidateRange(start, end); err != nil {
		wrapped := deny("playback_schedule_invalid")
		s.auditDenied(ctx, meta, cameraID, "PLAYBACK_RECORDING_REQUESTED", wrapped, map[string]any{
			"start":              start.Format(time.RFC3339),
			"end":                end.Format(time.RFC3339),
			"schedule_detail":    err.Error(),
		})
		return nil, wrapped
	}

	requestedQuality, _ := hls.ResolveQuality(quality)
	effectiveQuality, err := hls.ResolveQualityOrDefault(quality, cam.DefaultQuality)
	if err != nil {
		return nil, fmt.Errorf("invalid quality: %w", err)
	}

	rows, err := s.q.ListRecordingSegmentsByCameraRange(ctx, sqlc.ListRecordingSegmentsByCameraRangeParams{
		CameraID:  cameraID,
		StartTime: pgTimestamptz(start),
		EndTime:   pgTimestamptz(end),
		Column4:   effectiveQuality,
	})
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		err := &ErrNotFound{InternalReason: "no_recording_segments_in_range"}
		s.auditDenied(ctx, meta, cameraID, "PLAYBACK_RECORDING_REQUESTED", err, map[string]any{
			"start": start.Format(time.RFC3339),
			"end":   end.Format(time.RFC3339),
		})
		return nil, err
	}

	gap := time.Duration(s.cfg.TimelineSegmentGapSeconds) * time.Second
	if gap <= 0 {
		gap = 30 * time.Second
	}
	spans := spansFromRecordingRows(rows)
	hasGaps := DetectRecordingGaps(start.UTC(), end.UTC(), spans, gap)

	unique := dedupeRecordingSegments(rows)
	entries := make([]VODSegmentEntry, 0, len(unique))
	segTTL := s.cfg.RecordingPlaybackURLTTL
	for _, seg := range unique {
		url, err := s.storage.PresignGetObject(ctx, seg.SegmentPath, segTTL)
		if err != nil {
			return nil, fmt.Errorf("presign segment: %w", err)
		}
		entries = append(entries, VODSegmentEntry{
			URL:             url,
			DurationSeconds: float64(seg.DurationSeconds),
		})
	}

	playlist := BuildVODPlaylist(entries)
	key := TempPlaybackKey(meta.UserID.String(), cameraID.String(), time.Now().UTC().Unix())
	if err := s.storage.PutObject(ctx, key, playlist, "application/vnd.apple.mpegurl"); err != nil {
		return nil, err
	}

	expiry := s.cfg.RecordingPlaybackURLTTL
	signed, err := s.storage.PresignGetObject(ctx, key, expiry)
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().UTC().Add(expiry)

	var warnings []string
	if hasGaps {
		warnings = []string{"Requested range contains missing recording gaps"}
	}

	auditMeta := map[string]any{
		"camera_id":     cameraID.String(),
		"start":         start.Format(time.RFC3339),
		"end":           end.Format(time.RFC3339),
		"quality":       effectiveQuality,
		"segment_count": len(entries),
		"has_gaps":      hasGaps,
		"playlist_key":  key,
	}
	if requestedQuality != "" {
		auditMeta["requested_quality"] = requestedQuality
	}
	s.auditOK(ctx, meta, authz, "PLAYBACK_RECORDING_REQUESTED", auditMeta)

	return &PlaybackResult{
		CameraID:     cameraID.String(),
		CameraName:   cam.Name,
		Type:         "playback",
		Quality:      effectiveQuality,
		Start:        start.UTC().Format(time.RFC3339),
		End:          end.UTC().Format(time.RFC3339),
		SignedHLSURL: signed,
		ExpiresAt:    expiresAt.Format(time.RFC3339),
		SegmentCount: len(entries),
		Warnings:     warnings,
	}, nil
}

func dedupeRecordingSegments(rows []sqlc.RecordingSegment) []sqlc.RecordingSegment {
	seen := make(map[string]struct{}, len(rows))
	out := make([]sqlc.RecordingSegment, 0, len(rows))
	for _, seg := range rows {
		key := seg.ID.String()
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, seg)
	}
	return out
}

func (s *Service) checkRate(ctx context.Context, meta RequestMeta) error {
	ok, err := s.limiter.Allow(ctx, meta.UserID)
	if err != nil {
		return nil
	}
	if !ok {
		return &ErrRateLimited{}
	}
	return nil
}

func (s *Service) parseDateInSchoolTZ(date string) (time.Time, time.Time, error) {
	loc := s.schedule.loc
	t, err := time.ParseInLocation("2006-01-02", date, loc)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}
	return t, t.Add(24 * time.Hour), nil
}

func (s *Service) auditOK(ctx context.Context, meta RequestMeta, authz *AuthorizeResult, action string, extra map[string]any) {
	if extra == nil {
		extra = map[string]any{}
	}
	extra["user_id"] = meta.UserID.String()
	if meta.DeviceID != uuid.Nil {
		extra["device_id"] = meta.DeviceID.String()
	}
	if authz != nil && authz.ChildID != nil {
		extra["child_id"] = authz.ChildID.String()
	}

	cam := authz.Camera
	schoolID := cam.SchoolID
	var classroomID *uuid.UUID
	if cam.ClassroomID.Valid {
		id := uuid.UUID(cam.ClassroomID.Bytes)
		classroomID = &id
	}
	cameraID := cam.ID

	var deviceID *uuid.UUID
	if meta.DeviceID != uuid.Nil {
		deviceID = &meta.DeviceID
	}

	s.audit.Event(ctx, audit.EventParams{
		Action:      action,
		UserID:      &meta.UserID,
		SchoolID:    &schoolID,
		ClassroomID: classroomID,
		CameraID:    &cameraID,
		DeviceID:    deviceID,
		IPAddress:   meta.IPAddress,
		UserAgent:   meta.UserAgent,
		Metadata:    extra,
	})
}

func (s *Service) auditDenied(ctx context.Context, meta RequestMeta, cameraID uuid.UUID, action string, err error, extra map[string]any) {
	metaMap := map[string]any{
		"camera_id":        cameraID.String(),
		"user_id":          meta.UserID.String(),
		"denial_reason":    denialReasonForAudit(err),
		"attempted_action": action,
	}
	if meta.DeviceID != uuid.Nil {
		metaMap["device_id"] = meta.DeviceID.String()
	}
	if extra != nil {
		for k, v := range extra {
			metaMap[k] = v
		}
	}

	var deviceID *uuid.UUID
	if meta.DeviceID != uuid.Nil {
		deviceID = &meta.DeviceID
	}

	s.audit.Event(ctx, audit.EventParams{
		Action:    "PLAYBACK_ACCESS_DENIED",
		UserID:    &meta.UserID,
		CameraID:  &cameraID,
		DeviceID:  deviceID,
		IPAddress: meta.IPAddress,
		UserAgent: meta.UserAgent,
		Metadata:  metaMap,
	})
}

func denialReasonForAudit(err error) string {
	if IsLiveOutsideSchoolHours(err) {
		return "LIVE_OUTSIDE_SCHOOL_HOURS"
	}
	var denied *ErrAccessDenied
	if errors.As(err, &denied) {
		return denied.InternalReasonOrDefault()
	}
	var notFound *ErrNotFound
	if errors.As(err, &notFound) {
		return notFound.InternalReasonOrDefault()
	}
	if IsRateLimited(err) {
		return "rate_limit_exceeded"
	}
	return err.Error()
}

func pgTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t.UTC(), Valid: true}
}

func uuidStr(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return uuid.UUID(u.Bytes).String()
}

func textStr(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

