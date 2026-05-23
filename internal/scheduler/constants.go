package scheduler

const (
	DesiredRunning = "RUNNING"
	DesiredStopped = "STOPPED"

	ReasonWithinSchedule = "WITHIN_SCHEDULE"
	ReasonOutsideSchedule = "OUTSIDE_SCHEDULE"
	ReasonWeekend        = "WEEKEND"
	ReasonHoliday        = "HOLIDAY"
	ReasonManualOverride = "MANUAL_OVERRIDE"

	CurrentStateRunning = "RUNNING"
	CurrentStateStopped = "STOPPED"

	WorkerTypeScheduler = "SCHEDULER_WORKER"

	EventScheduleStarted = "CAMERA_SCHEDULE_STARTED"
	EventScheduleStopped = "CAMERA_SCHEDULE_STOPPED"
)
