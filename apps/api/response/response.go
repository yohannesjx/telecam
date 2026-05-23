// Package response provides consistent JSON envelopes for the API.
package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// OK writes a success payload.
func OK(c *gin.Context, status int, data any) {
	c.JSON(status, gin.H{"data": data})
}

// Error writes an error payload.
func Error(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

// BadRequest is a 400 helper.
func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, message)
}

// Unauthorized is a 401 helper.
func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, message)
}

// Forbidden is a 403 helper.
func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, message)
}

// TooManyRequests is a 429 helper.
func TooManyRequests(c *gin.Context, message string) {
	Error(c, http.StatusTooManyRequests, message)
}

// NotFound is a 404 helper.
func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, message)
}

// Internal is a 500 helper.
func Internal(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, message)
}
