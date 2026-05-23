package scheduler

import (
	"fmt"
	"time"
)

// Window describes the active recording schedule at a point in time.
type Window struct {
	CurrentState string
	DesiredState string
	Reason       string
	NextStartAt  *time.Time
	NextStopAt   *time.Time
}

// Clock evaluates school recording windows in a fixed timezone.
type Clock struct {
	loc      *time.Location
	startH   int
	startM   int
	endH     int
	endM     int
	weekdays map[time.Weekday]bool
}

// NewClock builds a schedule clock from worker config.
func NewClock(cfg WorkerConfig) (*Clock, error) {
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		return nil, fmt.Errorf("load timezone %q: %w", cfg.Timezone, err)
	}
	sh, sm, err := parseHM(cfg.RecordingStartTime)
	if err != nil {
		return nil, err
	}
	eh, em, err := parseHM(cfg.RecordingEndTime)
	if err != nil {
		return nil, err
	}
	return &Clock{
		loc:      loc,
		startH:   sh,
		startM:   sm,
		endH:     eh,
		endM:     em,
		weekdays: cfg.RecordingDays,
	}, nil
}

// Evaluate returns schedule state at time t.
func (c *Clock) Evaluate(t time.Time) Window {
	local := t.In(c.loc)
	if !c.weekdays[local.Weekday()] {
		ns := c.nextRecordingStartAfter(local)
		return Window{
			CurrentState: CurrentStateStopped,
			DesiredState: DesiredStopped,
			Reason:       ReasonWeekend,
			NextStartAt:  ns,
		}
	}
	if c.withinHours(local) {
		end := c.todayEnd(local)
		return Window{
			CurrentState: CurrentStateRunning,
			DesiredState: DesiredRunning,
			Reason:       ReasonWithinSchedule,
			NextStopAt:   &end,
		}
	}
	w := Window{
		CurrentState: CurrentStateStopped,
		DesiredState: DesiredStopped,
		Reason:       ReasonOutsideSchedule,
	}
	if c.beforeStart(local) {
		start := c.todayStart(local)
		w.NextStartAt = &start
	} else {
		w.NextStartAt = c.nextRecordingStartAfter(local)
	}
	return w
}

func (c *Clock) withinHours(t time.Time) bool {
	mins := t.Hour()*60 + t.Minute()
	start := c.startH*60 + c.startM
	end := c.endH*60 + c.endM
	return mins >= start && mins <= end
}

func (c *Clock) beforeStart(t time.Time) bool {
	return t.Hour()*60+t.Minute() < c.startH*60+c.startM
}

func (c *Clock) todayStart(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), c.startH, c.startM, 0, 0, c.loc)
}

func (c *Clock) todayEnd(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), c.endH, c.endM, 0, 0, c.loc)
}

func (c *Clock) nextRecordingStartAfter(from time.Time) *time.Time {
	local := from.In(c.loc)
	for d := 0; d <= 14; d++ {
		day := local.AddDate(0, 0, d)
		if !c.weekdays[day.Weekday()] {
			continue
		}
		start := c.todayStart(day)
		if start.After(local) {
			return &start
		}
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

// RecordingDaysList returns MON,TUE,... for API responses.
func (c *Clock) RecordingDaysList() []string {
	order := []struct {
		wd time.Weekday
		s  string
	}{
		{time.Monday, "MON"}, {time.Tuesday, "TUE"}, {time.Wednesday, "WED"},
		{time.Thursday, "THU"}, {time.Friday, "FRI"}, {time.Saturday, "SAT"}, {time.Sunday, "SUN"},
	}
	var out []string
	for _, o := range order {
		if c.weekdays[o.wd] {
			out = append(out, o.s)
		}
	}
	return out
}

func (c *Clock) Timezone() string {
	if c.loc != nil {
		return c.loc.String()
	}
	return "UTC"
}

func (c *Clock) StartTime() string {
	return fmt.Sprintf("%02d:%02d", c.startH, c.startM)
}

func (c *Clock) EndTime() string {
	return fmt.Sprintf("%02d:%02d", c.endH, c.endM)
}
