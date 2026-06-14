package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/school-camera-platform/school-camera-platform/internal/superappauth"
)

// fakeClient is a test double for superappauth.Client.
type fakeClient struct {
	user *superappauth.User
	err  error
}

func (f *fakeClient) Introspect(_ context.Context, _ string) (*superappauth.User, error) {
	return f.user, f.err
}

func testRouterWithSuperAppMiddleware(client superappauth.Client) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	g := r.Group("/parent/superapp")
	g.Use(RequireSuperAppUser(client))
	g.GET("/status", func(c *gin.Context) {
		user, ok := SuperAppUserFromContext(c)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no user in context"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user_id": user.UserID})
	})
	return r
}

func TestRequireSuperAppUser_MissingToken(t *testing.T) {
	r := testRouterWithSuperAppMiddleware(&fakeClient{})
	req := httptest.NewRequest(http.MethodGet, "/parent/superapp/status", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["code"] != "SUPERAPP_AUTH_REQUIRED" {
		t.Fatalf("want code SUPERAPP_AUTH_REQUIRED, got %s", body["code"])
	}
}

func TestRequireSuperAppUser_InactiveToken(t *testing.T) {
	r := testRouterWithSuperAppMiddleware(&fakeClient{user: nil, err: nil})
	req := httptest.NewRequest(http.MethodGet, "/parent/superapp/status", nil)
	req.Header.Set("Authorization", "Bearer inactive-token")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["code"] != "SUPERAPP_AUTH_INVALID" {
		t.Fatalf("want code SUPERAPP_AUTH_INVALID, got %s", body["code"])
	}
}

func TestRequireSuperAppUser_ValidToken(t *testing.T) {
	uid := uuid.New()
	activeUser := &superappauth.User{UserID: uid, Phone: "+251911000001", Status: "active"}
	r := testRouterWithSuperAppMiddleware(&fakeClient{user: activeUser})

	req := httptest.NewRequest(http.MethodGet, "/parent/superapp/status", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["user_id"] != uid.String() {
		t.Fatalf("want user_id %s, got %v", uid, body["user_id"])
	}
}
