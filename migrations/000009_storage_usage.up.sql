CREATE TABLE storage_usage (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    date              DATE NOT NULL,
    total_bytes       BIGINT NOT NULL DEFAULT 0,
    segment_count     BIGINT NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(12, 4),
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT storage_usage_school_date_unique UNIQUE (school_id, date)
);

CREATE INDEX idx_storage_usage_date ON storage_usage (date DESC);
CREATE INDEX idx_storage_usage_school_date ON storage_usage (school_id, date DESC);

CREATE TRIGGER storage_usage_set_updated_at
    BEFORE UPDATE ON storage_usage
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
