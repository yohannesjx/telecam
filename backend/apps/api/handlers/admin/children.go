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

type createChildRequest struct {
	FullName    string `json:"full_name" validate:"required"`
	ClassroomID string `json:"classroom_id" validate:"required,uuid"`
}

type patchChildRequest struct {
	FullName    *string `json:"full_name"`
	ClassroomID *string `json:"classroom_id"`
	Status      *string `json:"status"`
}

type assignParentRequest struct {
	ParentID     string `json:"parent_id" validate:"required,uuid"`
	Relationship string `json:"relationship"`
}

// CreateChild POST /admin/schools/:school_id/children
func (h *Handler) CreateChild(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok || !h.requireSchoolManage(c, schoolID) {
		return
	}

	var req createChildRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	classroomID, err := uuid.Parse(req.ClassroomID)
	if err != nil {
		response.BadRequest(c, "invalid classroom_id")
		return
	}
	belongs, err := h.q.ClassroomBelongsToSchool(c.Request.Context(), sqlc.ClassroomBelongsToSchoolParams{
		ID:       classroomID,
		SchoolID: schoolID,
	})
	if err != nil || !belongs {
		response.BadRequest(c, "classroom does not belong to school")
		return
	}

	child, err := h.q.CreateChild(c.Request.Context(), sqlc.CreateChildParams{
		ID:          uuid.New(),
		SchoolID:    schoolID,
		ClassroomID: database.UUIDToPgtype(classroomID),
		FullName:    req.FullName,
		Status:      "ACTIVE",
	})
	if err != nil {
		response.Internal(c, "failed to create child")
		return
	}

	user, _ := h.user(c)
	h.auditEvent(c, "CHILD_CREATED", &user.UserID, &schoolID, map[string]any{"child_id": child.ID.String()})
	response.OK(c, http.StatusCreated, adm.ChildFromModel(child))
}

// ListChildren GET /admin/schools/:school_id/children
func (h *Handler) ListChildren(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok || !h.requireSchoolManage(c, schoolID) {
		return
	}

	var classroomFilter pgtype.UUID
	if q := c.Query("classroom_id"); q != "" {
		cid, err := uuid.Parse(q)
		if err != nil {
			response.BadRequest(c, "invalid classroom_id query")
			return
		}
		classroomFilter = database.UUIDToPgtype(cid)
	}

	rows, err := h.q.ListChildrenBySchool(c.Request.Context(), sqlc.ListChildrenBySchoolParams{
		SchoolID:    schoolID,
		ClassroomID: classroomFilter,
	})
	if err != nil {
		response.Internal(c, "failed to list children")
		return
	}
	out := make([]adm.ChildDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, adm.ChildFromModel(r))
	}
	response.OK(c, http.StatusOK, out)
}

// PatchChild PATCH /admin/children/:child_id
func (h *Handler) PatchChild(c *gin.Context) {
	childID, ok := h.parseUUID(c, "child_id")
	if !ok {
		return
	}

	child, err := h.q.GetChild(c.Request.Context(), childID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "child not found")
			return
		}
		response.Internal(c, "failed to load child")
		return
	}
	if !h.requireSchoolManage(c, child.SchoolID) {
		return
	}

	var req patchChildRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	params := sqlc.UpdateChildParams{ID: childID, FullName: optionalText(req.FullName), Status: optionalText(req.Status)}
	if req.ClassroomID != nil {
		cid, err := uuid.Parse(*req.ClassroomID)
		if err != nil {
			response.BadRequest(c, "invalid classroom_id")
			return
		}
		belongs, err := h.q.ClassroomBelongsToSchool(c.Request.Context(), sqlc.ClassroomBelongsToSchoolParams{
			ID: cid, SchoolID: child.SchoolID,
		})
		if err != nil || !belongs {
			response.BadRequest(c, "classroom does not belong to school")
			return
		}
		params.ClassroomID = database.UUIDToPgtype(cid)
	}

	updated, err := h.q.UpdateChild(c.Request.Context(), params)
	if err != nil {
		response.Internal(c, "failed to update child")
		return
	}

	user, _ := h.user(c)
	h.auditEvent(c, "CHILD_UPDATED", &user.UserID, &child.SchoolID, map[string]any{"child_id": childID.String()})
	response.OK(c, http.StatusOK, adm.ChildFromModel(updated))
}

// AssignParent POST /admin/children/:child_id/parents
func (h *Handler) AssignParent(c *gin.Context) {
	childID, ok := h.parseUUID(c, "child_id")
	if !ok {
		return
	}

	child, err := h.q.GetChild(c.Request.Context(), childID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "child not found")
			return
		}
		response.Internal(c, "failed to load child")
		return
	}
	if !h.requireSchoolManage(c, child.SchoolID) {
		return
	}

	var req assignParentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	parentID, err := uuid.Parse(req.ParentID)
	if err != nil {
		response.BadRequest(c, "invalid parent_id")
		return
	}

	parent, err := h.q.GetUserByID(c.Request.Context(), parentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "parent not found")
			return
		}
		response.Internal(c, "failed to load parent")
		return
	}
	if parent.Role != adm.RoleParent {
		response.BadRequest(c, "user must have role PARENT")
		return
	}

	link, err := h.q.AssignParentToChild(c.Request.Context(), sqlc.AssignParentToChildParams{
		ParentID:     parentID,
		ChildID:      childID,
		Relationship: database.TextFromString(req.Relationship),
	})
	if err != nil {
		response.Internal(c, "failed to assign parent")
		return
	}

	user, _ := h.user(c)
	h.auditEvent(c, "PARENT_ASSIGNED_TO_CHILD", &user.UserID, &child.SchoolID, map[string]any{
		"child_id":  childID.String(),
		"parent_id": parentID.String(),
	})
	response.OK(c, http.StatusCreated, link)
}

// ListChildParents GET /admin/children/:child_id/parents
func (h *Handler) ListChildParents(c *gin.Context) {
	childID, ok := h.parseUUID(c, "child_id")
	if !ok {
		return
	}

	child, err := h.q.GetChild(c.Request.Context(), childID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "child not found")
			return
		}
		response.Internal(c, "failed to load child")
		return
	}
	if !h.requireSchoolManage(c, child.SchoolID) {
		return
	}

	rows, err := h.q.ListParentsForChild(c.Request.Context(), childID)
	if err != nil {
		response.Internal(c, "failed to list parents")
		return
	}
	response.OK(c, http.StatusOK, rows)
}
