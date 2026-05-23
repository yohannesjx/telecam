CREATE TABLE camera_stream_states (
    camera_id     UUID PRIMARY KEY REFERENCES cameras (id) ON DELETE CASCADE,
    desired_state TEXT NOT NULL DEFAULT 'STOPPED',
    reason        TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT camera_stream_states_desired_state_check CHECK (
        desired_state IN ('RUNNING', 'STOPPED')
    )
);

CREATE INDEX idx_camera_stream_states_desired_state ON camera_stream_states (desired_state);
CREATE INDEX idx_camera_stream_states_updated_at ON camera_stream_states (updated_at DESC);

CREATE TRIGGER camera_stream_states_set_updated_at
    BEFORE UPDATE ON camera_stream_states
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
