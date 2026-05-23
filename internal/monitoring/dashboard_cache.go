package monitoring

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const dashboardCacheKeyPrefix = "admin:dashboard:"

// DashboardCache stores aggregated dashboard JSON in Redis.
type DashboardCache struct {
	rdb *redis.Client
	ttl time.Duration
}

// NewDashboardCache creates a cache helper. ttl <= 0 disables caching.
func NewDashboardCache(rdb *redis.Client, ttl time.Duration) *DashboardCache {
	if ttl <= 0 {
		return &DashboardCache{}
	}
	return &DashboardCache{rdb: rdb, ttl: ttl}
}

// ScopeKey builds a stable cache key suffix from scoped school IDs (nil = global).
func ScopeKey(schoolIDs []uuid.UUID) string {
	if len(schoolIDs) == 0 {
		return "global"
	}
	ids := append([]uuid.UUID(nil), schoolIDs...)
	sort.Slice(ids, func(i, j int) bool {
		return strings.Compare(ids[i].String(), ids[j].String()) < 0
	})
	parts := make([]string, len(ids))
	for i, id := range ids {
		parts[i] = id.String()
	}
	return strings.Join(parts, ",")
}

// Get unmarshals cached dashboard JSON into dest. Returns false on miss or when disabled.
func (c *DashboardCache) Get(ctx context.Context, scopeKey string, dest any) bool {
	if c == nil || c.rdb == nil {
		return false
	}
	raw, err := c.rdb.Get(ctx, dashboardCacheKeyPrefix+scopeKey).Bytes()
	if err != nil {
		return false
	}
	return json.Unmarshal(raw, dest) == nil
}

// Set stores dashboard JSON with TTL.
func (c *DashboardCache) Set(ctx context.Context, scopeKey string, value any) error {
	if c == nil || c.rdb == nil {
		return nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal dashboard cache: %w", err)
	}
	return c.rdb.Set(ctx, dashboardCacheKeyPrefix+scopeKey, raw, c.ttl).Err()
}
