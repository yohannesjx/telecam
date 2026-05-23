package retention

import (
	"os"
	"strconv"
	"time"
)

// WorkerConfig holds retention-worker settings.
type WorkerConfig struct {
	WorkerName                 string
	RunInterval                time.Duration
	BatchSize                  int32
	DryRun                     bool
	DeleteObjects              bool
	DeleteDBRows               bool
	RecordingDays              int
	TempPlaybackRetention      time.Duration
	StorageUsageReportHour   int
	Timezone                   string
}

// LoadWorkerConfig reads retention env vars.
func LoadWorkerConfig() WorkerConfig {
	tz := envOr("SCHOOL_TIMEZONE", "Africa/Addis_Ababa")
	return WorkerConfig{
		WorkerName:               envOr("RETENTION_WORKER_NAME", "retention-worker-1"),
		RunInterval:              time.Duration(envIntOr("RETENTION_RUN_INTERVAL_MINUTES", 60)) * time.Minute,
		BatchSize:                int32(envIntOr("RETENTION_BATCH_SIZE", 1000)),
		DryRun:                   envBoolOr("RETENTION_DRY_RUN", false),
		DeleteObjects:            envBoolOr("RETENTION_DELETE_OBJECTS", true),
		DeleteDBRows:             envBoolOr("RETENTION_DELETE_DB_ROWS", true),
		RecordingDays:            envIntOr("RETENTION_RECORDING_DAYS", 7),
		TempPlaybackRetention:    tempPlaybackRetention(),
		StorageUsageReportHour:   envIntOr("STORAGE_USAGE_REPORT_HOUR", 23),
		Timezone:                 tz,
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

func tempPlaybackRetention() time.Duration {
	if v := os.Getenv("TEMP_PLAYBACK_RETENTION_MINUTES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return time.Duration(n) * time.Minute
		}
	}
	recordingTTL := envIntOr("RECORDING_PLAYBACK_URL_TTL_MINUTES", 10)
	return time.Duration(recordingTTL) * time.Minute
}

func envBoolOr(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		return v == "1" || v == "true" || v == "yes"
	}
	return def
}
