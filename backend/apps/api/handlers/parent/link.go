package parent

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/invitecodes"
	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

const defaultTrialDays = 5

// LinkSuperApp handles POST /parent/superapp/link.
//
// The client submits the raw invitation code (from the admin dashboard).
// This handler normalizes it, hashes it with HMAC-SHA256, looks up the code
// record, validates status and expiry, checks for duplicate links, then
// atomically creates the parent_superapp_link and marks the code as used.
//
// Raw codes are never stored, logged, or echoed back in any response.
func (h *Handler) LinkSuperApp(c *gin.Context) {
	v, ok := c.Get(superappauth.ContextKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "super app user not in context", "code": "SUPERAPP_AUTH_REQUIRED"})
		return
	}
	superAppUser, ok := v.(*superappauth.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unexpected context value type"})
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	normalized := invitecodes.Normalize(req.Code)
	if normalized == "" {
		response.BadRequest(c, "code is required")
		return
	}
	// Reject anything that isn't exactly 6 decimal digits (after trimming).
	// We must reject before hashing so we never compare malformed input to DB hashes.
	if err := invitecodes.Validate(normalized); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "invalid invitation code", "code": "PARENT_CODE_INVALID"})
		return
	}

	// Resolve HMAC secret — identical fallback logic as the admin handler.
	secret := h.cfg.ParentCodeHMACSecret
	if secret == "" {
		if h.cfg.IsProduction() {
			response.Internal(c, "parent code signing not configured")
			return
		}
		secret = "dev-parent-code-hmac-do-not-use-in-production"
	}

	codeHash := invitecodes.Hash(normalized, secret)

	// Lookup by hash only — raw code never touches the DB.
	inviteCode, err := h.q.GetParentInvitationCodeByHash(c.Request.Context(), codeHash)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "invalid invitation code", "code": "PARENT_CODE_INVALID"})
		return
	}
	if err != nil {
		response.Internal(c, "failed to look up invitation code")
		return
	}

	// Validate status.
	switch inviteCode.Status {
	case "used":
		c.JSON(http.StatusConflict, gin.H{"error": "invitation code has already been used", "code": "PARENT_CODE_ALREADY_USED"})
		return
	case "revoked":
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "invitation code has been revoked", "code": "PARENT_CODE_INVALID"})
		return
	case "expired":
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "invitation code has expired", "code": "PARENT_CODE_EXPIRED"})
		return
	}

	// Check DB-level expiry even when status is still "active" (clock may have
	// advanced past expires_at before a background cleanup job ran).
	if inviteCode.ExpiresAt.Valid && time.Now().UTC().After(inviteCode.ExpiresAt.Time) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "invitation code has expired", "code": "PARENT_CODE_EXPIRED"})
		return
	}

	if inviteCode.Status != "active" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "invalid invitation code", "code": "PARENT_CODE_INVALID"})
		return
	}

	parentID := inviteCode.ParentID
	schoolID := inviteCode.SchoolID

	// Guard: parent already linked to any Super App account.
	_, err = h.q.GetParentSuperAppLinkByParent(c.Request.Context(), parentID)
	if err == nil {
		response.ConflictWithCode(c, "PARENT_ALREADY_LINKED", "parent is already linked to a Super App account", nil)
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		response.Internal(c, "failed to check existing parent link")
		return
	}

	// Guard: this Super App user already linked to a parent at this school.
	_, err = h.q.GetParentSuperAppLinkBySuperAppUserAndSchool(c.Request.Context(), sqlc.GetParentSuperAppLinkBySuperAppUserAndSchoolParams{
		SuperAppUserID: superAppUser.UserID,
		SchoolID:       schoolID,
	})
	if err == nil {
		response.ConflictWithCode(c, "SUPERAPP_USER_ALREADY_LINKED", "Super App account is already linked to a parent at this school", nil)
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		response.Internal(c, "failed to check existing Super App user link")
		return
	}

	// Atomic: create link + mark code used in a single transaction.
	tx, err := h.pool.Begin(c.Request.Context())
	if err != nil {
		response.Internal(c, "failed to begin transaction")
		return
	}
	defer tx.Rollback(c.Request.Context()) //nolint:errcheck

	qtx := sqlc.New(tx)

	link, err := qtx.CreateParentSuperAppLink(c.Request.Context(), sqlc.CreateParentSuperAppLinkParams{
		ID:             uuid.New(),
		ParentID:       parentID,
		SchoolID:       schoolID,
		SuperAppUserID: superAppUser.UserID,
	})
	if err != nil {
		response.Internal(c, "failed to create parent link")
		return
	}

	_, err = qtx.MarkParentInvitationCodeUsed(c.Request.Context(), sqlc.MarkParentInvitationCodeUsedParams{
		ID:                   inviteCode.ID,
		UsedBySuperAppUserID: database.UUIDToPgtype(superAppUser.UserID),
	})
	if err != nil {
		response.Internal(c, "failed to mark invitation code as used")
		return
	}

	// Create a trial subscription if the parent has no active subscription/trial.
	hasSub, err := qtx.HasActiveSubscriptionForParentSchool(c.Request.Context(), sqlc.HasActiveSubscriptionForParentSchoolParams{
		ParentID: parentID,
		SchoolID: schoolID,
	})
	if err != nil {
		response.Internal(c, "failed to check subscription")
		return
	}
	if !hasSub {
		trialDays := h.cfg.ParentTrialDays
		if trialDays <= 0 {
			trialDays = defaultTrialDays
		}
		now := time.Now().UTC()
		_, err = qtx.CreateSubscription(c.Request.Context(), sqlc.CreateSubscriptionParams{
			ID:       uuid.New(),
			ParentID: parentID,
			SchoolID: schoolID,
			Status:   "TRIAL",
			StartsAt: database.TimestamptzFromTime(now),
			EndsAt:   database.TimestamptzFromTime(now.Add(time.Duration(trialDays) * 24 * time.Hour)),
		})
		if err != nil {
			response.Internal(c, "failed to create trial subscription")
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		response.Internal(c, "failed to commit transaction")
		return
	}

	linkedAt := ""
	if link.LinkedAt.Valid {
		linkedAt = link.LinkedAt.Time.UTC().Format(time.RFC3339)
	}

	c.JSON(http.StatusCreated, gin.H{
		"linked":            true,
		"link_id":           link.ID.String(),
		"parent_id":         link.ParentID.String(),
		"school_id":         link.SchoolID.String(),
		"super_app_user_id": link.SuperAppUserID.String(),
		"status":            link.Status,
		"linked_at":         linkedAt,
	})
}
