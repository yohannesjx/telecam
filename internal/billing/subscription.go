package billing

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// ParentPaymentMethods are offline methods parents may use (Chapa and card gateways are not supported).
var ParentPaymentMethods = []string{"BANK_TRANSFER", "TELEBIRR", "CASH"}

// AllowsPlayback reports whether a subscription grants parent playback access.
func AllowsPlayback(sub sqlc.Subscription) bool {
	if sub.Status != "ACTIVE" && sub.Status != "TRIAL" {
		return false
	}
	if sub.EndsAt.Valid && !sub.EndsAt.Time.After(time.Now().UTC()) {
		return false
	}
	return true
}

// DaysRemaining returns whole calendar days until ends_at (UTC date).
// nil when there is no end date; 0 when already expired or ending today.
func DaysRemaining(endsAt pgtype.Timestamptz) *int {
	if !endsAt.Valid {
		return nil
	}
	end := endsAt.Time.UTC()
	now := time.Now().UTC()
	endDay := time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, time.UTC)
	nowDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	days := int(endDay.Sub(nowDay).Hours() / 24)
	if days < 0 {
		days = 0
	}
	return &days
}

// ValidSubscriptionStatuses for admin updates.
var ValidSubscriptionStatuses = map[string]bool{
	"ACTIVE":    true,
	"TRIAL":     true,
	"PAST_DUE":  true,
	"CANCELLED": true,
	"BLOCKED":   true,
}
