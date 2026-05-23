package admin

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/retention"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type retentionStatusDTO struct {
	WorkerName string         `json:"worker_name"`
	Status     string         `json:"status"`
	LastSeenAt string         `json:"last_seen_at"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

// RetentionStatus GET /admin/retention/status
func (h *Handler) RetentionStatus(c *gin.Context) {
	hb, err := h.q.GetLatestWorkerHeartbeatByType(c.Request.Context(), retention.WorkerTypeRetention)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.OK(c, http.StatusOK, gin.H{
				"status":  "UNKNOWN",
				"message": "no retention worker heartbeat recorded yet",
			})
			return
		}
		response.Internal(c, "failed to load retention worker status")
		return
	}

	meta := map[string]any{}
	if len(hb.Metadata) > 0 {
		_ = json.Unmarshal(hb.Metadata, &meta)
	}
	response.OK(c, http.StatusOK, retentionStatusDTO{
		WorkerName: hb.WorkerName,
		Status:     hb.Status,
		LastSeenAt: hb.LastSeenAt.Time.UTC().Format(timeRFC3339),
		Metadata:   meta,
	})
}
