-- name: CountSchoolsScoped :one
SELECT COUNT(*)::bigint AS total
FROM schools
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountSchoolsByStatusScoped :one
SELECT COUNT(*)::bigint AS total
FROM schools
WHERE status = $1
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountParentsScoped :one
SELECT COUNT(DISTINCT u.id)::bigint AS total
FROM users u
WHERE u.role = 'PARENT'
  AND (
    sqlc.narg('school_ids')::uuid[] IS NULL
    OR EXISTS (
        SELECT 1
        FROM parent_children pc
        INNER JOIN children ch ON ch.id = pc.child_id
        WHERE pc.parent_id = u.id
          AND ch.school_id = ANY(sqlc.narg('school_ids')::uuid[])
    )
    OR EXISTS (
        SELECT 1
        FROM subscriptions sub
        WHERE sub.parent_id = u.id
          AND sub.school_id = ANY(sqlc.narg('school_ids')::uuid[])
    )
  );

-- name: CountParentsByStatusScoped :one
SELECT COUNT(DISTINCT u.id)::bigint AS total
FROM users u
WHERE u.role = 'PARENT'
  AND u.status = $1
  AND (
    sqlc.narg('school_ids')::uuid[] IS NULL
    OR EXISTS (
        SELECT 1
        FROM parent_children pc
        INNER JOIN children ch ON ch.id = pc.child_id
        WHERE pc.parent_id = u.id
          AND ch.school_id = ANY(sqlc.narg('school_ids')::uuid[])
    )
    OR EXISTS (
        SELECT 1
        FROM subscriptions sub
        WHERE sub.parent_id = u.id
          AND sub.school_id = ANY(sqlc.narg('school_ids')::uuid[])
    )
  );

-- name: CountChildrenScoped :one
SELECT COUNT(*)::bigint AS total
FROM children ch
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR ch.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountCamerasByStatusScoped :one
SELECT COUNT(*)::bigint AS total
FROM cameras cam
WHERE cam.status = $1
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR cam.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountCamerasScoped :one
SELECT COUNT(*)::bigint AS total
FROM cameras cam
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR cam.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountOpenAlertsScoped :one
SELECT COUNT(*)::bigint AS total
FROM alerts a
WHERE a.status IN ('OPEN', 'ACKNOWLEDGED')
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR a.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountOpenAlertsBySeverityScoped :one
SELECT COUNT(*)::bigint AS total
FROM alerts a
WHERE a.status IN ('OPEN', 'ACKNOWLEDGED')
  AND a.severity = $1
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR a.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountSubscriptionsByStatusScoped :one
SELECT COUNT(*)::bigint AS total
FROM subscriptions sub
WHERE sub.status = $1
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR sub.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: SumApprovedPaymentsCentsScoped :one
SELECT COALESCE(SUM(p.amount_cents), 0)::bigint AS total_cents
FROM payments p
WHERE p.status = 'APPROVED'
  AND p.approved_at >= $1
  AND p.approved_at < $2
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR p.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: SumPendingPaymentsCentsScoped :one
SELECT COALESCE(SUM(p.amount_cents), 0)::bigint AS total_cents
FROM payments p
WHERE p.status = 'PENDING'
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR p.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountAuditActionsScoped :one
SELECT COUNT(*)::bigint AS total
FROM audit_logs al
WHERE al.action = ANY(sqlc.arg('actions')::text[])
  AND al.created_at >= $1
  AND al.created_at < $2
  AND (
    sqlc.narg('school_ids')::uuid[] IS NULL
    OR al.school_id = ANY(sqlc.narg('school_ids')::uuid[])
    OR al.user_id IN (
        SELECT DISTINCT pc.parent_id
        FROM parent_children pc
        INNER JOIN children ch ON ch.id = pc.child_id
        WHERE ch.school_id = ANY(sqlc.narg('school_ids')::uuid[])
    )
  );

-- name: SumLatestStorageBytesScoped :one
SELECT COALESCE(SUM(latest.total_bytes), 0)::bigint AS total_bytes
FROM (
    SELECT DISTINCT ON (su.school_id)
        su.total_bytes
    FROM storage_usage su
    WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR su.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
    ORDER BY su.school_id, su.date DESC
) latest;

