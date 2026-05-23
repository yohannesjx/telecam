package parent

import (
	"net/http"

	"github.com/gin-gonic/gin"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/auth"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/playback"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

// Handler implements parent-facing APIs.
type Handler struct {
	q        *sqlc.Queries
	playback *playback.Service
}

// NewHandler creates a parent handler.
func NewHandler(q *sqlc.Queries, playbackSvc *playback.Service) *Handler {
	return &Handler{q: q, playback: playbackSvc}
}

func (h *Handler) user(c *gin.Context) (auth.UserContext, bool) {
	u, ok := auth.UserFromContext(c)
	if !ok {
		response.Unauthorized(c, "unauthorized")
	}
	return u, ok
}

// ListChildren GET /parent/children
func (h *Handler) ListChildren(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	rows, err := h.q.ListChildrenForParent(c.Request.Context(), user.UserID)
	if err != nil {
		response.Internal(c, "failed to list children")
		return
	}
	out := make([]adm.ParentChildDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, adm.ParentChildFromRow(r))
	}
	response.OK(c, http.StatusOK, out)
}

// ListCameras GET /parent/cameras
func (h *Handler) ListCameras(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	rows, err := h.q.ListCamerasForParent(c.Request.Context(), user.UserID)
	if err != nil {
		response.Internal(c, "failed to list cameras")
		return
	}
	out := make([]adm.ParentCameraDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, adm.ParentCameraFromRow(r))
	}
	response.OK(c, http.StatusOK, out)
}
