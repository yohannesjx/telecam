package admin

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/monitoring"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type cameraHealthHistoryDTO struct {
	CameraID  string             `json:"camera_id"`
	Period    string             `json:"period"`
	Since     string             `json:"since"`
	Events    []healthHistoryEventDTO `json:"events"`
}

type healthHistoryEventDTO struct {
	ID        string         `json:"id"`
	EventType string         `json:"event_type"`
	Severity  string         `json:"severity"`
	Message   string         `json:"message,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt string         `json:"created_at"`
}

// CameraHealthHistory GET /admin/cameras/:camera_id/health-history
func (h *Handler) CameraHealthHistory(c *gin.Context) {
	cameraID, ok := h.parseUUID(c, "camera_id")
	if !ok {
		return
	}

	cam, err := h.q.GetCamera(c.Request.Context(), cameraID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "camera not found")
			return
		}
		response.Internal(c, "failed to load camera")
		return
	}
	if !h.requireSchoolCameraView(c, cam.SchoolID) {
		return
	}

	period := c.DefaultQuery("period", "24h")
	var since time.Time
	var limit int32 = 500
	switch period {
	case "7d":
		since = time.Now().UTC().Add(-7 * 24 * time.Hour)
		limit = 2000
	case "24h":
		since = time.Now().UTC().Add(-24 * time.Hour)
	default:
		response.BadRequest(c, "invalid period (use 24h or 7d)")
		return
	}

	events, err := h.q.ListCameraHealthEventsSince(c.Request.Context(), sqlc.ListCameraHealthEventsSinceParams{
		CameraID:  cameraID,
		CreatedAt: database.TimestamptzFromTime(since),
		Limit:     limit,
	})
	if err != nil {
		response.Internal(c, "failed to load health history")
		return
	}

	out := make([]healthHistoryEventDTO, 0, len(events))
	for _, ev := range events {
		dto := healthHistoryEventDTO{
			ID:        ev.ID.String(),
			EventType: ev.EventType,
			Severity:  ev.Severity,
			CreatedAt: ev.CreatedAt.Time.UTC().Format(timeRFC3339),
			Metadata:  monitoring.SanitizeMetadata(ev.Metadata),
		}
		if ev.Message.Valid {
			dto.Message = ev.Message.String
		}
		out = append(out, dto)
	}

	response.OK(c, http.StatusOK, cameraHealthHistoryDTO{
		CameraID: cameraID.String(),
		Period:   period,
		Since:    since.Format(timeRFC3339),
		Events:   out,
	})
}
