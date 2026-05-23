package admin

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/monitoring"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

func (h *Handler) monitoringSchoolIDs(c *gin.Context) ([]uuid.UUID, bool) {
	user, ok := h.user(c)
	if !ok {
		return nil, false
	}
	ids, err := h.access.SchoolIDsForUser(c.Request.Context(), user.Role, user.UserID)
	if err != nil {
		response.Internal(c, "failed to resolve school scope")
		return nil, false
	}
	return ids, true
}

func (h *Handler) schoolLocation() *time.Location {
	return monitoring.LoadLocation(h.cfg.SchoolTimezone)
}

func (h *Handler) parsePagination(c *gin.Context) (limit, offset int32) {
	l, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	o, _ := strconv.Atoi(c.Query("offset"))
	li, off := monitoring.ParseLimitOffset(l, o)
	return int32(li), int32(off)
}

func (h *Handler) parseDateRange(c *gin.Context) (from, to pgtype.Timestamptz, ok bool) {
	loc := h.schoolLocation()
	if fromStr := c.Query("date_from"); fromStr != "" {
		d, err := time.Parse("2006-01-02", fromStr)
		if err != nil {
			response.BadRequest(c, "invalid date_from, use YYYY-MM-DD")
			return from, to, false
		}
		start, _ := monitoring.DayBoundsUTC(loc, d)
		from = database.TimestamptzFromTime(start)
	}
	if toStr := c.Query("date_to"); toStr != "" {
		d, err := time.Parse("2006-01-02", toStr)
		if err != nil {
			response.BadRequest(c, "invalid date_to, use YYYY-MM-DD")
			return from, to, false
		}
		_, end := monitoring.DayBoundsUTC(loc, d)
		to = database.TimestamptzFromTime(end)
	}
	return from, to, true
}

func centsToETB(cents int64) float64 {
	return float64(cents) / 100.0
}

func bytesToGB(b int64) float64 {
	return float64(b) / (1024 * 1024 * 1024)
}
