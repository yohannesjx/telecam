-- Phase 3A: Parent–Super App link table and admin invitation code table.
--
-- parent_superapp_links  — permanent record of a confirmed link between a School
--   parent user and a Super App user ID.
-- parent_invitation_codes — short-lived admin-generated codes used once to
--   establish the link. Raw code is never stored; only the HMAC-SHA256 hash.

CREATE TABLE parent_superapp_links (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    super_app_user_id UUID NOT NULL,
    status            TEXT NOT NULL DEFAULT 'active',
    linked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT parent_superapp_links_status_check
        CHECK (status IN ('active', 'revoked')),

    -- One School parent can only be linked to one Super App user at a time.
    CONSTRAINT parent_superapp_links_parent_unique
        UNIQUE (parent_id),

    -- One Super App user can only be linked to one parent per school.
    CONSTRAINT parent_superapp_links_superapp_school_unique
        UNIQUE (super_app_user_id, school_id)
);

CREATE INDEX idx_parent_superapp_links_super_app_user_id
    ON parent_superapp_links(super_app_user_id);

CREATE INDEX idx_parent_superapp_links_school_id
    ON parent_superapp_links(school_id);

CREATE INDEX idx_parent_superapp_links_status
    ON parent_superapp_links(status);

CREATE TRIGGER parent_superapp_links_set_updated_at
    BEFORE UPDATE ON parent_superapp_links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------

CREATE TABLE parent_invitation_codes (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id                 UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    -- HMAC-SHA256 of the raw code with PARENT_CODE_HMAC_SECRET as the key.
    -- The raw code is returned only once on generation and never persisted.
    code_hash                 TEXT NOT NULL,

    -- Displayable prefix for admin UI (first 8 chars of the formatted code).
    -- Safe to expose; too short to brute-force without the full code.
    code_prefix               TEXT NOT NULL,

    status                    TEXT NOT NULL DEFAULT 'active',
    expires_at                TIMESTAMPTZ NOT NULL,
    used_at                   TIMESTAMPTZ,
    used_by_super_app_user_id UUID,
    revoked_at                TIMESTAMPTZ,

    created_by                UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT parent_invitation_codes_status_check
        CHECK (status IN ('active', 'used', 'revoked', 'expired'))
);

CREATE INDEX idx_parent_invitation_codes_parent_id
    ON parent_invitation_codes(parent_id);

CREATE INDEX idx_parent_invitation_codes_school_id
    ON parent_invitation_codes(school_id);

CREATE INDEX idx_parent_invitation_codes_code_hash
    ON parent_invitation_codes(code_hash);

CREATE INDEX idx_parent_invitation_codes_status
    ON parent_invitation_codes(status);

CREATE INDEX idx_parent_invitation_codes_expires_at
    ON parent_invitation_codes(expires_at);

-- Partial index for fast "find active codes for this parent in this school" lookup.
CREATE INDEX idx_parent_invitation_codes_active_by_parent
    ON parent_invitation_codes(parent_id, school_id)
    WHERE status = 'active';

CREATE TRIGGER parent_invitation_codes_set_updated_at
    BEFORE UPDATE ON parent_invitation_codes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
