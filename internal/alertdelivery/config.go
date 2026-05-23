package alertdelivery

import (
	"os"
	"strconv"
	"strings"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
)

// WorkerConfig holds alert-worker settings from the environment.
type WorkerConfig struct {
	WorkerName       string
	PollInterval     time.Duration
	MaxAttempts      int32
	TelegramEnabled  bool
	TelegramBotToken string
	TelegramChatID   string
	SendSeverities   map[string]bool
	Timezone         string
}

// LoadWorkerConfig reads alert-worker configuration.
func LoadWorkerConfig(app *appconfig.Config) WorkerConfig {
	enabled := strings.EqualFold(os.Getenv("TELEGRAM_ALERTS_ENABLED"), "true") ||
		os.Getenv("TELEGRAM_ALERTS_ENABLED") == "1"
	return WorkerConfig{
		WorkerName:       envOr("ALERT_WORKER_NAME", "alert-worker-1"),
		PollInterval:     time.Duration(envIntOr("ALERT_WORKER_POLL_SECONDS", 15)) * time.Second,
		MaxAttempts:      int32(envIntOr("ALERT_DELIVERY_MAX_ATTEMPTS", 5)),
		TelegramEnabled:  enabled,
		TelegramBotToken: os.Getenv("TELEGRAM_BOT_TOKEN"),
		TelegramChatID:   os.Getenv("TELEGRAM_CHAT_ID"),
		SendSeverities:   parseSeverities(envOr("ALERT_SEND_SEVERITIES", "CRITICAL,WARNING")),
		Timezone:         app.SchoolTimezone,
	}
}

func parseSeverities(raw string) map[string]bool {
	out := map[string]bool{}
	for _, part := range strings.Split(raw, ",") {
		key := strings.TrimSpace(strings.ToUpper(part))
		if key != "" {
			out[key] = true
		}
	}
	return out
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
