CREATE TABLE alert_deliveries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id       UUID NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
    channel        TEXT NOT NULL,
    recipient      TEXT NOT NULL,
    delivery_kind  TEXT NOT NULL DEFAULT 'OPENED',
    status         TEXT NOT NULL DEFAULT 'PENDING',
    attempts       INT NOT NULL DEFAULT 0,
    last_error     TEXT,
    delivered_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT alert_deliveries_status_check CHECK (
        status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')
    ),
    CONSTRAINT alert_deliveries_channel_check CHECK (
        channel IN ('TELEGRAM', 'WHATSAPP', 'SMS', 'EMAIL')
    ),
    CONSTRAINT alert_deliveries_kind_check CHECK (
        delivery_kind IN ('OPENED', 'RESOLVED')
    )
);

CREATE UNIQUE INDEX idx_alert_deliveries_unique_target
    ON alert_deliveries (alert_id, channel, recipient, delivery_kind);

CREATE INDEX idx_alert_deliveries_alert_id ON alert_deliveries (alert_id);
CREATE INDEX idx_alert_deliveries_channel_status ON alert_deliveries (channel, status);
CREATE INDEX idx_alert_deliveries_created_at ON alert_deliveries (created_at DESC);

CREATE TRIGGER alert_deliveries_set_updated_at
    BEFORE UPDATE ON alert_deliveries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
