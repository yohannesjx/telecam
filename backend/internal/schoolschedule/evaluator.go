// Package schoolschedule provides per-school schedule evaluation for live streaming.
package schoolschedule

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// Live access reason codes.
const (
	ReasonOpen         = "OPEN"
	ReasonOutsideHours = "LIVE_OUTSIDE_SCHOOL_HOURS"
	ReasonLiveDisabled = "LIVE_DISABLED_FOR_SCHOOL"
	ReasonLivePaused   = "LIVE_TEMPORARILY_PAUSED"
)

// EvalResult holds the outcome of evaluating a school's schedule at a point in time.
type EvalResult struct {
	IsOpenNow                bool
	ReasonCode               string
	NextLiveAvailableAt      *time.Time
	Timezone                 string
	OpenDays                 []string
	OpenTime                 string
	CloseTime                string
	LiveEnabled              bool
	TemporaryLivePaused      bool
	TemporaryLivePauseReason string
}

// EnvDefaults holds the global fallback schedule from environment variables.
type EnvDefaults struct {
	Timezone  string
	OpenTime  string
	CloseTime string
	OpenDays  string // comma-separated abbreviations, e.g. "MON,TUE,WED,THU,FRI"
}

// DefaultsFromConfig extracts the env fallback values from the app config.
func DefaultsFromConfig(cfg *appconfig.Config) EnvDefaults {
	var days []string
	order := []struct {
		wd time.Weekday
		s  string
	}{
		{time.Monday, "MON"}, {time.Tuesday, "TUE"}, {time.Wednesday, "WED"},
		{time.Thursday, "THU"}, {time.Friday, "FRI"}, {time.Saturday, "SAT"}, {time.Sunday, "SUN"},
	}
	for _, o := range order {
		if cfg.RecordingWeekdays[o.wd] {
			days = append(days, o.s)
		}
	}
	// Also support DEFAULT_SCHOOL_DAYS / DEFAULT_SCHOOL_OPEN_TIME / DEFAULT_SCHOOL_CLOSE_TIME
	// names from the task spec. Fall through to existing RECORDING_* env values.
	return EnvDefaults{
		Timezone:  cfg.SchoolTimezone,
		OpenTime:  cfg.RecordingStartTime,
		CloseTime: cfg.RecordingEndTime,
		OpenDays:  strings.Join(days, ","),
	}
}

// scheduleStore is the database surface used by the evaluator.
type scheduleStore interface {
	GetSchoolScheduleSettings(ctx context.Context, schoolID uuid.UUID) (sqlc.SchoolScheduleSetting, error)
}

// Evaluator loads per-school schedule settings from the database, falling back
// to environment defaults when no row exists.
type Evaluator struct {
	q        scheduleStore
	defaults EnvDefaults
}

// NewEvaluator creates an Evaluator with the given store and env defaults.
func NewEvaluator(q *sqlc.Queries, defaults EnvDefaults) *Evaluator {
	return &Evaluator{q: q, defaults: defaults}
}

// ForSchool loads settings for a school, or returns env defaults if no row exists.
func (e *Evaluator) ForSchool(ctx context.Context, schoolID uuid.UUID) (*Settings, error) {
	row, err := e.q.GetSchoolScheduleSettings(ctx, schoolID)
	if errors.Is(err, pgx.ErrNoRows) {
		return e.settingsFromDefaults(), nil
	}
	if err != nil {
		return nil, fmt.Errorf("load school schedule %s: %w", schoolID, err)
	}
	return settingsFromRow(row)
}

func (e *Evaluator) settingsFromDefaults() *Settings {
	s, _ := buildSettings(
		e.defaults.Timezone,
		e.defaults.OpenDays,
		e.defaults.OpenTime,
		e.defaults.CloseTime,
		true,
		false,
		"",
	)
	return s
}

// Settings holds the parsed per-school (or fallback) schedule configuration.
type Settings struct {
	Timezone                 string
	openDaysList             []string
	openDays                 map[time.Weekday]bool
	openTime                 string
	closeTime                string
	LiveEnabled              bool
	TemporaryLivePaused      bool
	TemporaryLivePauseReason string
	loc                      *time.Location
	startH, startM           int
	endH, endM               int
}

// Evaluate returns the schedule state at time t (UTC).
func (s *Settings) Evaluate(t time.Time) EvalResult {
	base := EvalResult{
		Timezone:                 s.Timezone,
		OpenDays:                 s.openDaysList,
		OpenTime:                 s.openTime,
		CloseTime:                s.closeTime,
		LiveEnabled:              s.LiveEnabled,
		TemporaryLivePaused:      s.TemporaryLivePaused,
		TemporaryLivePauseReason: s.TemporaryLivePauseReason,
	}

	if !s.LiveEnabled {
		base.IsOpenNow = false
		base.ReasonCode = ReasonLiveDisabled
		return base
	}

	if s.TemporaryLivePaused {
		base.IsOpenNow = false
		base.ReasonCode = ReasonLivePaused
		return base
	}

	local := t.In(s.loc)
	if !s.openDays[local.Weekday()] {
		base.IsOpenNow = false
		base.ReasonCode = ReasonOutsideHours
		base.NextLiveAvailableAt = s.nextLiveStart(local)
		return base
	}

	if !s.withinHours(local) {
		base.IsOpenNow = false
		base.ReasonCode = ReasonOutsideHours
		base.NextLiveAvailableAt = s.nextLiveStart(local)
		return base
	}

	base.IsOpenNow = true
	base.ReasonCode = ReasonOpen
	return base
}

