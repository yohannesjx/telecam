-- name: ListActiveCamerasForStreaming :many
SELECT
    cam.id,
    cam.school_id,
    cam.classroom_id,
    cam.name,
    cam.encrypted_rtsp_url,
    cam.r2_live_path,
    cam.r2_recording_path,
    cam.default_quality,
    cam.status,
    cam.last_segment_at
FROM cameras cam
INNER JOIN schools s ON s.id = cam.school_id AND s.status = 'ACTIVE'
INNER JOIN classrooms cr ON cr.id = cam.classroom_id AND cr.status = 'ACTIVE'
INNER JOIN camera_stream_states css ON css.camera_id = cam.id AND css.desired_state = 'RUNNING'
WHERE cam.status IN ('ACTIVE', 'OFFLINE')
ORDER BY cam.name;

-- name: UpdateCameraStreamStatus :exec
UPDATE cameras
SET status = $2, updated_at = NOW()
WHERE id = $1;

-- name: InsertWorkerHeartbeat :one
INSERT INTO worker_heartbeats (
    id,
    worker_name,
    worker_type,
    status,
    metadata,
    last_seen_at
) VALUES (
    $1, $2, $3, $4, $5, NOW()
)
RETURNING *;

-- name: InsertCameraHealthEvent :one
INSERT INTO camera_health_events (
    id,
    camera_id,
    school_id,
    event_type,
    severity,
    message,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;
