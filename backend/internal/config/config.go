// Package config loads shared environment configuration for all services.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds common settings used across services.
type Config struct {
	// API
	APIPort string

	// PostgreSQL
	DatabaseURL string
	PostgresDSN string

	// Redis
	RedisAddr string

	// JWT / auth
	JWTAccessSecret  string
	JWTAccessTTL     time.Duration
	RefreshTokenTTL  time.Duration
	BcryptCost       int
	AppEncryptionKey string

	// S3 / MinIO / R2
	StorageProvider  string // minio | r2
	S3Endpoint       string
	S3PublicEndpoint string
	S3Bucket         string
	S3Region         string
	S3AccessKey      string
	S3SecretKey      string
	S3ForcePathStyle bool
	SignedURLExpiry  time.Duration

	// Stream worker
	StreamWorkerMode        string // demo | rtsp | mixed
	StreamWorkerPollSeconds int
	StreamWorkerName        string
	StreamWorkerMaxRestarts int

	// Stream worker hardening (Phase 8)
	StreamUploadMaxRetries         int
	StreamUploadRetryBaseSeconds   int
	CameraOfflineAfterSeconds      int
	StreamTempCleanupIntervalSec   int
	StreamTempMaxAgeMinutes        int

	// Playback signed URL TTLs
	LivePlaybackURLTTL     time.Duration
	RecordingPlaybackURLTTL time.Duration
	LiveDelaySeconds       int

	// School recording schedule (local timezone)
	SchoolTimezone    string
	RecordingStartTime string // HH:MM
	RecordingEndTime   string // HH:MM
	RecordingWeekdays  map[time.Weekday]bool

	// Playback rate limit (per user per minute; 0 = disabled)
	PlaybackRateLimitPerMinute int

	// Admin monitoring
	DashboardCacheTTL          time.Duration
	WorkerStaleThresholdSeconds int

	// Timeline grouping (gap between segments to merge into one block)
	TimelineSegmentGapSeconds int

	// HLS demo
	HLSDemoCameraID   string
	HLSSegmentSeconds int
	HLSLocalTmpDir    string
	SampleVideoPath   string

	// Deployment / security
	AppEnv              string
	Domain              string
	CaddyEmail          string
	CORSAllowedOrigins  []string
	DemoLiveEnabled     bool
	TelegramAlertsEnabled bool
	TelegramBotToken    string
	TelegramChatID      string
	S3PublicAnonymous   bool

	// Auth rate limiting
	AuthRateLimitEnabled              bool
	AuthRateLimitFailClosedProduction bool
	AuthLoginIPLimit                  int
	AuthLoginIPWindowSeconds          int
	AuthLoginEmailLimit               int
	AuthLoginEmailWindowSeconds       int
	AuthRefreshIPLimit                int
	AuthRefreshIPWindowSeconds        int
	AuthRefreshTokenLimit             int
	AuthRefreshTokenWindowSeconds     int

	// Firebase Cloud Messaging (parent push)
	FCMEnabled                   bool
	FCMProjectID                 string
	GoogleApplicationCredentials string

	// Super App auth bridge (Phase 2)
	// SuperAppBackendURL is the base URL of the Super App backend (no trailing slash).
	// Used to call POST /internal/auth/introspect to validate parent Super App tokens.
	// Empty in development falls through to legacy school auth only.
	SuperAppBackendURL string // SUPERAPP_BACKEND_URL

	// SuperAppInternalToken is the shared secret sent as X-Internal-Token when
	// calling the Super App backend's introspect endpoint.
	SuperAppInternalToken string // SUPERAPP_INTERNAL_TOKEN

	// ParentCodeHMACSecret is the HMAC-SHA256 key used to hash parent invitation
	// codes before storage. The raw code is never persisted.
	// Required in production. In development falls back to a loud warning.
	ParentCodeHMACSecret string // PARENT_CODE_HMAC_SECRET

	// ParentTrialDays is how long a newly linked parent's trial subscription lasts.
	// Defaults to 5 if unset or ≤ 0.
	ParentTrialDays int // PARENT_TRIAL_DAYS

	// Super App billing — monthly subscription amount shown in the billing summary.
	// No per-school pricing exists in this phase; a flat default is used.
	// Amount is in minor currency units (e.g., ETB cents × 100 if applicable).
	SchoolCameraMonthlyAmountMinor int64  // SCHOOL_CAMERA_MONTHLY_AMOUNT_MINOR (default 50000)
	SchoolCameraCurrency           string // SCHOOL_CAMERA_CURRENCY (default ETB)

	// SchoolCameraInternalToken is the shared secret the main Super App backend
	// must supply as X-Internal-Token when calling /internal/superapp/school-camera/*
	// endpoints. Empty in development (all callers rejected when unset).
	SchoolCameraInternalToken string // SCHOOL_CAMERA_INTERNAL_TOKEN

	// PaymentRequestExpiryMinutes is how long a pending payment request remains
	// valid before the main backend can no longer fulfill it. Defaults to 10.
	PaymentRequestExpiryMinutes int // PAYMENT_REQUEST_EXPIRY_MINUTES
}

