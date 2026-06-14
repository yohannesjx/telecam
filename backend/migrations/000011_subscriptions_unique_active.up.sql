CREATE UNIQUE INDEX idx_subscriptions_active_parent_school
    ON subscriptions (parent_id, school_id)
    WHERE status IN ('ACTIVE', 'TRIAL');
