-- Reset default admin accounts (idempotent).
-- Super admin: admin@example.com / admin123
-- School admin: schooladmin@example.com / password123

INSERT INTO users (id, full_name, phone, email, password_hash, role, status, force_password_change)
VALUES (
    '11111111-1111-1111-1111-111111111106',
    'Demo Super Admin',
    '+10000000003',
    'admin@example.com',
    '$2a$12$.j3pxcEcgBPgsAY/e3jh1O034mNNgGglvcZRH1ZexeQSFWlMgJ.o2',
    'SUPER_ADMIN',
    'ACTIVE',
    false
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = 'ACTIVE',
    force_password_change = false,
    updated_at = NOW();

INSERT INTO users (id, full_name, phone, email, password_hash, role, status, force_password_change)
VALUES (
    '11111111-1111-1111-1111-111111111107',
    'Demo School Admin',
    '+10000000004',
    'schooladmin@example.com',
    '$2a$12$BmXtn3GfQa2V4VvAEp2bceCMLNjocancvbfaSUXnY3CZYEG20dDPi',
    'SCHOOL_ADMIN',
    'ACTIVE',
    false
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = 'ACTIVE',
    force_password_change = false,
    updated_at = NOW();

-- Ensure school admin is linked to Sunshine Kindergarten (if that school exists).
INSERT INTO school_admins (school_id, user_id)
SELECT
    '11111111-1111-1111-1111-111111111101',
    u.id
FROM users u
WHERE u.email = 'schooladmin@example.com'
ON CONFLICT (school_id, user_id) DO NOTHING;
