package playback

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/audit"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

type mockAuthorizeStore struct {
	device              sqlc.Device
	deviceErr           error
	updateLastSeenErr   error
	camera              sqlc.GetCameraWithSchoolClassroomRow
	cameraErr           error
	canAccess           bool
	canAccessErr        error
	childID             uuid.UUID
	childErr            error
	subscriptionErr     error
	updateLastSeenCalls int
}

func (m *mockAuthorizeStore) GetDeviceByIDForUser(ctx context.Context, arg sqlc.GetDeviceByIDForUserParams) (sqlc.Device, error) {
	if m.deviceErr != nil {
		return sqlc.Device{}, m.deviceErr
	}
	return m.device, nil
}

func (m *mockAuthorizeStore) UpdateDeviceLastSeenByID(ctx context.Context, arg sqlc.UpdateDeviceLastSeenByIDParams) error {
	m.updateLastSeenCalls++
	return m.updateLastSeenErr
}

func (m *mockAuthorizeStore) GetCameraWithSchoolClassroom(ctx context.Context, id uuid.UUID) (sqlc.GetCameraWithSchoolClassroomRow, error) {
	if m.cameraErr != nil {
		return sqlc.GetCameraWithSchoolClassroomRow{}, m.cameraErr
	}
	return m.camera, nil
}

func (m *mockAuthorizeStore) ParentCanAccessCamera(ctx context.Context, arg sqlc.ParentCanAccessCameraParams) (bool, error) {
	if m.canAccessErr != nil {
		return false, m.canAccessErr
	}
	return m.canAccess, nil
}

func (m *mockAuthorizeStore) GetParentChildIDForCamera(ctx context.Context, arg sqlc.GetParentChildIDForCameraParams) (uuid.UUID, error) {
	if m.childErr != nil {
		return uuid.Nil, m.childErr
	}
	return m.childID, nil
}

func (m *mockAuthorizeStore) GetActiveSubscriptionForParentSchool(ctx context.Context, arg sqlc.GetActiveSubscriptionForParentSchoolParams) (sqlc.Subscription, error) {
	if m.subscriptionErr != nil {
		return sqlc.Subscription{}, m.subscriptionErr
	}
	return sqlc.Subscription{Status: "ACTIVE"}, nil
}

func activeParentMeta(userID, deviceID uuid.UUID) RequestMeta {
	return RequestMeta{
		UserID:   userID,
		DeviceID: deviceID,
		Role:     "PARENT",
		Status:   "ACTIVE",
	}
}

func defaultCameraRow(schoolID, classroomID, cameraID uuid.UUID) sqlc.GetCameraWithSchoolClassroomRow {
	return sqlc.GetCameraWithSchoolClassroomRow{
		ID:              cameraID,
		SchoolID:        schoolID,
		ClassroomID:     pgtype.UUID{Bytes: classroomID, Valid: true},
		Name:            "Room Camera",
		R2LivePath:      "cameras/demo/live",
		DefaultQuality:  "sd_360p",
		CameraStatus:    "ACTIVE",
		SchoolName:      "Demo School",
		SchoolStatus:    "ACTIVE",
		ClassroomName:   pgtype.Text{String: "Room A", Valid: true},
		ClassroomStatus: pgtype.Text{String: "ACTIVE", Valid: true},
	}
}

func TestAuthorizeParentPlayback_Allowed(t *testing.T) {
	userID := uuid.New()
	deviceID := uuid.New()
	cameraID := uuid.New()
	schoolID := uuid.New()
	classroomID := uuid.New()
	childID := uuid.New()

	store := &mockAuthorizeStore{
		device: sqlc.Device{ID: deviceID, UserID: userID, Status: "ACTIVE"},
		camera: defaultCameraRow(schoolID, classroomID, cameraID),
		canAccess: true,
		childID: childID,
	}

	result, err := authorizeParentPlayback(context.Background(), store, activeParentMeta(userID, deviceID), cameraID)
	if err != nil {
		t.Fatalf("expected allow: %v", err)
	}
	if result.ChildID == nil || *result.ChildID != childID {
		t.Fatal("expected child id in result")
	}
	if store.updateLastSeenCalls != 1 {
		t.Fatalf("expected last_seen update, got %d", store.updateLastSeenCalls)
	}
}

