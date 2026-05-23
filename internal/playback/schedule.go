package playback

import (
	"fmt"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
)

// Schedule validates recording window rules in the school timezone.
type Schedule struct {
	loc      *time.Location
	startH   int
	startM   int
	endH     int
	endM     int
	weekdays map[time.Weekday]bool
	tzName   string
	startRaw string
	endRaw   string
}

// NewSchedule builds a schedule from config.
func NewSchedule(cfg *appconfig.Config) (*Schedule, error) {
	loc, err := time.LoadLocation(cfg.SchoolTimezone)
	if err != nil {
		return nil, fmt.Errorf("load timezone %q: %w", cfg.SchoolTimezone, err)
	}
	sh, sm, err := parseHM(cfg.RecordingStartTime)
	if err != nil {
		return nil, err
	}
	eh, em, err := parseHM(cfg.RecordingEndTime)
	if err != nil {
		return nil, err
	}
	return &Schedule{
		loc:      loc,
		startH:   sh,
		startM:   sm,
		endH:     eh,
		endM:     em,
		weekdays: cfg.RecordingWeekdays,
		tzName:   cfg.SchoolTimezone,
		startRaw: cfg.RecordingStartTime,
		endRaw:   cfg.RecordingEndTime,
	}, nil
}

// Timezone returns the configured IANA timezone name.
func (s *Schedule) Timezone() string {
	return s.tzName
}

// RecordingStartTime returns HH:MM school recording start.
func (s *Schedule) RecordingStartTime() string {
	return s.startRaw
}

// RecordingEndTime returns HH:MM school recording end.
func (s *Schedule) RecordingEndTime() string {
	return s.endRaw
}

// RecordingDaysList returns weekday abbreviations (MON, TUE, ...).
func (s *Schedule) RecordingDaysList() []string {
	order := []struct {
		wd time.Weekday
		ab string
	}{
		{time.Monday, "MON"}, {time.Tuesday, "TUE"}, {time.Wednesday, "WED"},
		{time.Thursday, "THU"}, {time.Friday, "FRI"}, {time.Saturday, "SAT"}, {time.Sunday, "SUN"},
	}
	var out []string
	for _, o := range order {
		if s.weekdays[o.wd] {
			out = append(out, o.ab)
		}
	}
	return out
}

// IsWithinRecordingWindow reports whether t falls on a recording weekday and school hours.
func (s *Schedule) IsWithinRecordingWindow(t time.Time) bool {
	local := t.In(s.loc)
	if !s.weekdays[local.Weekday()] {
		return false
	}
	return withinHours(local, s.startH, s.startM, s.endH, s.endM)
}

// NextLiveAvailableAt returns the next time live view may be available (school timezone).
func (s *Schedule) NextLiveAvailableAt(from time.Time) *time.Time {
	local := from.In(s.loc)
	if s.IsWithinRecordingWindow(from) {
		return nil
	}
	if !s.weekdays[local.Weekday()] {
		return s.nextRecordingStartAfter(local)
	}
	if withinHours(local, s.startH, s.startM, s.endH, s.endM) {
		return nil
	}
	if local.Hour()*60+local.Minute() < s.startH*60+s.startM {
		start := time.Date(local.Year(), local.Month(), local.Day(), s.startH, s.startM, 0, 0, s.loc)
		return &start
	}
	return s.nextRecordingStartAfter(local)
}

func (s *Schedule) nextRecordingStartAfter(from time.Time) *time.Time {
	local := from.In(s.loc)
	for d := 0; d <= 14; d++ {
		day := local.AddDate(0, 0, d)
		if !s.weekdays[day.Weekday()] {
			continue
		}
		start := time.Date(day.Year(), day.Month(), day.Day(), s.startH, s.startM, 0, 0, s.loc)
		if start.After(local) {
			return &start
		}
	}
	return nil
}

// ValidateRange ensures start/end fall on allowed weekdays and within school hours.
func (s *Schedule) ValidateRange(start, end time.Time) error {
	if !end.After(start) {
		return fmt.Errorf("end must be after start")
	}
	if end.Sub(start) > time.Hour {
		return fmt.Errorf("playback window cannot exceed 1 hour")
	}
	localStart := start.In(s.loc)
	localEnd := end.In(s.loc)
	if localStart.Weekday() != localEnd.Weekday() || localStart.Format("2006-01-02") != localEnd.Format("2006-01-02") {
		return fmt.Errorf("playback must be within a single calendar day in school timezone")
	}
	if !s.weekdays[localStart.Weekday()] {
		return fmt.Errorf("recordings are not available on this weekday")
	}
	if !withinHours(localStart, s.startH, s.startM, s.endH, s.endM) || !withinHours(localEnd, s.startH, s.startM, s.endH, s.endM) {
		return fmt.Errorf("requested time is outside school recording hours")
	}
	return nil
}

func parseHM(value string) (int, int, error) {
	var h, m int
	if _, err := fmt.Sscanf(value, "%d:%d", &h, &m); err != nil {
		return 0, 0, fmt.Errorf("invalid time %q: %w", value, err)
	}
	return h, m, nil
}

func withinHours(t time.Time, startH, startM, endH, endM int) bool {
	mins := t.Hour()*60 + t.Minute()
	start := startH*60 + startM
	end := endH*60 + endM
	return mins >= start && mins <= end
}