// IsProduction reports whether APP_ENV is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.AppEnv, "production")
}

// Load reads configuration from environment variables with sensible defaults for local dev.
func Load() (*Config, error) {
	appEnv := envOr("APP_ENV", "local")
	demoLiveDefault := appEnv != "production"
	cfg := &Config{
		APIPort:                    envOr("API_PORT", "58081"),
		DatabaseURL:                buildDatabaseURL(),
		RedisAddr:                  envOr("REDIS_ADDR", "redis:6379"),
		JWTAccessSecret:            envOr("JWT_ACCESS_SECRET", "local_dev_access_secret_change_me"),
		JWTAccessTTL:               time.Duration(envIntOr("JWT_ACCESS_TTL_MINUTES", 15)) * time.Minute,
		RefreshTokenTTL:            time.Duration(envIntOr("REFRESH_TOKEN_TTL_DAYS", 30)) * 24 * time.Hour,
		BcryptCost:                 envIntOr("BCRYPT_COST", 12),
		AppEncryptionKey:           envOr("APP_ENCRYPTION_KEY", ""),
		StorageProvider:            envOr("STORAGE_PROVIDER", "minio"),
		S3Endpoint:                 envOr("S3_ENDPOINT", "http://minio:9000"),
		S3PublicEndpoint:           envOr("S3_PUBLIC_ENDPOINT", "http://localhost:59000"),
		S3Bucket:                   envOr("S3_BUCKET", "school-camera-local"),
		S3Region:                   envOr("S3_REGION", "us-east-1"),
		S3AccessKey:                envOr("S3_ACCESS_KEY", "minioadmin_local"),
		S3SecretKey:                envOr("S3_SECRET_KEY", "minioadmin_local_pass"),
		S3ForcePathStyle:           envBoolOr("S3_FORCE_PATH_STYLE", true),
		SignedURLExpiry:            envDurationOr("SIGNED_URL_EXPIRY", 1*time.Hour),
		LivePlaybackURLTTL:         time.Duration(envIntOr("LIVE_PLAYBACK_URL_TTL_MINUTES", 3)) * time.Minute,
		RecordingPlaybackURLTTL:    time.Duration(envIntOr("RECORDING_PLAYBACK_URL_TTL_MINUTES", 10)) * time.Minute,
		LiveDelaySeconds:           envIntOr("LIVE_DELAY_SECONDS", 30),
		SchoolTimezone:             envOr("SCHOOL_TIMEZONE", "Africa/Addis_Ababa"),
		RecordingStartTime:         envOr("RECORDING_START_TIME", "08:30"),
		RecordingEndTime:           envOr("RECORDING_END_TIME", "16:30"),
		PlaybackRateLimitPerMinute: envIntOr("PLAYBACK_RATE_LIMIT_PER_MINUTE", 60),
		DashboardCacheTTL:          time.Duration(envIntOr("DASHBOARD_CACHE_TTL_SECONDS", 45)) * time.Second,
		WorkerStaleThresholdSeconds: envIntOr("WORKER_STALE_THRESHOLD_SECONDS", 120),
		TimelineSegmentGapSeconds:  envIntOr("TIMELINE_SEGMENT_GAP_SECONDS", 30),
		HLSDemoCameraID:            envOr("HLS_DEMO_CAMERA_ID", "demo"),
		HLSSegmentSeconds:          envIntOr("HLS_SEGMENT_SECONDS", 10),
		HLSLocalTmpDir:             envOr("HLS_LOCAL_TMP_DIR", "/tmp/hls"),
		SampleVideoPath:            envOr("SAMPLE_VIDEO_PATH", "/samples/sample.mp4"),
		StreamWorkerMode:           envOr("STREAM_WORKER_MODE", "demo"),
		StreamWorkerPollSeconds:    envIntOr("STREAM_WORKER_POLL_SECONDS", 15),
		StreamWorkerName:           envOr("STREAM_WORKER_NAME", "stream-worker-1"),
		StreamWorkerMaxRestarts:      envIntOr("STREAM_WORKER_MAX_RESTARTS", 10),
		StreamUploadMaxRetries:         envIntOr("STREAM_UPLOAD_MAX_RETRIES", 5),
		StreamUploadRetryBaseSeconds:   envIntOr("STREAM_UPLOAD_RETRY_BASE_SECONDS", 2),
		CameraOfflineAfterSeconds:      envIntOr("CAMERA_OFFLINE_AFTER_SECONDS", 120),
		StreamTempCleanupIntervalSec:   envIntOr("STREAM_TEMP_CLEANUP_INTERVAL_SECONDS", 300),
		StreamTempMaxAgeMinutes:        envIntOr("STREAM_TEMP_MAX_AGE_MINUTES", 30),
		AppEnv:                         appEnv,
		Domain:                         envOr("DOMAIN", "localhost"),
		CaddyEmail:                     envOr("CADDY_EMAIL", ""),
		CORSAllowedOrigins:             parseCORSAllowedOrigins(appEnv),
		DemoLiveEnabled:                envBoolOr("DEMO_LIVE_ENABLED", demoLiveDefault),
		TelegramAlertsEnabled:          envBoolOr("TELEGRAM_ALERTS_ENABLED", false),
		TelegramBotToken:               envOr("TELEGRAM_BOT_TOKEN", ""),
		TelegramChatID:                 envOr("TELEGRAM_CHAT_ID", ""),
		S3PublicAnonymous:              envBoolOr("S3_BUCKET_PUBLIC_ACCESS", false),
		AuthRateLimitEnabled:           envBoolOr("AUTH_RATE_LIMIT_ENABLED", true),
		AuthRateLimitFailClosedProduction: envBoolOr("AUTH_RATE_LIMIT_FAIL_CLOSED_PRODUCTION", true),
		AuthLoginIPLimit:               envIntOr("AUTH_LOGIN_IP_LIMIT", 20),
		AuthLoginIPWindowSeconds:       envIntOr("AUTH_LOGIN_IP_WINDOW_SECONDS", 60),
		AuthLoginEmailLimit:            envIntOr("AUTH_LOGIN_EMAIL_LIMIT", 5),
		AuthLoginEmailWindowSeconds:    envIntOr("AUTH_LOGIN_EMAIL_WINDOW_SECONDS", 900),
		AuthRefreshIPLimit:             envIntOr("AUTH_REFRESH_IP_LIMIT", 60),
		AuthRefreshIPWindowSeconds:     envIntOr("AUTH_REFRESH_IP_WINDOW_SECONDS", 60),
		AuthRefreshTokenLimit:          envIntOr("AUTH_REFRESH_TOKEN_LIMIT", 10),
		AuthRefreshTokenWindowSeconds:  envIntOr("AUTH_REFRESH_TOKEN_WINDOW_SECONDS", 60),
		FCMEnabled:                     envBoolOr("FCM_ENABLED", false),
		FCMProjectID:                   envOr("FCM_PROJECT_ID", "school-camera-72810"),
		GoogleApplicationCredentials:   envOr("GOOGLE_APPLICATION_CREDENTIALS", ""),
		SuperAppBackendURL:             envOr("SUPERAPP_BACKEND_URL", ""),
		SuperAppInternalToken:          envOr("SUPERAPP_INTERNAL_TOKEN", ""),
		ParentCodeHMACSecret:           envOr("PARENT_CODE_HMAC_SECRET", ""),
		ParentTrialDays:                envIntOr("PARENT_TRIAL_DAYS", 5),
		SchoolCameraMonthlyAmountMinor: int64(envIntOr("SCHOOL_CAMERA_MONTHLY_AMOUNT_MINOR", 50000)),
		SchoolCameraCurrency:           envOr("SCHOOL_CAMERA_CURRENCY", "ETB"),
		SchoolCameraInternalToken:      envOr("SCHOOL_CAMERA_INTERNAL_TOKEN", ""),
		PaymentRequestExpiryMinutes:    envIntOr("PAYMENT_REQUEST_EXPIRY_MINUTES", 10),
	}
	cfg.RecordingWeekdays = parseRecordingDays(envOr("RECORDING_DAYS", "MON,TUE,WED,THU,FRI"))
	cfg.PostgresDSN = cfg.DatabaseURL
	if err := validateStreamWorkerMode(cfg.StreamWorkerMode); err != nil {
		return nil, err
	}
	if err := validateStorageProvider(cfg.StorageProvider); err != nil {
		return nil, err
	}
	return cfg, nil
}

