package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type alertDTO struct {
	ID         string  `json:"id"`
	SchoolID   *string `json:"school_id,omitempty"`
	CameraID   *string `json:"camera_id,omitempty"`
	AlertType  string  `json:"alert_type"`
	Severity   string  `json:"severity"`
	Status     string  `json:"status"`
	Title      string  `json:"title"`
	Message    string  `json:"message,omitempty"`
	OpenedAt   string  `json:"opened_at"`
	ResolvedAt *string `json:"resolved_at,omitempty"`
	UpdatedAt  string  `json:"updated_at"`
}

func alertFromRow(a sqlc.Alert) alertDTO {
	dto := alertDTO{
		ID:        a.ID.String(),
		AlertType: a.AlertType,
		Severity:  a.Severity,
		Status:    a.Status,
		Title:     a.Title,
		OpenedAt:  a.OpenedAt.Time.UTC().Format(timeRFC3339),
		UpdatedAt: a.UpdatedAt.Time.UTC().Format(timeRFC3339),
	}
	if a.SchoolID.Valid {
		s := uuid.UUID(a.SchoolID.Bytes).String()
		dto.SchoolID = &s
	}
	if a.CameraID.Valid {
		s := uuid.UUID(a.CameraID.Bytes).String()
		dto.CameraID = &s
	}
	if a.Message.Valid {
		dto.Message = a.Message.String
	}
	if a.ResolvedAt.Valid {
		s := a.ResolvedAt.Time.UTC().Format(timeRFC3339)
		dto.ResolvedAt = &s
	}
	return dto
}

const timeRFC3339 = "2006-01-02T15:04:05Z07:00"

// ListAlerts GET /admin/alerts
func (h *Handler) ListAlerts(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	schoolIDs, err := h.access.SchoolIDsForUser(c.Request.Context(), user.Role, user.UserID)
	if err != nil {
		response.Internal(c, "failed to resolve school scope")
		return
	}

	limit, offset := h.parsePagination(c)

	params := sqlc.ListAlertsParams{
		RowLimit:  limit,
		RowOffset: offset,
	}
	countParams := sqlc.CountAlertsFilteredParams{}
	if len(schoolIDs) > 0 {
		params.SchoolIds = schoolIDs
		countParams.SchoolIds = schoolIDs
	}
	if status := c.Query("status"); status != "" {
		params.Status = pgtype.Text{String: status, Valid: true}
		countParams.Status = params.Status
	}
	if severity := c.Query("severity"); severity != "" {
		params.Severity = pgtype.Text{String: severity, Valid: true}
		countParams.Severity = params.Severity
	}
	if alertType := c.Query("alert_type"); alertType != "" {
		params.AlertType = pgtype.Text{String: alertType, Valid: true}
		countParams.AlertType = params.AlertType
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
		countParams.SchoolID = params.SchoolID
	}
	if cameraIDStr := c.Query("camera_id"); cameraIDStr != "" {
		cid, err := uuid.Parse(cameraIDStr)
		if err != nil {
			response.BadRequest(c, "invalid camera_id")
			return
		}
		camSchool, err := h.access.CameraSchoolID(c.Request.Context(), cid)
		if err != nil {
			response.NotFound(c, "camera not found")
			return
		}
		if !h.requireSchoolCameraView(c, camSchool) {
			return
		}
		params.CameraID = pgtype.UUID{Bytes: cid, Valid: true}
		countParams.CameraID = params.CameraID
	}

	ctx := c.Request.Context()
	total, err := h.q.CountAlertsFiltered(ctx, countParams)
	if err != nil {
		response.Internal(c, "failed to count alerts")
		return
	}

	rows, err := h.q.ListAlerts(ctx, params)
	if err != nil {
		response.Internal(c, "failed to list alerts")
		return
	}
	out := make([]alertDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, alertFromRow(row))
	}
	c.JSON(http.StatusOK, gin.H{
		"data": out,
		"pagination": paginationDTO{
			Limit:  limit,
			Offset: offset,
			Total:  total,
		},
	})
}

// AcknowledgeAlert PATCH /admin/alerts/:alert_id/acknowledge
func (h *Handler) AcknowledgeAlert(c *gin.Context) {
	h.updateAlertStatus(c, "ACKNOWLEDGED", "ALERT_ACKNOWLEDGED")
}

// ResolveAlert PATCH /admin/alerts/:alert_id/resolve
func (h *Handler) ResolveAlert(c *gin.Context) {
	alertID, ok := h.parseUUID(c, "alert_id")
	if !ok {
		return
	}
	alert, err := h.q.GetAlertByID(c.Request.Context(), alertID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "alert not found")
			return
		}
		response.Internal(c, "failed to load alert")
		return
	}
	if !h.canActOnAlert(c, alert) {
		return
	}
	updated, err := h.q.ResolveAlert(c.Request.Context(), alertID)
	if err != nil {
		response.Internal(c, "failed to resolve alert")
		return
	}
	user, _ := h.user(c)
	h.auditEvent(c, "ALERT_RESOLVED", &user.UserID, pgSchoolID(alert.SchoolID), map[string]any{"alert_id": alertID.String()})
	response.OK(c, http.StatusOK, alertFromRow(updated))
}

func (h *Handler) updateAlertStatus(c *gin.Context, status, auditAction string) {
	alertID, ok := h.parseUUID(c, "alert_id")
	if !ok {
		return
	}
	alert, err := h.q.GetAlertByID(c.Request.Context(), alertID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "alert not found")
			return
		}
		response.Internal(c, "failed to load alert")
		return
	}
	if !h.canActOnAlert(c, alert) {
		return
	}
	updated, err := h.q.UpdateAlertStatus(c.Request.Context(), sqlc.UpdateAlertStatusParams{
		ID:     alertID,
		Status: status,
	})
	if err != nil {
		response.Internal(c, "failed to update alert")
		return
	}
	user, _ := h.user(c)
	h.auditEvent(c, auditAction, &user.UserID, pgSchoolID(alert.SchoolID), map[string]any{
		"alert_id": alertID.String(),
		"status":   status,
	})
	response.OK(c, http.StatusOK, alertFromRow(updated))
}

func (h *Handler) canActOnAlert(c *gin.Context, alert sqlc.Alert) bool {
	user, ok := h.user(c)
	if !ok {
		return false
	}
	allowed, err := h.access.CanViewAlert(c.Request.Context(), user.Role, user.UserID, alert.SchoolID)
	if err != nil {
		response.Internal(c, "access check failed")
		return false
	}
	if !allowed {
		response.Forbidden(c, "not allowed for this alert")
		return false
	}
	return true
}

func pgSchoolID(id pgtype.UUID) *uuid.UUID {
	if !id.Valid {
		return nil
	}
	u := uuid.UUID(id.Bytes)
	return &u
}
