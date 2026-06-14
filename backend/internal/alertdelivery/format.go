package alertdelivery

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// AlertContext holds display names for notification formatting.
type AlertContext struct {
	SchoolName string
	CameraName string
}

// FormatOpenMessage builds the Telegram text for a new alert.
func FormatOpenMessage(alert sqlc.Alert, ctx AlertContext, loc *time.Location) string {
	emoji := severityEmoji(alert.Severity)
	lines := []string{
		fmt.Sprintf("%s %s Alert", emoji, alert.Severity),
		fmt.Sprintf("Type: %s", alert.AlertType),
	}
	if ctx.SchoolName != "" {
		lines = append(lines, fmt.Sprintf("School: %s", ctx.SchoolName))
	}
	if ctx.CameraName != "" {
		lines = append(lines, fmt.Sprintf("Camera: %s", ctx.CameraName))
	}
	if alert.Message.Valid && alert.Message.String != "" {
		lines = append(lines, fmt.Sprintf("Message: %s", alert.Message.String))
	} else if alert.Title != "" {
		lines = append(lines, fmt.Sprintf("Message: %s", alert.Title))
	}
	lines = append(lines, fmt.Sprintf("Opened: %s", formatTime(alert.OpenedAt, loc)))
	return strings.Join(lines, "\n")
}

// FormatResolvedMessage builds the Telegram text for a resolved alert.
func FormatResolvedMessage(alert sqlc.Alert, ctx AlertContext, loc *time.Location) string {
	lines := []string{
		"✅ Alert Resolved",
		fmt.Sprintf("Type: %s", alert.AlertType),
	}
	if ctx.SchoolName != "" {
		lines = append(lines, fmt.Sprintf("School: %s", ctx.SchoolName))
	}
	if ctx.CameraName != "" {
		lines = append(lines, fmt.Sprintf("Camera: %s", ctx.CameraName))
	}
	resolved := alert.ResolvedAt
	if !resolved.Valid {
		resolved = alert.UpdatedAt
	}
	lines = append(lines, fmt.Sprintf("Resolved: %s", formatTime(resolved, loc)))
	return strings.Join(lines, "\n")
}

func severityEmoji(severity string) string {
	switch severity {
	case "CRITICAL":
		return "🚨"
	case "WARNING":
		return "⚠️"
	default:
		return "ℹ️"
	}
}

func formatTime(ts pgtype.Timestamptz, loc *time.Location) string {
	if !ts.Valid {
		return "unknown"
	}
	t := ts.Time.UTC()
	if loc != nil {
		t = t.In(loc)
	}
	zone := "UTC"
	if loc != nil {
		zone = loc.String()
	}
	return t.Format("2006-01-02 15:04") + " " + zone
}

func schoolIDPtr(id pgtype.UUID) *uuid.UUID {
	if !id.Valid {
		return nil
	}
	u := uuid.UUID(id.Bytes)
	return &u
}

func cameraIDPtr(id pgtype.UUID) *uuid.UUID {
	if !id.Valid {
		return nil
	}
	u := uuid.UUID(id.Bytes)
	return &u
}
