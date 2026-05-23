package admin

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type billingScope struct {
	SchoolIDs    []uuid.UUID
	FilterSchool pgtype.UUID
	FilterParent pgtype.UUID
}

func (h *Handler) resolveBillingScope(c *gin.Context) (billingScope, bool) {
	user, ok := h.user(c)
	if !ok {
		return billingScope{}, false
	}

	schoolIDs, err := h.access.SchoolIDsForUser(c.Request.Context(), user.Role, user.UserID)
	if err != nil {
		response.Internal(c, "failed to resolve school scope")
		return billingScope{}, false
	}

	scope := billingScope{SchoolIDs: schoolIDs}
	if schoolIDStr := c.Query("school_id"); schoolIDStr != "" {
		sid, err := uuid.Parse(schoolIDStr)
		if err != nil {
			response.BadRequest(c, "invalid school_id")
			return billingScope{}, false
		}
		if len(schoolIDs) > 0 && !containsUUID(schoolIDs, sid) {
			response.Forbidden(c, "not allowed for this school")
			return billingScope{}, false
		}
		scope.FilterSchool = database.UUIDToPgtype(sid)
	}
	if parentIDStr := c.Query("parent_id"); parentIDStr != "" {
		pid, err := uuid.Parse(parentIDStr)
		if err != nil {
			response.BadRequest(c, "invalid parent_id")
			return billingScope{}, false
		}
		scope.FilterParent = database.UUIDToPgtype(pid)
	}
	return scope, true
}

func containsUUID(ids []uuid.UUID, id uuid.UUID) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func scopeSchoolIDs(scope billingScope) []uuid.UUID {
	if scope.FilterSchool.Valid {
		return nil
	}
	return scope.SchoolIDs
}
