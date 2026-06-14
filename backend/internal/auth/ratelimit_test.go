package auth

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestRateLimiter_LoginIPLimit(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	limiter := NewRateLimiter(rdb, RateLimitConfig{
		Enabled:         true,
		LoginIPLimit:    2,
		LoginIPWindow:   time.Minute,
		LoginEmailLimit: 100,
		LoginEmailWindow: time.Minute,
	}, nil)

	ctx := context.Background()
	ip := "203.0.113.1"
	email := "parent@example.com"

	for i := 0; i < 2; i++ {
		ok, err := limiter.AllowLogin(ctx, ip, email)
		if err != nil || !ok {
			t.Fatalf("attempt %d: ok=%v err=%v", i+1, ok, err)
		}
	}
	ok, err := limiter.AllowLogin(ctx, ip, email)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("expected IP limit to block third attempt")
	}
}

func TestRateLimiter_LoginEmailLimit(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	limiter := NewRateLimiter(rdb, RateLimitConfig{
		Enabled:          true,
		LoginIPLimit:     100,
		LoginIPWindow:    time.Minute,
		LoginEmailLimit:  2,
		LoginEmailWindow: 15 * time.Minute,
	}, nil)

	ctx := context.Background()
	for i := 0; i < 2; i++ {
		ok, _ := limiter.AllowLogin(ctx, "203.0.113.2", "User@Example.COM")
		if !ok {
			t.Fatalf("attempt %d should pass", i+1)
		}
	}
	ok, _ := limiter.AllowLogin(ctx, "203.0.113.99", "user@example.com")
	if ok {
		t.Fatal("expected email limit across IPs")
	}
}

func TestRateLimiter_RefreshLimit(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer mr.Close()

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	limiter := NewRateLimiter(rdb, RateLimitConfig{
		Enabled:            true,
		RefreshIPLimit:     100,
		RefreshIPWindow:    time.Minute,
		RefreshTokenLimit:  1,
		RefreshTokenWindow: time.Minute,
	}, nil)

	ctx := context.Background()
	token := "refresh-token-abc"
	ok, _ := limiter.AllowRefresh(ctx, "203.0.113.3", token)
	if !ok {
		t.Fatal("first refresh should pass")
	}
	ok, _ = limiter.AllowRefresh(ctx, "203.0.113.3", token)
	if ok {
		t.Fatal("second refresh for same token should fail")
	}
}

func TestRateLimiter_FailOpenWhenRedisMissing(t *testing.T) {
	limiter := NewRateLimiter(nil, RateLimitConfig{
		Enabled:        true,
		IsProduction:   false,
		LoginIPLimit:   1,
		LoginIPWindow:  time.Minute,
		LoginEmailLimit: 1,
		LoginEmailWindow: time.Minute,
	}, nil)
	ok, err := limiter.AllowLogin(context.Background(), "1.2.3.4", "a@b.com")
	if err != nil || !ok {
		t.Fatalf("expected fail open, ok=%v err=%v", ok, err)
	}
}

func TestRateLimiter_FailClosedProduction(t *testing.T) {
	limiter := NewRateLimiter(nil, RateLimitConfig{
		Enabled:                true,
		IsProduction:           true,
		FailClosedInProduction: true,
		LoginIPLimit:           10,
		LoginIPWindow:          time.Minute,
		LoginEmailLimit:        10,
		LoginEmailWindow:       time.Minute,
	}, nil)
	ok, err := limiter.AllowLogin(context.Background(), "1.2.3.4", "a@b.com")
	if err == nil || ok {
		t.Fatalf("expected fail closed, ok=%v err=%v", ok, err)
	}
}
