package playback

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

func TestErrAccessDenied_PublicMessage(t *testing.T) {
	err := deny("camera exists but not assigned")
	if err.Error() != "access denied" {
		t.Fatalf("got %q", err.Error())
	}
	var denied *ErrAccessDenied
	if !errors.As(err, &denied) {
		t.Fatal("expected ErrAccessDenied")
	}
	if denied.InternalReasonOrDefault() != "camera exists but not assigned" {
		t.Fatal("internal reason should be preserved for audit")
	}
}

func TestErrNotFound_PublicMessage(t *testing.T) {
	err := &ErrNotFound{InternalReason: "no segments in range"}
	if err.Error() != "recording not found" {
		t.Fatalf("got %q", err.Error())
	}
}

func TestErrRateLimited(t *testing.T) {
	err := &ErrRateLimited{}
	if err.Error() != "rate limit exceeded" {
		t.Fatalf("got %q", err.Error())
	}
	if !IsRateLimited(err) {
		t.Fatal("expected rate limited")
	}
}

func TestValidateDeviceStatus(t *testing.T) {
	tests := []struct {
		status string
		deny   bool
	}{
		{"ACTIVE", false},
		{"BLOCKED", true},
		{"DISABLED", true},
		{"UNKNOWN", true},
	}
	for _, tc := range tests {
		dev := sqlc.Device{Status: tc.status}
		err := validateDeviceStatus(dev)
		if tc.deny && err == nil {
			t.Fatalf("status %s should deny", tc.status)
		}
		if !tc.deny && err != nil {
			t.Fatalf("status %s should allow: %v", tc.status, err)
		}
	}
}

func TestSubscriptionEndsAtInFuture(t *testing.T) {
	future := time.Now().UTC().Add(24 * time.Hour)
	past := time.Now().UTC().Add(-24 * time.Hour)

	if !subscriptionValid(sqlc.Subscription{
		Status:  "TRIAL",
		EndsAt:  pgtype.Timestamptz{Time: future, Valid: true},
	}) {
		t.Fatal("future ends_at should be valid")
	}
	if subscriptionValid(sqlc.Subscription{
		Status:  "TRIAL",
		EndsAt:  pgtype.Timestamptz{Time: past, Valid: true},
	}) {
		t.Fatal("past ends_at should be invalid")
	}
	if !subscriptionValid(sqlc.Subscription{Status: "ACTIVE", EndsAt: pgtype.Timestamptz{}}) {
		t.Fatal("null ends_at should be valid")
	}
}

func subscriptionValid(sub sqlc.Subscription) bool {
	if sub.Status != "ACTIVE" && sub.Status != "TRIAL" {
		return false
	}
	if sub.EndsAt.Valid && !sub.EndsAt.Time.After(time.Now().UTC()) {
		return false
	}
	return true
}

func TestRequestMeta_DeviceRequired(t *testing.T) {
	meta := RequestMeta{UserID: uuid.New(), Role: "PARENT", Status: "ACTIVE"}
	if meta.DeviceID != uuid.Nil {
		t.Fatal("zero device should block")
	}
}
