-- name: CreateAlertDelivery :one
INSERT INTO alert_deliveries (
    id,
    alert_id,
    channel,
    recipient,
    delivery_kind,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetAlertDelivery :one
SELECT * FROM alert_deliveries
WHERE id = $1;

-- name: GetAlertDeliveryByTarget :one
SELECT * FROM alert_deliveries
WHERE alert_id = $1
  AND channel = $2
  AND recipient = $3
  AND delivery_kind = $4;

-- name: ListPendingAlertDeliveries :many
SELECT *
FROM alert_deliveries
WHERE channel = $1
  AND status IN ('PENDING', 'FAILED')
  AND attempts < $2
ORDER BY created_at ASC
LIMIT $3;

-- name: MarkAlertDeliverySent :one
UPDATE alert_deliveries
SET status = 'SENT',
    delivered_at = NOW(),
    updated_at = NOW(),
    last_error = NULL
WHERE id = $1
RETURNING *;

-- name: MarkAlertDeliveryFailed :one
UPDATE alert_deliveries
SET status = 'FAILED',
    last_error = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkAlertDeliverySkipped :one
UPDATE alert_deliveries
SET status = 'SKIPPED',
    last_error = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: IncrementAlertDeliveryAttempt :one
UPDATE alert_deliveries
SET attempts = attempts + 1,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListAlertsNeedingOpenDelivery :many
SELECT a.*
FROM alerts a
WHERE a.status IN ('OPEN', 'ACKNOWLEDGED')
  AND (
    a.severity = 'CRITICAL'
    OR (
      a.severity = 'WARNING'
      AND a.alert_type IN (
        'CAMERA_FFMPEG_RESTART_SPIKE',
        'CAMERA_UPLOAD_FAILURE_SPIKE',
        'STREAM_WORKER_STALE'
      )
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM alert_deliveries d
    WHERE d.alert_id = a.id
      AND d.channel = $1
      AND d.recipient = $2
      AND d.delivery_kind = 'OPENED'
      AND d.status = 'SENT'
  )
ORDER BY a.opened_at ASC
LIMIT $3;

-- name: ListResolvedAlertsNeedingDelivery :many
SELECT a.*
FROM alerts a
WHERE a.status = 'RESOLVED'
  AND a.resolved_at IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM alert_deliveries d
    WHERE d.alert_id = a.id
      AND d.channel = $1
      AND d.recipient = $2
      AND d.delivery_kind = 'OPENED'
      AND d.status = 'SENT'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM alert_deliveries d
    WHERE d.alert_id = a.id
      AND d.channel = $1
      AND d.recipient = $2
      AND d.delivery_kind = 'RESOLVED'
      AND d.status = 'SENT'
  )
ORDER BY a.resolved_at ASC
LIMIT $3;

-- name: ListAlertDeliveries :many
SELECT *
FROM alert_deliveries
WHERE (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('channel')::text IS NULL OR channel = sqlc.narg('channel'))
  AND (sqlc.narg('alert_id')::uuid IS NULL OR alert_id = sqlc.narg('alert_id'))
ORDER BY created_at DESC
LIMIT sqlc.arg('row_limit');
