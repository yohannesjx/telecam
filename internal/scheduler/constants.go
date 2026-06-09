package scheduler

const (
	DesiredRunning = "RUNNING"
	DesiredStopped = "STOPPED"

	ReasonWithinSchedule  = "WITHIN_SCHEDULE"
	ReasonOutsideSchedule = "OUTSIDE_SCHEDULE"
	ReasonWeekend         = "WEEKEND"
	ReasonHoliday         = "HOLIDAY"
	ReasonManualOverride  = "MANUAL_OVERRIDE"

	// Per-school schedule reason codes (also used by schoolschedule package).
	ReasonLiveDisabledForSchool = "LIVE_DISABLED_FOR_SCHOOL"
	ReasonLiveTemporarilyPaused = "LIVE_TEMPORARILY_PAUSED"
	ReasonLiveOutsideSchoolHours = "LIVE_OUTSIDE_SCHOOL_HOURS"

	CurrentStateRunning = "RUNNING"
	CurrentStateStopped = "STOPPED"

	WorkerTypeScheduler = "SCHEDULER_WORKER"

	EventScheduleStarted = "CAMERA_SCHEDULE_STARTED"
	EventScheduleStopped = "CAMERA_SCHEDULE_STOPPED"
)
