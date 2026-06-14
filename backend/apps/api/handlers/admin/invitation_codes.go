package admin

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/invitecodes"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

// GenerateParentInvitationCode handles POST /admin/parents/:parent_id/invitation-code.
//
// Security guarantees:
//   - Raw code returned once in response only; never stored.
//   - Code hash (HMAC-SHA256) stored in DB.
//   - Any previous active codes for this parent+school are revoked first.
//   - PARENT_CODE_HMAC_SECRET must be set; production-mode failure if empty.
func (h *Handler) GenerateParentInvitationCode(c *gin.Context) {
	actor, ok := h.user(c)
	if !ok {
		return
	}

	parentID, ok := h.parseUUID(c, "parent_id")
	if !ok {
		return
	}

	// Require school_id in the body because a parent can belong to multiple schools.
	var req struct {
		SchoolID string `json:"school_id" validate:"required,uuid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, "school_id is required")
		return
	}
	schoolID, err := uuid.Parse(req.SchoolID)
	if err != nil {
		response.BadRequest(c, "invalid school_id")
		return
	}

	// RBAC: SUPER_ADMIN can manage any school; SCHOOL_ADMIN only their own.
	if actor.Role != adm.RoleSuperAdmin {
		if actor.Role != adm.RoleSchoolAdmin {
			response.Forbidden(c, "only admins can generate parent invitation codes")
			return
		}
		allowed, err := h.access.CanManageSchool(c.Request.Context(), actor.Role, actor.UserID, schoolID)
		if err != nil {
			response.Internal(c, "access check failed")
			return
		}
		if !allowed {
			response.Forbidden(c, "you do not manage this school")
			return
		}
	}

	// Verify the target user exists and is a PARENT.
	parent, err := h.q.GetUserByID(c.Request.Context(), parentID)
	if errors.Is(err, pgx.ErrNoRows) {
		response.NotFound(c, "parent not found")
		return
	}
	if err != nil {
		response.Internal(c, "failed to fetch parent")
		return
	}
	if parent.Role != adm.RoleParent {
		response.BadRequest(c, "user is not a parent")
		return
	}

	// Reject if HMAC secret is missing (fail closed in production; clear error everywhere).
	if h.cfg.ParentCodeHMACSecret == "" {
		if h.cfg.IsProduction() {
			response.Internal(c, "parent code signing not configured")
			return
		}
		// In development, log a loud warning and use a deterministic dev secret so
		// developers can test without configuring PARENT_CODE_HMAC_SECRET.
		h.logger.Warn("PARENT_CODE_HMAC_SECRET is not set — using insecure dev fallback. Set it before going to production.")
	}
	secret := h.cfg.ParentCodeHMACSecret
	if secret == "" {
		secret = "dev-parent-code-hmac-do-not-use-in-production"
	}

	// Revoke any existing active codes for this parent+school before issuing a new one.
	if err := h.q.RevokeActiveParentInvitationCodesForParent(c.Request.Context(),
		sqlc.RevokeActiveParentInvitationCodesForParentParams{
			ParentID: parentID,
			SchoolID: schoolID,
		}); err != nil {
		response.Internal(c, "failed to revoke existing codes")
		return
	}

	rawCode, codePrefix, err := invitecodes.Generate()
	if err != nil {
		response.Internal(c, "failed to generate code")
		return
	}
	codeHash := invitecodes.Hash(rawCode, secret)
	expiresAt := time.Now().UTC().Add(invitecodes.Expiry)

	code, err := h.q.CreateParentInvitationCode(c.Request.Context(), sqlc.CreateParentInvitationCodeParams{
		ID:         uuid.New(),
		ParentID:   parentID,
		SchoolID:   schoolID,
		CodeHash:   codeHash,
		CodePrefix: codePrefix,
		ExpiresAt:  database.TimestamptzFromTime(expiresAt),
		CreatedBy:  database.UUIDToPgtype(actor.UserID),
	})
	if err != nil {
		response.Internal(c, "failed to store invitation code")
		return
	}

	h.auditEvent(c, "PARENT_INVITATION_CODE_GENERATED", &actor.UserID, &schoolID, map[string]any{
		"parent_id": parentID.String(),
		"code_id":   code.ID.String(),
	})

	response.OK(c, http.StatusCreated, gin.H{
		"code_id":     code.ID.String(),
		"parent_id":   code.ParentID.String(),
		"school_id":   code.SchoolID.String(),
		"parent_code": rawCode,
		"code_prefix": code.CodePrefix,
		"expires_at":  expiresAt.Format(time.RFC3339),
	})
}

// ListParentInvitationCodes handles GET /admin/parents/:parent_id/invitation-codes.
// Returns metadata only — never the raw code or hash.
func (h *Handler) ListParentInvitationCodes(c *gin.Context) {
	actor, ok := h.user(c)
	if !ok {
		return
	}

	parentID, ok := h.parseUUID(c, "parent_id")
	if !ok {
		return
	}

	// Verify the parent exists.
	parent, err := h.q.GetUserByID(c.Request.Context(), parentID)
	if errors.Is(err, pgx.ErrNoRows) {
		response.NotFound(c, "parent not found")
		return
	}
	if err != nil {
		response.Internal(c, "failed to fetch parent")
		return
	}
	if parent.Role != adm.RoleParent {
		response.BadRequest(c, "user is not a parent")
		return
	}

	// SCHOOL_ADMIN scope check: they can only list codes for parents whose
	// school they manage. SUPER_ADMIN has unrestricted access.
	if actor.Role == adm.RoleSchoolAdmin {
		schoolIDs, err := h.q.ListSchoolIDsForUser(c.Request.Context(), actor.UserID)
		if err != nil {
			response.Internal(c, "failed to resolve admin schools")
			return
		}
		// Fetch codes and filter by the admin's schools.
		codes, err := h.q.ListParentInvitationCodesByParent(c.Request.Context(), parentID)
		if err != nil {
			response.Internal(c, "failed to list codes")
			return
		}
		adminSchools := make(map[uuid.UUID]bool, len(schoolIDs))
		for _, id := range schoolIDs {
			adminSchools[id] = true
		}
		out := invitationCodeDTOs(filterCodesBySchools(codes, adminSchools))
		response.OK(c, http.StatusOK, gin.H{"codes": out})
		return
	}

	codes, err := h.q.ListParentInvitationCodesByParent(c.Request.Context(), parentID)
	if err != nil {
		response.Internal(c, "failed to list codes")
		return
	}
	response.OK(c, http.StatusOK, gin.H{"codes": invitationCodeDTOs(codes)})
}

// RevokeAdminParentInvitationCode handles POST /admin/parents/:parent_id/invitation-codes/:code_id/revoke.
func (h *Handler) RevokeAdminParentInvitationCode(c *gin.Context) {
	actor, ok := h.user(c)
	if !ok {
		return
	}

	parentID, ok := h.parseUUID(c, "parent_id")
	if !ok {
		return
	}
	codeID, ok := h.parseUUID(c, "code_id")
	if !ok {
		return
	}

	// Fetch code and verify it belongs to the given parent.
	code, err := h.q.GetParentInvitationCodeByID(c.Request.Context(), codeID)
	if errors.Is(err, pgx.ErrNoRows) {
		response.NotFound(c, "invitation code not found")
		return
	}
	if err != nil {
		response.Internal(c, "failed to fetch invitation code")
		return
	}
	if code.ParentID != parentID {
		response.NotFound(c, "invitation code not found for this parent")
		return
	}

	// SCHOOL_ADMIN can only revoke codes for schools they manage.
	if actor.Role == adm.RoleSchoolAdmin {
		allowed, err := h.access.CanManageSchool(c.Request.Context(), actor.Role, actor.UserID, code.SchoolID)
		if err != nil {
			response.Internal(c, "access check failed")
			return
		}
		if !allowed {
			response.Forbidden(c, "you do not manage this school")
			return
		}
	} else if actor.Role != adm.RoleSuperAdmin {
		response.Forbidden(c, "only admins can revoke parent invitation codes")
		return
	}

	// Idempotent: already revoked/used/expired codes return success without error.
	if code.Status != "active" {
		response.OK(c, http.StatusOK, gin.H{
			"id":     code.ID.String(),
			"status": code.Status,
		})
		return
	}

	revoked, err := h.q.RevokeParentInvitationCode(c.Request.Context(), codeID)
	if err != nil {
		response.Internal(c, "failed to revoke invitation code")
		return
	}

	h.auditEvent(c, "PARENT_INVITATION_CODE_REVOKED", &actor.UserID, &code.SchoolID, map[string]any{
		"parent_id": parentID.String(),
		"code_id":   codeID.String(),
	})

	response.OK(c, http.StatusOK, gin.H{
		"id":         revoked.ID.String(),
		"status":     revoked.Status,
		"revoked_at": revoked.RevokedAt.Time.Format(time.RFC3339),
	})
}

// ListSchoolParentLinks handles GET /admin/schools/:school_id/parent-links.
func (h *Handler) ListSchoolParentLinks(c *gin.Context) {
	actor, ok := h.user(c)
	if !ok {
		return
	}

	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}

	// RBAC
	if actor.Role != adm.RoleSuperAdmin {
		allowed, err := h.access.CanManageSchool(c.Request.Context(), actor.Role, actor.UserID, schoolID)
		if err != nil {
			response.Internal(c, "access check failed")
			return
		}
		if !allowed {
			response.Forbidden(c, "you do not manage this school")
			return
		}
	}

	links, err := h.q.ListParentSuperAppLinksBySchool(c.Request.Context(), schoolID)
	if err != nil {
		response.Internal(c, "failed to list parent links")
		return
	}

	out := make([]gin.H, 0, len(links))
	for _, l := range links {
		item := gin.H{
			"id":                 l.ID.String(),
			"parent_id":         l.ParentID.String(),
			"parent_name":       l.ParentName,
			"school_id":         l.SchoolID.String(),
			"super_app_user_id": l.SuperAppUserID.String(),
			"status":            l.Status,
		}
		if l.LinkedAt.Valid {
			item["linked_at"] = l.LinkedAt.Time.Format(time.RFC3339)
		}
		if l.RevokedAt.Valid {
			item["revoked_at"] = l.RevokedAt.Time.Format(time.RFC3339)
		}
		out = append(out, item)
	}
	response.OK(c, http.StatusOK, gin.H{"links": out})
}

// ── helpers ────────────────────────────────────────────────────────────────

func invitationCodeDTOs(codes []sqlc.ParentInvitationCode) []gin.H {
	out := make([]gin.H, 0, len(codes))
	for _, c := range codes {
		item := gin.H{
			"id":          c.ID.String(),
			"code_prefix": c.CodePrefix,
			"status":      c.Status,
			"created_at":  c.CreatedAt.Time.Format(time.RFC3339),
		}
		if c.ExpiresAt.Valid {
			item["expires_at"] = c.ExpiresAt.Time.Format(time.RFC3339)
		}
		if c.UsedAt.Valid {
			item["used_at"] = c.UsedAt.Time.Format(time.RFC3339)
		} else {
			item["used_at"] = nil
		}
		if c.RevokedAt.Valid {
			item["revoked_at"] = c.RevokedAt.Time.Format(time.RFC3339)
		} else {
			item["revoked_at"] = nil
		}
		out = append(out, item)
	}
	return out
}

func filterCodesBySchools(codes []sqlc.ParentInvitationCode, allowed map[uuid.UUID]bool) []sqlc.ParentInvitationCode {
	out := codes[:0]
	for _, c := range codes {
		if allowed[c.SchoolID] {
			out = append(out, c)
		}
	}
	return out
}
