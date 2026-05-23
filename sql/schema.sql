-- Canonical schema for sqlc (mirrors migrations/000001_init_schema.up.sql tables)

CREATE TABLE users (
    id            UUID PRIMARY KEY,
    full_name     TEXT NOT NULL,
    phone         TEXT UNIQUE,
    email         TEXT UNIQUE,
    password_hash TEXT,
    role          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE schools (
    id         UUID PRIMARY KEY,
    name       TEXT NOT NULL,
    address    TEXT,
    phone      TEXT,
    status     TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE classrooms (
    id          UUID PRIMARY KEY,
    school_id   UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    age_group   TEXT,
    status      TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE children (
    id           UUID PRIMARY KEY,
    school_id    UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms (id) ON DELETE SET NULL,
    full_name    TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parent_children (
    parent_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    child_id     UUID NOT NULL REFERENCES children (id) ON DELETE CASCADE,
    relationship TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (parent_id, child_id)
);

CREATE TABLE cameras (
    id                 UUID PRIMARY KEY,
    school_id          UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    classroom_id       UUID REFERENCES classrooms (id) ON DELETE SET NULL,
    name               TEXT NOT NULL,
    encrypted_rtsp_url TEXT,
    r2_live_path       TEXT NOT NULL,
    r2_recording_path  TEXT,
    default_quality    TEXT NOT NULL DEFAULT 'sd_360p',
    CONSTRAINT cameras_default_quality_check CHECK (default_quality IN ('low_240p', 'sd_360p', 'sd_480p')),
    status             TEXT NOT NULL DEFAULT 'ACTIVE',
    last_segment_at    TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id         UUID PRIMARY KEY,
    parent_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    school_id  UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'TRIAL',
    starts_at  TIMESTAMPTZ,
    ends_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id              UUID PRIMARY KEY,
    parent_id       UUID REFERENCES users (id) ON DELETE SET NULL,
    school_id       UUID REFERENCES schools (id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions (id) ON DELETE SET NULL,
    amount_cents    BIGINT NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'ETB',
    method          TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    reference       TEXT,
    proof_url       TEXT,
    notes           TEXT,
    approved_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    rejected_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    rejected_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
    id              UUID PRIMARY KEY,
    parent_id       UUID REFERENCES users (id) ON DELETE SET NULL,
    school_id       UUID REFERENCES schools (id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions (id) ON DELETE SET NULL,
    invoice_number  TEXT NOT NULL UNIQUE,
    amount_cents    BIGINT NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'ETB',
    status          TEXT NOT NULL DEFAULT 'OPEN',
    due_date        DATE,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE school_revenue_share (
    id          UUID PRIMARY KEY,
    school_id   UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    percentage  NUMERIC(5, 2) NOT NULL DEFAULT 25.00,
    active_from DATE NOT NULL DEFAULT CURRENT_DATE,
    active_to   DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE devices (
    id                 UUID PRIMARY KEY,
    user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    device_name        TEXT,
    device_fingerprint TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'ACTIVE',
    last_seen_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recording_segments (
    id               UUID PRIMARY KEY,
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

CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY,
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

CREATE TABLE worker_heartbeats (
    id           UUID PRIMARY KEY,
    worker_name  TEXT NOT NULL,
    worker_type  TEXT NOT NULL,
    status       TEXT NOT NULL,
    metadata     JSONB,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE camera_health_events (
    id         UUID PRIMARY KEY,
    camera_id  UUID NOT NULL REFERENCES cameras (id) ON DELETE CASCADE,
    school_id  UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity   TEXT NOT NULL,
    message    TEXT,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
    id          UUID PRIMARY KEY,
    school_id   UUID REFERENCES schools (id) ON DELETE SET NULL,
    camera_id   UUID REFERENCES cameras (id) ON DELETE SET NULL,
    alert_type  TEXT NOT NULL,
    severity    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'OPEN',
    title       TEXT NOT NULL,
    message     TEXT,
    metadata    JSONB,
    opened_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE storage_usage (
    id                 UUID PRIMARY KEY,
    school_id          UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    date               DATE NOT NULL,
    total_bytes        BIGINT NOT NULL DEFAULT 0,
    segment_count      BIGINT NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(12, 4),
    metadata           JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE camera_stream_states (
    camera_id     UUID PRIMARY KEY REFERENCES cameras (id) ON DELETE CASCADE,
    desired_state TEXT NOT NULL DEFAULT 'STOPPED',
    reason        TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alert_deliveries (
    id             UUID PRIMARY KEY,
    alert_id       UUID NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
    channel        TEXT NOT NULL,
    recipient      TEXT NOT NULL,
    delivery_kind  TEXT NOT NULL DEFAULT 'OPENED',
    status         TEXT NOT NULL DEFAULT 'PENDING',
    attempts       INT NOT NULL DEFAULT 0,
    last_error     TEXT,
    delivered_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE school_admins (
    school_id  UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (school_id, user_id)
);

CREATE TABLE refresh_tokens (
    id                     UUID PRIMARY KEY,
    user_id                UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash             TEXT NOT NULL UNIQUE,
    device_id              UUID REFERENCES devices (id) ON DELETE SET NULL,
    expires_at             TIMESTAMPTZ NOT NULL,
    revoked_at             TIMESTAMPTZ,
    replaced_by_token_hash TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
