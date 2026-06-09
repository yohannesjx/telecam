package scheduler

import (
	"os"
	"strconv"
	"strings"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/schoolschedule"
)

// WorkerConfig holds scheduler-worker settings.
type WorkerConfig struct {
	WorkerName         string
	Timezone           string
	RecordingStartTime string
	RecordingEndTime   string
	RecordingDays      map[time.Weekday]bool
	PollInterval       time.Duration
}

// LoadWorkerConfig reads scheduler env with fallback to shared recording settings.
func LoadWorkerConfig(app *appconfig.Config) WorkerConfig {
	tz := envOr("SCHEDULER_TIMEZONE", "")
	if tz == "" {
		tz = app.SchoolTimezone
	}
	start := envOr("SCHEDULER_RECORDING_START_TIME", "")
	if start == "" {
		start = app.RecordingStartTime
	}
	end := envOr("SCHEDULER_RECORDING_END_TIME", "")
	if end == "" {
		end = app.RecordingEndTime
	}
	daysRaw := envOr("SCHEDULER_RECORDING_DAYS", "")
	if daysRaw == "" {
		daysRaw = strings.Join(recordingDaysToList(app.RecordingWeekdays), ",")
	}
	return WorkerConfig{
		WorkerName:         envOr("SCHEDULER_WORKER_NAME", "scheduler-worker-1"),
		Timezone:           tz,
		RecordingStartTime: start,
		RecordingEndTime:   end,
		RecordingDays:      parseRecordingDays(daysRaw),
		PollInterval:       time.Duration(envIntOr("SCHEDULER_POLL_SECONDS", 30)) * time.Second,
	}
}

// toEnvDefaults converts WorkerConfig to schoolschedule.EnvDefaults.
func (c WorkerConfig) toEnvDefaults() schoolschedule.EnvDefaults {
	return schoolschedule.EnvDefaults{
		Timezone:  c.Timezone,
		OpenTime:  c.RecordingStartTime,
		CloseTime: c.RecordingEndTime,
		OpenDays:  strings.Join(recordingDaysToList(c.RecordingDays), ","),
	}
}

func recordingDaysToList(days map[time.Weekday]bool) []string {
	abbrevs := []struct {
		wd time.Weekday
		s  string
	}{
		{time.Monday, "MON"}, {time.Tuesday, "TUE"}, {time.Wednesday, "WED"},
		{time.Thursday, "THU"}, {time.Friday, "FRI"}, {time.Saturday, "SAT"}, {time.Sunday, "SUN"},
	}
	var out []string
	for _, a := range abbrevs {
		if days[a.wd] {
			out = append(out, a.s)
		}
	}
	return out
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
