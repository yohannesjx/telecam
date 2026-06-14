package admin

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type storageUsageDTO struct {
	SchoolID         string  `json:"school_id"`
	SchoolName       string  `json:"school_name"`
	Date             string  `json:"date"`
	TotalBytes       int64   `json:"total_bytes"`
	TotalGB          float64 `json:"total_gb"`
	SegmentCount     int64   `json:"segment_count"`
	EstimatedCostUSD float64 `json:"estimated_cost_usd,omitempty"`
}

// ListStorageUsage GET /admin/storage-usage
func (h *Handler) ListStorageUsage(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	schoolIDs, err := h.access.SchoolIDsForUser(c.Request.Context(), user.Role, user.UserID)
	if err != nil {
		response.Internal(c, "failed to resolve school scope")
		return
	}

	params := sqlc.ListStorageUsageReportParams{RowLimit: 365}
	if len(schoolIDs) > 0 {
		params.SchoolIds = schoolIDs
	}
	if schoolIDStr := c.Query("school_id"); schoolIDStr != "" {
		sid, err := uuid.Parse(schoolIDStr)
		if err != nil {
			response.BadRequest(c, "invalid school_id")
			return
		}
		if len(schoolIDs) > 0 {
			allowed := false
			for _, id := range schoolIDs {
				if id == sid {
					allowed = true
					break
				}
			}
			if !allowed {
				response.Forbidden(c, "not allowed for this school")
				return
			}
		}
		params.SchoolID = pgtype.UUID{Bytes: sid, Valid: true}
	}
	if from := c.Query("date_from"); from != "" {
		d, err := time.Parse("2006-01-02", from)
		if err != nil {
			response.BadRequest(c, "invalid date_from, use YYYY-MM-DD")
			return
		}
		params.DateFrom = pgtype.Date{Time: d, Valid: true}
	}
	if to := c.Query("date_to"); to != "" {
		d, err := time.Parse("2006-01-02", to)
		if err != nil {
			response.BadRequest(c, "invalid date_to, use YYYY-MM-DD")
			return
		}
		params.DateTo = pgtype.Date{Time: d, Valid: true}
	}

	rows, err := h.q.ListStorageUsageReport(c.Request.Context(), params)
	if err != nil {
		response.Internal(c, "failed to list storage usage")
		return
	}

	out := make([]storageUsageDTO, 0, len(rows))
	var sumBytes int64
	var sumCost float64
	for _, row := range rows {
		gb := float64(row.TotalBytes) / (1024 * 1024 * 1024)
		dto := storageUsageDTO{
			SchoolID:     row.SchoolID.String(),
			SchoolName:   row.SchoolName,
			Date:         row.Date.Time.Format("2006-01-02"),
			TotalBytes:   row.TotalBytes,
			TotalGB:      gb,
			SegmentCount: row.SegmentCount,
		}
		if row.EstimatedCostUsd.Valid {
			f, _ := row.EstimatedCostUsd.Float64Value()
			if f.Valid {
				dto.EstimatedCostUSD = f.Float64
				sumCost += f.Float64
			}
		}
		sumBytes += row.TotalBytes
		out = append(out, dto)
	}

	if c.Query("summary") == "true" {
		c.JSON(http.StatusOK, gin.H{
			"data": out,
			"summary": gin.H{
				"total_bytes":         sumBytes,
				"total_gb":            bytesToGB(sumBytes),
				"estimated_cost_usd":  sumCost,
				"rows":                len(out),
			},
		})
		return
	}
	response.OK(c, http.StatusOK, out)
}
