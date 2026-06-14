package health

// Alert types stored in alerts.alert_type.
const (
	AlertNoSegmentUploaded      = "NO_SEGMENT_UPLOADED"
	AlertCameraOffline          = "CAMERA_OFFLINE"
	AlertStreamWorkerStale      = "STREAM_WORKER_STALE"
	AlertFFmpegRestartSpike     = "CAMERA_FFMPEG_RESTART_SPIKE"
	AlertUploadFailureSpike     = "CAMERA_UPLOAD_FAILURE_SPIKE"
	AlertPlaylistStaleOrMissing = "PLAYLIST_STALE_OR_MISSING"
	AlertSchoolOffline          = "SCHOOL_OFFLINE"
)

// Health event types written by the health-worker.
const (
	EventNoSegmentUploaded = "CAMERA_NO_SEGMENT_UPLOADED"
	EventSegmentResumed    = "CAMERA_SEGMENT_RESUMED"
)

// Stream-worker health event types counted by the health-worker.
const (
	EventUploadFailed    = "CAMERA_UPLOAD_FAILED"
	EventFFmpegRestarted = "CAMERA_FFMPEG_RESTARTED"
	EventCameraOffline   = "CAMERA_OFFLINE"
)

const (
	SeverityInfo     = "INFO"
	SeverityWarning  = "WARNING"
	SeverityCritical = "CRITICAL"

	StatusOpen          = "OPEN"
	StatusAcknowledged  = "ACKNOWLEDGED"
	StatusResolved      = "RESOLVED"

	WorkerTypeHealth = "HEALTH_WORKER"
	WorkerTypeStream = "STREAM_WORKER"
)
