-- name: ListActiveCamerasForHealth :many
SELECT
    cam.id,
    cam.school_id,
    cam.name,
    cam.r2_live_path,
    cam.default_quality,
    cam.status,
    cam.last_segment_at,
    cam.updated_at
FROM cameras cam
INNER JOIN schools s ON s.id = cam.school_id AND s.status = 'ACTIVE'
INNER JOIN classrooms cr ON cr.id = cam.classroom_id AND cr.status = 'ACTIVE'
WHERE cam.status IN ('ACTIVE', 'OFFLINE')
ORDER BY cam.school_id, cam.name;

-- name: GetLatestWorkerHeartbeatByType :one
SELECT id, worker_name, worker_type, status, metadata, last_seen_at, created_at
FROM worker_heartbeats
WHERE worker_type = $1
ORDER BY last_seen_at DESC
LIMIT 1;

-- name: GetLatestCameraHealthEvent :one
SELECT id, camera_id, school_id, event_type, severity, message, metadata, created_at
FROM camera_health_events
WHERE camera_id = $1
  AND event_type = $2
ORDER BY created_at DESC
LIMIT 1;

-- name: GetRecentCameraHealthEvents :many
SELECT id, camera_id, school_id, event_type, severity, message, metadata, created_at
FROM camera_health_events
WHERE camera_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- name: ListCameraHealthEventsSince :many
SELECT id, camera_id, school_id, event_type, severity, message, metadata, created_at
FROM camera_health_events
WHERE camera_id = $1
  AND created_at >= $2
ORDER BY created_at DESC
LIMIT $3;

-- name: GetLatestRecordingSegmentStartForCamera :one
SELECT MAX(start_time)::timestamptz AS latest_start
FROM recording_segments
WHERE camera_id = $1
  AND expires_at > NOW();

-- name: CountRecentCameraHealthEvents :one
SELECT COUNT(*)::bigint AS event_count
FROM camera_health_events
WHERE camera_id = $1
  AND event_type = $2
  AND created_at >= NOW() - ($3::int * INTERVAL '1 minute');

-- name: CreateAlert :one
INSERT INTO alerts (
    id,
    school_id,
    camera_id,
    alert_type,
    severity,
    status,
    title,
    message,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, 'OPEN', $6, $7, $8
)
RETURNING *;

-- name: GetOpenAlertByTypeAndCamera :one
SELECT *
FROM alerts
WHERE alert_type = $1
  AND camera_id = $2
  AND status IN ('OPEN', 'ACKNOWLEDGED')
LIMIT 1;

-- name: GetOpenAlertByTypeAndSchool :one
SELECT *
FROM alerts
WHERE alert_type = $1
  AND school_id = $2
  AND camera_id IS NULL
  AND status IN ('OPEN', 'ACKNOWLEDGED')
LIMIT 1;

-- name: GetOpenAlertByTypeGlobal :one
SELECT *
FROM alerts
WHERE alert_type = $1
  AND school_id IS NULL
  AND camera_id IS NULL
  AND status IN ('OPEN', 'ACKNOWLEDGED')
LIMIT 1;

-- name: ResolveAlert :one
UPDATE alerts
SET status = 'RESOLVED',
    resolved_at = NOW(),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateAlertStatus :one
UPDATE alerts
SET status = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: TouchAlertMetadata :one
UPDATE alerts
SET metadata = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetAlertByID :one
SELECT *
FROM alerts
WHERE id = $1;

-- name: ListAlerts :many
SELECT *
FROM alerts
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('severity')::text IS NULL OR severity = sqlc.narg('severity'))
  AND (sqlc.narg('alert_type')::text IS NULL OR alert_type = sqlc.narg('alert_type'))
  AND (sqlc.narg('school_id')::uuid IS NULL OR school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('camera_id')::uuid IS NULL OR camera_id = sqlc.narg('camera_id'))
ORDER BY opened_at DESC
LIMIT sqlc.arg('row_limit') OFFSET sqlc.arg('row_offset');

-- name: CountAlertsFiltered :one
SELECT COUNT(*)::bigint AS total
FROM alerts
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('severity')::text IS NULL OR severity = sqlc.narg('severity'))
  AND (sqlc.narg('alert_type')::text IS NULL OR alert_type = sqlc.narg('alert_type'))
  AND (sqlc.narg('school_id')::uuid IS NULL OR school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('camera_id')::uuid IS NULL OR camera_id = sqlc.narg('camera_id'));

-- name: CountAlertsByStatus :one
SELECT COUNT(*)::bigint
FROM alerts
WHERE status = $1
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountAlertsByStatusAndSeverity :one
SELECT COUNT(*)::bigint
FROM alerts
WHERE status = $1
  AND severity = $2
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountCamerasByStatus :one
SELECT COUNT(*)::bigint
FROM cameras cam
INNER JOIN schools s ON s.id = cam.school_id AND s.status = 'ACTIVE'
WHERE cam.status = $1;

-- name: CountActiveSchools :one
SELECT COUNT(*)::bigint FROM schools WHERE status = 'ACTIVE';

-- name: ListOpenAlertsForCamera :many
SELECT *
FROM alerts
WHERE camera_id = $1
  AND status IN ('OPEN', 'ACKNOWLEDGED')
ORDER BY opened_at DESC;

-- name: ListSchoolIDsForUser :many
SELECT school_id
FROM school_admins
WHERE user_id = $1;
