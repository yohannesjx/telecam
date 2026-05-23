package scheduler

import (
	"testing"
	"time"
)

func TestClock_WeekendStopped(t *testing.T) {
	cfg := WorkerConfig{
		Timezone:           "Africa/Addis_Ababa",
		RecordingStartTime: "08:30",
		RecordingEndTime:   "16:30",
		RecordingDays:      parseRecordingDays("MON,TUE,WED,THU,FRI"),
	}
	clock, err := NewClock(cfg)
	if err != nil {
		t.Fatal(err)
	}
	// Saturday 2026-05-23 in Addis
	sat := time.Date(2026, 5, 23, 10, 0, 0, 0, time.UTC)
	w := clock.Evaluate(sat)
	if w.DesiredState != DesiredStopped || w.Reason != ReasonWeekend {
		t.Fatalf("got %+v", w)
	}
}

func TestClock_WeekdayWithinSchedule(t *testing.T) {
	cfg := WorkerConfig{
		Timezone:           "Africa/Addis_Ababa",
		RecordingStartTime: "08:30",
		RecordingEndTime:   "16:30",
		RecordingDays:      parseRecordingDays("MON,TUE,WED,THU,FRI"),
	}
	clock, err := NewClock(cfg)
	if err != nil {
		t.Fatal(err)
	}
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	fri := time.Date(2026, 5, 22, 10, 0, 0, 0, loc)
	w := clock.Evaluate(fri)
	if w.DesiredState != DesiredRunning || w.Reason != ReasonWithinSchedule {
		t.Fatalf("got %+v", w)
	}
}
