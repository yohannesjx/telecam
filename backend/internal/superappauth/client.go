// Package superappauth provides a client for validating Super App bearer tokens
// via the Super App backend's token introspection endpoint.
// The School Camera backend never verifies Super App JWTs directly — it calls
// the introspect endpoint so JWT key material stays in the Super App backend.
package superappauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ContextKey is the Gin context key under which the authenticated Super App
// user is stored by RequireSuperAppUser middleware.
// Exported so handler packages can retrieve the value without importing gin.
const ContextKey = "superapp_user"

// User holds the minimal Super App user info returned by token introspection.
type User struct {
	UserID uuid.UUID
	Phone  string
	Status string
}

// Client validates a Super App access token by calling the Super App backend.
type Client interface {
	// Introspect returns (nil, nil) when the token is valid but the user is
	// inactive. Returns (*User, nil) for an active user. Returns (nil, err)
	// only for transport or protocol failures.
	Introspect(ctx context.Context, rawToken string) (*User, error)
}

// HTTPClient is the production Client implementation.
type HTTPClient struct {
	baseURL       string
	internalToken string
	httpClient    *http.Client
}

// NewHTTPClient creates an HTTPClient. baseURL must not end with a slash.
func NewHTTPClient(baseURL, internalToken string) *HTTPClient {
	return &HTTPClient{
		baseURL:       strings.TrimRight(baseURL, "/"),
		internalToken: internalToken,
		httpClient:    &http.Client{Timeout: 5 * time.Second},
	}
}

type introspectReq struct {
	Token string `json:"token"`
}

type introspectResp struct {
	Active bool   `json:"active"`
	UserID string `json:"user_id"`
	Phone  string `json:"phone"`
	Status string `json:"status"`
}

// Introspect calls POST /internal/auth/introspect on the Super App backend.
func (c *HTTPClient) Introspect(ctx context.Context, rawToken string) (*User, error) {
	body, err := json.Marshal(introspectReq{Token: rawToken})
	if err != nil {
		return nil, fmt.Errorf("superappauth: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/auth/introspect", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("superappauth: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.internalToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("superappauth: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("superappauth: unexpected status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("superappauth: read body: %w", err)
	}

	var result introspectResp
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("superappauth: decode response: %w", err)
	}

	if !result.Active {
		return nil, nil
	}

	userID, err := uuid.Parse(result.UserID)
	if err != nil {
		return nil, fmt.Errorf("superappauth: invalid user_id %q: %w", result.UserID, err)
	}

	return &User{
		UserID: userID,
		Phone:  result.Phone,
		Status: result.Status,
	}, nil
}