func (s *Settings) withinHours(t time.Time) bool {
	mins := t.Hour()*60 + t.Minute()
	start := s.startH*60 + s.startM
	end := s.endH*60 + s.endM
	return mins >= start && mins < end
}

func (s *Settings) nextLiveStart(from time.Time) *time.Time {
	local := from.In(s.loc)

	// Before open time today
	if s.openDays[local.Weekday()] && local.Hour()*60+local.Minute() < s.startH*60+s.startM {
		candidate := time.Date(local.Year(), local.Month(), local.Day(), s.startH, s.startM, 0, 0, s.loc)
		return &candidate
	}

	// Find next open day
	for d := 1; d <= 14; d++ {
		day := local.AddDate(0, 0, d)
		if s.openDays[day.Weekday()] {
			candidate := time.Date(day.Year(), day.Month(), day.Day(), s.startH, s.startM, 0, 0, s.loc)
			return &candidate
		}
	}
	return nil
}

func settingsFromRow(row sqlc.SchoolScheduleSetting) (*Settings, error) {
	pauseReason := ""
	if row.TemporaryLivePauseReason.Valid {
		pauseReason = row.TemporaryLivePauseReason.String
	}
	return buildSettings(
		row.Timezone,
		row.OpenDays,
		row.OpenTime,
		row.CloseTime,
		row.LiveEnabled,
		row.TemporaryLivePaused,
		pauseReason,
	)
}

func buildSettings(
	timezone, openDaysRaw, openTime, closeTime string,
	liveEnabled, temporaryPaused bool,
	pauseReason string,
) (*Settings, error) {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
		timezone = "UTC"
	}

	sh, sm, err := parseHM(openTime)
	if err != nil {
		return nil, fmt.Errorf("invalid open_time %q: %w", openTime, err)
	}
	eh, em, err := parseHM(closeTime)
	if err != nil {
		return nil, fmt.Errorf("invalid close_time %q: %w", closeTime, err)
	}
	if sh*60+sm >= eh*60+em {
		return nil, fmt.Errorf("open_time %q must be before close_time %q", openTime, closeTime)
	}

	days, daysList := parseDays(openDaysRaw)

	return &Settings{
		Timezone:                 timezone,
		openDaysList:             daysList,
		openDays:                 days,
		openTime:                 openTime,
		closeTime:                closeTime,
		LiveEnabled:              liveEnabled,
		TemporaryLivePaused:      temporaryPaused,
		TemporaryLivePauseReason: pauseReason,
		loc:                      loc,
		startH:                   sh,
		startM:                   sm,
		endH:                     eh,
		endM:                     em,
	}, nil
}

func parseDays(raw string) (map[time.Weekday]bool, []string) {
	abbrevs := map[string]time.Weekday{
		"SUN": time.Sunday, "MON": time.Monday, "TUE": time.Tuesday,
		"WED": time.Wednesday, "THU": time.Thursday, "FRI": time.Friday, "SAT": time.Saturday,
	}
	order := []struct {
		wd time.Weekday
		s  string
	}{
		{time.Monday, "MON"}, {time.Tuesday, "TUE"}, {time.Wednesday, "WED"},
		{time.Thursday, "THU"}, {time.Friday, "FRI"}, {time.Saturday, "SAT"}, {time.Sunday, "SUN"},
	}

	set := map[time.Weekday]bool{}
	for _, part := range strings.Split(raw, ",") {
		key := strings.TrimSpace(strings.ToUpper(part))
		if wd, ok := abbrevs[key]; ok {
			set[wd] = true
		}
	}

	var list []string
	for _, o := range order {
		if set[o.wd] {
			list = append(list, o.s)
		}
	}
	return set, list
}

func parseHM(value string) (int, int, error) {
	var h, m int
	if _, err := fmt.Sscanf(value, "%d:%d", &h, &m); err != nil {
		return 0, 0, fmt.Errorf("expected HH:MM format")
	}
	return h, m, nil
}

// ValidateDays returns an error if days contains any unknown abbreviation or is empty.
func ValidateDays(days []string) error {
	valid := map[string]bool{
		"MON": true, "TUE": true, "WED": true, "THU": true,
		"FRI": true, "SAT": true, "SUN": true,
	}
	if len(days) == 0 {
		return fmt.Errorf("open_days must not be empty")
	}
	for _, d := range days {
		if !valid[strings.ToUpper(d)] {
			return fmt.Errorf("unknown day %q; use MON,TUE,WED,THU,FRI,SAT,SUN", d)
		}
	}
	return nil
}
