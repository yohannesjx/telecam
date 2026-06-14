package config

import (
	"encoding/base64"
	"fmt"
	"log/slog"
	"strings"
)

const defaultJWTSecret = "local_dev_access_secret_change_me"

// ValidateProduction fails startup when APP_ENV=production and unsafe settings are detected.
func ValidateProduction(cfg *Config) error {
	if !cfg.IsProduction() {
		return nil
	}

	var errs []string

	if cfg.JWTAccessSecret == "" || cfg.JWTAccessSecret == defaultJWTSecret {
		errs = append(errs, "JWT_ACCESS_SECRET must be set to a unique value (not the local default)")
	}
	if len(cfg.JWTAccessSecret) < 32 {
		errs = append(errs, "JWT_ACCESS_SECRET must be at least 32 characters")
	}

	if cfg.AppEncryptionKey == "" {
		errs = append(errs, "APP_ENCRYPTION_KEY is required in production")
	} else if key, err := base64.StdEncoding.DecodeString(cfg.AppEncryptionKey); err != nil || len(key) != 32 {
		errs = append(errs, "APP_ENCRYPTION_KEY must be a valid base64-encoded 32-byte key")
	}

	if cfg.TelegramAlertsEnabled {
		if cfg.TelegramBotToken == "" || cfg.TelegramChatID == "" {
			errs = append(errs, "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required when TELEGRAM_ALERTS_ENABLED=true")
		}
	}

	if cfg.DemoLiveEnabled {
		errs = append(errs, "DEMO_LIVE_ENABLED must be false in production")
	}

	domain := strings.ToLower(strings.TrimSpace(cfg.Domain))
	if domain == "" || domain == "localhost" || strings.HasPrefix(domain, "127.") {
		errs = append(errs, "DOMAIN must be set to your public hostname (not localhost)")
	}

	if cfg.S3PublicAnonymous {
		errs = append(errs, "S3 bucket must not allow public anonymous access")
	}

	if len(errs) > 0 {
		return fmt.Errorf("production safety checks failed:\n- %s", strings.Join(errs, "\n- "))
	}
	return nil
}

// LogProductionWarnings logs non-fatal production advisories.
func LogProductionWarnings(cfg *Config, logger *slog.Logger) {
	if !cfg.IsProduction() || logger == nil {
		return
	}
	if strings.Contains(cfg.DatabaseURL, "sslmode=disable") {
		logger.Warn("DATABASE_URL uses sslmode=disable; use TLS if Postgres is reachable outside the Docker network")
	}
	if cfg.RedisAddr != "" && !strings.Contains(cfg.RedisAddr, "@") {
		logger.Warn("REDIS_ADDR has no password; ensure Redis is not exposed publicly")
	}
}
