package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestStripAPIPrefixHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	registerCoreRoutes(router)

	handler := stripAPIPrefixHandler(router)

	t.Run("GET /api/health", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
		handler.ServeHTTP(w, req)
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
