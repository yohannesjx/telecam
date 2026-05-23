package parent

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/school-camera-platform/school-camera-platform/internal/auth"
	"github.com/school-camera-platform/school-camera-platform/internal/playback"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

func (h *Handler) requestMeta(c *gin.Context) playback.RequestMeta {
	user, _ := auth.UserFromContext(c)
	return playback.RequestMeta{
		UserID:    user.UserID,
		DeviceID:  user.DeviceID,
		Role:      user.Role,
		Status:    user.Status,
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	}
}

func (h *Handler) handlePlaybackError(c *gin.Context, err error) {
	if playback.IsRateLimited(err) {
		response.TooManyRequests(c, err.Error())
		return
	}
	if playback.IsNotFound(err) {
		response.NotFound(c, err.Error())
		return
	}
	if playback.IsAccessDenied(err) {
		response.Forbidden(c, err.Error())
		return
	}
	response.BadRequest(c, err.Error())
}

// Live GET /parent/cameras/:camera_id/live
func (h *Handler) Live(c *gin.Context) {
	if _, ok := h.user(c); !ok {
		return
	}
	cameraID, ok := h.parseCameraID(c)
	if !ok {
		return
	}

	if h.playback == nil {
		response.Internal(c, "playback service unavailable")
		return
	}
	result, err := h.playback.Live(c.Request.Context(), h.requestMeta(c), cameraID, c.Query("quality"))
	if err != nil {
		h.handlePlaybackError(c, err)
		return
	}
	response.OK(c, http.StatusOK, result)
}

// Timeline GET /parent/cameras/:camera_id/timeline
func (h *Handler) Timeline(c *gin.Context) {
	if _, ok := h.user(c); !ok {
		return
	}
	cameraID, ok := h.parseCameraID(c)
	if !ok {
		return
	}
	date := c.Query("date")
	if date == "" {
		response.BadRequest(c, "date query parameter is required (YYYY-MM-DD)")
		return
	}

	includeSegments := c.Query("include_segments") == "true"
	result, err := h.playback.Timeline(c.Request.Context(), h.requestMeta(c), cameraID, date, c.Query("quality"), includeSegments)
	if err != nil {
		h.handlePlaybackError(c, err)
		return
	}
	response.OK(c, http.StatusOK, result)
}

// Playback GET /parent/cameras/:camera_id/playback
func (h *Handler) Playback(c *gin.Context) {
	if _, ok := h.user(c); !ok {
		return
	}
	cameraID, ok := h.parseCameraID(c)
	if !ok {
		return
	}

	startStr := c.Query("start")
	endStr := c.Query("end")
	if startStr == "" || endStr == "" {
		response.BadRequest(c, "start and end query parameters are required (ISO 8601)")
		return
	}
	start, err := time.Parse(time.RFC3339, startStr)
	if err != nil {
		response.BadRequest(c, "invalid start datetime")
		return
	}
	end, err := time.Parse(time.RFC3339, endStr)
	if err != nil {
		response.BadRequest(c, "invalid end datetime")
		return
	}
	quality := c.Query("quality")

	result, err := h.playback.Playback(c.Request.Context(), h.requestMeta(c), cameraID, start, end, quality)
	if err != nil {
		h.handlePlaybackError(c, err)
		return
	}
	response.OK(c, http.StatusOK, result)
}

func (h *Handler) parseCameraID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("camera_id"))
	if err != nil {
		response.BadRequest(c, "invalid camera_id")
		return uuid.Nil, false
	}
	return id, true
}
