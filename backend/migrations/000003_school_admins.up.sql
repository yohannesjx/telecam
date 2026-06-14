CREATE TABLE school_admins (
    school_id   UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (school_id, user_id)
);

CREATE INDEX idx_school_admins_user_id ON school_admins (user_id);
