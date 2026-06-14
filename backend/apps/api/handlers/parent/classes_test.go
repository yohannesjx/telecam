package parent

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// ── buildClassesResponse unit tests ───────────────────────────────────────────

// TestBuildClassesResponse_Empty verifies that a linked parent with no children
// (or no children with classrooms) returns a non-nil empty slice.
func TestBuildClassesResponse_Empty(t *testing.T) {
	out := buildClassesResponse(nil)
	if out == nil {
		t.Fatal("expected non-nil slice for nil input")
	}
	if len(out) != 0 {
		t.Fatalf("expected empty slice for nil input, got %d items", len(out))
	}
}

// TestBuildClassesResponse_EmptyRows verifies the same for an empty non-nil slice.
func TestBuildClassesResponse_EmptyRows(t *testing.T) {
	out := buildClassesResponse([]sqlc.ListSuperAppParentClassesRow{})
	if len(out) != 0 {
		t.Fatalf("expected 0 children, got %d", len(out))
	}
}

// TestBuildClassesResponse_ChildWithNoCamera verifies that a child whose classroom
// has no cameras still appears in the response with "cameras": [].
func TestBuildClassesResponse_ChildWithNoCamera(t *testing.T) {
	childID := uuid.New()
	rows := []sqlc.ListSuperAppParentClassesRow{
		{
			ChildID:       childID,
			ChildName:     "Abel",
			ClassroomID:   uuid.New(),
			ClassroomName: "KG 2 Blue",
			SchoolID:      uuid.New(),
			SchoolName:    "Bright Future School",
			CameraID:      pgtype.UUID{Valid: false}, // LEFT JOIN produced NULL
			CameraLabel:   pgtype.Text{Valid: false},
			CameraStatus:  pgtype.Text{Valid: false},
			DefaultQuality: pgtype.Text{Valid: false},
		},
	}

	out := buildClassesResponse(rows)
	if len(out) != 1 {
		t.Fatalf("expected 1 child, got %d", len(out))
	}
	// Use JSON round-trip to verify cameras is an empty array, not nil/missing.
	b, _ := json.Marshal(out[0])
	var m map[string]json.RawMessage
	json.Unmarshal(b, &m)
	if string(m["cameras"]) != "[]" {
		t.Fatalf("expected cameras to be [], got %s", m["cameras"])
	}
}

// TestBuildClassesResponse_OneChildOneCamera verifies the standard happy path.
func TestBuildClassesResponse_OneChildOneCamera(t *testing.T) {
	childID := uuid.New()
	camID := uuid.New()

	rows := []sqlc.ListSuperAppParentClassesRow{
		{
			ChildID:        childID,
			ChildName:      "Abel",
			ClassroomID:    uuid.New(),
			ClassroomName:  "KG 2 Blue",
			SchoolID:       uuid.New(),
			SchoolName:     "Bright Future School",
			CameraID:       pgtype.UUID{Bytes: camID, Valid: true},
			CameraLabel:    pgtype.Text{String: "Front Camera", Valid: true},
			CameraStatus:   pgtype.Text{String: "ACTIVE", Valid: true},
			DefaultQuality: pgtype.Text{String: "sd_360p", Valid: true},
		},
	}

	out := buildClassesResponse(rows)
	if len(out) != 1 {
		t.Fatalf("expected 1 child, got %d", len(out))
	}

	b, _ := json.Marshal(out[0])
	var child map[string]json.RawMessage
	json.Unmarshal(b, &child)

	if string(child["child_name"]) != `"Abel"` {
		t.Fatalf("unexpected child_name: %s", child["child_name"])
	}

	var cameras []map[string]json.RawMessage
	json.Unmarshal(child["cameras"], &cameras)
	if len(cameras) != 1 {
		t.Fatalf("expected 1 camera, got %d", len(cameras))
	}
	if string(cameras[0]["status"]) != `"online"` {
		t.Fatalf("expected status online, got %s", cameras[0]["status"])
	}
	if string(cameras[0]["live_available"]) != "true" {
		t.Fatalf("expected live_available true, got %s", cameras[0]["live_available"])
	}
	if string(cameras[0]["default_quality"]) != `"sd_360p"` {
		t.Fatalf("expected sd_360p, got %s", cameras[0]["default_quality"])
	}
}

