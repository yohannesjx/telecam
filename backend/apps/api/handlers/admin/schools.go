package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type createSchoolRequest struct {
	Name    string `json:"name" validate:"required"`
	Address string `json:"address"`
	Phone   string `json:"phone"`
}

type patchSchoolRequest struct {
	Name    *string `json:"name"`
	Address *string `json:"address"`
	Phone   *string `json:"phone"`
	Status  *string `json:"status"`
}

// CreateSchool POST /admin/schools
func (h *Handler) CreateSchool(c *gin.Context) {
	var req createSchoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, ok := h.user(c)
	if !ok {
		return
	}

	school, err := h.q.CreateSchool(c.Request.Context(), sqlc.CreateSchoolParams{
		ID:      uuid.New(),
		Name:    req.Name,
		Address: database.TextFromString(req.Address),
		Phone:   database.TextFromString(req.Phone),
		Status:  "ACTIVE",
	})
	if err != nil {
		response.Internal(c, "failed to create school")
		return
	}

	h.auditEvent(c, "SCHOOL_CREATED", &user.UserID, &school.ID, map[string]any{"name": school.Name})
	response.OK(c, http.StatusCreated, adm.SchoolFromModel(school))
}

// ListSchools GET /admin/schools
func (h *Handler) ListSchools(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	var schools []sqlc.School
	var err error
	switch user.Role {
	case adm.RoleSuperAdmin:
		schools, err = h.q.ListSchools(c.Request.Context())
	case adm.RoleSchoolAdmin:
		schools, err = h.q.ListSchoolsForAdmin(c.Request.Context(), user.UserID)
	default:
		response.Forbidden(c, "insufficient role")
		return
	}
	if err != nil {
		response.Internal(c, "failed to list schools")
		return
	}

	out := make([]adm.SchoolDTO, 0, len(schools))
	for _, s := range schools {
		out = append(out, adm.SchoolFromModel(s))
	}
	response.OK(c, http.StatusOK, out)
}

// GetSchool GET /admin/schools/:school_id
func (h *Handler) GetSchool(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}
	if !h.requireSchoolManage(c, schoolID) {
		return
	}

	school, err := h.q.GetSchool(c.Request.Context(), schoolID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "school not found")
			return
		}
		response.Internal(c, "failed to get school")
		return
	}
	response.OK(c, http.StatusOK, adm.SchoolFromModel(school))
}

// PatchSchool PATCH /admin/schools/:school_id
func (h *Handler) PatchSchool(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}
	if !h.requireSchoolManage(c, schoolID) {
		return
	}

	var req patchSchoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	user, ok := h.user(c)
	if !ok {
		return
	}

	var school sqlc.School
	var err error
	if user.Role == adm.RoleSuperAdmin {
		school, err = h.q.UpdateSchool(c.Request.Context(), sqlc.UpdateSchoolParams{
			ID:      schoolID,
			Name:    optionalText(req.Name),
			Address: optionalText(req.Address),
			Phone:   optionalText(req.Phone),
			Status:  optionalText(req.Status),
		})
	} else {
		if req.Name != nil || req.Status != nil {
			response.Forbidden(c, "school admin may only update address and phone")
			return
		}
		school, err = h.q.UpdateSchoolLimited(c.Request.Context(), sqlc.UpdateSchoolLimitedParams{
			ID:      schoolID,
			Address: optionalText(req.Address),
			Phone:   optionalText(req.Phone),
		})
	}
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "school not found")
			return
		}
		response.Internal(c, "failed to update school")
		return
	}

	h.auditEvent(c, "SCHOOL_UPDATED", &user.UserID, &schoolID, nil)
	response.OK(c, http.StatusOK, adm.SchoolFromModel(school))
}

func optionalText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return database.TextFromString(*s)
}
