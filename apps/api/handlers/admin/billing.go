package admin

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	adm "github.com/school-camera-platform/school-camera-platform/internal/admin"
	"github.com/school-camera-platform/school-camera-platform/internal/billing"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

var (
	validPaymentMethods = map[string]bool{
		"CASH": true, "BANK_TRANSFER": true, "TELEBIRR": true, "MANUAL": true,
	}
	validPaymentStatuses = map[string]bool{
		"PENDING": true, "APPROVED": true, "REJECTED": true, "REFUNDED": true,
	}
)

type createSubscriptionRequest struct {
	ParentID  string `json:"parent_id" validate:"required"`
	SchoolID  string `json:"school_id" validate:"required"`
	Status    string `json:"status" validate:"required"`
	StartsAt  string `json:"starts_at"`
	EndsAt    string `json:"ends_at"`
}

type patchSubscriptionStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

type extendSubscriptionRequest struct {
	EndsAt string `json:"ends_at" validate:"required"`
}

type createPaymentRequest struct {
	ParentID       string `json:"parent_id" validate:"required"`
	SchoolID       string `json:"school_id" validate:"required"`
	SubscriptionID string `json:"subscription_id"`
	AmountCents    int64  `json:"amount_cents" validate:"required,gt=0"`
	Currency       string `json:"currency"`
	Method         string `json:"method" validate:"required"`
	Reference      string `json:"reference"`
	Notes          string `json:"notes"`
}

type rejectPaymentRequest struct {
	Notes string `json:"notes"`
}

type createInvoiceRequest struct {
	ParentID       string `json:"parent_id" validate:"required"`
	SchoolID       string `json:"school_id" validate:"required"`
	SubscriptionID string `json:"subscription_id"`
	AmountCents    int64  `json:"amount_cents" validate:"required,gt=0"`
	Currency       string `json:"currency"`
	DueDate        string `json:"due_date"`
}

type setRevenueShareRequest struct {
	Percentage  float64 `json:"percentage" validate:"required"`
	ActiveFrom  string  `json:"active_from" validate:"required"`
}

// CreateSubscription POST /admin/subscriptions
func (h *Handler) CreateSubscription(c *gin.Context) {
	var req createSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if !billing.ValidSubscriptionStatuses[req.Status] {
		response.BadRequest(c, "invalid subscription status")
		return
	}

	parentID, err := uuid.Parse(req.ParentID)
	if err != nil {
		response.BadRequest(c, "invalid parent_id")
		return
	}
	schoolID, err := uuid.Parse(req.SchoolID)
	if err != nil {
		response.BadRequest(c, "invalid school_id")
		return
	}
	if !h.requireSchoolManage(c, schoolID) {
		return
	}

	parent, err := h.q.GetUserByID(c.Request.Context(), parentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "parent not found")
			return
		}
		response.Internal(c, "failed to load parent")
		return
	}
	if parent.Role != adm.RoleParent {
		response.BadRequest(c, "user must have role PARENT")
		return
	}

	exists, err := h.q.HasActiveSubscriptionForParentSchool(c.Request.Context(), sqlc.HasActiveSubscriptionForParentSchoolParams{
		ParentID: parentID,
		SchoolID: schoolID,
	})
	if err != nil {
		response.Internal(c, "failed to check existing subscription")
		return
	}
	if exists {
		response.BadRequest(c, "active subscription already exists for this parent and school")
		return
	}

	startsAt, err := parseOptionalTime(req.StartsAt)
	if err != nil {
		response.BadRequest(c, "invalid starts_at")
		return
	}
	if !startsAt.Valid {
		startsAt = database.TimestamptzFromTime(time.Now().UTC())
	}
	endsAt, err := parseOptionalTime(req.EndsAt)
	if err != nil {
		response.BadRequest(c, "invalid ends_at")
		return
	}

	sub, err := h.q.CreateSubscription(c.Request.Context(), sqlc.CreateSubscriptionParams{
		ID:       uuid.New(),
		ParentID: parentID,
		SchoolID: schoolID,
		Status:   req.Status,
		StartsAt: startsAt,
		EndsAt:   endsAt,
	})
	if err != nil {
		response.Internal(c, "failed to create subscription")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "SUBSCRIPTION_CREATED", &actor.UserID, &schoolID, map[string]any{
		"subscription_id": sub.ID.String(),
		"parent_id":       parentID.String(),
		"status":          sub.Status,
	})
	response.OK(c, http.StatusCreated, subscriptionDTOFromSub(sub, parent.FullName, ""))
}

