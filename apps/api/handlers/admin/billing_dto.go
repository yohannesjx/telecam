package admin

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/billing"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

type subscriptionDTO struct {
	ID              string  `json:"id"`
	ParentID        string  `json:"parent_id"`
	ParentName      string  `json:"parent_name,omitempty"`
	SchoolID        string  `json:"school_id"`
	SchoolName      string  `json:"school_name,omitempty"`
	Status          string  `json:"status"`
	StartsAt        *string `json:"starts_at,omitempty"`
	EndsAt          *string `json:"ends_at,omitempty"`
	AllowedPlayback bool    `json:"allowed_playback"`
	CreatedAt       string  `json:"created_at"`
}

func subscriptionDTOFromRow(id, parentID, schoolID uuid.UUID, status string, starts, ends, created pgtype.Timestamptz, parentName, schoolName string) subscriptionDTO {
	sub := sqlc.Subscription{
		ID: id, ParentID: parentID, SchoolID: schoolID, Status: status,
		StartsAt: starts, EndsAt: ends, CreatedAt: created,
	}
	dto := subscriptionDTO{
		ID:              id.String(),
		ParentID:        parentID.String(),
		SchoolID:        schoolID.String(),
		Status:          status,
		AllowedPlayback: billing.AllowsPlayback(sub),
		CreatedAt:       tsRFC3339(created),
		ParentName:      parentName,
		SchoolName:      schoolName,
	}
	if starts.Valid {
		s := tsRFC3339(starts)
		dto.StartsAt = &s
	}
	if ends.Valid {
		s := tsRFC3339(ends)
		dto.EndsAt = &s
	}
	return dto
}

func subscriptionDTOFromSub(sub sqlc.Subscription, parentName, schoolName string) subscriptionDTO {
	return subscriptionDTOFromRow(sub.ID, sub.ParentID, sub.SchoolID, sub.Status, sub.StartsAt, sub.EndsAt, sub.CreatedAt, parentName, schoolName)
}

type paymentDTO struct {
	ID             string  `json:"id"`
	ParentID       *string `json:"parent_id,omitempty"`
	SchoolID       *string `json:"school_id,omitempty"`
	SchoolName     string  `json:"school_name,omitempty"`
	SubscriptionID *string `json:"subscription_id,omitempty"`
	AmountCents    int64   `json:"amount_cents"`
	Currency       string  `json:"currency"`
	Method         string  `json:"method"`
	Status         string  `json:"status"`
	Reference      string  `json:"reference,omitempty"`
	Notes          string  `json:"notes,omitempty"`
	ApprovedAt     *string `json:"approved_at,omitempty"`
	RejectedAt     *string `json:"rejected_at,omitempty"`
	CreatedAt      string  `json:"created_at"`
}

func paymentDTOFromPayment(p sqlc.Payment, schoolName string) paymentDTO {
	dto := paymentDTO{
		ID:          p.ID.String(),
		AmountCents: p.AmountCents,
		Currency:    p.Currency,
		Method:      p.Method,
		Status:      p.Status,
		SchoolName:  schoolName,
		CreatedAt:   tsRFC3339(p.CreatedAt),
	}
	if p.ParentID.Valid {
		s := uuid.UUID(p.ParentID.Bytes).String()
		dto.ParentID = &s
	}
	if p.SchoolID.Valid {
		s := uuid.UUID(p.SchoolID.Bytes).String()
		dto.SchoolID = &s
	}
	if p.SubscriptionID.Valid {
		s := uuid.UUID(p.SubscriptionID.Bytes).String()
		dto.SubscriptionID = &s
	}
	if p.Reference.Valid {
		dto.Reference = p.Reference.String
	}
	if p.Notes.Valid {
		dto.Notes = p.Notes.String
	}
	if p.ApprovedAt.Valid {
		s := tsRFC3339(p.ApprovedAt)
		dto.ApprovedAt = &s
	}
	if p.RejectedAt.Valid {
		s := tsRFC3339(p.RejectedAt)
		dto.RejectedAt = &s
	}
	return dto
}

type invoiceDTO struct {
	ID             string  `json:"id"`
	ParentID       *string `json:"parent_id,omitempty"`
	SchoolID       *string `json:"school_id,omitempty"`
	SchoolName     string  `json:"school_name,omitempty"`
	SubscriptionID *string `json:"subscription_id,omitempty"`
	InvoiceNumber  string  `json:"invoice_number"`
	AmountCents    int64   `json:"amount_cents"`
	Currency       string  `json:"currency"`
	Status         string  `json:"status"`
	DueDate        *string `json:"due_date,omitempty"`
	PaidAt         *string `json:"paid_at,omitempty"`
	CreatedAt      string  `json:"created_at"`
}

func invoiceDTOFromInvoice(i sqlc.Invoice, schoolName string) invoiceDTO {
	dto := invoiceDTO{
		ID:            i.ID.String(),
		InvoiceNumber: i.InvoiceNumber,
		AmountCents:   i.AmountCents,
		Currency:      i.Currency,
		Status:        i.Status,
		SchoolName:    schoolName,
		CreatedAt:     tsRFC3339(i.CreatedAt),
	}
	if i.ParentID.Valid {
		s := uuid.UUID(i.ParentID.Bytes).String()
		dto.ParentID = &s
	}
	if i.SchoolID.Valid {
		s := uuid.UUID(i.SchoolID.Bytes).String()
		dto.SchoolID = &s
	}
	if i.SubscriptionID.Valid {
		s := uuid.UUID(i.SubscriptionID.Bytes).String()
		dto.SubscriptionID = &s
	}
	if i.DueDate.Valid {
		s := i.DueDate.Time.Format("2006-01-02")
		dto.DueDate = &s
	}
	if i.PaidAt.Valid {
		s := tsRFC3339(i.PaidAt)
		dto.PaidAt = &s
	}
	return dto
}

type revenueShareDTO struct {
	ID         string  `json:"id"`
	SchoolID   string  `json:"school_id"`
	Percentage float64 `json:"percentage"`
	ActiveFrom string  `json:"active_from"`
	ActiveTo   *string `json:"active_to,omitempty"`
}

func tsRFC3339(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format(timeRFC3339)
}

func parseOptionalTime(s string) (pgtype.Timestamptz, error) {
	if s == "" {
		return pgtype.Timestamptz{}, nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return pgtype.Timestamptz{}, err
	}
	return pgtype.Timestamptz{Time: t.UTC(), Valid: true}, nil
}