-- name: ListLatestWorkerHeartbeats :many
SELECT DISTINCT ON (worker_name)
    id,
    worker_name,
    worker_type,
    status,
    metadata,
    last_seen_at,
    created_at
FROM worker_heartbeats
ORDER BY worker_name, last_seen_at DESC;

-- name: ListCameraStatusBySchool :many
SELECT
    cam.id AS camera_id,
    cam.name AS camera_name,
    cr.name AS classroom_name,
    cam.status,
    COALESCE(css.desired_state, 'STOPPED')::text AS desired_state,
    cam.default_quality,
    cam.last_segment_at,
    (
        SELECT COUNT(*)::bigint
        FROM alerts a
        WHERE a.camera_id = cam.id
          AND a.status IN ('OPEN', 'ACKNOWLEDGED')
    ) AS open_alerts,
    (
        SELECT che.event_type
        FROM camera_health_events che
        WHERE che.camera_id = cam.id
        ORDER BY che.created_at DESC
        LIMIT 1
    ) AS last_health_event
FROM cameras cam
LEFT JOIN classrooms cr ON cr.id = cam.classroom_id
LEFT JOIN camera_stream_states css ON css.camera_id = cam.id
WHERE cam.school_id = $1
ORDER BY cam.name;

-- name: ListAuditLogsFiltered :many
SELECT
    al.id,
    al.user_id,
    al.school_id,
    al.classroom_id,
    al.camera_id,
    al.child_id,
    al.device_id,
    al.action,
    al.ip_address,
    al.user_agent,
    al.metadata,
    al.created_at,
    u.full_name AS user_name,
    s.name AS school_name
FROM audit_logs al
LEFT JOIN users u ON u.id = al.user_id
LEFT JOIN schools s ON s.id = al.school_id
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR al.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR al.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('user_id')::uuid IS NULL OR al.user_id = sqlc.narg('user_id'))
  AND (sqlc.narg('camera_id')::uuid IS NULL OR al.camera_id = sqlc.narg('camera_id'))
  AND (sqlc.narg('action')::text IS NULL OR al.action = sqlc.narg('action'))
  AND (sqlc.narg('date_from')::timestamptz IS NULL OR al.created_at >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::timestamptz IS NULL OR al.created_at < sqlc.narg('date_to'))
ORDER BY al.created_at DESC
LIMIT sqlc.arg('row_limit') OFFSET sqlc.arg('row_offset');

-- name: CountAuditLogsFiltered :one
SELECT COUNT(*)::bigint AS total
FROM audit_logs al
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR al.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR al.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('user_id')::uuid IS NULL OR al.user_id = sqlc.narg('user_id'))
  AND (sqlc.narg('camera_id')::uuid IS NULL OR al.camera_id = sqlc.narg('camera_id'))
  AND (sqlc.narg('action')::text IS NULL OR al.action = sqlc.narg('action'))
  AND (sqlc.narg('date_from')::timestamptz IS NULL OR al.created_at >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::timestamptz IS NULL OR al.created_at < sqlc.narg('date_to'));

-- name: CountPlaybackStatsScoped :one
SELECT
    COUNT(*) FILTER (WHERE al.action = 'PLAYBACK_LIVE_REQUESTED')::bigint AS live_requests,
    COUNT(*) FILTER (WHERE al.action = 'PLAYBACK_TIMELINE_REQUESTED')::bigint AS timeline_requests,
    COUNT(*) FILTER (WHERE al.action = 'PLAYBACK_RECORDING_REQUESTED')::bigint AS recording_requests,
    COUNT(*) FILTER (WHERE al.action = 'PLAYBACK_ACCESS_DENIED')::bigint AS denied_requests,
    COUNT(*)::bigint AS total_requests
FROM audit_logs al
WHERE al.action IN (
    'PLAYBACK_LIVE_REQUESTED',
    'PLAYBACK_TIMELINE_REQUESTED',
    'PLAYBACK_RECORDING_REQUESTED',
    'PLAYBACK_ACCESS_DENIED'
)
  AND al.created_at >= $1
  AND al.created_at < $2
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR al.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR al.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('camera_id')::uuid IS NULL OR al.camera_id = sqlc.narg('camera_id'));

