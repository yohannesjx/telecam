package monitoring

import "math"

// CameraHealthScorePercent returns percent of cameras considered healthy (0–100).
func CameraHealthScorePercent(healthy, total int64) float64 {
	if total <= 0 {
		return 100
	}
	pct := float64(healthy) / float64(total) * 100
	return math.Round(pct*10) / 10
}

// SegmentLagSeconds returns seconds since last segment minus expected live delay.
func SegmentLagSeconds(segmentAgeSeconds int64, liveDelaySeconds int) *int64 {
	if segmentAgeSeconds < 0 {
		return nil
	}
	lag := segmentAgeSeconds - int64(liveDelaySeconds)
	if lag < 0 {
		lag = 0
	}
	return &lag
}

// SegmentAgeMinutes converts seconds to minutes (one decimal).
func SegmentAgeMinutes(segmentAgeSeconds int64) *float64 {
	if segmentAgeSeconds < 0 {
		return nil
	}
	m := float64(segmentAgeSeconds) / 60.0
	m = math.Round(m*10) / 10
	return &m
}
