package playback

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/school-camera-platform/school-camera-platform/internal/scheduler"
	"github.com/school-camera-platform/school-camera-platform/internal/schoolschedule"
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

// ensureLiveAvailable checks whether the school's schedule (per-school or fallback)
// and the current stream state allow live access for cameraID.
func (s *Service) ensureLiveAvailable(ctx context.Context, cameraID, schoolID uuid.UUID) error {
	now := liveAccessNow()
	snap, err := s.loadStreamState(ctx, cameraID)
	if err != nil {
		return err
	}

	if s.schedEval != nil {
		settings, err := s.schedEval.ForSchool(ctx, schoolID)
		if err != nil {
			return err
		}
		result := settings.Evaluate(now)
		return evaluateLiveAccessFromResult(now, result, snap)
	}

	// Fallback: use global schedule (for tests that create Service directly).
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

// evaluateLiveAccess decides whether live view is allowed at now using a *Schedule.
// This is the backward-compatible path used by existing tests.
func evaluateLiveAccess(now time.Time, sched *Schedule, snap streamStateSnapshot) error {
	result := sched.toEvalResult(now)
	return evaluateLiveAccessFromResult(now, result, snap)
}

// evaluateLiveAccessFromResult is the main live access decision function using
// a pre-evaluated EvalResult (per-school or global fallback).
func evaluateLiveAccessFromResult(now time.Time, result schoolschedule.EvalResult, snap streamStateSnapshot) error {
	if !result.IsOpenNow {
		switch result.ReasonCode {
		case schoolschedule.ReasonLiveDisabled:
			return &ErrLiveDisabledForSchool{}
		case schoolschedule.ReasonLivePaused:
			return &ErrLiveTemporarilyPaused{SafeReason: result.TemporaryLivePauseReason}
		default:
			// LIVE_OUTSIDE_SCHOOL_HOURS: use snap reason if it's a known schedule stop reason
			streamReason := result.ReasonCode
			if isScheduleStopReason(snap.Reason) {
				streamReason = snap.Reason
			}
			return buildLiveOutsideError(now, result, snap, streamReason)
		}
	}

	if snap.DesiredState == scheduler.DesiredRunning || !snap.HasRow {
		return nil
	}

	if isScheduleStopReason(snap.Reason) {
		return buildLiveOutsideError(now, result, snap, snap.Reason)
	}
	if snap.Reason == scheduler.ReasonManualOverride {
		return deny("live_unavailable_manual_override")
	}
	return deny("live_not_available")
}

func isScheduleStopReason(reason string) bool {
	switch reason {
	case scheduler.ReasonOutsideSchedule, scheduler.ReasonWeekend, scheduler.ReasonHoliday,
		schoolschedule.ReasonOutsideHours:
		return true
	default:
		return false
	}
}

func buildLiveOutsideError(now time.Time, result schoolschedule.EvalResult, snap streamStateSnapshot, streamReason string) *ErrLiveOutsideSchoolHours {
	nextStr := ""
	if result.NextLiveAvailableAt != nil {
		nextStr = result.NextLiveAvailableAt.UTC().Format(time.RFC3339)
	}
	return &ErrLiveOutsideSchoolHours{
		Data: LiveOutsideSchoolHoursData{
			Timezone:            result.Timezone,
			RecordingDays:       result.OpenDays,
			RecordingStartTime:  result.OpenTime,
			RecordingEndTime:    result.CloseTime,
			NextLiveAvailableAt: nextStr,
			DesiredState:        snap.DesiredState,
			StreamStateReason:   streamReason,
		},
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

// ErrLiveDisabledForSchool is returned when live streaming is disabled for the school.
type ErrLiveDisabledForSchool struct{}

func (e *ErrLiveDisabledForSchool) Error() string {
	return "live streaming is disabled for this school"
}

// IsLiveDisabledForSchool reports whether err is an ErrLiveDisabledForSchool.
func IsLiveDisabledForSchool(err error) bool {
	var target *ErrLiveDisabledForSchool
	return errors.As(err, &target)
}

// ErrLiveTemporarilyPaused is returned when live streaming is temporarily paused.
type ErrLiveTemporarilyPaused struct {
	SafeReason string // may be shown to users; must not contain internal details
}

func (e *ErrLiveTemporarilyPaused) Error() string {
	return "live streaming is temporarily paused"
}

// IsLiveTemporarilyPaused reports whether err is an ErrLiveTemporarilyPaused.
func IsLiveTemporarilyPaused(err error) bool {
	var target *ErrLiveTemporarilyPaused
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
