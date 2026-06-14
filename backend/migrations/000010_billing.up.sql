CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_status_check CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED')
    ),
    CONSTRAINT payments_method_check CHECK (
        method IN ('CASH', 'BANK_TRANSFER', 'TELEBIRR', 'MANUAL')
    )
);

CREATE INDEX idx_payments_parent_school ON payments (parent_id, school_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_subscription_id ON payments (subscription_id);

CREATE TRIGGER payments_set_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT invoices_status_check CHECK (
        status IN ('OPEN', 'PAID', 'VOID', 'OVERDUE')
    )
);

CREATE INDEX idx_invoices_parent_school ON invoices (parent_id, school_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_subscription_id ON invoices (subscription_id);

CREATE TRIGGER invoices_set_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE school_revenue_share (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
    percentage  NUMERIC(5, 2) NOT NULL DEFAULT 25.00,
    active_from DATE NOT NULL DEFAULT CURRENT_DATE,
    active_to   DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_school_revenue_share_school_active ON school_revenue_share (school_id, active_from);

CREATE TRIGGER school_revenue_share_set_updated_at
    BEFORE UPDATE ON school_revenue_share
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_subscriptions_parent_school_status ON subscriptions (parent_id, school_id, status);