func validateStreamWorkerMode(mode string) error {
	switch mode {
	case "demo", "rtsp", "mixed":
		return nil
	default:
		return fmt.Errorf("invalid STREAM_WORKER_MODE %q (allowed: demo, rtsp, mixed)", mode)
	}
}

func validateStorageProvider(provider string) error {
	switch provider {
	case "minio", "r2":
		return nil
	default:
		return fmt.Errorf("invalid STORAGE_PROVIDER %q (allowed: minio, r2)", provider)
	}
}

func parseRecordingDays(raw string) map[time.Weekday]bool {
	days := map[time.Weekday]bool{}
	abbrevs := map[string]time.Weekday{
		"SUN": time.Sunday, "MON": time.Monday, "TUE": time.Tuesday,
		"WED": time.Wednesday, "THU": time.Thursday, "FRI": time.Friday, "SAT": time.Saturday,
	}
	for _, part := range strings.Split(raw, ",") {
		key := strings.TrimSpace(strings.ToUpper(part))
		if wd, ok := abbrevs[key]; ok {
			days[wd] = true
		}
	}
	return days
}

func buildDatabaseURL() string {
	if u := os.Getenv("DATABASE_URL"); u != "" {
		return u
	}
	if dsn := os.Getenv("POSTGRES_DSN"); dsn != "" {
		return dsn
	}
	host := envOr("POSTGRES_HOST", "postgres")
	port := envOr("POSTGRES_PORT", "5432")
	db := envOr("POSTGRES_DB", "school_camera")
	user := envOr("POSTGRES_USER", "school_camera_user")
	pass := envOr("POSTGRES_PASSWORD", "school_camera_pass")
	ssl := envOr("POSTGRES_SSLMODE", "disable")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, port, db, ssl)
}

func BuildDatabaseURL() string {
	return buildDatabaseURL()
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envIntOr(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func envBoolOr(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		return v == "1" || v == "true" || v == "yes"
	}
	return def
}

func envDurationOr(key string, def time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return def
}

func parseCORSAllowedOrigins(appEnv string) []string {
	raw := os.Getenv("CORS_ALLOWED_ORIGINS")
	if raw == "" && !strings.EqualFold(appEnv, "production") {
		raw = "http://localhost:53000,http://127.0.0.1:53000"
	}
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			out = append(out, origin)
		}
	}
	return out
}
