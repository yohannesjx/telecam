package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func testRouterWithCoreRoutes() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	registerCoreRoutes(router)
	registerNoRouteHandler(router)
	return router
}

func TestCoreRoutes_JSON(t *testing.T) {
	router := testRouterWithCoreRoutes()

	t.Run("GET /", func(t *testing.T) {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
		if w.Code != http.StatusOK {
			t.Fatalf("status: got %d body %s", w.Code, w.Body.String())
		}
		if ct := w.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
			t.Fatalf("content-type: %q", ct)
		}
		var body map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if body["status"] != "ok" || body["service"] != "school-camera-api" || body["version"] != apiVersion {
			t.Fatalf("unexpected body: %v", body)
		}
		if body["message"] == "" {
			t.Fatalf("expected message in root response")
		}
	})

	t.Run("GET /health", func(t *testing.T) {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health", nil))
		if w.Code != http.StatusOK {
			t.Fatalf("status: got %d body %s", w.Code, w.Body.String())
		}
		var body map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if body["status"] != "healthy" {
			t.Fatalf("unexpected body: %v", body)
		}
	})

	t.Run("GET /api/health via prefix strip", func(t *testing.T) {
		handler := stripAPIPrefixHandler(router)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/health", nil))
		if w.Code != http.StatusOK {
			t.Fatalf("status: got %d body %s", w.Code, w.Body.String())
		}
		var body map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if body["status"] != "healthy" {
			t.Fatalf("unexpected body: %v", body)
		}
	})
}
