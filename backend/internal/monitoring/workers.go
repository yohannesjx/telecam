package monitoring

import (
	"time"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// WorkerDisplayStatus maps heartbeat recency to RUNNING, STALE, or UNKNOWN.
func WorkerDisplayStatus(hb sqlc.WorkerHeartbeat, staleThresholdSeconds int) string {
	if staleThresholdSeconds <= 0 {
		staleThresholdSeconds = 120
	}
	if hb.LastSeenAt.Time.IsZero() {
		return "UNKNOWN"
	}
	age := time.Since(hb.LastSeenAt.Time)
	if age > time.Duration(staleThresholdSeconds)*time.Second {
		return "STALE"
	}
	if hb.Status != "" {
		return hb.Status
	}
	return "RUNNING"
}
