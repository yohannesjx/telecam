CREATE TABLE school_schedule_settings (
    school_id                   UUID PRIMARY KEY REFERENCES schools (id) ON DELETE CASCADE,
    timezone                    TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    open_days                   TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI',
    open_time                   TEXT NOT NULL DEFAULT '08:30',
    close_time                  TEXT NOT NULL DEFAULT '16:30',
    live_enabled                BOOLEAN NOT NULL DEFAULT TRUE,
    temporary_live_paused       BOOLEAN NOT NULL DEFAULT FALSE,
    temporary_live_pause_reason TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER school_schedule_settings_set_updated_at
    BEFORE UPDATE ON school_schedule_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