// TestBuildClassesResponse_TwoCamerasSameChild verifies that two cameras for the
// same child are grouped into a single child entry.
func TestBuildClassesResponse_TwoCamerasSameChild(t *testing.T) {
	childID := uuid.New()
	classroomID := uuid.New()
	schoolID := uuid.New()

	cam1 := uuid.New()
	cam2 := uuid.New()

	rows := []sqlc.ListSuperAppParentClassesRow{
		{
			ChildID: childID, ChildName: "Sara",
			ClassroomID: classroomID, ClassroomName: "KG 1",
			SchoolID: schoolID, SchoolName: "Sunshine",
			CameraID:       pgtype.UUID{Bytes: cam1, Valid: true},
			CameraLabel:    pgtype.Text{String: "Cam A", Valid: true},
			CameraStatus:   pgtype.Text{String: "ACTIVE", Valid: true},
			DefaultQuality: pgtype.Text{String: "sd_360p", Valid: true},
		},
		{
			ChildID: childID, ChildName: "Sara",
			ClassroomID: classroomID, ClassroomName: "KG 1",
			SchoolID: schoolID, SchoolName: "Sunshine",
			CameraID:       pgtype.UUID{Bytes: cam2, Valid: true},
			CameraLabel:    pgtype.Text{String: "Cam B", Valid: true},
			CameraStatus:   pgtype.Text{String: "OFFLINE", Valid: true},
			DefaultQuality: pgtype.Text{String: "sd_360p", Valid: true},
		},
	}

	out := buildClassesResponse(rows)
	if len(out) != 1 {
		t.Fatalf("expected 1 child entry for two cameras, got %d", len(out))
	}

	b, _ := json.Marshal(out[0])
	var child map[string]json.RawMessage
	json.Unmarshal(b, &child)

	var cameras []map[string]json.RawMessage
	json.Unmarshal(child["cameras"], &cameras)
	if len(cameras) != 2 {
		t.Fatalf("expected 2 cameras, got %d", len(cameras))
	}

	// Second camera is OFFLINE → status "offline", live_available false.
	if string(cameras[1]["status"]) != `"offline"` {
		t.Fatalf("expected offline, got %s", cameras[1]["status"])
	}
	if string(cameras[1]["live_available"]) != "false" {
		t.Fatalf("expected live_available false, got %s", cameras[1]["live_available"])
	}
}

// TestBuildClassesResponse_TwoChildren verifies that two different children are
// returned as separate entries.
func TestBuildClassesResponse_TwoChildren(t *testing.T) {
	child1 := uuid.New()
	child2 := uuid.New()

	rows := []sqlc.ListSuperAppParentClassesRow{
		{
			ChildID: child1, ChildName: "Abel",
			ClassroomID: uuid.New(), ClassroomName: "KG 1",
			SchoolID: uuid.New(), SchoolName: "School A",
			CameraID: pgtype.UUID{Valid: false},
		},
		{
			ChildID: child2, ChildName: "Sara",
			ClassroomID: uuid.New(), ClassroomName: "KG 2",
			SchoolID: uuid.New(), SchoolName: "School A",
			CameraID: pgtype.UUID{Valid: false},
		},
	}

	out := buildClassesResponse(rows)
	if len(out) != 2 {
		t.Fatalf("expected 2 children, got %d", len(out))
	}
}

// TestBuildClassesResponse_NoSensitiveFields verifies that the response never
// contains RTSP URLs, encrypted RTSP URLs, signed HLS URLs, or storage paths.
func TestBuildClassesResponse_NoSensitiveFields(t *testing.T) {
	forbidden := []string{
		"rtsp_url", "encrypted_rtsp_url", "r2_live_path", "r2_recording_path",
		"storage_path", "hls_url", "signed_url", "stream_key",
	}

	camID := uuid.New()
	rows := []sqlc.ListSuperAppParentClassesRow{
		{
			ChildID: uuid.New(), ChildName: "Abel",
			ClassroomID: uuid.New(), ClassroomName: "KG 1",
			SchoolID: uuid.New(), SchoolName: "School A",
			CameraID:       pgtype.UUID{Bytes: camID, Valid: true},
			CameraLabel:    pgtype.Text{String: "Front Cam", Valid: true},
			CameraStatus:   pgtype.Text{String: "ACTIVE", Valid: true},
			DefaultQuality: pgtype.Text{String: "sd_360p", Valid: true},
		},
	}

	out := buildClassesResponse(rows)
	b, _ := json.Marshal(out)
	payload := string(b)

	for _, field := range forbidden {
		if containsField(payload, field) {
			t.Fatalf("response must not contain field %q, got: %s", field, payload)
		}
	}
}

// TestCameraStatus_Mapping verifies status label and live_available derivation.
func TestCameraStatus_Mapping(t *testing.T) {
	cases := []struct {
		dbStatus   string
		wantLabel  string
		wantLive   bool
	}{
		{"ACTIVE", "online", true},
		{"OFFLINE", "offline", false},
		{"INACTIVE", "unknown", false},
		{"", "unknown", false},
	}
	for _, tc := range cases {
		s := pgtype.Text{String: tc.dbStatus, Valid: tc.dbStatus != ""}
		if got := cameraStatus(s); got != tc.wantLabel {
			t.Errorf("cameraStatus(%q) = %q, want %q", tc.dbStatus, got, tc.wantLabel)
		}
		if got := cameraLiveAvailable(s); got != tc.wantLive {
			t.Errorf("cameraLiveAvailable(%q) = %v, want %v", tc.dbStatus, got, tc.wantLive)
		}
	}
}

// TestCameraStatus_NullDB verifies NULL camera status (LEFT JOIN with no camera).
func TestCameraStatus_NullDB(t *testing.T) {
	null := pgtype.Text{Valid: false}
	if got := cameraStatus(null); got != "unknown" {
		t.Fatalf("NULL status should map to unknown, got %q", got)
	}
	if cameraLiveAvailable(null) {
		t.Fatal("NULL status should not be live_available")
	}
}

// ── helpers ──────────────────────────────────────────────────────────────────

// gin_H is a type alias to avoid importing gin in the test just for the assertion.
type gin_H = map[string]any

// containsField checks whether a JSON payload contains a given key string.
func containsField(payload, field string) bool {
	return len(payload) > 0 && (len(field) > 0) &&
		(indexOf(payload, `"`+field+`"`) >= 0)
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
