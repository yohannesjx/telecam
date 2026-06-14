package parent

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
	"github.com/school-camera-platform/school-camera-platform/internal/billing"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
)

// SuperAppBilling handles GET /parent/superapp/billing.
//
// Returns subscription status, due date, amount due, and recent payment/invoice
// history for the linked parent+school. Does not perform any payment.
//
// parentID and schoolID come from the verified parent_superapp_links record,
// never from request parameters, so a parent cannot view another parent's billing.
func (h *Handler) SuperAppBilling(c *gin.Context) {
	v, ok := c.Get(superappauth.ContextKey)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "SUPERAPP_AUTH_REQUIRED", "message": "Super App authentication required"}})
		return
	}
	superAppUser, ok := v.(*superappauth.User)
	if !ok {
		response.Internal(c, "unexpected context value type")
		return
	}

	ctx := c.Request.Context()

	link, err := h.q.GetActiveParentSuperAppLinkBySuperAppUser(ctx, superAppUser.UserID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{
			"code":    "PARENT_LINK_REQUIRED",
			"message": "Link your school parent account before viewing billing",
		}})
		return
	}

	parentID := link.ParentID
	schoolID := link.SchoolID

	// Fetch latest subscription for this parent+school (any status).
	sub, err := h.q.GetSubscriptionByParentSchool(ctx, sqlc.GetSubscriptionByParentSchoolParams{
		ParentID: parentID,
		SchoolID: schoolID,
	})
	subFound := err == nil
	if err != nil && err != pgx.ErrNoRows {
		response.Internal(c, "failed to fetch subscription")
		return
	}

	// Payments and invoices filtered by parent+school.
	pRows, err := h.q.ListPaymentsForParentSchool(ctx, sqlc.ListPaymentsForParentSchoolParams{
		ParentID: database.UUIDToPgtype(parentID),
		SchoolID: database.UUIDToPgtype(schoolID),
		Limit:    20,
	})
	if err != nil {
		response.Internal(c, "failed to fetch payments")
		return
	}

	iRows, err := h.q.ListInvoicesForParentSchool(ctx, sqlc.ListInvoicesForParentSchoolParams{
		ParentID: database.UUIDToPgtype(parentID),
		SchoolID: database.UUIDToPgtype(schoolID),
		Limit:    20,
	})
	if err != nil {
		response.Internal(c, "failed to fetch invoices")
		return
	}

	amountMinor := h.cfg.SchoolCameraMonthlyAmountMinor
	currency := h.cfg.SchoolCameraCurrency

	subResp, billingResp := buildBillingSummary(sub, subFound, amountMinor, currency)

	c.JSON(http.StatusOK, gin.H{
		"subscription": subResp,
		"billing":      billingResp,
		"payments":     buildPaymentList(pRows),
		"invoices":     buildInvoiceList(iRows),
	})
}

// ── subscription/billing summary helpers ─────────────────────────────────────

type subscriptionSummary struct {
	Status       string  `json:"status"`
	StartsAt     *string `json:"starts_at,omitempty"`
	EndsAt       *string `json:"ends_at,omitempty"`
	TrialEndsAt  *string `json:"trial_ends_at,omitempty"`
	IsActive     bool    `json:"is_active"`
}

type billingSummary struct {
	AmountDueMinor int64   `json:"amount_due_minor"`
	Currency       string  `json:"currency"`
	DueDate        *string `json:"due_date,omitempty"`
	CanPay         bool    `json:"can_pay"`
}

