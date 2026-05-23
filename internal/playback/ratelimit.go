package playback

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// RateLimiter limits playback requests per user using Redis.
type RateLimiter struct {
	rdb    *redis.Client
	limit  int
	window time.Duration
}

// NewRateLimiter creates a limiter (limit 0 disables checks).
func NewRateLimiter(rdb *redis.Client, limitPerMinute int) *RateLimiter {
	return &RateLimiter{
		rdb:    rdb,
		limit:  limitPerMinute,
		window: time.Minute,
	}
}

// Allow returns false if the user exceeded the rate limit.
func (r *RateLimiter) Allow(ctx context.Context, userID uuid.UUID) (bool, error) {
	if r == nil || r.rdb == nil || r.limit <= 0 {
		return true, nil
	}
	key := fmt.Sprintf("playback:rate:%s", userID.String())
	n, err := r.rdb.Incr(ctx, key).Result()
	if err != nil {
		return true, err // fail open for local dev
	}
	if n == 1 {
		_ = r.rdb.Expire(ctx, key, r.window).Err()
	}
	return n <= int64(r.limit), nil
}
