package main

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
)

// RequireSuperAppUser is a Gin middleware that validates a Super App bearer
// token by calling the Super App backend's token introspection endpoint.
// On success, the verified *superappauth.User is stored in context under
// superappauth.ContextKey. On failure, the request is aborted with 401.
func RequireSuperAppUser(client superappauth.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		const prefix = "Bearer "
		if !strings.HasPrefix(h, prefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Super App bearer token required.",
				"code":  "SUPERAPP_AUTH_REQUIRED",
			})
			return
		}
		token := strings.TrimSpace(strings.TrimPrefix(h, prefix))
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Super App bearer token required.",
				"code":  "SUPERAPP_AUTH_REQUIRED",
			})
			return
		}

		user, err := client.Introspect(c.Request.Context(), token)
		if err != nil || user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or inactive Super App token.",
				"code":  "SUPERAPP_AUTH_INVALID",
			})
			return
		}

		c.Set(superappauth.ContextKey, user)
		c.Next()
	}
}

// SuperAppUserFromContext retrieves the Super App user stored by
// RequireSuperAppUser. Returns (nil, false) if the middleware did not run.
func SuperAppUserFromContext(c *gin.Context) (*superappauth.User, bool) {
	v, ok := c.Get(superappauth.ContextKey)
	if !ok {
		return nil, false
	}
	u, ok := v.(*superappauth.User)
	return u, ok
}
