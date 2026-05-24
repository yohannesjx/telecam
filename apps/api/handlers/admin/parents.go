package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	authpkg "github.com/school-camera-platform/school-camera-platform/internal/auth"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

type createParentRequest struct {
	FullName string `json:"full_name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Phone    string `json:"phone"`
	Password string `json:"password" validate:"required,min=6"`
}

// CreateParent POST /admin/parents
func (h *Handler) CreateParent(c *gin.Context) {
	var req createParentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	hash, err := authpkg.HashPassword(req.Password, h.cfg.BcryptCost)
	if err != nil {
		response.Internal(c, "failed to hash password")
		return
	}

	user, err := h.q.CreateUser(c.Request.Context(), sqlc.CreateUserParams{
		ID:                  uuid.New(),
		FullName:            req.FullName,
		Phone:               database.TextFromString(req.Phone),
		Email:               database.TextFromString(req.Email),
		PasswordHash:        database.TextFromString(hash),
		Role:                "PARENT",
		Status:              "ACTIVE",
		ForcePasswordChange: false,
		CreatedByUserID:     pgtype.UUID{},
	})
	if err != nil {
		response.Internal(c, "failed to create parent (email may already exist)")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "PARENT_CREATED", &actor.UserID, nil, map[string]any{"parent_id": user.ID.String()})
	response.OK(c, http.StatusCreated, gin.H{
		"id":        user.ID.String(),
		"full_name": user.FullName,
		"email":     req.Email,
		"role":      user.Role,
		"status":    user.Status,
	})
}

// ListParents GET /admin/parents
func (h *Handler) ListParents(c *gin.Context) {
	rows, err := h.q.ListParents(c.Request.Context())
	if err != nil {
		response.Internal(c, "failed to list parents")
		return
	}
	out := make([]gin.H, 0, len(rows))
	for _, u := range rows {
		item := gin.H{
			"id":        u.ID.String(),
			"full_name": u.FullName,
			"role":      u.Role,
			"status":    u.Status,
		}
		if u.Email.Valid {
			item["email"] = u.Email.String
		}
		if u.Phone.Valid {
			item["phone"] = u.Phone.String
		}
		out = append(out, item)
	}
	response.OK(c, http.StatusOK, out)
}
