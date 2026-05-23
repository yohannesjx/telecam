package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/school-camera-platform/school-camera-platform/internal/auth"
)

// ProtectedHandler exposes role-gated test routes.
type ProtectedHandler struct{}

// NewProtectedHandler creates a protected routes handler.
func NewProtectedHandler() *ProtectedHandler {
	return &ProtectedHandler{}
}

// AdminTest handles GET /admin/protected-test (SUPER_ADMIN only).
func (h *ProtectedHandler) AdminTest(c *gin.Context) {
	user, _ := auth.UserFromContext(c)
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "super admin access granted",
		"role":    user.Role,
	})
}

// ParentTest handles GET /parent/protected-test (PARENT only).
func (h *ProtectedHandler) ParentTest(c *gin.Context) {
	user, _ := auth.UserFromContext(c)
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "parent access granted",
		"role":    user.Role,
	})
}
