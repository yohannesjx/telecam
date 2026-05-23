package audit

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// Logger writes structured audit events to PostgreSQL.
type Logger struct {
	q      *sqlc.Queries
	logger *slog.Logger
}

// NewLogger creates an audit logger.
func NewLogger(q *sqlc.Queries, logger *slog.Logger) *Logger {
	return &Logger{q: q, logger: logger}
}

// Event records an audit log row.
func (l *Logger) Event(ctx context.Context, p EventParams) {
	meta, _ := json.Marshal(p.Metadata)
	_, err := l.q.CreateAuditLog(ctx, sqlc.CreateAuditLogParams{
		ID:          uuid.New(),
		UserID:      pgUUID(p.UserID),
		SchoolID:    pgUUID(p.SchoolID),
		ClassroomID: pgUUID(p.ClassroomID),
		CameraID:    pgUUID(p.CameraID),
		ChildID:     pgUUID(p.ChildID),
		DeviceID:    pgUUID(p.DeviceID),
		Action:      p.Action,
		IpAddress:   pgText(p.IPAddress),
		UserAgent:   pgText(p.UserAgent),
		Metadata:    meta,
	})
	if err != nil && l.logger != nil {
		l.logger.Warn("audit log insert failed", "action", p.Action, "error", err)
	}
}

// EventParams describes an audit event.
type EventParams struct {
	Action      string
	UserID      *uuid.UUID
	SchoolID    *uuid.UUID
	ClassroomID *uuid.UUID
	CameraID    *uuid.UUID
	ChildID     *uuid.UUID
	DeviceID    *uuid.UUID
	IPAddress   string
	UserAgent   string
	Metadata    map[string]any
}

func pgUUID(id *uuid.UUID) pgtype.UUID {
	if id == nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: *id, Valid: true}
}

func pgText(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}
