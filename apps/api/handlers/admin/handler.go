package admin

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/audit"
	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/auth"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/encryption"
	"github.com/school-camera-platform/school-camera-platform/internal/monitoring"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

// Handler implements admin management APIs.
type Handler struct {
	q        *sqlc.Queries
	access   *adm.Access
	audit    *audit.Logger
	cipher   *encryption.Cipher
	cfg            *appconfig.Config
	storage        *storage.Client
	dashboardCache *monitoring.DashboardCache
	validate       *validator.Validate
	logger         *slog.Logger
}

// NewHandler creates an admin handler.
func NewHandler(
	q *sqlc.Queries,
	access *adm.Access,
	auditLog *audit.Logger,
	cipher *encryption.Cipher,
	cfg *appconfig.Config,
	s3 *storage.Client,
	rdb *redis.Client,
	logger *slog.Logger,
) *Handler {
	return &Handler{
		q:              q,
		access:         access,
		audit:          auditLog,
		cipher:         cipher,
		cfg:            cfg,
		storage:        s3,
		dashboardCache: monitoring.NewDashboardCache(rdb, cfg.DashboardCacheTTL),
		validate:       validator.New(),
		logger:         logger,
	}
}

func (h *Handler) user(c *gin.Context) (auth.UserContext, bool) {
	u, ok := auth.UserFromContext(c)
	if !ok {
		response.Unauthorized(c, "unauthorized")
	}
	return u, ok
}

func (h *Handler) parseUUID(c *gin.Context, param string) (uuid.UUID, bool) {
	raw := c.Param(param)
	id, err := uuid.Parse(raw)
	if err != nil {
		response.BadRequest(c, "invalid "+param)
		return uuid.Nil, false
	}
	return id, true
}

func (h *Handler) requireSchoolManage(c *gin.Context, schoolID uuid.UUID) bool {
	user, ok := h.user(c)
	if !ok {
		return false
	}
	allowed, err := h.access.CanManageSchool(c.Request.Context(), user.Role, user.UserID, schoolID)
	if err != nil {
		response.Internal(c, "access check failed")
		return false
	}
	if !allowed {
		response.Forbidden(c, "not allowed for this school")
		return false
	}
	return true
}

func (h *Handler) requireSchoolCameraView(c *gin.Context, schoolID uuid.UUID) bool {
	user, ok := h.user(c)
	if !ok {
		return false
	}
	allowed, err := h.access.CanViewSchoolCameras(c.Request.Context(), user.Role, user.UserID, schoolID)
	if err != nil {
		response.Internal(c, "access check failed")
		return false
	}
	if !allowed {
		response.Forbidden(c, "not allowed for this school")
		return false
	}
	return true
}

func (h *Handler) auditEvent(c *gin.Context, action string, userID *uuid.UUID, schoolID *uuid.UUID, meta map[string]any) {
	h.audit.Event(c.Request.Context(), audit.EventParams{
		Action:    action,
		UserID:    userID,
		SchoolID:  schoolID,
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata:  meta,
	})
}
