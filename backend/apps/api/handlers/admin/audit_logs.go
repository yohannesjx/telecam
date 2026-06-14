package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/monitoring"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type auditLogDTO struct {
	ID          string         `json:"id"`
	UserID      *string        `json:"user_id,omitempty"`
	UserName    string         `json:"user_name,omitempty"`
	SchoolID    *string        `json:"school_id,omitempty"`
	SchoolName  string         `json:"school_name,omitempty"`
	ClassroomID *string        `json:"classroom_id,omitempty"`
	CameraID    *string        `json:"camera_id,omitempty"`
	ChildID     *string        `json:"child_id,omitempty"`
	DeviceID    *string        `json:"device_id,omitempty"`
	Action      string         `json:"action"`
	IPAddress   string         `json:"ip_address,omitempty"`
	UserAgent   string         `json:"user_agent,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	CreatedAt   string         `json:"created_at"`
}

type paginationDTO struct {
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
	Total  int64 `json:"total"`
}

// ListAuditLogs GET /admin/audit-logs
func (h *Handler) ListAuditLogs(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}
	if user.Role != adm.RoleSuperAdmin && user.Role != adm.RoleSchoolAdmin {
		response.Forbidden(c, "insufficient role")
		return
	}

	schoolIDs, ok := h.monitoringSchoolIDs(c)
	if !ok {
		return
	}

	limit, offset := h.parsePagination(c)
	dateFrom, dateTo, ok := h.parseDateRange(c)
	if !ok {
		return
	}

	params := sqlc.ListAuditLogsFilteredParams{
		SchoolIds: schoolIDs,
		DateFrom:  dateFrom,
		DateTo:    dateTo,
		RowLimit:  limit,
		RowOffset: offset,
	}
	countParams := sqlc.CountAuditLogsFilteredParams{
		SchoolIds: schoolIDs,
		DateFrom:  dateFrom,
		DateTo:    dateTo,
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
		params.SchoolID = database.UUIDToPgtype(sid)
		countParams.SchoolID = params.SchoolID
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		uid, err := uuid.Parse(userIDStr)
		if err != nil {
			response.BadRequest(c, "invalid user_id")
			return
		}
		params.UserID = database.UUIDToPgtype(uid)
		countParams.UserID = params.UserID
	}
	if cameraIDStr := c.Query("camera_id"); cameraIDStr != "" {
		cid, err := uuid.Parse(cameraIDStr)
		if err != nil {
			response.BadRequest(c, "invalid camera_id")
			return
		}
		params.CameraID = database.UUIDToPgtype(cid)
		countParams.CameraID = params.CameraID
	}
	if action := c.Query("action"); action != "" {
		params.Action = pgtype.Text{String: action, Valid: true}
		countParams.Action = params.Action
	}

	ctx := c.Request.Context()
	total, err := h.q.CountAuditLogsFiltered(ctx, countParams)
	if err != nil {
		response.Internal(c, "failed to count audit logs")
		return
	}

	rows, err := h.q.ListAuditLogsFiltered(ctx, params)
	if err != nil {
		response.Internal(c, "failed to list audit logs")
		return
	}

	out := make([]auditLogDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, auditLogFromRow(r))
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

func auditLogFromRow(r sqlc.ListAuditLogsFilteredRow) auditLogDTO {
	dto := auditLogDTO{
		ID:        r.ID.String(),
		Action:    r.Action,
		CreatedAt: r.CreatedAt.Time.UTC().Format(timeRFC3339),
		Metadata:  monitoring.SanitizeMetadata(r.Metadata),
	}
	if r.UserID.Valid {
		s := uuid.UUID(r.UserID.Bytes).String()
		dto.UserID = &s
	}
	if r.UserName.Valid {
		dto.UserName = r.UserName.String
	}
	if r.SchoolID.Valid {
		s := uuid.UUID(r.SchoolID.Bytes).String()
		dto.SchoolID = &s
	}
	if r.SchoolName.Valid {
		dto.SchoolName = r.SchoolName.String
	}
	if r.ClassroomID.Valid {
		s := uuid.UUID(r.ClassroomID.Bytes).String()
		dto.ClassroomID = &s
	}
	if r.CameraID.Valid {
		s := uuid.UUID(r.CameraID.Bytes).String()
		dto.CameraID = &s
	}
	if r.ChildID.Valid {
		s := uuid.UUID(r.ChildID.Bytes).String()
		dto.ChildID = &s
	}
	if r.DeviceID.Valid {
		s := uuid.UUID(r.DeviceID.Bytes).String()
		dto.DeviceID = &s
	}
	if r.IpAddress.Valid {
		dto.IPAddress = r.IpAddress.String
	}
	if r.UserAgent.Valid {
		dto.UserAgent = r.UserAgent.String
	}
	return dto
}
