// Package internalapi implements server-to-server endpoints called exclusively
// by the main Super App backend. All routes require X-Internal-Token validation.
// These routes must never be reachable by end users — the load balancer must
// block external access to /internal/*.
package internalapi

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// Handler implements the internal Super App callback endpoints.
type Handler struct {
	q   *sqlc.Queries
	cfg *appconfig.Config
}

// NewHandler creates an internal handler.
func NewHandler(q *sqlc.Queries, cfg *appconfig.Config) *Handler {
	return &Handler{q: q, cfg: cfg}
}

// VerifyPaymentRequest handles POST /internal/superapp/school-camera/payment-request/verify.
//
// Called by the main Super App backend before debiting the user's wallet.
// Validates that the request is pending, not expired, and owned by the caller.
// Returns 200 with payment details on success, or an error code.
func (h *Handler) VerifyPaymentRequest(c *gin.Context) {
	var req struct {
		PaymentRequestID string `json:"payment_request_id"`
		SuperAppUserID   string `json:"super_app_user_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "invalid request body"}})
		return
	}
	prID, err := uuid.Parse(req.PaymentRequestID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "invalid payment_request_id"}})
		return
	}
	callerUserID, err := uuid.Parse(req.SuperAppUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "invalid super_app_user_id"}})
		return
	}

	ctx := c.Request.Context()
	pr, err := h.q.GetPaymentRequest(ctx, prID)
	if err == pgx.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "PAYMENT_REQUEST_NOT_FOUND", "message": "payment request not found"}})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch payment request"}})
		return
	}

	// Security: caller's Super App user must match the request owner.
	if pr.SuperAppUserID != callerUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "PAYMENT_REQUEST_FORBIDDEN", "message": "payment request does not belong to this user"}})
		return
	}

	// Already paid — idempotent success so the main backend can resume safely.
	if pr.Status == "paid" {
		c.JSON(http.StatusOK, gin.H{
			"payment_request_id": pr.ID.String(),
			"status":             pr.Status,
			"already_paid":       true,
			"amount_minor":       pr.AmountMinor,
			"currency":           pr.Currency,
		})
		return
	}

	if pr.Status != "pending" {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{
			"code":    "PAYMENT_REQUEST_NOT_PAYABLE",
			"message": "payment request is not in pending status",
			"status":  pr.Status,
		}})
		return
	}

	if pr.ExpiresAt.Valid && !pr.ExpiresAt.Time.After(time.Now().UTC()) {
		c.JSON(http.StatusGone, gin.H{"error": gin.H{"code": "PAYMENT_REQUEST_EXPIRED", "message": "payment request has expired"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"payment_request_id": pr.ID.String(),
		"parent_id":          pr.ParentID.String(),
		"school_id":          pr.SchoolID.String(),
		"super_app_user_id":  pr.SuperAppUserID.String(),
		"amount_minor":       pr.AmountMinor,
		"currency":           pr.Currency,
		"months":             pr.Months,
		"status":             pr.Status,
		"already_paid":       false,
	})
}

// PaymentCaptured handles POST /internal/superapp/school-camera/payment-captured.
//
// Called by the main Super App backend after the TigerBeetle transfer succeeds.
// Atomically marks the request paid, extends/creates the subscription, and records
// a payment row for admin visibility. Idempotent on super_app_payment_reference.
func (h *Handler) PaymentCaptured(c *gin.Context) {
	var req struct {
		PaymentRequestID         string `json:"payment_request_id"`
		SuperAppPaymentReference string `json:"super_app_payment_reference"`
		AmountMinor              int64  `json:"amount_minor"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "invalid request body"}})
		return
	}
	prID, err := uuid.Parse(req.PaymentRequestID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "invalid payment_request_id"}})
		return
	}
	if req.SuperAppPaymentReference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "super_app_payment_reference is required"}})
		return
	}

	ctx := c.Request.Context()

	// Idempotency: if this reference was already processed, return success.
	existing, err := h.q.GetPaymentRequestByReference(ctx, pgtype.Text{String: req.SuperAppPaymentReference, Valid: true})
	if err == nil && existing.Status == "paid" {
		c.JSON(http.StatusOK, capturedResponse(existing))
		return
	}

	pr, err := h.q.GetPaymentRequest(ctx, prID)
	if err == pgx.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "PAYMENT_REQUEST_NOT_FOUND", "message": "payment request not found"}})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to fetch payment request"}})
		return
	}

	if pr.Status == "paid" {
		c.JSON(http.StatusOK, capturedResponse(pr))
		return
	}
	if pr.Status != "pending" {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{
			"code":    "PAYMENT_REQUEST_NOT_PAYABLE",
			"message": "payment request is not in pending status",
			"status":  pr.Status,
		}})
		return
	}

	// Mark the payment request paid.
	paidPR, err := h.q.MarkPaymentRequestPaid(ctx, sqlc.MarkPaymentRequestPaidParams{
		ID:                       prID,
		SuperAppPaymentReference: pgtype.Text{String: req.SuperAppPaymentReference, Valid: true},
	})
	if err != nil {
		// Concurrent payment may have just succeeded — check.
		if check, e2 := h.q.GetPaymentRequest(ctx, prID); e2 == nil && check.Status == "paid" {
			c.JSON(http.StatusOK, capturedResponse(check))
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to mark payment request paid"}})
		return
	}

	// Extend or create subscription.
	newEndsAt, err := h.applySubscriptionExtension(ctx, paidPR)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{
			"code":    "SUBSCRIPTION_UPDATE_FAILED",
			"message": "payment captured but subscription could not be extended — contact support",
		}})
		return
	}

	// Create admin-visible payment record (non-fatal).
	h.createPaymentRecord(ctx, paidPR, req.AmountMinor)

	// Mark request fully completed.
	_, _ = h.q.MarkPaymentRequestCompleted(ctx, prID)

	c.JSON(http.StatusOK, gin.H{
		"payment_request_id":          paidPR.ID.String(),
		"status":                      "paid",
		"super_app_payment_reference": paidPR.SuperAppPaymentReference.String,
		"subscription_ends_at":        newEndsAt.UTC().Format(time.RFC3339),
	})
}

