package alertdelivery

import (
	"testing"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
)

func TestLoadWorkerConfig_TelegramDisabledByDefault(t *testing.T) {
	t.Setenv("TELEGRAM_ALERTS_ENABLED", "")
	cfg := LoadWorkerConfig(&appconfig.Config{SchoolTimezone: "UTC"})
	if cfg.TelegramEnabled {
		t.Fatal("expected telegram disabled by default")
	}
}

func TestParseSeverities(t *testing.T) {
	m := parseSeverities("CRITICAL, WARNING")
	if !m["CRITICAL"] || !m["WARNING"] {
		t.Fatalf("got %v", m)
	}
}
