package parent

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// ── subscriptionAPIStatus ────────────────────────────────────────────────────

func TestSubscriptionAPIStatus_Trial(t *testing.T) {
	sub := sqlc.Subscription{
		Status: "TRIAL",
		EndsAt: pgtype.Timestamptz{Time: time.Now().UTC().Add(48 * time.Hour), Valid: true},
	}
	if got := subscriptionAPIStatus(sub, time.Now().UTC()); got != "trial" {
		t.Fatalf("expected trial, got %q", got)
	}
}

func TestSubscriptionAPIStatus_TrialExpired(t *testing.T) {
	sub := sqlc.Subscription{
		Status: "TRIAL",
		EndsAt: pgtype.Timestamptz{Time: time.Now().UTC().Add(-time.Hour), Valid: true},
	}
	if got := subscriptionAPIStatus(sub, time.Now().UTC()); got != "expired" {
		t.Fatalf("expected expired, got %q", got)
	}
}

func TestSubscriptionAPIStatus_Active(t *testing.T) {
	sub := sqlc.Subscription{
		Status: "ACTIVE",
		EndsAt: pgtype.Timestamptz{Time: time.Now().UTC().Add(30 * 24 * time.Hour), Valid: true},
	}
	if got := subscriptionAPIStatus(sub, time.Now().UTC()); got != "active" {
		t.Fatalf("expected active, got %q", got)
	}
}

func TestSubscriptionAPIStatus_ActiveExpired(t *testing.T) {
	sub := sqlc.Subscription{
		Status: "ACTIVE",
		EndsAt: pgtype.Timestamptz{Time: time.Now().UTC().Add(-time.Hour), Valid: true},
	}
	if got := subscriptionAPIStatus(sub, time.Now().UTC()); got != "expired" {
		t.Fatalf("expected expired, got %q", got)
	}
}

func TestSubscriptionAPIStatus_PastDue(t *testing.T) {
	sub := sqlc.Subscription{Status: "PAST_DUE"}
	if got := subscriptionAPIStatus(sub, time.Now().UTC()); got != "past_due" {
		t.Fatalf("expected past_due, got %q", got)
	}
}

func TestSubscriptionAPIStatus_Cancelled(t *testing.T) {
	sub := sqlc.Subscription{Status: "CANCELLED"}
	if got := subscriptionAPIStatus(sub, time.Now().UTC()); got != "cancelled" {
		t.Fatalf("expected cancelled, got %q", got)
	}
}

func TestSubscriptionAPIStatus_Blocked(t *testing.T) {
	sub := sqlc.Subscription{Status: "BLOCKED"}
	if got := subscriptionAPIStatus(sub, time.Now().UTC()); got != "blocked" {
		t.Fatalf("expected blocked, got %q", got)
	}
}

// ── buildBillingSummary ──────────────────────────────────────────────────────

func TestBuildBillingSummary_None(t *testing.T) {
	ss, bs := buildBillingSummary(sqlc.Subscription{}, false, 50000, "ETB")
	if ss.Status != "none" {
		t.Fatalf("expected none, got %q", ss.Status)
	}
	if ss.IsActive {
		t.Fatal("expected is_active false when no subscription")
	}
	if !bs.CanPay {
		t.Fatal("expected can_pay true when no subscription")
	}
	if bs.AmountDueMinor != 50000 {
		t.Fatalf("expected 50000, got %d", bs.AmountDueMinor)
	}
	if bs.Currency != "ETB" {
		t.Fatalf("expected ETB, got %q", bs.Currency)
	}
}

func TestBuildBillingSummary_Trial(t *testing.T) {
	endsAt := time.Now().UTC().Add(72 * time.Hour)
	sub := sqlc.Subscription{
		Status: "TRIAL",
		EndsAt: pgtype.Timestamptz{Time: endsAt, Valid: true},
	}
	ss, bs := buildBillingSummary(sub, true, 50000, "ETB")
	if ss.Status != "trial" {
		t.Fatalf("expected trial, got %q", ss.Status)
	}
	if !ss.IsActive {
		t.Fatal("expected is_active true for active trial")
	}
	if ss.TrialEndsAt == nil {
		t.Fatal("expected trial_ends_at to be set")
	}
	if bs.DueDate == nil {
		t.Fatal("expected due_date to be set for active trial")
	}
	// trial is active → can_pay false (no renewal needed yet)
	if bs.CanPay {
		t.Fatal("expected can_pay false for active trial")
	}
}

