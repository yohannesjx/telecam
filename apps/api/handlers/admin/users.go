package admin

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	authpkg "github.com/school-camera-platform/school-camera-platform/internal/auth"
	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

var managedRoles = map[string]struct{}{
	adm.RoleSuperAdmin:  {},
	adm.RoleSchoolAdmin: {},
	adm.RoleTechnician:  {},
}

var validStatuses = map[string]struct{}{
	"ACTIVE":   {},
	"BLOCKED":  {},
	"DISABLED": {},
}

type createUserRequest struct {
	Name                string   `json:"name" validate:"required"`
	FullName            string   `json:"full_name"`
	Email               string   `json:"email" validate:"required,email"`
	Phone               string   `json:"phone"`
	Role                string   `json:"role" validate:"required"`
	Status              string   `json:"status"`
	TemporaryPassword   string   `json:"temporary_password" validate:"required,min=8"`
	ForcePasswordChange *bool    `json:"force_password_change"`
	SchoolIDs           []string `json:"school_ids"`
}

type patchUserRequest struct {
	Name     string `json:"name"`
	FullName string `json:"full_name"`
	Email    string `json:"email" validate:"omitempty,email"`
	Phone    string `json:"phone"`
}

type patchUserStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

type patchUserRoleRequest struct {
	Role string `json:"role" validate:"required"`
}

type resetPasswordRequest struct {
	TemporaryPassword string `json:"temporary_password"`
	Generate          bool   `json:"generate"`
	ForceChange       *bool  `json:"force_change"`
}

type forcePasswordChangeRequest struct {
	Force bool `json:"force"`
}

type assignSchoolsRequest struct {
	SchoolIDs []string `json:"school_ids" validate:"required"`
}

func (h *Handler) userSchoolIDs(c *gin.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	return h.q.ListSchoolIDsForUser(c.Request.Context(), userID)
}

