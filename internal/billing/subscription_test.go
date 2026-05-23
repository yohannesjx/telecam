package billing

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

func TestAllowsPlayback(t *testing.T) {
	future := pgtype.Timestamptz{Time: time.Now().UTC().Add(24 * time.Hour), Valid: true}
	past := pgtype.Timestamptz{Time: time.Now().UTC().Add(-time.Hour), Valid: true}

	cases := []struct {
		status string
		ends   pgtype.Timestamptz
		want   bool
	}{
		{"ACTIVE", future, true},
		{"TRIAL", future, true},
		{"ACTIVE", pgtype.Timestamptz{}, true},
		{"ACTIVE", past, false},
		{"PAST_DUE", future, false},
		{"CANCELLED", future, false},
		{"BLOCKED", future, false},
	}
	for _, tc := range cases {
		sub := sqlc.Subscription{Status: tc.status, EndsAt: tc.ends}
		if got := AllowsPlayback(sub); got != tc.want {
			t.Fatalf("status=%s ends_valid=%v: got %v want %v", tc.status, tc.ends.Valid, got, tc.want)
		}
	}
}

func TestDaysRemaining(t *testing.T) {
	if DaysRemaining(pgtype.Timestamptz{}) != nil {
		t.Fatal("expected nil when no ends_at")
	}

	tomorrow := pgtype.Timestamptz{
		Time: time.Now().UTC().Add(36 * time.Hour),
		Valid: true,
	}
	if got := *DaysRemaining(tomorrow); got < 1 || got > 2 {
		t.Fatalf("expected 1-2 days for ~36h ahead, got %d", got)
	}

	past := pgtype.Timestamptz{
		Time: time.Now().UTC().Add(-48 * time.Hour),
		Valid: true,
	}
	if got := *DaysRemaining(past); got != 0 {
		t.Fatalf("expected 0 for past end, got %d", got)
	}
}
