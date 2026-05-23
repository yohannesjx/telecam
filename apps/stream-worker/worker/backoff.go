package worker

import "time"

// ffmpegBackoffSequence returns delay before the next FFmpeg restart attempt.
// Sequence: 5s, 10s, 20s, 40s, then capped at 60s.
func ffmpegBackoffSequence(attempt int) time.Duration {
	delays := []time.Duration{
		5 * time.Second,
		10 * time.Second,
		20 * time.Second,
		40 * time.Second,
		60 * time.Second,
	}
	if attempt < 0 {
		attempt = 0
	}
	if attempt >= len(delays) {
		return delays[len(delays)-1]
	}
	return delays[attempt]
}

// uploadRetryDelay returns delay before the next upload retry.
func uploadRetryDelay(baseSeconds, attempt int) time.Duration {
	if baseSeconds < 1 {
		baseSeconds = 2
	}
	delay := time.Duration(baseSeconds) * time.Second
	for i := 0; i < attempt; i++ {
		delay *= 2
		if delay > 60*time.Second {
			return 60 * time.Second
		}
	}
	return delay
}