// ListSubscriptions GET /admin/subscriptions
func (h *Handler) ListSubscriptions(c *gin.Context) {
	scope, ok := h.resolveBillingScope(c)
	if !ok {
		return
	}

	params := sqlc.ListSubscriptionsAdminParams{
		SchoolIds: scopeSchoolIDs(scope),
		SchoolID:  scope.FilterSchool,
		ParentID:  scope.FilterParent,
		RowLimit:  200,
	}
	if status := c.Query("status"); status != "" {
		if !billing.ValidSubscriptionStatuses[status] {
			response.BadRequest(c, "invalid status")
			return
		}
		params.Status = pgtype.Text{String: status, Valid: true}
	}

	rows, err := h.q.ListSubscriptionsAdmin(c.Request.Context(), params)
	if err != nil {
		response.Internal(c, "failed to list subscriptions")
		return
	}
	out := make([]subscriptionDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, subscriptionDTOFromRow(
			r.ID, r.ParentID, r.SchoolID, r.Status,
			r.StartsAt, r.EndsAt, r.CreatedAt,
			r.ParentName, r.SchoolName,
		))
	}
	response.OK(c, http.StatusOK, out)
}

// PatchSubscriptionStatus PATCH /admin/subscriptions/:id/status
func (h *Handler) PatchSubscriptionStatus(c *gin.Context) {
	subID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	var req patchSubscriptionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if !billing.ValidSubscriptionStatuses[req.Status] {
		response.BadRequest(c, "invalid status")
		return
	}

	sub, err := h.q.GetSubscription(c.Request.Context(), subID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "subscription not found")
			return
		}
		response.Internal(c, "failed to load subscription")
		return
	}
	if !h.requireSchoolManage(c, sub.SchoolID) {
		return
	}

	updated, err := h.q.UpdateSubscriptionStatus(c.Request.Context(), sqlc.UpdateSubscriptionStatusParams{
		ID:     subID,
		Status: req.Status,
	})
	if err != nil {
		response.Internal(c, "failed to update subscription")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "SUBSCRIPTION_STATUS_UPDATED", &actor.UserID, &sub.SchoolID, map[string]any{
		"subscription_id": subID.String(),
		"from_status":     sub.Status,
		"to_status":       req.Status,
	})
	response.OK(c, http.StatusOK, subscriptionDTOFromSub(updated, "", ""))
}

// ExtendSubscription PATCH /admin/subscriptions/:id/extend
func (h *Handler) ExtendSubscription(c *gin.Context) {
	subID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	var req extendSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	endsAt, err := time.Parse(time.RFC3339, req.EndsAt)
	if err != nil {
		response.BadRequest(c, "invalid ends_at")
		return
	}

	sub, err := h.q.GetSubscription(c.Request.Context(), subID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "subscription not found")
			return
		}
		response.Internal(c, "failed to load subscription")
		return
	}
	if !h.requireSchoolManage(c, sub.SchoolID) {
		return
	}

	updated, err := h.q.ExtendSubscription(c.Request.Context(), sqlc.ExtendSubscriptionParams{
		ID:     subID,
		EndsAt: database.TimestamptzFromTime(endsAt),
	})
	if err != nil {
		response.Internal(c, "failed to extend subscription")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "SUBSCRIPTION_EXTENDED", &actor.UserID, &sub.SchoolID, map[string]any{
		"subscription_id": subID.String(),
		"ends_at":         req.EndsAt,
	})
	response.OK(c, http.StatusOK, subscriptionDTOFromSub(updated, "", ""))
}

