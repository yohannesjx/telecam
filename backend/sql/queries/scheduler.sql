-- name: UpsertCameraStreamState :one
INSERT INTO camera_stream_states (
    camera_id,
    desired_state,
    reason
) VALUES (
    $1, $2, $3
)
ON CONFLICT (camera_id) DO UPDATE SET
    desired_state = EXCLUDED.desired_state,
    reason = EXCLUDED.reason,
    updated_at = NOW()
RETURNING *;

-- name: GetCameraStreamState :one
SELECT *
FROM camera_stream_states
WHERE camera_id = $1;

-- name: ListCameraStreamStates :many
SELECT *
FROM camera_stream_states
ORDER BY updated_at DESC
LIMIT $1;

-- name: ListCamerasForScheduler :many
SELECT
    cam.id,
    cam.school_id,
    cam.status
FROM cameras cam
INNER JOIN schools s ON s.id = cam.school_id AND s.status = 'ACTIVE'
INNER JOIN classrooms cr ON cr.id = cam.classroom_id AND cr.status = 'ACTIVE'
WHERE cam.status IN ('ACTIVE', 'OFFLINE')
ORDER BY cam.school_id, cam.name;

-- name: ListRunningDesiredCameras :many
SELECT css.*
FROM camera_stream_states css
INNER JOIN cameras cam ON cam.id = css.camera_id
INNER JOIN schools s ON s.id = cam.school_id AND s.status = 'ACTIVE'
INNER JOIN classrooms cr ON cr.id = cam.classroom_id AND cr.status = 'ACTIVE'
WHERE cam.status IN ('ACTIVE', 'OFFLINE')
  AND css.desired_state = 'RUNNING'
ORDER BY css.updated_at DESC;

-- name: CountCameraStreamStatesByDesiredState :one
SELECT COUNT(*)::bigint
FROM camera_stream_states css
INNER JOIN cameras cam ON cam.id = css.camera_id
INNER JOIN schools s ON s.id = cam.school_id AND s.status = 'ACTIVE'
INNER JOIN classrooms cr ON cr.id = cam.classroom_id AND cr.status = 'ACTIVE'
WHERE cam.status IN ('ACTIVE', 'OFFLINE')
  AND css.desired_state = $1;

-- name: SetAllActiveCamerasDesiredState :execrows
UPDATE camera_stream_states css
SET desired_state = $1,
    reason = $2,
    updated_at = NOW()
FROM cameras cam
INNER JOIN schools s ON s.id = cam.school_id AND s.status = 'ACTIVE'
INNER JOIN classrooms cr ON cr.id = cam.classroom_id AND cr.status = 'ACTIVE'
WHERE css.camera_id = cam.id
  AND cam.status IN ('ACTIVE', 'OFFLINE');
