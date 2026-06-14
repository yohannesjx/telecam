DROP INDEX IF EXISTS idx_devices_user_fcm;

ALTER TABLE devices
    DROP COLUMN IF EXISTS app_version,
    DROP COLUMN IF EXISTS fcm_token_updated_at,
    DROP COLUMN IF EXISTS notification_preferences,
    DROP COLUMN IF EXISTS notifications_enabled,
    DROP COLUMN IF EXISTS push_platform,
    DROP COLUMN IF EXISTS fcm_token;
