ALTER TABLE devices
    ADD COLUMN IF NOT EXISTS fcm_token TEXT,
    ADD COLUMN IF NOT EXISTS push_platform TEXT,
    ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
        "subscription_reminders": true,
        "payment_updates": true,
        "important_notices": true,
        "camera_status_notices": false
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS app_version TEXT;

CREATE INDEX IF NOT EXISTS idx_devices_user_fcm
    ON devices (user_id)
    WHERE fcm_token IS NOT NULL AND notifications_enabled = TRUE;
