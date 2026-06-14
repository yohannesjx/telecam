package parent

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/billing"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/apps/api/response"
)

const timeRFC3339 = "2006-01-02T15:04:05Z07:00"

type parentSubscriptionDTO struct {
	ID               string   `json:"id"`
	SchoolID         string   `json:"school_id"`
	SchoolName       string   `json:"school_name"`
	Status           string   `json:"status"`
	StartsAt         *string  `json:"starts_at,omitempty"`
	EndsAt           *string  `json:"ends_at,omitempty"`
	DaysRemaining    *int     `json:"days_remaining"`
	AllowedPlayback  bool     `json:"allowed_playback"`
	PaymentMethods   []string `json:"payment_methods"`
}

type parentPaymentDTO struct {
	ID            string  `json:"id"`
	SchoolID      *string `json:"school_id,omitempty"`
	SchoolName    string  `json:"school_name,omitempty"`
	AmountCents   int64   `json:"amount_cents"`
	Currency      string  `json:"currency"`
	PaymentMethod string  `json:"payment_method"`
	Status        string  `json:"status"`
	Reference     string  `json:"reference,omitempty"`
	CreatedAt     string  `json:"created_at"`
}

type parentInvoiceDTO struct {
	ID            string  `json:"id"`
	SchoolID      *string `json:"school_id,omitempty"`
	SchoolName    string  `json:"school_name,omitempty"`
	InvoiceNumber string  `json:"invoice_number"`
	AmountCents   int64   `json:"amount_cents"`
	Currency      string  `json:"currency"`
	Status        string  `json:"status"`
	DueDate       *string `json:"due_date,omitempty"`
	PaidAt        *string `json:"paid_at,omitempty"`
	CreatedAt     string  `json:"created_at"`
}

// ListSubscriptions GET /parent/subscriptions
func (h *Handler) ListSubscriptions(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	rows, err := h.q.ListSubscriptionsByParent(c.Request.Context(), user.UserID)
	if err != nil {
		response.Internal(c, "failed to list subscriptions")
		return
	}

	out := make([]parentSubscriptionDTO, 0, len(rows))
	for _, r := range rows {
		sub := sqlc.Subscription{
			ID: r.ID, ParentID: r.ParentID, SchoolID: r.SchoolID, Status: r.Status,
			StartsAt: r.StartsAt, EndsAt: r.EndsAt, CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
		}
		dto := parentSubscriptionDTO{
			ID:              r.ID.String(),
			SchoolID:        r.SchoolID.String(),
			SchoolName:      r.SchoolName,
			Status:          r.Status,
			AllowedPlayback: billing.AllowsPlayback(sub),
			DaysRemaining:   billing.DaysRemaining(r.EndsAt),
			PaymentMethods:  billing.ParentPaymentMethods,
		}
		if r.StartsAt.Valid {
			s := r.StartsAt.Time.UTC().Format(timeRFC3339)
			dto.StartsAt = &s
		}
		if r.EndsAt.Valid {
			s := r.EndsAt.Time.UTC().Format(timeRFC3339)
			dto.EndsAt = &s
		}
		out = append(out, dto)
	}
	response.OK(c, http.StatusOK, out)
}

// ListPayments GET /parent/payments
func (h *Handler) ListPayments(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	rows, err := h.q.ListPaymentsForParent(c.Request.Context(), sqlc.ListPaymentsForParentParams{
		ParentID: pgtype.UUID{Bytes: user.UserID, Valid: true},
		Limit:    100,
	})
	if err != nil {
		response.Internal(c, "failed to list payments")
		return
	}

	out := make([]parentPaymentDTO, 0, len(rows))
	for _, r := range rows {
		dto := parentPaymentDTO{
			ID:            r.ID.String(),
			AmountCents:   r.AmountCents,
			Currency:      r.Currency,
			PaymentMethod: r.Method,
			Status:        r.Status,
			SchoolName:    textOrEmpty(r.SchoolName),
			CreatedAt:     tsFormat(r.CreatedAt),
		}
		if r.SchoolID.Valid {
			s := uuid.UUID(r.SchoolID.Bytes).String()
			dto.SchoolID = &s
		}
		if r.Reference.Valid {
			dto.Reference = r.Reference.String
		}
		out = append(out, dto)
	}
	response.OK(c, http.StatusOK, out)
}

// ListInvoices GET /parent/invoices
func (h *Handler) ListInvoices(c *gin.Context) {
	user, ok := h.user(c)
	if !ok {
		return
	}

	rows, err := h.q.ListInvoicesForParent(c.Request.Context(), sqlc.ListInvoicesForParentParams{
		ParentID: pgtype.UUID{Bytes: user.UserID, Valid: true},
		Limit:    100,
	})
	if err != nil {
		response.Internal(c, "failed to list invoices")
		return
	}

	out := make([]parentInvoiceDTO, 0, len(rows))
	for _, r := range rows {
		dto := parentInvoiceDTO{
			ID:            r.ID.String(),
			InvoiceNumber: r.InvoiceNumber,
			AmountCents:   r.AmountCents,
			Currency:      r.Currency,
			Status:        r.Status,
			SchoolName:    textOrEmpty(r.SchoolName),
			CreatedAt:     tsFormat(r.CreatedAt),
		}
		if r.SchoolID.Valid {
			s := uuid.UUID(r.SchoolID.Bytes).String()
			dto.SchoolID = &s
		}
		if r.DueDate.Valid {
			s := r.DueDate.Time.Format("2006-01-02")
			dto.DueDate = &s
		}
		if r.PaidAt.Valid {
			s := tsFormat(r.PaidAt)
			dto.PaidAt = &s
		}
		out = append(out, dto)
	}
	response.OK(c, http.StatusOK, out)
}

func tsFormat(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format(timeRFC3339)
}

func textOrEmpty(t pgtype.Text) string {
	if t.Valid {
		return t.String
	}
	return ""
}
