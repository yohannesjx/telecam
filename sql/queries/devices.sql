-- name: CreateDevice :one
INSERT INTO devices (
    id,
    user_id,
    device_name,
    device_fingerprint,
    status,
    last_seen_at
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetDeviceByFingerprint :one
SELECT * FROM devices
WHERE user_id = $1 AND device_fingerprint = $2;

-- name: GetDeviceByIDForUser :one
SELECT * FROM devices
WHERE id = $1 AND user_id = $2;

-- name: UpdateDeviceLastSeen :one
UPDATE devices
SET last_seen_at = $3, device_name = COALESCE($4, device_name)
WHERE user_id = $1 AND device_fingerprint = $2
RETURNING *;

-- name: UpdateDeviceLastSeenByID :exec
UPDATE devices
SET last_seen_at = $2
WHERE id = $1 AND user_id = $3;

-- name: ListUserDevices :many
SELECT * FROM devices
WHERE user_id = $1
ORDER BY last_seen_at DESC NULLS LAST, created_at DESC;

-- name: UpdateDevicePushToken :one
UPDATE devices
SET
    fcm_token = $3,
    push_platform = $4,
    app_version = $5,
    notifications_enabled = $6,
    fcm_token_updated_at = NOW(),
    last_seen_at = NOW(),
    device_name = COALESCE($7, device_name)
WHERE user_id = $1 AND device_fingerprint = $2
RETURNING *;

-- name: UpdateDevicePushTokenByID :one
UPDATE devices
SET
    fcm_token = $3,
    push_platform = $4,
    app_version = $5,
    notifications_enabled = $6,
    fcm_token_updated_at = NOW(),
    last_seen_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: UpdateDeviceNotificationPreferences :one
UPDATE devices
SET notification_preferences = $3
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DisableDeviceNotifications :one
UPDATE devices
SET notifications_enabled = FALSE
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: ListPushEnabledDevicesForUser :many
SELECT * FROM devices
WHERE user_id = $1
  AND status = 'ACTIVE'
  AND notifications_enabled = TRUE
  AND fcm_token IS NOT NULL
  AND length(trim(fcm_token)) > 0;