func userToJSON(u sqlc.User, schoolIDs []uuid.UUID) gin.H {
	item := gin.H{
		"id":                    u.ID.String(),
		"full_name":             u.FullName,
		"name":                    u.FullName,
		"role":                    u.Role,
		"status":                  u.Status,
		"force_password_change":   u.ForcePasswordChange,
	}
	if u.Email.Valid {
		item["email"] = u.Email.String
	}
	if u.Phone.Valid {
		item["phone"] = u.Phone.String
	}
	if u.PasswordChangedAt.Valid {
		item["password_changed_at"] = u.PasswordChangedAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	if u.LastLoginAt.Valid {
		item["last_login_at"] = u.LastLoginAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	if u.CreatedAt.Valid {
		item["created_at"] = u.CreatedAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	if u.UpdatedAt.Valid {
		item["updated_at"] = u.UpdatedAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	if schoolIDs != nil {
		ids := make([]string, 0, len(schoolIDs))
		for _, id := range schoolIDs {
			ids = append(ids, id.String())
		}
		item["school_ids"] = ids
	}
	return item
}

func (h *Handler) loadManagedUser(c *gin.Context, userID uuid.UUID) (sqlc.User, bool) {
	u, err := h.q.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "user not found")
			return sqlc.User{}, false
		}
		response.Internal(c, "failed to load user")
		return sqlc.User{}, false
	}
	if _, ok := managedRoles[u.Role]; !ok {
		response.NotFound(c, "user not found")
		return sqlc.User{}, false
	}
	return u, true
}

func parseSchoolIDs(raw []string) ([]uuid.UUID, error) {
	out := make([]uuid.UUID, 0, len(raw))
	for _, s := range raw {
		id, err := uuid.Parse(strings.TrimSpace(s))
		if err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, nil
}

// ListUsers GET /admin/users
func (h *Handler) ListUsers(c *gin.Context) {
	rows, err := h.q.ListManagedUsers(c.Request.Context())
	if err != nil {
		response.Internal(c, "failed to list users")
		return
	}

	roleFilter := strings.TrimSpace(c.Query("role"))
	statusFilter := strings.TrimSpace(c.Query("status"))
	schoolFilter := strings.TrimSpace(c.Query("school_id"))
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))

	out := make([]gin.H, 0, len(rows))
	for _, u := range rows {
		if roleFilter != "" && u.Role != roleFilter {
			continue
		}
		if statusFilter != "" && u.Status != statusFilter {
			continue
		}
		schoolIDs, err := h.userSchoolIDs(c, u.ID)
		if err != nil {
			response.Internal(c, "failed to load school assignments")
			return
		}
		if schoolFilter != "" {
			sid, err := uuid.Parse(schoolFilter)
			if err != nil {
				response.BadRequest(c, "invalid school_id filter")
				return
			}
			found := false
			for _, id := range schoolIDs {
				if id == sid {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		if search != "" {
			email := ""
			if u.Email.Valid {
				email = u.Email.String
			}
			phone := ""
			if u.Phone.Valid {
				phone = u.Phone.String
			}
			hay := strings.ToLower(u.FullName + " " + email + " " + phone)
			if !strings.Contains(hay, search) {
				continue
			}
		}
		out = append(out, userToJSON(u, schoolIDs))
	}
	response.OK(c, http.StatusOK, out)
}

// GetUser GET /admin/users/:id
func (h *Handler) GetUser(c *gin.Context) {
	userID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	u, ok := h.loadManagedUser(c, userID)
	if !ok {
		return
	}
	schoolIDs, err := h.userSchoolIDs(c, u.ID)
	if err != nil {
		response.Internal(c, "failed to load school assignments")
		return
	}
	response.OK(c, http.StatusOK, userToJSON(u, schoolIDs))
}

// CreateUser POST /admin/users
func (h *Handler) CreateUser(c *gin.Context) {
	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if req.FullName == "" {
		req.FullName = req.Name
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if _, ok := managedRoles[req.Role]; !ok {
		response.BadRequest(c, "invalid role for user management")
		return
	}
	status := req.Status
	if status == "" {
		status = "ACTIVE"
	}
	if _, ok := validStatuses[status]; !ok {
		response.BadRequest(c, "invalid status")
		return
	}
	forceChange := true
	if req.ForcePasswordChange != nil {
		forceChange = *req.ForcePasswordChange
	}

	schoolIDs, err := parseSchoolIDs(req.SchoolIDs)
	if err != nil {
		response.BadRequest(c, "invalid school_ids")
		return
	}
	if req.Role == adm.RoleSchoolAdmin && len(schoolIDs) == 0 {
		response.BadRequest(c, "school_ids required for SCHOOL_ADMIN")
		return
	}

	hash, err := authpkg.HashPassword(req.TemporaryPassword, h.cfg.BcryptCost)
	if err != nil {
		response.Internal(c, "failed to hash password")
		return
	}

	actor, ok := h.user(c)
	if !ok {
		return
	}

	user, err := h.q.CreateUser(c.Request.Context(), sqlc.CreateUserParams{
		ID:                  uuid.New(),
		FullName:            req.FullName,
		Phone:               database.TextFromString(req.Phone),
		Email:               database.TextFromString(req.Email),
		PasswordHash:        database.TextFromString(hash),
		Role:                req.Role,
		Status:              status,
		ForcePasswordChange: forceChange,
		CreatedByUserID:     database.OptionalUUIDToPgtype(&actor.UserID),
	})
	if err != nil {
		response.Internal(c, "failed to create user (email may already exist)")
		return
	}

	for _, sid := range schoolIDs {
		if _, err := h.q.GetSchool(c.Request.Context(), sid); err != nil {
			response.BadRequest(c, "school not found")
			return
		}
		if _, err := h.q.AssignSchoolAdmin(c.Request.Context(), sqlc.AssignSchoolAdminParams{
			SchoolID: sid,
			UserID:   user.ID,
		}); err != nil {
			response.Internal(c, "failed to assign school admin")
			return
		}
	}

	h.auditEvent(c, "ADMIN_USER_CREATED", &actor.UserID, nil, map[string]any{
		"target_user_id": user.ID.String(),
		"role":           user.Role,
	})
	response.OK(c, http.StatusCreated, userToJSON(user, schoolIDs))
}

// PatchUser PATCH /admin/users/:id
func (h *Handler) PatchUser(c *gin.Context) {
	userID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	u, ok := h.loadManagedUser(c, userID)
	if !ok {
		return
	}

	var req patchUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	fullName := u.FullName
	if req.FullName != "" {
		fullName = req.FullName
	} else if req.Name != "" {
		fullName = req.Name
	}
	email := u.Email
	if req.Email != "" {
		email = database.TextFromString(req.Email)
	}
	phone := u.Phone
	if req.Phone != "" {
		phone = database.TextFromString(req.Phone)
	}

	updated, err := h.q.UpdateUserProfile(c.Request.Context(), sqlc.UpdateUserProfileParams{
		ID:       userID,
		FullName: fullName,
		Email:    email,
		Phone:    phone,
	})
	if err != nil {
		response.Internal(c, "failed to update user")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "ADMIN_USER_UPDATED", &actor.UserID, nil, map[string]any{
		"target_user_id": userID.String(),
	})
	schoolIDs, _ := h.userSchoolIDs(c, updated.ID)
	response.OK(c, http.StatusOK, userToJSON(updated, schoolIDs))
}

// PatchUserStatus PATCH /admin/users/:id/status
func (h *Handler) PatchUserStatus(c *gin.Context) {
	userID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	_, ok = h.loadManagedUser(c, userID)
	if !ok {
		return
	}

	var req patchUserStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if _, ok := validStatuses[req.Status]; !ok {
		response.BadRequest(c, "invalid status")
		return
	}

	actor, ok := h.user(c)
	if !ok {
		return
	}
	if actor.UserID == userID {
		response.Forbidden(c, "cannot change your own account status")
		return
	}

	updated, err := h.q.UpdateUserStatus(c.Request.Context(), sqlc.UpdateUserStatusParams{
		ID:     userID,
		Status: req.Status,
	})
	if err != nil {
		response.Internal(c, "failed to update status")
		return
	}

	if req.Status != "ACTIVE" {
		_ = h.q.RevokeAllUserRefreshTokens(c.Request.Context(), userID)
	}

	h.auditEvent(c, "ADMIN_USER_STATUS_CHANGED", &actor.UserID, nil, map[string]any{
		"target_user_id": userID.String(),
		"status":         req.Status,
	})
	schoolIDs, _ := h.userSchoolIDs(c, updated.ID)
	response.OK(c, http.StatusOK, userToJSON(updated, schoolIDs))
}

// PatchUserRole PATCH /admin/users/:id/role
func (h *Handler) PatchUserRole(c *gin.Context) {
	userID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	u, ok := h.loadManagedUser(c, userID)
	if !ok {
		return
	}

	var req patchUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if _, ok := managedRoles[req.Role]; !ok {
		response.BadRequest(c, "invalid role")
		return
	}

	actor, ok := h.user(c)
	if !ok {
		return
	}
	if actor.UserID == userID && u.Role == adm.RoleSuperAdmin && req.Role != adm.RoleSuperAdmin {
		response.Forbidden(c, "cannot remove your own SUPER_ADMIN role")
		return
	}

	updated, err := h.q.UpdateUserRole(c.Request.Context(), sqlc.UpdateUserRoleParams{
		ID:   userID,
		Role: req.Role,
	})
	if err != nil {
		response.Internal(c, "failed to update role")
		return
	}

	h.auditEvent(c, "ADMIN_USER_ROLE_CHANGED", &actor.UserID, nil, map[string]any{
		"target_user_id": userID.String(),
		"role":           req.Role,
	})
	schoolIDs, _ := h.userSchoolIDs(c, updated.ID)
	response.OK(c, http.StatusOK, userToJSON(updated, schoolIDs))
}

// ResetUserPassword POST /admin/users/:id/reset-password
func (h *Handler) ResetUserPassword(c *gin.Context) {
	userID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	if _, ok := h.loadManagedUser(c, userID); !ok {
		return
	}

	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	temp := strings.TrimSpace(req.TemporaryPassword)
	if req.Generate {
		generated, err := authpkg.GenerateTemporaryPassword(12)
		if err != nil {
			response.Internal(c, "failed to generate password")
			return
		}
		temp = generated
	}
	if temp == "" {
		response.BadRequest(c, "temporary_password or generate=true required")
		return
	}
	if len(temp) < 8 {
		response.BadRequest(c, "password must be at least 8 characters")
		return
	}

	forceChange := true
	if req.ForceChange != nil {
		forceChange = *req.ForceChange
	}

	hash, err := authpkg.HashPassword(temp, h.cfg.BcryptCost)
	if err != nil {
		response.Internal(c, "failed to hash password")
		return
	}

	if _, err := h.q.UpdateUserPasswordFull(c.Request.Context(), sqlc.UpdateUserPasswordFullParams{
		ID:                  userID,
		PasswordHash:        database.TextFromString(hash),
		ForcePasswordChange: forceChange,
	}); err != nil {
		response.Internal(c, "failed to reset password")
		return
	}
	_ = h.q.RevokeAllUserRefreshTokens(c.Request.Context(), userID)

	actor, _ := h.user(c)
	h.auditEvent(c, "ADMIN_USER_PASSWORD_RESET", &actor.UserID, nil, map[string]any{
		"target_user_id": userID.String(),
	})

	response.OK(c, http.StatusOK, gin.H{
		"temporary_password": temp,
	})
}

// ForceUserPasswordChange POST /admin/users/:id/force-password-change
func (h *Handler) ForceUserPasswordChange(c *gin.Context) {
	userID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	if _, ok := h.loadManagedUser(c, userID); !ok {
		return
	}

	var req forcePasswordChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	updated, err := h.q.SetUserForcePasswordChange(c.Request.Context(), sqlc.SetUserForcePasswordChangeParams{
		ID:                  userID,
		ForcePasswordChange: req.Force,
	})
	if err != nil {
		response.Internal(c, "failed to update force password change")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "ADMIN_USER_FORCE_PASSWORD_CHANGE_SET", &actor.UserID, nil, map[string]any{
		"target_user_id":        userID.String(),
		"force_password_change": req.Force,
	})
	schoolIDs, _ := h.userSchoolIDs(c, updated.ID)
	response.OK(c, http.StatusOK, userToJSON(updated, schoolIDs))
}

// AssignUserSchools PUT /admin/users/:id/schools
func (h *Handler) AssignUserSchools(c *gin.Context) {
	userID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	u, ok := h.loadManagedUser(c, userID)
	if !ok {
		return
	}
	if u.Role != adm.RoleSchoolAdmin {
		response.BadRequest(c, "school assignment only applies to SCHOOL_ADMIN users")
		return
	}

	var req assignSchoolsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	schoolIDs, err := parseSchoolIDs(req.SchoolIDs)
	if err != nil || len(schoolIDs) == 0 {
		response.BadRequest(c, "school_ids required")
		return
	}

	current, _ := h.userSchoolIDs(c, userID)
	currentSet := make(map[uuid.UUID]struct{}, len(current))
	for _, id := range current {
		currentSet[id] = struct{}{}
	}
	newSet := make(map[uuid.UUID]struct{}, len(schoolIDs))
	for _, id := range schoolIDs {
		newSet[id] = struct{}{}
		if _, err := h.q.GetSchool(c.Request.Context(), id); err != nil {
			response.BadRequest(c, "school not found")
			return
		}
		if _, exists := currentSet[id]; !exists {
			if _, err := h.q.AssignSchoolAdmin(c.Request.Context(), sqlc.AssignSchoolAdminParams{
				SchoolID: id,
				UserID:   userID,
			}); err != nil {
				response.Internal(c, "failed to assign school")
				return
			}
		}
	}
	for _, id := range current {
		if _, keep := newSet[id]; !keep {
			_ = h.q.RemoveSchoolAdmin(c.Request.Context(), sqlc.RemoveSchoolAdminParams{
				SchoolID: id,
				UserID:   userID,
			})
		}
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "ADMIN_USER_UPDATED", &actor.UserID, nil, map[string]any{
		"target_user_id": userID.String(),
		"schools_updated": true,
	})
	updatedSchools, _ := h.userSchoolIDs(c, userID)
	updated, _ := h.q.GetUserByID(c.Request.Context(), userID)
	response.OK(c, http.StatusOK, userToJSON(updated, updatedSchools))
}
