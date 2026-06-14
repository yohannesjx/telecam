package alertdelivery

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/health"
)

func TestFormatOpenMessage(t *testing.T) {
	loc := time.UTC
	alert := sqlc.Alert{
		ID:        uuid.New(),
		AlertType: health.AlertSchoolOffline,
		Severity:  health.SeverityCritical,
		Title:     "School offline",
		Message:   pgtype.Text{String: "No segments for 10 minutes", Valid: true},
		OpenedAt:  pgtype.Timestamptz{Time: time.Date(2026, 5, 24, 10, 35, 0, 0, time.UTC), Valid: true},
	}
	text := FormatOpenMessage(alert, AlertContext{
		SchoolName: "Sunshine Kindergarten",
		CameraName: "Classroom 1 Camera",
	}, loc)
	if !strings.Contains(text, "CRITICAL") || !strings.Contains(text, "Sunshine Kindergarten") {
		t.Fatalf("unexpected message:\n%s", text)
	}
}