-- name: CountHealthyCamerasScoped :one
SELECT COUNT(*)::bigint AS total
FROM cameras cam
WHERE cam.status = 'ACTIVE'
  AND cam.last_segment_at IS NOT NULL
  AND cam.last_segment_at > NOW() - (sqlc.arg('max_segment_age_seconds')::int * INTERVAL '1 second')
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR cam.school_id = ANY(sqlc.narg('school_ids')::uuid[]));

-- name: CountUniqueParentsPlaybackScoped :one
SELECT COUNT(DISTINCT al.user_id)::bigint AS unique_parents
FROM audit_logs al
INNER JOIN users u ON u.id = al.user_id AND u.role = 'PARENT'
WHERE al.action IN (
    'PLAYBACK_LIVE_REQUESTED',
    'PLAYBACK_TIMELINE_REQUESTED',
    'PLAYBACK_RECORDING_REQUESTED'
)
  AND al.user_id IS NOT NULL
  AND al.created_at >= $1
  AND al.created_at < $2
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR al.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR al.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('camera_id')::uuid IS NULL OR al.camera_id = sqlc.narg('camera_id'));

-- name: CountPlaybackStatsByDayScoped :many
SELECT
    (date_trunc('day', timezone(sqlc.arg('tz_name')::text, al.created_at)))::date AS day,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE al.action = 'PLAYBACK_ACCESS_DENIED')::bigint AS denied,
    COUNT(DISTINCT al.user_id) FILTER (
        WHERE al.user_id IS NOT NULL
          AND al.action IN (
              'PLAYBACK_LIVE_REQUESTED',
              'PLAYBACK_TIMELINE_REQUESTED',
              'PLAYBACK_RECORDING_REQUESTED'
          )
          AND EXISTS (SELECT 1 FROM users u WHERE u.id = al.user_id AND u.role = 'PARENT')
    )::bigint AS unique_parents
FROM audit_logs al
WHERE al.action IN (
    'PLAYBACK_LIVE_REQUESTED',
    'PLAYBACK_TIMELINE_REQUESTED',
    'PLAYBACK_RECORDING_REQUESTED',
    'PLAYBACK_ACCESS_DENIED'
)
  AND al.created_at >= $1
  AND al.created_at < $2
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR al.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR al.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('camera_id')::uuid IS NULL OR al.camera_id = sqlc.narg('camera_id'))
GROUP BY day
ORDER BY day ASC;

-- name: CountPlaybackStatsByCameraScoped :many
SELECT
    al.camera_id,
    cam.name AS camera_name,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE al.action = 'PLAYBACK_ACCESS_DENIED')::bigint AS denied
FROM audit_logs al
LEFT JOIN cameras cam ON cam.id = al.camera_id
WHERE al.action IN (
    'PLAYBACK_LIVE_REQUESTED',
    'PLAYBACK_TIMELINE_REQUESTED',
    'PLAYBACK_RECORDING_REQUESTED',
    'PLAYBACK_ACCESS_DENIED'
)
  AND al.created_at >= $1
  AND al.created_at < $2
  AND al.camera_id IS NOT NULL
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR al.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR al.school_id = sqlc.narg('school_id'))
GROUP BY al.camera_id, cam.name
ORDER BY total DESC
LIMIT sqlc.arg('row_limit');

-- name: CountPlaybackStatsBySchoolScoped :many
SELECT
    al.school_id,
    s.name AS school_name,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE al.action = 'PLAYBACK_ACCESS_DENIED')::bigint AS denied
FROM audit_logs al
LEFT JOIN schools s ON s.id = al.school_id
WHERE al.action IN (
    'PLAYBACK_LIVE_REQUESTED',
    'PLAYBACK_TIMELINE_REQUESTED',
    'PLAYBACK_RECORDING_REQUESTED',
    'PLAYBACK_ACCESS_DENIED'
)
  AND al.created_at >= $1
  AND al.created_at < $2
  AND al.school_id IS NOT NULL
  AND (sqlc.narg('school_ids')::uuid[] IS NULL OR al.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
GROUP BY al.school_id, s.name
ORDER BY total DESC
LIMIT sqlc.arg('row_limit');
