package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSMiddleware_AllowsConfiguredOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(corsMiddleware([]string{"http://localhost:53000"}))
	router.POST("/auth/login", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	t.Run("preflight", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/auth/login", nil)
		req.Header.Set("Origin", "http://localhost:53000")
		req.Header.Set("Access-Control-Request-Method", "POST")
		req.Header.Set("Access-Control-Request-Headers", "content-type,authorization")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusNoContent {
			t.Fatalf("status: got %d want %d", w.Code, http.StatusNoContent)
		}
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:53000" {
			t.Fatalf("allow-origin: got %q", got)
		}
	})

	t.Run("actual request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.Header.Set("Origin", "http://localhost:53000")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("status: got %d", w.Code)
		}
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:53000" {
			t.Fatalf("allow-origin: got %q", got)
		}
	})
}

func TestCORSMiddleware_BlocksUnknownOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(corsMiddleware([]string{"http://localhost:53000"}))
	router.POST("/auth/login", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodOptions, "/auth/login", nil)
	req.Header.Set("Origin", "https://evil.example")
	req.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("status: got %d want %d", w.Code, http.StatusForbidden)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("allow-origin should be empty, got %q", got)
	}
}
