package health

import (
	"os"
	"strconv"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
)

// WorkerConfig holds health-worker tuning from the environment.
type WorkerConfig struct {
	WorkerName                    string
	CheckInterval                 time.Duration
	CameraOfflineAlert            time.Duration
	SchoolOfflineAlert            time.Duration
	NoSegmentAlert                time.Duration
	PlaylistStaleAlert            time.Duration
	UploadFailureAlertCount       int64
	FFmpegRestartAlertCount       int64
	HealthEventLookback           time.Duration
	StreamWorkerStaleAfter        time.Duration
}

// LoadWorkerConfig reads health-worker settings (uses shared app config for DB/S3/schedule).
func LoadWorkerConfig(app *appconfig.Config) WorkerConfig {
	intervalSec := envIntOr("HEALTH_CHECK_INTERVAL_SECONDS", 30)
	interval := time.Duration(intervalSec) * time.Second
	staleMult := envIntOr("STREAM_WORKER_STALE_INTERVAL_MULTIPLIER", 2)
	return WorkerConfig{
		WorkerName:              envOr("HEALTH_WORKER_NAME", "health-worker-1"),
		CheckInterval:           interval,
		CameraOfflineAlert:      time.Duration(envIntOr("CAMERA_OFFLINE_ALERT_SECONDS", 300)) * time.Second,
		SchoolOfflineAlert:      time.Duration(envIntOr("SCHOOL_OFFLINE_ALERT_SECONDS", 600)) * time.Second,
		NoSegmentAlert:          time.Duration(envIntOr("NO_SEGMENT_ALERT_SECONDS", 180)) * time.Second,
		PlaylistStaleAlert:      time.Duration(envIntOr("PLAYLIST_STALE_ALERT_SECONDS", 180)) * time.Second,
		UploadFailureAlertCount: int64(envIntOr("UPLOAD_FAILURE_ALERT_COUNT", 5)),
		FFmpegRestartAlertCount: int64(envIntOr("FFMPEG_RESTART_ALERT_COUNT", 5)),
		HealthEventLookback:     time.Duration(envIntOr("HEALTH_EVENT_LOOKBACK_MINUTES", 10)) * time.Minute,
		StreamWorkerStaleAfter:  time.Duration(staleMult*intervalSec) * time.Second,
	}
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