func TestBuildBillingSummary_ActivePaidSub(t *testing.T) {
	endsAt := time.Now().UTC().Add(30 * 24 * time.Hour)
	sub := sqlc.Subscription{
		Status: "ACTIVE",
		EndsAt: pgtype.Timestamptz{Time: endsAt, Valid: true},
	}
	ss, bs := buildBillingSummary(sub, true, 50000, "ETB")
	if ss.Status != "active" {
		t.Fatalf("expected active, got %q", ss.Status)
	}
	if !ss.IsActive {
		t.Fatal("expected is_active true for active subscription")
	}
	if ss.TrialEndsAt != nil {
		t.Fatal("expected trial_ends_at to be nil for non-trial")
	}
	if bs.CanPay {
		t.Fatal("expected can_pay false for active paid subscription")
	}
}

func TestBuildBillingSummary_ExpiredSub(t *testing.T) {
	endsAt := time.Now().UTC().Add(-24 * time.Hour)
	sub := sqlc.Subscription{
		Status: "ACTIVE",
		EndsAt: pgtype.Timestamptz{Time: endsAt, Valid: true},
	}
	ss, bs := buildBillingSummary(sub, true, 50000, "ETB")
	if ss.Status != "expired" {
		t.Fatalf("expected expired, got %q", ss.Status)
	}
	if ss.IsActive {
		t.Fatal("expected is_active false for expired subscription")
	}
	if !bs.CanPay {
		t.Fatal("expected can_pay true for expired subscription")
	}
	if bs.DueDate != nil {
		t.Fatal("expected due_date nil for expired subscription")
	}
}

// ── buildPaymentList / buildInvoiceList ──────────────────────────────────────

func TestBuildPaymentList_Empty(t *testing.T) {
	out := buildPaymentList(nil)
	if out == nil || len(out) != 0 {
		t.Fatalf("expected empty non-nil slice, got %v", out)
	}
}

func TestBuildInvoiceList_Empty(t *testing.T) {
	out := buildInvoiceList(nil)
	if out == nil || len(out) != 0 {
		t.Fatalf("expected empty non-nil slice, got %v", out)
	}
}

func TestBuildPaymentList_StatusLowercase(t *testing.T) {
	rows := []sqlc.ListPaymentsForParentSchoolRow{
		{
			Status:    "APPROVED",
			Currency:  "ETB",
			CreatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		},
	}
	out := buildPaymentList(rows)
	if out[0].Status != "approved" {
		t.Fatalf("expected lowercase status, got %q", out[0].Status)
	}
}

func TestBuildInvoiceList_StatusLowercase(t *testing.T) {
	rows := []sqlc.ListInvoicesForParentSchoolRow{
		{
			Status:    "PAID",
			Currency:  "ETB",
			CreatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		},
	}
	out := buildInvoiceList(rows)
	if out[0].Status != "paid" {
		t.Fatalf("expected lowercase status, got %q", out[0].Status)
	}
}

func TestBuildBillingSummary_NoSensitiveFields(t *testing.T) {
	sub := sqlc.Subscription{
		Status: "TRIAL",
		EndsAt: pgtype.Timestamptz{Time: time.Now().UTC().Add(72 * time.Hour), Valid: true},
	}
	ss, bs := buildBillingSummary(sub, true, 50000, "ETB")

	forbidden := []string{
		"rtsp_url", "encrypted_rtsp_url", "r2_live_path", "r2_recording_path",
		"stream_key", "hls_url", "signed_url", "proof_url", "notes",
		"approved_by", "rejected_by",
	}
	b, _ := json.Marshal(map[string]any{"subscription": ss, "billing": bs})
	payload := string(b)
	for _, field := range forbidden {
		if containsField(payload, field) {
			t.Fatalf("response must not contain %q", field)
		}
	}
}

func TestBuildPaymentList_NoSensitiveFields(t *testing.T) {
	rows := []sqlc.ListPaymentsForParentSchoolRow{
		{
			Status:    "APPROVED",
			Currency:  "ETB",
			CreatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
			Reference: pgtype.Text{String: "REF-001", Valid: true},
		},
	}
	out := buildPaymentList(rows)
	b, _ := json.Marshal(out)
	payload := string(b)

	forbidden := []string{"proof_url", "notes", "approved_by", "rejected_by", "rtsp_url", "encrypted_rtsp_url"}
	for _, field := range forbidden {
		if containsField(payload, field) {
			t.Fatalf("payment response must not contain %q", field)
		}
	}
}
