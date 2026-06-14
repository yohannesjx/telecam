-- Phase 2 core schema for School Camera Platform

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reusable trigger to maintain updated_at on row updates.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     TEXT NOT NULL,
    phone         TEXT UNIQUE,
    email         TEXT UNIQUE,
    password_hash TEXT,
    role          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'PARENT', 'TECHNICIAN')),
    CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'BLOCKED', 'DISABLED'))
);

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE schools (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    address    TEXT,
    phone      TEXT,
    status     TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT schools_status_check CHECK (status IN ('ACTIVE', 'BLOCKED', 'DISABLED'))
);

CREATE TRIGGER schools_set_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE classrooms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    age_group   TEXT,
    status      TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT classrooms_status_check CHECK (status IN ('ACTIVE', 'BLOCKED', 'DISABLED'))
);

CREATE INDEX idx_classrooms_school_id ON classrooms (school_id);

CREATE TRIGGER classrooms_set_updated_at
    BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE children (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms (id) ON DELETE SET NULL,
    full_name    TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT children_status_check CHECK (status IN ('ACTIVE', 'BLOCKED', 'DISABLED'))
);

CREATE INDEX idx_children_school_id ON children (school_id);
CREATE INDEX idx_children_classroom_id ON children (classroom_id);

CREATE TRIGGER children_set_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE parent_children (
    parent_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    child_id     UUID NOT NULL REFERENCES children (id) ON DELETE CASCADE,
    relationship TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (parent_id, child_id)
);

CREATE INDEX idx_parent_children_child_id ON parent_children (child_id);

CREATE TABLE cameras (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id          UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    classroom_id       UUID REFERENCES classrooms (id) ON DELETE SET NULL,
    name               TEXT NOT NULL,
    encrypted_rtsp_url TEXT,
    r2_live_path       TEXT NOT NULL,
    r2_recording_path  TEXT,
    default_quality    TEXT NOT NULL DEFAULT 'sd_360p',
    status             TEXT NOT NULL DEFAULT 'ACTIVE',
    last_segment_at    TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cameras_status_check CHECK (status IN ('ACTIVE', 'DISABLED', 'OFFLINE', 'ERROR'))
);

CREATE INDEX idx_cameras_school_id ON cameras (school_id);
CREATE INDEX idx_cameras_classroom_id ON cameras (classroom_id);

CREATE TRIGGER cameras_set_updated_at
    BEFORE UPDATE ON cameras
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subscriptions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    school_id  UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'TRIAL',
    starts_at  TIMESTAMPTZ,
    ends_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT subscriptions_status_check CHECK (
        status IN ('ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'BLOCKED')
    )
);

CREATE INDEX idx_subscriptions_parent_id ON subscriptions (parent_id);
CREATE INDEX idx_subscriptions_school_id ON subscriptions (school_id);

CREATE TRIGGER subscriptions_set_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE devices (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    device_name        TEXT,
    device_fingerprint TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'ACTIVE',
    last_seen_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT devices_status_check CHECK (status IN ('ACTIVE', 'BLOCKED', 'DISABLED')),
    CONSTRAINT devices_user_fingerprint_unique UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX idx_devices_user_id ON devices (user_id);

CREATE TABLE recording_segments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id        UUID NOT NULL REFERENCES cameras (id) ON DELETE CASCADE,
    school_id        UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    segment_path     TEXT NOT NULL,
    playlist_path    TEXT,
    quality          TEXT NOT NULL,
    start_time       TIMESTAMPTZ NOT NULL,
    end_time         TIMESTAMPTZ NOT NULL,
    duration_seconds INT NOT NULL,
    size_bytes       BIGINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_recording_segments_camera_start ON recording_segments (camera_id, start_time);
CREATE INDEX idx_recording_segments_school_start ON recording_segments (school_id, start_time);
CREATE INDEX idx_recording_segments_expires_at ON recording_segments (expires_at);

CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users (id) ON DELETE SET NULL,
    school_id    UUID REFERENCES schools (id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms (id) ON DELETE SET NULL,
    camera_id    UUID REFERENCES cameras (id) ON DELETE SET NULL,
    child_id     UUID REFERENCES children (id) ON DELETE SET NULL,
    device_id    UUID REFERENCES devices (id) ON DELETE SET NULL,
    action       TEXT NOT NULL,
    ip_address   TEXT,
    user_agent   TEXT,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created_at);
CREATE INDEX idx_audit_logs_school_created ON audit_logs (school_id, created_at);
CREATE INDEX idx_audit_logs_camera_created ON audit_logs (camera_id, created_at);
CREATE INDEX idx_audit_logs_action_created ON audit_logs (action, created_at);

CREATE TABLE worker_heartbeats (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_name  TEXT NOT NULL,
    worker_type  TEXT NOT NULL,
    status       TEXT NOT NULL,
    metadata     JSONB,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worker_heartbeats_worker_name ON worker_heartbeats (worker_name);
CREATE INDEX idx_worker_heartbeats_last_seen ON worker_heartbeats (last_seen_at);

CREATE TABLE camera_health_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id  UUID NOT NULL REFERENCES cameras (id) ON DELETE CASCADE,
    school_id  UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity   TEXT NOT NULL,
    message    TEXT,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_camera_health_events_camera_id ON camera_health_events (camera_id);
CREATE INDEX idx_camera_health_events_school_id ON camera_health_events (school_id);
CREATE INDEX idx_camera_health_events_created_at ON camera_health_events (created_at);
