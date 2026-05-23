package health

import (
	"testing"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
)

func TestLoadWorkerConfig_Defaults(t *testing.T) {
	t.Setenv("HEALTH_CHECK_INTERVAL_SECONDS", "30")
	t.Setenv("STREAM_WORKER_STALE_INTERVAL_MULTIPLIER", "2")

	cfg := LoadWorkerConfig(&appconfig.Config{})
	if cfg.CheckInterval != 30*time.Second {
		t.Fatalf("interval %v", cfg.CheckInterval)
	}
	if cfg.StreamWorkerStaleAfter != 60*time.Second {
		t.Fatalf("stale after %v", cfg.StreamWorkerStaleAfter)
	}
	if cfg.UploadFailureAlertCount != 5 {
		t.Fatalf("upload threshold %d", cfg.UploadFailureAlertCount)
	}
}
