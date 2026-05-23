package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type createClassroomRequest struct {
	Name     string `json:"name" validate:"required"`
	AgeGroup string `json:"age_group"`
}

type patchClassroomRequest struct {
	Name     *string `json:"name"`
	AgeGroup *string `json:"age_group"`
	Status   *string `json:"status"`
}

// CreateClassroom POST /admin/schools/:school_id/classrooms
func (h *Handler) CreateClassroom(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok || !h.requireSchoolManage(c, schoolID) {
		return
	}

	var req createClassroomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	classroom, err := h.q.CreateClassroom(c.Request.Context(), sqlc.CreateClassroomParams{
		ID:        uuid.New(),
		SchoolID:  schoolID,
		Name:      req.Name,
		AgeGroup:  database.TextFromString(req.AgeGroup),
		Status:    "ACTIVE",
	})
	if err != nil {
		response.Internal(c, "failed to create classroom")
		return
	}

	user, _ := h.user(c)
	h.auditEvent(c, "CLASSROOM_CREATED", &user.UserID, &schoolID, map[string]any{"classroom_id": classroom.ID.String()})
	response.OK(c, http.StatusCreated, adm.ClassroomFromModel(classroom))
}

// ListClassrooms GET /admin/schools/:school_id/classrooms
func (h *Handler) ListClassrooms(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok || !h.requireSchoolManage(c, schoolID) {
		return
	}

	rows, err := h.q.ListClassroomsBySchool(c.Request.Context(), schoolID)
	if err != nil {
		response.Internal(c, "failed to list classrooms")
		return
	}
	out := make([]adm.ClassroomDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, adm.ClassroomFromModel(r))
	}
	response.OK(c, http.StatusOK, out)
}

// PatchClassroom PATCH /admin/classrooms/:classroom_id
func (h *Handler) PatchClassroom(c *gin.Context) {
	classroomID, ok := h.parseUUID(c, "classroom_id")
	if !ok {
		return
	}

	classroom, err := h.q.GetClassroom(c.Request.Context(), classroomID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "classroom not found")
			return
		}
		response.Internal(c, "failed to load classroom")
		return
	}
	if !h.requireSchoolManage(c, classroom.SchoolID) {
		return
	}

	var req patchClassroomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	updated, err := h.q.UpdateClassroom(c.Request.Context(), sqlc.UpdateClassroomParams{
		ID:       classroomID,
		Name:     optionalText(req.Name),
		AgeGroup: optionalText(req.AgeGroup),
		Status:   optionalText(req.Status),
	})
	if err != nil {
		response.Internal(c, "failed to update classroom")
		return
	}

	user, _ := h.user(c)
	h.auditEvent(c, "CLASSROOM_UPDATED", &user.UserID, &classroom.SchoolID, map[string]any{"classroom_id": classroomID.String()})
	response.OK(c, http.StatusOK, adm.ClassroomFromModel(updated))
}
