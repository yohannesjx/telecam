CREATE TABLE school_camera_payment_requests (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id                   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    super_app_user_id           UUID NOT NULL,
    amount_minor                BIGINT NOT NULL,
    currency                    TEXT NOT NULL DEFAULT 'ETB',
    months                      INTEGER NOT NULL DEFAULT 1,
    status                      TEXT NOT NULL DEFAULT 'pending',
    super_app_payment_reference TEXT,
    idempotency_key             TEXT NOT NULL,
    paid_at                     TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    expires_at                  TIMESTAMPTZ NOT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT school_camera_payment_requests_status_check
        CHECK (status IN ('pending', 'paid', 'cancelled', 'expired', 'failed')),
    CONSTRAINT school_camera_payment_requests_idempotency_key_unique
        UNIQUE (idempotency_key)
);

CREATE INDEX idx_scpr_parent_school ON school_camera_payment_requests (parent_id, school_id);
CREATE INDEX idx_scpr_super_app_user ON school_camera_payment_requests (super_app_user_id);
CREATE INDEX idx_scpr_status ON school_camera_payment_requests (status);
CREATE INDEX idx_scpr_reference ON school_camera_payment_requests (super_app_payment_reference)
    WHERE super_app_payment_reference IS NOT NULL;

CREATE TRIGGER school_camera_payment_requests_set_updated_at
    BEFORE UPDATE ON school_camera_payment_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Extend payments.method to include Super App wallet payments.
ALTER TABLE payments DROP CONSTRAINT payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (
    method IN ('CASH', 'BANK_TRANSFER', 'TELEBIRR', 'MANUAL', 'SUPERAPP_WALLET')
);
