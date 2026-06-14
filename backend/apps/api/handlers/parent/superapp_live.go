package parent

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
	"github.com/school-camera-platform/school-camera-platform/internal/playback"
	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
)

// SuperAppLive handles GET /parent/superapp/cameras/:camera_id/live.
//
// Auth: Super App bearer token (validated by RequireSuperAppUser middleware).
// Additional requirement: caller must have an active parent_superapp_links record.
//
// Returns a signed live HLS URL. The signed URL is included in the response
// body only — it is never written to any server log.
func (h *Handler) SuperAppLive(c *gin.Context) {
	v, ok := c.Get(superappauth.ContextKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "SUPERAPP_AUTH_REQUIRED", "message": "Super App authentication required"}})
		return
	}
	superAppUser, ok := v.(*superappauth.User)
	if !ok {
		response.Internal(c, "unexpected context value type")
		return
	}

	cameraID, ok := h.parseCameraID(c)
	if !ok {
		return
	}

	if h.playback == nil {
		response.Internal(c, "playback service unavailable")
		return
	}

	// Resolve the parent link — gives us the School parentID and schoolID.
	link, err := h.q.GetActiveParentSuperAppLinkBySuperAppUser(c.Request.Context(), superAppUser.UserID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "PARENT_LINK_REQUIRED", "message": "Link your school parent account before accessing live video"}})
		return
	}

	result, err := h.playback.LiveForSuperAppParent(
		c.Request.Context(),
		superAppUser.UserID,
		link.ParentID,
		link.SchoolID,
		cameraID,
		c.Query("quality"),
	)
	if err != nil {
		if playback.IsSubscriptionRequired(err) {
			c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "SUBSCRIPTION_REQUIRED", "message": "An active subscription is required to watch live video"}})
			return
		}
		h.handlePlaybackError(c, err)
		return
	}

	response.OK(c, http.StatusOK, result)
}