func TestAuthorizeParentPlayback_Denials(t *testing.T) {
	userID := uuid.New()
	deviceID := uuid.New()
	cameraID := uuid.New()
	schoolID := uuid.New()
	classroomID := uuid.New()

	baseStore := func() *mockAuthorizeStore {
		return &mockAuthorizeStore{
			device:    sqlc.Device{ID: deviceID, UserID: userID, Status: "ACTIVE"},
			camera:    defaultCameraRow(schoolID, classroomID, cameraID),
			canAccess: true,
			childID:   uuid.New(),
		}
	}

	tests := []struct {
		name       string
		meta       RequestMeta
		store      func() *mockAuthorizeStore
		wantReason string
	}{
		{
			name:       "wrong role",
			meta:       RequestMeta{UserID: userID, DeviceID: deviceID, Role: "SCHOOL_ADMIN", Status: "ACTIVE"},
			store:      baseStore,
			wantReason: "parent_role_required",
		},
		{
			name:       "blocked user",
			meta:       RequestMeta{UserID: userID, DeviceID: deviceID, Role: "PARENT", Status: "BLOCKED"},
			store:      baseStore,
			wantReason: "user_not_active",
		},
		{
			name:       "missing device id",
			meta:       RequestMeta{UserID: userID, Role: "PARENT", Status: "ACTIVE"},
			store:      baseStore,
			wantReason: "device_id_missing",
		},
		{
			name: "blocked device",
			meta: activeParentMeta(userID, deviceID),
			store: func() *mockAuthorizeStore {
				s := baseStore()
				s.device.Status = "BLOCKED"
				return s
			},
			wantReason: "device_blocked",
		},
		{
			name: "disabled device",
			meta: activeParentMeta(userID, deviceID),
			store: func() *mockAuthorizeStore {
				s := baseStore()
				s.device.Status = "DISABLED"
				return s
			},
			wantReason: "device_disabled",
		},
		{
			name: "another classroom camera",
			meta: activeParentMeta(userID, deviceID),
			store: func() *mockAuthorizeStore {
				s := baseStore()
				s.canAccess = false
				return s
			},
			wantReason: "parent_child_classroom_mismatch",
		},
		{
			name: "inactive subscription",
			meta: activeParentMeta(userID, deviceID),
			store: func() *mockAuthorizeStore {
				s := baseStore()
				s.subscriptionErr = pgx.ErrNoRows
				return s
			},
			wantReason: "subscription_inactive_or_expired",
		},
		{
			name: "inactive camera",
			meta: activeParentMeta(userID, deviceID),
			store: func() *mockAuthorizeStore {
				s := baseStore()
				s.camera.CameraStatus = "INACTIVE"
				return s
			},
			wantReason: "camera_not_active",
		},
		{
			name: "inactive school",
			meta: activeParentMeta(userID, deviceID),
			store: func() *mockAuthorizeStore {
				s := baseStore()
				s.camera.SchoolStatus = "INACTIVE"
				return s
			},
			wantReason: "school_not_active",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := authorizeParentPlayback(context.Background(), tc.store(), tc.meta, cameraID)
			if !IsAccessDenied(err) {
				t.Fatalf("expected access denied, got %v", err)
			}
			var denied *ErrAccessDenied
			if !errors.As(err, &denied) {
				t.Fatal("expected ErrAccessDenied")
			}
			if denied.InternalReasonOrDefault() != tc.wantReason {
				t.Fatalf("reason %q, want %q", denied.InternalReasonOrDefault(), tc.wantReason)
			}
			if err.Error() != "access denied" {
				t.Fatalf("public message %q", err.Error())
			}
		})
	}
}

type captureAudit struct {
	events []audit.EventParams
}

func (c *captureAudit) Event(ctx context.Context, p audit.EventParams) {
	c.events = append(c.events, p)
}

func TestAuditDenied_LogsPlaybackAccessDenied(t *testing.T) {
	capture := &captureAudit{}
	svc := &Service{audit: capture}
	userID := uuid.New()
	deviceID := uuid.New()
	cameraID := uuid.New()
	meta := activeParentMeta(userID, deviceID)
	meta.IPAddress = "203.0.113.1"
	meta.UserAgent = "test-agent"

	svc.auditDenied(context.Background(), meta, cameraID, "PLAYBACK_LIVE_REQUESTED", deny("device_blocked"), nil)

	if len(capture.events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(capture.events))
	}
	ev := capture.events[0]
	if ev.Action != "PLAYBACK_ACCESS_DENIED" {
		t.Fatalf("action %q", ev.Action)
	}
	if ev.Metadata["denial_reason"] != "device_blocked" {
		t.Fatalf("denial_reason %v", ev.Metadata["denial_reason"])
	}
	if ev.Metadata["device_id"] != deviceID.String() {
		t.Fatalf("device_id %v", ev.Metadata["device_id"])
	}
}

func TestSchedule_OutsideSchoolHoursDenied(t *testing.T) {
	loc, err := time.LoadLocation("Africa/Addis_Ababa")
	if err != nil {
		t.Fatal(err)
	}
	sched := &Schedule{
		loc:      loc,
		startH:   8,
		startM:   30,
		endH:     16,
		endM:     30,
		weekdays: map[time.Weekday]bool{time.Monday: true, time.Tuesday: true, time.Wednesday: true, time.Thursday: true, time.Friday: true},
	}
	// Friday 2026-05-22 07:00 local (before school)
	start := time.Date(2026, 5, 22, 4, 0, 0, 0, time.UTC)
	end := start.Add(10 * time.Minute)
	if err := sched.ValidateRange(start, end); err == nil {
		t.Fatal("expected outside school hours error")
	}
}

func TestPlayback_NoSegments_IsNotFound(t *testing.T) {
	err := &ErrNotFound{InternalReason: "no_recording_segments_in_range"}
	if !IsNotFound(err) {
		t.Fatal("expected not found")
	}
	if err.Error() != "recording not found" {
		t.Fatalf("public message %q", err.Error())
	}
}
