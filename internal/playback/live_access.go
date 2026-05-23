package playback

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/scheduler"
)

// streamStateSnapshot is the scheduler row used for live access decisions.
type streamStateSnapshot struct {
	HasRow       bool
	DesiredState string
	Reason       string
}

func (s *Service) loadStreamState(ctx context.Context, cameraID uuid.UUID) (streamStateSnapshot, error) {
	row, err := s.q.GetCameraStreamState(ctx, cameraID)
	if errors.Is(err, pgx.ErrNoRows) {
		return streamStateSnapshot{DesiredState: scheduler.DesiredStopped}, nil
	}
	if err != nil {
		return streamStateSnapshot{}, err
	}
	snap := streamStateSnapshot{
		HasRow:       true,
		DesiredState: row.DesiredState,
	}
	if row.Reason.Valid {
		snap.Reason = row.Reason.String
	}
	return snap, nil
}

func (s *Service) ensureLiveAvailable(ctx context.Context, cameraID uuid.UUID) error {
	now := liveAccessNow()
	snap, err := s.loadStreamState(ctx, cameraID)
	if err != nil {
		return err
	}
	return evaluateLiveAccess(now, s.schedule, snap)
}

// liveAccessClock is set in tests to pin "now" for schedule checks.
var liveAccessClock func() time.Time

func liveAccessNow() time.Time {
	if liveAccessClock != nil {
		return liveAccessClock()
	}
	return time.Now().UTC()
}

// evaluateLiveAccess decides whether a parent may open live view at now.
func evaluateLiveAccess(now time.Time, sched *Schedule, snap streamStateSnapshot) error {
	inWindow := sched.IsWithinRecordingWindow(now)

	if !inWindow {
		return liveOutsideSchoolHours(sched, now, snap, schedReasonForOutsideWindow(now, sched, snap))
	}

	if snap.DesiredState == scheduler.DesiredRunning || !snap.HasRow {
		return nil
	}

	if isScheduleStopReason(snap.Reason) {
		return liveOutsideSchoolHours(sched, now, snap, snap.Reason)
	}
	if snap.Reason == scheduler.ReasonManualOverride {
		return deny("live_unavailable_manual_override")
	}
	return deny("live_not_available")
}

func schedReasonForOutsideWindow(now time.Time, sched *Schedule, snap streamStateSnapshot) string {
	if isScheduleStopReason(snap.Reason) {
		return snap.Reason
	}
	local := now.In(sched.loc)
	if !sched.weekdays[local.Weekday()] {
		return scheduler.ReasonWeekend
	}
	return scheduler.ReasonOutsideSchedule
}

func isScheduleStopReason(reason string) bool {
	switch reason {
	case scheduler.ReasonOutsideSchedule, scheduler.ReasonWeekend, scheduler.ReasonHoliday:
		return true
	default:
		return false
	}
}

func liveOutsideSchoolHours(sched *Schedule, now time.Time, snap streamStateSnapshot, streamReason string) error {
	data := LiveOutsideSchoolHoursData{
		Timezone:           sched.Timezone(),
		RecordingDays:      sched.RecordingDaysList(),
		RecordingStartTime: sched.RecordingStartTime(),
		RecordingEndTime:   sched.RecordingEndTime(),
		DesiredState:       snap.DesiredState,
		StreamStateReason:  streamReason,
	}
	if next := sched.NextLiveAvailableAt(now); next != nil {
		data.NextLiveAvailableAt = next.UTC().Format(time.RFC3339)
	}
	return &ErrLiveOutsideSchoolHours{
		Data:              data,
		StreamStateReason: streamReason,
		DesiredState:      snap.DesiredState,
		CurrentTime:       now.UTC().Format(time.RFC3339),
	}
}

// LiveOutsideSchoolHoursData is returned in 409 responses for blocked live view.
type LiveOutsideSchoolHoursData struct {
	Timezone            string   `json:"timezone"`
	RecordingDays       []string `json:"recording_days"`
	RecordingStartTime  string   `json:"recording_start_time"`
	RecordingEndTime    string   `json:"recording_end_time"`
	NextLiveAvailableAt string   `json:"next_live_available_at,omitempty"`
	DesiredState        string   `json:"desired_state,omitempty"`
	StreamStateReason   string   `json:"stream_state_reason,omitempty"`
}

// ErrLiveOutsideSchoolHours blocks live view outside the school schedule.
type ErrLiveOutsideSchoolHours struct {
	Data              LiveOutsideSchoolHoursData
	StreamStateReason string
	DesiredState      string
	CurrentTime       string
}

func (e *ErrLiveOutsideSchoolHours) Error() string {
	return "live view is not available outside school hours"
}

// IsLiveOutsideSchoolHours reports a schedule-related live denial.
func IsLiveOutsideSchoolHours(err error) bool {
	var target *ErrLiveOutsideSchoolHours
	return errors.As(err, &target)
}

func (s *Service) auditLiveOutsideDenied(ctx context.Context, meta RequestMeta, cameraID uuid.UUID, err error) {
	var outside *ErrLiveOutsideSchoolHours
	if !errors.As(err, &outside) {
		s.auditDenied(ctx, meta, cameraID, "PLAYBACK_LIVE_REQUESTED", err, nil)
		return
	}
	s.auditDenied(ctx, meta, cameraID, "PLAYBACK_LIVE_REQUESTED", err, map[string]any{
		"reason":              "LIVE_OUTSIDE_SCHOOL_HOURS",
		"current_time":        outside.CurrentTime,
		"timezone":            outside.Data.Timezone,
		"desired_state":       outside.DesiredState,
		"stream_state_reason": outside.StreamStateReason,
	})
}