// CreatePayment POST /admin/payments
func (h *Handler) CreatePayment(c *gin.Context) {
	var req createPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if !validPaymentMethods[req.Method] {
		response.BadRequest(c, "invalid payment method")
		return
	}

	parentID, err := uuid.Parse(req.ParentID)
	if err != nil {
		response.BadRequest(c, "invalid parent_id")
		return
	}
	schoolID, err := uuid.Parse(req.SchoolID)
	if err != nil {
		response.BadRequest(c, "invalid school_id")
		return
	}
	if !h.requireSchoolManage(c, schoolID) {
		return
	}

	currency := req.Currency
	if currency == "" {
		currency = "ETB"
	}

	var subID pgtype.UUID
	if req.SubscriptionID != "" {
		parsed, err := uuid.Parse(req.SubscriptionID)
		if err != nil {
			response.BadRequest(c, "invalid subscription_id")
			return
		}
		sub, err := h.q.GetSubscription(c.Request.Context(), parsed)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				response.NotFound(c, "subscription not found")
				return
			}
			response.Internal(c, "failed to load subscription")
			return
		}
		if sub.ParentID != parentID || sub.SchoolID != schoolID {
			response.BadRequest(c, "subscription does not match parent and school")
			return
		}
		subID = database.UUIDToPgtype(parsed)
	}

	payment, err := h.q.CreatePayment(c.Request.Context(), sqlc.CreatePaymentParams{
		ID:             uuid.New(),
		ParentID:       database.UUIDToPgtype(parentID),
		SchoolID:       database.UUIDToPgtype(schoolID),
		SubscriptionID: subID,
		AmountCents:    req.AmountCents,
		Currency:       currency,
		Method:         req.Method,
		Status:         "PENDING",
		Reference:      database.TextFromString(req.Reference),
		Notes:          database.TextFromString(req.Notes),
	})
	if err != nil {
		response.Internal(c, "failed to create payment")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "PAYMENT_CREATED", &actor.UserID, &schoolID, map[string]any{
		"payment_id": payment.ID.String(),
		"amount":     payment.AmountCents,
		"method":     payment.Method,
	})
	response.OK(c, http.StatusCreated, paymentDTOFromPayment(payment, ""))
}

// ListPayments GET /admin/payments
func (h *Handler) ListPayments(c *gin.Context) {
	scope, ok := h.resolveBillingScope(c)
	if !ok {
		return
	}

	params := sqlc.ListPaymentsParams{
		SchoolIds: scopeSchoolIDs(scope),
		SchoolID:  scope.FilterSchool,
		ParentID:  scope.FilterParent,
		RowLimit:  200,
	}
	if status := c.Query("status"); status != "" {
		if !validPaymentStatuses[status] {
			response.BadRequest(c, "invalid status")
			return
		}
		params.Status = pgtype.Text{String: status, Valid: true}
	}
	if method := c.Query("method"); method != "" {
		if !validPaymentMethods[method] {
			response.BadRequest(c, "invalid method")
			return
		}
		params.Method = pgtype.Text{String: method, Valid: true}
	}

	rows, err := h.q.ListPayments(c.Request.Context(), params)
	if err != nil {
		response.Internal(c, "failed to list payments")
		return
	}
	out := make([]paymentDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, paymentDTOFromListRow(r))
	}
	response.OK(c, http.StatusOK, out)
}

// ApprovePayment PATCH /admin/payments/:id/approve
func (h *Handler) ApprovePayment(c *gin.Context) {
	paymentID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}

	payment, err := h.q.GetPayment(c.Request.Context(), paymentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "payment not found")
			return
		}
		response.Internal(c, "failed to load payment")
		return
	}
	if payment.Status != "PENDING" {
		response.BadRequest(c, "payment is not pending")
		return
	}
	if !h.requirePaymentSchool(c, payment) {
		return
	}

	actor, ok := h.user(c)
	if !ok {
		return
	}

	approved, err := h.q.ApprovePayment(c.Request.Context(), sqlc.ApprovePaymentParams{
		ID:         paymentID,
		ApprovedBy: database.UUIDToPgtype(actor.UserID),
		Notes:      payment.Notes,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.BadRequest(c, "payment could not be approved")
			return
		}
		response.Internal(c, "failed to approve payment")
		return
	}

	var schoolID *uuid.UUID
	if payment.SchoolID.Valid {
		sid := uuid.UUID(payment.SchoolID.Bytes)
		schoolID = &sid
	}

	if payment.SubscriptionID.Valid {
		subID := uuid.UUID(payment.SubscriptionID.Bytes)
		sub, err := h.q.GetSubscription(c.Request.Context(), subID)
		if err == nil {
			newEnds := extendSubscriptionEnd(sub.EndsAt, 30)
			_, _ = h.q.ActivateSubscription(c.Request.Context(), sqlc.ActivateSubscriptionParams{
				ID:     subID,
				EndsAt: newEnds,
			})
		}
	}

	if payment.ParentID.Valid && payment.SchoolID.Valid {
		inv, err := h.q.FindOpenInvoiceForParentSchool(c.Request.Context(), sqlc.FindOpenInvoiceForParentSchoolParams{
			ParentID: payment.ParentID,
			SchoolID: payment.SchoolID,
		})
		if err == nil {
			_, _ = h.q.MarkInvoicePaid(c.Request.Context(), inv.ID)
		}
	}

	h.auditEvent(c, "PAYMENT_APPROVED", &actor.UserID, schoolID, map[string]any{
		"payment_id": paymentID.String(),
	})
	if payment.ParentID.Valid && h.push != nil {
		parentID := uuid.UUID(payment.ParentID.Bytes)
		h.push.NotifyPaymentApproved(c.Request.Context(), parentID, paymentID)
	}
	response.OK(c, http.StatusOK, paymentDTOFromPayment(approved, ""))
}

