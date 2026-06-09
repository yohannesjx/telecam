-- name: GetSchoolScheduleSettings :one
SELECT *
FROM school_schedule_settings
WHERE school_id = $1;

-- name: UpsertSchoolScheduleSettings :one
INSERT INTO school_schedule_settings (
    school_id,
    timezone,
    open_days,
    open_time,
    close_time,
    live_enabled,
    temporary_live_paused,
    temporary_live_pause_reason
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (school_id) DO UPDATE SET
    timezone                    = EXCLUDED.timezone,
    open_days                   = EXCLUDED.open_days,
    open_time                   = EXCLUDED.open_time,
    close_time                  = EXCLUDED.close_time,
    live_enabled                = EXCLUDED.live_enabled,
    temporary_live_paused       = EXCLUDED.temporary_live_paused,
    temporary_live_pause_reason = EXCLUDED.temporary_live_pause_reason,
    updated_at                  = NOW()
RETURNING *;
