package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimitConfig holds auth endpoint rate limit settings.
type RateLimitConfig struct {
	Enabled                  bool
	FailClosedInProduction   bool
	IsProduction             bool
	LoginIPLimit             int
	LoginIPWindow            time.Duration
	LoginEmailLimit          int
	LoginEmailWindow         time.Duration
	RefreshIPLimit           int
	RefreshIPWindow          time.Duration
	RefreshTokenLimit        int
	RefreshTokenWindow       time.Duration
}

// RateLimiter enforces Redis-backed limits on auth endpoints.
type RateLimiter struct {
	rdb    *redis.Client
	cfg    RateLimitConfig
	logger *slog.Logger
}

// NewRateLimiter creates an auth rate limiter.
func NewRateLimiter(rdb *redis.Client, cfg RateLimitConfig, logger *slog.Logger) *RateLimiter {
	return &RateLimiter{rdb: rdb, cfg: cfg, logger: logger}
}

// AllowLogin returns false when IP or email limits are exceeded.
func (l *RateLimiter) AllowLogin(ctx context.Context, ip, email string) (bool, error) {
	if !l.cfg.Enabled {
		return true, nil
	}
	emailKey := normalizeEmail(email)
	if ok, err := l.allow(ctx, fmt.Sprintf("auth:login:ip:%s", ip), l.cfg.LoginIPLimit, l.cfg.LoginIPWindow); err != nil || !ok {
		return ok, err
	}
	return l.allow(ctx, fmt.Sprintf("auth:login:email:%s", emailKey), l.cfg.LoginEmailLimit, l.cfg.LoginEmailWindow)
}

// AllowRefresh returns false when IP or refresh-token limits are exceeded.
func (l *RateLimiter) AllowRefresh(ctx context.Context, ip, refreshTokenPlain string) (bool, error) {
	if !l.cfg.Enabled {
		return true, nil
	}
	tokenKey := refreshTokenRateKey(refreshTokenPlain, ip)
	if ok, err := l.allow(ctx, fmt.Sprintf("auth:refresh:ip:%s", ip), l.cfg.RefreshIPLimit, l.cfg.RefreshIPWindow); err != nil || !ok {
		return ok, err
	}
	return l.allow(ctx, fmt.Sprintf("auth:refresh:token:%s", tokenKey), l.cfg.RefreshTokenLimit, l.cfg.RefreshTokenWindow)
}

func (l *RateLimiter) allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error) {
	if limit <= 0 || window <= 0 {
		return true, nil
	}
	if l.rdb == nil {
		return l.onRedisMissing()
	}
	n, err := l.rdb.Incr(ctx, key).Result()
	if err != nil {
		return l.onRedisError(err)
	}
	if n == 1 {
		_ = l.rdb.Expire(ctx, key, window).Err()
	}
	return n <= int64(limit), nil
}

func (l *RateLimiter) onRedisMissing() (bool, error) {
	if l.cfg.FailClosedInProduction && l.cfg.IsProduction {
		return false, fmt.Errorf("redis unavailable")
	}
	if l.logger != nil {
		l.logger.Warn("auth rate limit skipped: redis client not configured")
	}
	return true, nil
}

func (l *RateLimiter) onRedisError(err error) (bool, error) {
	if l.cfg.FailClosedInProduction && l.cfg.IsProduction {
		return false, err
	}
	if l.logger != nil {
		l.logger.Warn("auth rate limit redis error; failing open", "error", err)
	}
	return true, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func refreshTokenRateKey(plain, ip string) string {
	if plain == "" {
		return "ip:" + ip
	}
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:8])
}