// RejectPayment PATCH /admin/payments/:id/reject
func (h *Handler) RejectPayment(c *gin.Context) {
	paymentID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}
	var req rejectPaymentRequest
	_ = c.ShouldBindJSON(&req)

	payment, err := h.q.GetPayment(c.Request.Context(), paymentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "payment not found")
			return
		}
		response.Internal(c, "failed to load payment")
		return
	}
	if payment.Status != "PENDING" {
		response.BadRequest(c, "payment is not pending")
		return
	}
	if !h.requirePaymentSchool(c, payment) {
		return
	}

	actor, ok := h.user(c)
	if !ok {
		return
	}

	rejected, err := h.q.RejectPayment(c.Request.Context(), sqlc.RejectPaymentParams{
		ID:         paymentID,
		RejectedBy: database.UUIDToPgtype(actor.UserID),
		Notes:      database.TextFromString(req.Notes),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.BadRequest(c, "payment could not be rejected")
			return
		}
		response.Internal(c, "failed to reject payment")
		return
	}

	var schoolID *uuid.UUID
	if payment.SchoolID.Valid {
		sid := uuid.UUID(payment.SchoolID.Bytes)
		schoolID = &sid
	}
	h.auditEvent(c, "PAYMENT_REJECTED", &actor.UserID, schoolID, map[string]any{
		"payment_id": paymentID.String(),
		"notes":      req.Notes,
	})
	if payment.ParentID.Valid && h.push != nil {
		parentID := uuid.UUID(payment.ParentID.Bytes)
		h.push.NotifyPaymentRejected(c.Request.Context(), parentID, paymentID)
	}
	response.OK(c, http.StatusOK, paymentDTOFromPayment(rejected, ""))
}

// CreateInvoice POST /admin/invoices
func (h *Handler) CreateInvoice(c *gin.Context) {
	var req createInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	parentID, err := uuid.Parse(req.ParentID)
	if err != nil {
		response.BadRequest(c, "invalid parent_id")
		return
	}
	schoolID, err := uuid.Parse(req.SchoolID)
	if err != nil {
		response.BadRequest(c, "invalid school_id")
		return
	}
	if !h.requireSchoolManage(c, schoolID) {
		return
	}

	currency := req.Currency
	if currency == "" {
		currency = "ETB"
	}

	var subID pgtype.UUID
	if req.SubscriptionID != "" {
		parsed, err := uuid.Parse(req.SubscriptionID)
		if err != nil {
			response.BadRequest(c, "invalid subscription_id")
			return
		}
		subID = database.UUIDToPgtype(parsed)
	}

	invoiceNumber, err := billing.GenerateInvoiceNumber(c.Request.Context(), h.q, time.Now().UTC())
	if err != nil {
		response.Internal(c, "failed to generate invoice number")
		return
	}

	var dueDate pgtype.Date
	if req.DueDate != "" {
		t, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			response.BadRequest(c, "invalid due_date")
			return
		}
		dueDate = pgtype.Date{Time: t, Valid: true}
	}

	inv, err := h.q.CreateInvoice(c.Request.Context(), sqlc.CreateInvoiceParams{
		ID:             uuid.New(),
		ParentID:       database.UUIDToPgtype(parentID),
		SchoolID:       database.UUIDToPgtype(schoolID),
		SubscriptionID: subID,
		InvoiceNumber:  invoiceNumber,
		AmountCents:    req.AmountCents,
		Currency:       currency,
		Status:         "OPEN",
		DueDate:        dueDate,
	})
	if err != nil {
		response.Internal(c, "failed to create invoice")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "INVOICE_CREATED", &actor.UserID, &schoolID, map[string]any{
		"invoice_id":     inv.ID.String(),
		"invoice_number": inv.InvoiceNumber,
	})
	if h.push != nil {
		h.push.NotifyInvoiceCreated(c.Request.Context(), parentID, inv.ID)
	}
	response.OK(c, http.StatusCreated, invoiceDTOFromInvoice(inv, ""))
}