// buildBillingSummary derives the subscription and billing summaries from the
// latest subscription record (or no-subscription state).
func buildBillingSummary(sub sqlc.Subscription, found bool, amountMinor int64, currency string) (subscriptionSummary, billingSummary) {
	now := time.Now().UTC()

	if !found {
		return subscriptionSummary{Status: "none", IsActive: false},
			billingSummary{AmountDueMinor: amountMinor, Currency: currency, CanPay: true}
	}

	isActive := billing.AllowsPlayback(sub)
	apiStatus := subscriptionAPIStatus(sub, now)

	ss := subscriptionSummary{
		Status:   apiStatus,
		IsActive: isActive,
	}
	if sub.StartsAt.Valid {
		s := sub.StartsAt.Time.UTC().Format(time.RFC3339)
		ss.StartsAt = &s
	}
	if sub.EndsAt.Valid {
		s := sub.EndsAt.Time.UTC().Format(time.RFC3339)
		ss.EndsAt = &s
		if sub.Status == "TRIAL" {
			ss.TrialEndsAt = &s
		}
	}

	bs := billingSummary{
		AmountDueMinor: amountMinor,
		Currency:       currency,
		CanPay:         !isActive, // show pay button when subscription is not currently active
	}
	// due_date = ends_at for active/trial; omit for others since it has already lapsed.
	if isActive && sub.EndsAt.Valid {
		s := sub.EndsAt.Time.UTC().Format(time.RFC3339)
		bs.DueDate = &s
	}

	return ss, bs
}

// subscriptionAPIStatus maps DB status + expiry to a lowercase API status string.
func subscriptionAPIStatus(sub sqlc.Subscription, now time.Time) string {
	expired := sub.EndsAt.Valid && !sub.EndsAt.Time.After(now)

	switch sub.Status {
	case "TRIAL":
		if expired {
			return "expired"
		}
		return "trial"
	case "ACTIVE":
		if expired {
			return "expired"
		}
		return "active"
	default:
		// PAST_DUE, CANCELLED, BLOCKED — lowercase, preserving DB value.
		return strings.ToLower(sub.Status)
	}
}

// ── payment / invoice list builders ─────────────────────────────────────────

type superAppPaymentDTO struct {
	ID          string  `json:"id"`
	AmountMinor int64   `json:"amount_minor"`
	Currency    string  `json:"currency"`
	Method      string  `json:"method"`
	Status      string  `json:"status"`
	PaidAt      *string `json:"paid_at,omitempty"`
	Reference   *string `json:"reference,omitempty"`
	CreatedAt   string  `json:"created_at"`
}

type superAppInvoiceDTO struct {
	ID          string  `json:"id"`
	AmountMinor int64   `json:"amount_minor"`
	Currency    string  `json:"currency"`
	Status      string  `json:"status"`
	DueDate     *string `json:"due_date,omitempty"`
	PaidAt      *string `json:"paid_at,omitempty"`
	CreatedAt   string  `json:"created_at"`
}

func buildPaymentList(rows []sqlc.ListPaymentsForParentSchoolRow) []superAppPaymentDTO {
	out := make([]superAppPaymentDTO, 0, len(rows))
	for _, r := range rows {
		dto := superAppPaymentDTO{
			ID:          r.ID.String(),
			AmountMinor: r.AmountCents,
			Currency:    r.Currency,
			Method:      r.Method,
			Status:      strings.ToLower(r.Status),
			CreatedAt:   tsFormat(r.CreatedAt),
		}
		// approved_at is used as paid_at for APPROVED payments.
		if r.ApprovedAt.Valid {
			s := r.ApprovedAt.Time.UTC().Format(time.RFC3339)
			dto.PaidAt = &s
		}
		if r.Reference.Valid && r.Reference.String != "" {
			s := r.Reference.String
			dto.Reference = &s
		}
		out = append(out, dto)
	}
	return out
}

func buildInvoiceList(rows []sqlc.ListInvoicesForParentSchoolRow) []superAppInvoiceDTO {
	out := make([]superAppInvoiceDTO, 0, len(rows))
	for _, r := range rows {
		dto := superAppInvoiceDTO{
			ID:          r.ID.String(),
			AmountMinor: r.AmountCents,
			Currency:    r.Currency,
			Status:      strings.ToLower(r.Status),
			CreatedAt:   tsFormat(r.CreatedAt),
		}
		if r.DueDate.Valid {
			s := r.DueDate.Time.Format("2006-01-02")
			dto.DueDate = &s
		}
		if r.PaidAt.Valid {
			s := r.PaidAt.Time.UTC().Format(time.RFC3339)
			dto.PaidAt = &s
		}
		out = append(out, dto)
	}
	return out
}

