package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type assignSchoolAdminRequest struct {
	UserID string `json:"user_id" validate:"required,uuid"`
}

// AssignSchoolAdmin POST /admin/schools/:school_id/admins
func (h *Handler) AssignSchoolAdmin(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}

	var req assignSchoolAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		response.BadRequest(c, "invalid user_id")
		return
	}

	u, err := h.q.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "user not found")
			return
		}
		response.Internal(c, "failed to load user")
		return
	}
	if u.Role != adm.RoleSchoolAdmin {
		response.BadRequest(c, "user must have role SCHOOL_ADMIN")
		return
	}

	if _, err := h.q.GetSchool(c.Request.Context(), schoolID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "school not found")
			return
		}
		response.Internal(c, "failed to load school")
		return
	}

	_, err = h.q.AssignSchoolAdmin(c.Request.Context(), sqlc.AssignSchoolAdminParams{
		SchoolID: schoolID,
		UserID:   userID,
	})
	if err != nil {
		response.Internal(c, "failed to assign school admin")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "SCHOOL_ADMIN_ASSIGNED", &actor.UserID, &schoolID, map[string]any{"assigned_user_id": userID.String()})
	response.OK(c, http.StatusCreated, gin.H{
		"school_id": schoolID.String(),
		"user_id":   userID.String(),
	})
}

// ListSchoolAdmins GET /admin/schools/:school_id/admins
func (h *Handler) ListSchoolAdmins(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}

	rows, err := h.q.ListSchoolAdminsForSchool(c.Request.Context(), schoolID)
	if err != nil {
		response.Internal(c, "failed to list school admins")
		return
	}
	response.OK(c, http.StatusOK, rows)
}
