package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"github.com/school-camera-platform/school-camera-platform/internal/audit"
	"github.com/school-camera-platform/school-camera-platform/internal/auth"
)

// AuthHandler exposes authentication HTTP endpoints.
type AuthHandler struct {
	auth     *auth.Service
	limiter  *auth.RateLimiter
	audit    *audit.Logger
	validate *validator.Validate
}

// NewAuthHandler creates an auth handler.
func NewAuthHandler(svc *auth.Service, limiter *auth.RateLimiter, auditLog *audit.Logger) *AuthHandler {
	return &AuthHandler{
		auth:     svc,
		limiter:  limiter,
		audit:    auditLog,
		validate: validator.New(),
	}
}

type loginRequest struct {
	Email             string `json:"email" validate:"required,email"`
	Password          string `json:"password" validate:"required,min=6"`
	DeviceName        string `json:"device_name" validate:"required"`
	DeviceFingerprint string `json:"device_fingerprint" validate:"required"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func (h *AuthHandler) rateLimited(c *gin.Context, scope, ip, detail string) {
	if h.audit != nil {
		h.audit.Event(c.Request.Context(), audit.EventParams{
			Action:    "AUTH_RATE_LIMIT_EXCEEDED",
			IPAddress: ip,
			UserAgent: c.Request.UserAgent(),
			Metadata: map[string]any{
				"scope":  scope,
				"detail": detail,
			},
		})
	}
	c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
}

// Login handles POST /auth/login.
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if err := h.validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ip := c.ClientIP()
	if h.limiter != nil {
		ok, err := h.limiter.AllowLogin(c.Request.Context(), ip, req.Email)
		if err != nil {
			h.rateLimited(c, "login", ip, "redis_unavailable")
			return
		}
		if !ok {
			h.rateLimited(c, "login", ip, "limit_exceeded")
			return
		}
	}

	pair, user, err := h.auth.Login(c.Request.Context(), auth.LoginInput{
		Email:             req.Email,
		Password:          req.Password,
		DeviceName:        req.DeviceName,
		DeviceFingerprint: req.DeviceFingerprint,
		IPAddress:         ip,
		UserAgent:         c.Request.UserAgent(),
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"expires_in":    pair.ExpiresIn,
		"user":          user,
	})
}

// Refresh handles POST /auth/refresh.
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if err := h.validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ip := c.ClientIP()
	if h.limiter != nil {
		ok, err := h.limiter.AllowRefresh(c.Request.Context(), ip, req.RefreshToken)
		if err != nil {
			h.rateLimited(c, "refresh", ip, "redis_unavailable")
			return
		}
		if !ok {
			h.rateLimited(c, "refresh", ip, "limit_exceeded")
			return
		}
	}

	pair, err := h.auth.Refresh(c.Request.Context(), req.RefreshToken, ip, c.Request.UserAgent())
	if err != nil {
		msg := "invalid credentials"
		if strings.Contains(err.Error(), "revoked") || strings.Contains(err.Error(), "expired") {
			msg = err.Error()
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": msg})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"expires_in":    pair.ExpiresIn,
	})
}

// Logout handles POST /auth/logout.
func (h *AuthHandler) Logout(c *gin.Context) {
	user, ok := auth.UserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req logoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if err := h.validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.auth.Logout(c.Request.Context(), user.UserID, req.RefreshToken, c.ClientIP(), c.Request.UserAgent()); err != nil {
		if errors.Is(err, auth.ErrRefreshNotOwned) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

// Me handles GET /auth/me.
func (h *AuthHandler) Me(c *gin.Context) {
	user, ok := auth.UserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	profile, err := h.auth.Me(c.Request.Context(), user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": profile})
}
