ALTER TABLE users
    DROP COLUMN IF EXISTS created_by_user_id,
    DROP COLUMN IF EXISTS last_login_at,
    DROP COLUMN IF EXISTS password_changed_at,
    DROP COLUMN IF EXISTS force_password_change;
