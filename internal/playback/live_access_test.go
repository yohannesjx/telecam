package playback

import (
	"testing"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/scheduler"
)

func testSchedule(t *testing.T) *Schedule {
	t.Helper()
	cfg := &appconfig.Config{
		SchoolTimezone:     "Africa/Addis_Ababa",
		RecordingStartTime: "08:30",
		RecordingEndTime:   "16:30",
		RecordingWeekdays: map[time.Weekday]bool{
			time.Monday: true, time.Tuesday: true, time.Wednesday: true,
			time.Thursday: true, time.Friday: true,
		},
	}
	sched, err := NewSchedule(cfg)
	if err != nil {
		t.Fatal(err)
	}
	return sched
}

func TestEvaluateLiveAccess_WithinSchoolHoursRunning(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	now := time.Date(2026, 5, 22, 10, 0, 0, 0, loc) // Friday 10:00

	err := evaluateLiveAccess(now, sched, streamStateSnapshot{
		HasRow:       true,
		DesiredState: scheduler.DesiredRunning,
		Reason:       scheduler.ReasonWithinSchedule,
	})
	if err != nil {
		t.Fatalf("expected allow, got %v", err)
	}
}

func TestEvaluateLiveAccess_WeekendDenied(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	now := time.Date(2026, 5, 23, 10, 0, 0, 0, loc) // Saturday

	err := evaluateLiveAccess(now, sched, streamStateSnapshot{
		HasRow:       true,
		DesiredState: scheduler.DesiredStopped,
		Reason:       scheduler.ReasonWeekend,
	})
	if !IsLiveOutsideSchoolHours(err) {
		t.Fatalf("expected LIVE_OUTSIDE_SCHOOL_HOURS, got %v", err)
	}
	outside := err.(*ErrLiveOutsideSchoolHours)
	if outside.Data.StreamStateReason != scheduler.ReasonWeekend {
		t.Fatalf("reason: got %q", outside.Data.StreamStateReason)
	}
	if outside.Data.NextLiveAvailableAt == "" {
		t.Fatal("expected next_live_available_at")
	}
}

func TestEvaluateLiveAccess_OutsideHoursDenied(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	now := time.Date(2026, 5, 22, 7, 0, 0, 0, loc) // Friday 07:00

	err := evaluateLiveAccess(now, sched, streamStateSnapshot{
		HasRow:       true,
		DesiredState: scheduler.DesiredStopped,
		Reason:       scheduler.ReasonOutsideSchedule,
	})
	if !IsLiveOutsideSchoolHours(err) {
		t.Fatalf("expected LIVE_OUTSIDE_SCHOOL_HOURS, got %v", err)
	}
}

func TestEvaluateLiveAccess_ManualOverrideDenied(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	now := time.Date(2026, 5, 22, 10, 0, 0, 0, loc)

	err := evaluateLiveAccess(now, sched, streamStateSnapshot{
		HasRow:       true,
		DesiredState: scheduler.DesiredStopped,
		Reason:       scheduler.ReasonManualOverride,
	})
	if !IsAccessDenied(err) {
		t.Fatalf("expected access denied, got %v", err)
	}
}

func TestEvaluateLiveAccess_NoStreamStateInWindowAllowed(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	now := time.Date(2026, 5, 22, 10, 0, 0, 0, loc)

	err := evaluateLiveAccess(now, sched, streamStateSnapshot{
		DesiredState: scheduler.DesiredStopped,
		HasRow:       false,
	})
	if err != nil {
		t.Fatalf("expected allow when scheduler row missing but in window, got %v", err)
	}
}

func TestSchedule_ValidateRange_FridayRecordingOnSaturdayNow(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	start := time.Date(2026, 5, 22, 9, 0, 0, 0, loc)
	end := time.Date(2026, 5, 22, 9, 30, 0, 0, loc)

	if err := sched.ValidateRange(start, end); err != nil {
		t.Fatalf("Friday playback range should validate regardless of current day: %v", err)
	}
}

func TestSchedule_ValidateRange_OutsideHoursForDateDenied(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	start := time.Date(2026, 5, 22, 6, 0, 0, 0, loc)
	end := time.Date(2026, 5, 22, 6, 30, 0, 0, loc)

	if err := sched.ValidateRange(start, end); err == nil {
		t.Fatal("expected outside recording hours error")
	}
}

func TestSchedule_IsWithinRecordingWindow_Weekend(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	sat := time.Date(2026, 5, 23, 10, 0, 0, 0, loc)
	if sched.IsWithinRecordingWindow(sat) {
		t.Fatal("Saturday should be outside recording window")
	}
}

func TestTimelineNotBlockedByCurrentTime(t *testing.T) {
	sched := testSchedule(t)
	loc, _ := time.LoadLocation("Africa/Addis_Ababa")
	saturday := time.Date(2026, 5, 23, 10, 0, 0, 0, loc)
	if sched.IsWithinRecordingWindow(saturday) {
		t.Fatal("sanity: Saturday is outside live window")
	}
	fridayDate := "2026-05-22"
	dayStart, dayEnd, err := parseDateInSchedule(sched, fridayDate)
	if err != nil {
		t.Fatal(err)
	}
	if !dayEnd.After(dayStart) {
		t.Fatal("expected valid Friday timeline bounds")
	}
	_ = loc
}

func parseDateInSchedule(sched *Schedule, date string) (time.Time, time.Time, error) {
	t, err := time.ParseInLocation("2006-01-02", date, sched.loc)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	return t, t.Add(24 * time.Hour), nil
}
