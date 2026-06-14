package superappauth_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"

	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
)

func TestHTTPClient_Introspect(t *testing.T) {
	const internalToken = "test-secret"

	t.Run("active user returns User", func(t *testing.T) {
		uid := uuid.New()
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost || r.URL.Path != "/internal/auth/introspect" {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			if r.Header.Get("X-Internal-Token") != internalToken {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"active":  true,
				"user_id": uid.String(),
				"phone":   "+251911000001",
				"status":  "active",
			})
		}))
		defer srv.Close()

		client := superappauth.NewHTTPClient(srv.URL, internalToken)
		user, err := client.Introspect(context.Background(), "sometoken")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if user == nil {
			t.Fatal("expected non-nil user for active token")
		}
		if user.UserID != uid {
			t.Fatalf("user_id: want %s, got %s", uid, user.UserID)
		}
		if user.Phone != "+251911000001" {
			t.Fatalf("phone: want +251911000001, got %s", user.Phone)
		}
		if user.Status != "active" {
			t.Fatalf("status: want active, got %s", user.Status)
		}
	})

	t.Run("inactive user returns nil user, nil error", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"active": false})
		}))
		defer srv.Close()

		client := superappauth.NewHTTPClient(srv.URL, internalToken)
		user, err := client.Introspect(context.Background(), "badtoken")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if user != nil {
			t.Fatalf("expected nil user for inactive token, got %+v", user)
		}
	})

	t.Run("server error returns error", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer srv.Close()

		client := superappauth.NewHTTPClient(srv.URL, internalToken)
		_, err := client.Introspect(context.Background(), "sometoken")
		if err == nil {
			t.Fatal("expected error for 500 response")
		}
	})

	t.Run("wrong internal token returns error", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusForbidden)
		}))
		defer srv.Close()

		client := superappauth.NewHTTPClient(srv.URL, "wrong-token")
		_, err := client.Introspect(context.Background(), "sometoken")
		if err == nil {
			t.Fatal("expected error for 403 response")
		}
	})
}