// ListInvoices GET /admin/invoices
func (h *Handler) ListInvoices(c *gin.Context) {
	scope, ok := h.resolveBillingScope(c)
	if !ok {
		return
	}

	params := sqlc.ListInvoicesParams{
		SchoolIds: scopeSchoolIDs(scope),
		SchoolID:  scope.FilterSchool,
		ParentID:  scope.FilterParent,
		RowLimit:  200,
	}
	if status := c.Query("status"); status != "" {
		params.Status = pgtype.Text{String: status, Valid: true}
	}

	rows, err := h.q.ListInvoices(c.Request.Context(), params)
	if err != nil {
		response.Internal(c, "failed to list invoices")
		return
	}
	out := make([]invoiceDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, invoiceDTOFromListRow(r))
	}
	response.OK(c, http.StatusOK, out)
}

// VoidInvoice PATCH /admin/invoices/:id/void
func (h *Handler) VoidInvoice(c *gin.Context) {
	invoiceID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}

	inv, err := h.q.GetInvoice(c.Request.Context(), invoiceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "invoice not found")
			return
		}
		response.Internal(c, "failed to load invoice")
		return
	}
	if !h.requireInvoiceSchool(c, inv) {
		return
	}

	voided, err := h.q.VoidInvoice(c.Request.Context(), invoiceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.BadRequest(c, "invoice cannot be voided")
			return
		}
		response.Internal(c, "failed to void invoice")
		return
	}

	var schoolID *uuid.UUID
	if inv.SchoolID.Valid {
		sid := uuid.UUID(inv.SchoolID.Bytes)
		schoolID = &sid
	}
	actor, _ := h.user(c)
	h.auditEvent(c, "INVOICE_VOIDED", &actor.UserID, schoolID, map[string]any{
		"invoice_id": invoiceID.String(),
	})
	response.OK(c, http.StatusOK, invoiceDTOFromInvoice(voided, ""))
}

// MarkInvoicePaid PATCH /admin/invoices/:id/mark-paid
func (h *Handler) MarkInvoicePaid(c *gin.Context) {
	invoiceID, ok := h.parseUUID(c, "id")
	if !ok {
		return
	}

	inv, err := h.q.GetInvoice(c.Request.Context(), invoiceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "invoice not found")
			return
		}
		response.Internal(c, "failed to load invoice")
		return
	}
	if !h.requireInvoiceSchool(c, inv) {
		return
	}

	paid, err := h.q.MarkInvoicePaid(c.Request.Context(), invoiceID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.BadRequest(c, "invoice cannot be marked paid")
			return
		}
		response.Internal(c, "failed to mark invoice paid")
		return
	}

	var schoolID *uuid.UUID
	if inv.SchoolID.Valid {
		sid := uuid.UUID(inv.SchoolID.Bytes)
		schoolID = &sid
	}
	actor, _ := h.user(c)
	h.auditEvent(c, "INVOICE_MARKED_PAID", &actor.UserID, schoolID, map[string]any{
		"invoice_id": invoiceID.String(),
	})
	response.OK(c, http.StatusOK, invoiceDTOFromInvoice(paid, ""))
}

// SetSchoolRevenueShare POST /admin/schools/:school_id/revenue-share
func (h *Handler) SetSchoolRevenueShare(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}

	var req setRevenueShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if req.Percentage < 0 || req.Percentage > 100 {
		response.BadRequest(c, "percentage must be between 0 and 100")
		return
	}

	activeFrom, err := time.Parse("2006-01-02", req.ActiveFrom)
	if err != nil {
		response.BadRequest(c, "invalid active_from")
		return
	}

	var pct pgtype.Numeric
	if err := pct.Scan(fmt.Sprintf("%.2f", req.Percentage)); err != nil {
		response.BadRequest(c, "invalid percentage")
		return
	}

	closeTo := activeFrom.AddDate(0, 0, -1)
	_, _ = h.q.CloseSchoolRevenueShares(c.Request.Context(), sqlc.CloseSchoolRevenueSharesParams{
		SchoolID: schoolID,
		ActiveTo: pgtype.Date{Time: closeTo, Valid: true},
	})

	share, err := h.q.CreateSchoolRevenueShare(c.Request.Context(), sqlc.CreateSchoolRevenueShareParams{
		ID:         uuid.New(),
		SchoolID:   schoolID,
		Percentage: pct,
		ActiveFrom: pgtype.Date{Time: activeFrom, Valid: true},
	})
	if err != nil {
		response.Internal(c, "failed to set revenue share")
		return
	}

	actor, _ := h.user(c)
	h.auditEvent(c, "REVENUE_SHARE_UPDATED", &actor.UserID, &schoolID, map[string]any{
		"percentage":  req.Percentage,
		"active_from": req.ActiveFrom,
	})
	response.OK(c, http.StatusCreated, revenueShareDTOFromModel(share))
}

