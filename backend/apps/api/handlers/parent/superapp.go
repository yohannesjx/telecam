package parent

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

// SuperAppStatus handles GET /parent/superapp/status.
//
// Returns whether the calling Super App user is linked to a School parent account.
// If linked, includes parent_id, school_id, and parent_name from the link record.
func (h *Handler) SuperAppStatus(c *gin.Context) {
	v, ok := c.Get(superappauth.ContextKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "super app user not in context"})
		return
	}
	superAppUser, ok := v.(*superappauth.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unexpected context value type"})
		return
	}

	link, err := h.q.GetActiveParentSuperAppLinkBySuperAppUser(c.Request.Context(), superAppUser.UserID)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusOK, gin.H{
			"linked":            false,
			"super_app_user_id": superAppUser.UserID,
		})
		return
	}
	if err != nil {
		response.Internal(c, "failed to query link status")
		return
	}

	parentName := ""
	parent, err := h.q.GetUserByID(c.Request.Context(), link.ParentID)
	if err == nil {
		parentName = parent.FullName
	}

	c.JSON(http.StatusOK, gin.H{
		"linked":            true,
		"super_app_user_id": superAppUser.UserID,
		"link_id":           link.ID.String(),
		"parent_id":         link.ParentID.String(),
		"school_id":         link.SchoolID.String(),
		"parent_name":       parentName,
		"status":            link.Status,
	})
}
