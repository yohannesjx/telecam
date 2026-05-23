CREATE TABLE alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT alerts_status_check CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    CONSTRAINT alerts_severity_check CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL'))
);

CREATE INDEX idx_alerts_status_severity ON alerts (status, severity);
CREATE INDEX idx_alerts_school_status ON alerts (school_id, status);
CREATE INDEX idx_alerts_camera_status ON alerts (camera_id, status);
CREATE INDEX idx_alerts_type_status ON alerts (alert_type, status);
CREATE INDEX idx_alerts_opened_at ON alerts (opened_at DESC);

CREATE TRIGGER alerts_set_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
