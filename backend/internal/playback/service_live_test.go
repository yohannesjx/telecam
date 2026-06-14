package playback

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/audit"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
	"github.com/school-camera-platform/school-camera-platform/internal/scheduler"
)

type liveServiceStore struct {
	mockAuthorizeStore
	streamState sqlc.CameraStreamState
	streamErr   error
}

func (m *liveServiceStore) GetCameraStreamState(_ context.Context, _ uuid.UUID) (sqlc.CameraStreamState, error) {
	if m.streamErr != nil {
		return sqlc.CameraStreamState{}, m.streamErr
	}
	return m.streamState, nil
}

func (m *liveServiceStore) ListRecordingSegmentsByCameraDate(context.Context, sqlc.ListRecordingSegmentsByCameraDateParams) ([]sqlc.RecordingSegment, error) {
	return nil, nil
}

func (m *liveServiceStore) ListRecordingSegmentsByCameraRange(context.Context, sqlc.ListRecordingSegmentsByCameraRangeParams) ([]sqlc.RecordingSegment, error) {
	return nil, nil
}

type fakeObjectStore struct {
	existing map[string]bool
}

func (f *fakeObjectStore) ObjectExists(_ context.Context, key string) (bool, error) {
	return f.existing[key], nil
}

func (f *fakeObjectStore) PresignGetObject(_ context.Context, key string, _ time.Duration) (string, error) {
	return "https://signed.example/" + key, nil
}

func (f *fakeObjectStore) PutObject(context.Context, string, []byte, string) error {
	return nil
}

type noopAudit struct{}

func (noopAudit) Event(context.Context, audit.EventParams) {}

func TestService_Live_DuringSchoolHoursReturnsSignedURL(t *testing.T) {
	loc, err := time.LoadLocation("Africa/Addis_Ababa")
	if err != nil {
		t.Fatal(err)
	}
	liveAccessClock = func() time.Time {
		return time.Date(2026, 5, 22, 10, 0, 0, 0, loc)
	}
	t.Cleanup(func() { liveAccessClock = nil })

	userID := uuid.New()
	deviceID := uuid.New()
	cameraID := uuid.New()
	schoolID := uuid.New()
	classroomID := uuid.New()
	livePath := "cameras/demo/live"
	playlistKey := hls.LivePlaylistKey(livePath, "sd_360p")

	store := &liveServiceStore{
		mockAuthorizeStore: mockAuthorizeStore{
			device:    sqlc.Device{ID: deviceID, UserID: userID, Status: "ACTIVE"},
			camera:    defaultCameraRow(schoolID, classroomID, cameraID),
			canAccess: true,
		},
		streamState: sqlc.CameraStreamState{
			CameraID:     cameraID,
			DesiredState: scheduler.DesiredRunning,
			Reason:       pgtype.Text{String: scheduler.ReasonWithinSchedule, Valid: true},
		},
	}

	cfg := &appconfig.Config{
		SchoolTimezone:             "Africa/Addis_Ababa",
		RecordingStartTime:         "08:30",
		RecordingEndTime:           "16:30",
		RecordingWeekdays: map[time.Weekday]bool{
			time.Monday: true, time.Tuesday: true, time.Wednesday: true,
			time.Thursday: true, time.Friday: true,
		},
		LivePlaybackURLTTL:     time.Minute * 3,
		LiveDelaySeconds:       30,
		PlaybackRateLimitPerMinute: 0,
	}
	sched, err := NewSchedule(cfg)
	if err != nil {
		t.Fatal(err)
	}

	svc := &Service{
		cfg:      cfg,
		q:        store,
		storage:  &fakeObjectStore{existing: map[string]bool{playlistKey: true}},
		audit:    noopAudit{},
		schedule: sched,
		limiter:  NewRateLimiter(nil, 0),
	}

	result, err := svc.Live(context.Background(), activeParentMeta(userID, deviceID), cameraID, "")
	if err != nil {
		t.Fatalf("Live: %v", err)
	}
	if result.SignedHLSURL == "" {
		t.Fatal("expected signed URL")
	}
}

func TestService_Live_WeekendReturnsOutsideSchoolHours(t *testing.T) {
	loc, err := time.LoadLocation("Africa/Addis_Ababa")
	if err != nil {
		t.Fatal(err)
	}
	liveAccessClock = func() time.Time {
		return time.Date(2026, 5, 23, 10, 0, 0, 0, loc)
	}
	t.Cleanup(func() { liveAccessClock = nil })

	userID := uuid.New()
	deviceID := uuid.New()
	cameraID := uuid.New()
	schoolID := uuid.New()
	classroomID := uuid.New()

	store := &liveServiceStore{
		mockAuthorizeStore: mockAuthorizeStore{
			device:    sqlc.Device{ID: deviceID, UserID: userID, Status: "ACTIVE"},
			camera:    defaultCameraRow(schoolID, classroomID, cameraID),
			canAccess: true,
		},
		streamState: sqlc.CameraStreamState{
			CameraID:     cameraID,
			DesiredState: scheduler.DesiredStopped,
			Reason:       pgtype.Text{String: scheduler.ReasonWeekend, Valid: true},
		},
	}

	cfg := &appconfig.Config{
		SchoolTimezone:     "Africa/Addis_Ababa",
		RecordingStartTime: "08:30",
		RecordingEndTime:   "16:30",
		RecordingWeekdays: map[time.Weekday]bool{
			time.Monday: true, time.Tuesday: true, time.Wednesday: true,
			time.Thursday: true, time.Friday: true,
		},
		PlaybackRateLimitPerMinute: 0,
	}
	sched, err := NewSchedule(cfg)
	if err != nil {
		t.Fatal(err)
	}

	svc := &Service{
		cfg:      cfg,
		q:        store,
		storage:  &fakeObjectStore{existing: map[string]bool{"any": true}},
		audit:    noopAudit{},
		schedule: sched,
		limiter:  NewRateLimiter(nil, 0),
	}

	_, err = svc.Live(context.Background(), activeParentMeta(userID, deviceID), cameraID, "")
	if !IsLiveOutsideSchoolHours(err) {
		t.Fatalf("expected LIVE_OUTSIDE_SCHOOL_HOURS, got %v", err)
	}
}