// GetSchoolRevenueShare GET /admin/schools/:school_id/revenue-share
func (h *Handler) GetSchoolRevenueShare(c *gin.Context) {
	schoolID, ok := h.parseUUID(c, "school_id")
	if !ok {
		return
	}
	if !h.requireSchoolManage(c, schoolID) {
		return
	}

	if c.Query("history") == "true" {
		shares, err := h.q.ListSchoolRevenueShares(c.Request.Context(), schoolID)
		if err != nil {
			response.Internal(c, "failed to list revenue shares")
			return
		}
		out := make([]revenueShareDTO, 0, len(shares))
		for _, s := range shares {
			out = append(out, revenueShareDTOFromModel(s))
		}
		response.OK(c, http.StatusOK, out)
		return
	}

	share, err := h.q.GetActiveSchoolRevenueShare(c.Request.Context(), schoolID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "no active revenue share")
			return
		}
		response.Internal(c, "failed to get revenue share")
		return
	}
	response.OK(c, http.StatusOK, revenueShareDTOFromModel(share))
}

func (h *Handler) requirePaymentSchool(c *gin.Context, p sqlc.Payment) bool {
	if !p.SchoolID.Valid {
		response.BadRequest(c, "payment has no school")
		return false
	}
	return h.requireSchoolManage(c, uuid.UUID(p.SchoolID.Bytes))
}

func (h *Handler) requireInvoiceSchool(c *gin.Context, inv sqlc.Invoice) bool {
	if !inv.SchoolID.Valid {
		response.BadRequest(c, "invoice has no school")
		return false
	}
	return h.requireSchoolManage(c, uuid.UUID(inv.SchoolID.Bytes))
}

func extendSubscriptionEnd(current pgtype.Timestamptz, days int) pgtype.Timestamptz {
	now := time.Now().UTC()
	base := now
	if current.Valid && current.Time.After(now) {
		base = current.Time.UTC()
	}
	return database.TimestamptzFromTime(base.AddDate(0, 0, days))
}

func paymentDTOFromListRow(r sqlc.ListPaymentsRow) paymentDTO {
	return paymentDTOFromPayment(sqlc.Payment{
		ID: r.ID, ParentID: r.ParentID, SchoolID: r.SchoolID, SubscriptionID: r.SubscriptionID,
		AmountCents: r.AmountCents, Currency: r.Currency, Method: r.Method, Status: r.Status,
		Reference: r.Reference, ProofUrl: r.ProofUrl, Notes: r.Notes,
		ApprovedBy: r.ApprovedBy, ApprovedAt: r.ApprovedAt,
		RejectedBy: r.RejectedBy, RejectedAt: r.RejectedAt,
		CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
	}, textOrEmpty(r.SchoolName))
}

func invoiceDTOFromListRow(r sqlc.ListInvoicesRow) invoiceDTO {
	return invoiceDTOFromInvoice(sqlc.Invoice{
		ID: r.ID, ParentID: r.ParentID, SchoolID: r.SchoolID, SubscriptionID: r.SubscriptionID,
		InvoiceNumber: r.InvoiceNumber, AmountCents: r.AmountCents, Currency: r.Currency,
		Status: r.Status, DueDate: r.DueDate, PaidAt: r.PaidAt,
		CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
	}, textOrEmpty(r.SchoolName))
}

func textOrEmpty(t pgtype.Text) string {
	if t.Valid {
		return t.String
	}
	return ""
}

func revenueShareDTOFromModel(s sqlc.SchoolRevenueShare) revenueShareDTO {
	dto := revenueShareDTO{
		ID:         s.ID.String(),
		SchoolID:   s.SchoolID.String(),
		ActiveFrom: s.ActiveFrom.Time.Format("2006-01-02"),
	}
	if f, err := s.Percentage.Float64Value(); err == nil && f.Valid {
		dto.Percentage = f.Float64
	}
	if s.ActiveTo.Valid {
		s := s.ActiveTo.Time.Format("2006-01-02")
		dto.ActiveTo = &s
	}
	return dto
}