// applySubscriptionExtension extends the existing active/trial subscription, or
// creates a new ACTIVE subscription if none exists. Returns the new ends_at.
//
// Extension rule (from spec):
//   - If current active/trial ends_at is in the future: extend from ends_at.
//   - Otherwise: start from now.
//   - Add 1 calendar month per pr.Months.
func (h *Handler) applySubscriptionExtension(ctx context.Context, pr sqlc.SchoolCameraPaymentRequest) (time.Time, error) {
	months := int(pr.Months)
	if months <= 0 {
		months = 1
	}

	sub, err := h.q.GetSubscriptionByParentSchool(ctx, sqlc.GetSubscriptionByParentSchoolParams{
		ParentID: pr.ParentID,
		SchoolID: pr.SchoolID,
	})

	now := time.Now().UTC()

	if err == pgx.ErrNoRows {
		// No subscription — create a new ACTIVE one from now.
		newEndsAt := addMonths(now, months)
		_, cerr := h.q.CreateSubscription(ctx, sqlc.CreateSubscriptionParams{
			ID:       uuid.New(),
			ParentID: pr.ParentID,
			SchoolID: pr.SchoolID,
			Status:   "ACTIVE",
			StartsAt: database.TimestamptzFromTime(now),
			EndsAt:   database.TimestamptzFromTime(newEndsAt),
		})
		return newEndsAt, cerr
	}
	if err != nil {
		return time.Time{}, err
	}

	// Determine new base for extension.
	base := now
	if sub.EndsAt.Valid && sub.EndsAt.Time.After(now) {
		base = sub.EndsAt.Time.UTC()
	}
	newEndsAt := addMonths(base, months)

	// If subscription is not ACTIVE (e.g., TRIAL, PAST_DUE, CANCELLED), activate it.
	if sub.Status != "ACTIVE" {
		_, err = h.q.ActivateSubscription(ctx, sqlc.ActivateSubscriptionParams{
			ID:     sub.ID,
			EndsAt: database.TimestamptzFromTime(newEndsAt),
		})
	} else {
		_, err = h.q.ExtendSubscription(ctx, sqlc.ExtendSubscriptionParams{
			ID:     sub.ID,
			EndsAt: database.TimestamptzFromTime(newEndsAt),
		})
	}
	return newEndsAt, err
}

// addMonths adds n calendar months to t. Uses time.AddDate so leap years and
// month-end boundary cases are handled correctly.
func addMonths(t time.Time, n int) time.Time {
	return t.AddDate(0, n, 0)
}

// capturedResponse builds the success body for an already-paid payment request.
func capturedResponse(pr sqlc.SchoolCameraPaymentRequest) gin.H {
	resp := gin.H{
		"payment_request_id": pr.ID.String(),
		"status":             pr.Status,
	}
	if pr.SuperAppPaymentReference.Valid {
		resp["super_app_payment_reference"] = pr.SuperAppPaymentReference.String
	}
	if pr.CompletedAt.Valid {
		resp["subscription_ends_at"] = pr.CompletedAt.Time.UTC().Format(time.RFC3339)
	}
	return resp
}

// createPaymentRecord creates a payments table row for admin visibility.
// Non-fatal — the subscription has already been extended.
func (h *Handler) createPaymentRecord(ctx context.Context, pr sqlc.SchoolCameraPaymentRequest, amountMinor int64) {
	if amountMinor <= 0 {
		amountMinor = pr.AmountMinor
	}
	ref := ""
	if pr.SuperAppPaymentReference.Valid {
		ref = pr.SuperAppPaymentReference.String
	}
	_, _ = h.q.CreatePayment(ctx, sqlc.CreatePaymentParams{
		ID:             uuid.New(),
		ParentID:       database.UUIDToPgtype(pr.ParentID),
		SchoolID:       database.UUIDToPgtype(pr.SchoolID),
		SubscriptionID: pgtype.UUID{},
		AmountCents:    amountMinor,
		Currency:       pr.Currency,
		Method:         "SUPERAPP_WALLET",
		Status:         "APPROVED",
		Reference:      pgtype.Text{String: ref, Valid: ref != ""},
		ProofUrl:       pgtype.Text{},
		Notes:          pgtype.Text{},
	})
}
