package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type contextKey string

const userContextKey contextKey = "authUser"

// UserContext holds authenticated user claims attached to a request.
type UserContext struct {
	UserID   uuid.UUID
	DeviceID uuid.UUID
	Role     string
	Status   string
}

// SetUser stores the authenticated user on the Gin context.
func SetUser(c *gin.Context, user UserContext) {
	c.Set(string(userContextKey), user)
}

// UserFromContext returns the authenticated user or false if missing.
func UserFromContext(c *gin.Context) (UserContext, bool) {
	v, ok := c.Get(string(userContextKey))
	if !ok {
		return UserContext{}, false
	}
	user, ok := v.(UserContext)
	return user, ok
}
