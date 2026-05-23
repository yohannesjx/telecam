-- Local development seed (idempotent). Run via: migrate seed

INSERT INTO schools (id, name, address, phone, status)
VALUES (
    '11111111-1111-1111-1111-111111111101',
    'Sunshine Kindergarten',
    '123 Demo Street',
    '+10000000001',
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO classrooms (id, school_id, name, age_group, status)
VALUES (
    '11111111-1111-1111-1111-111111111102',
    '11111111-1111-1111-1111-111111111101',
    'Butterflies Room',
    '3-4',
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- Parent: parent@example.com / password123
INSERT INTO users (id, full_name, phone, email, password_hash, role, status)
VALUES (
    '11111111-1111-1111-1111-111111111103',
    'Demo Parent',
    '+10000000002',
    'parent@example.com',
    '$2a$12$BmXtn3GfQa2V4VvAEp2bceCMLNjocancvbfaSUXnY3CZYEG20dDPi',
    'PARENT',
    'ACTIVE'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Super admin: admin@example.com / admin123
INSERT INTO users (id, full_name, phone, email, password_hash, role, status)
VALUES (
    '11111111-1111-1111-1111-111111111106',
    'Demo Super Admin',
    '+10000000003',
    'admin@example.com',
    '$2a$12$.j3pxcEcgBPgsAY/e3jh1O034mNNgGglvcZRH1ZexeQSFWlMgJ.o2',
    'SUPER_ADMIN',
    'ACTIVE'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- School admin: schooladmin@example.com / password123 (assigned to Sunshine Kindergarten)
INSERT INTO users (id, full_name, phone, email, password_hash, role, status)
VALUES (
    '11111111-1111-1111-1111-111111111107',
    'Demo School Admin',
    '+10000000004',
    'schooladmin@example.com',
    '$2a$12$BmXtn3GfQa2V4VvAEp2bceCMLNjocancvbfaSUXnY3CZYEG20dDPi',
    'SCHOOL_ADMIN',
    'ACTIVE'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO school_admins (school_id, user_id)
VALUES (
    '11111111-1111-1111-1111-111111111101',
    '11111111-1111-1111-1111-111111111107'
)
ON CONFLICT (school_id, user_id) DO NOTHING;

INSERT INTO children (id, school_id, classroom_id, full_name, status)
VALUES (
    '11111111-1111-1111-1111-111111111104',
    '11111111-1111-1111-1111-111111111101',
    '11111111-1111-1111-1111-111111111102',
    'Alex Demo',
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO parent_children (parent_id, child_id, relationship)
VALUES (
    '11111111-1111-1111-1111-111111111103',
    '11111111-1111-1111-1111-111111111104',
    'parent'
)
ON CONFLICT (parent_id, child_id) DO NOTHING;

-- Trial subscription for demo parent at Sunshine Kindergarten
INSERT INTO subscriptions (id, parent_id, school_id, status, starts_at, ends_at)
VALUES (
    '11111111-1111-1111-1111-111111111108',
    '11111111-1111-1111-1111-111111111103',
    '11111111-1111-1111-1111-111111111101',
    'TRIAL',
    NOW(),
    NOW() + INTERVAL '365 days'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    ends_at = EXCLUDED.ends_at;

INSERT INTO cameras (
    id,
    school_id,
    classroom_id,
    name,
    encrypted_rtsp_url,
    r2_live_path,
    r2_recording_path,
    default_quality,
    status
)
VALUES (
    '11111111-1111-1111-1111-111111111105',
    '11111111-1111-1111-1111-111111111101',
    '11111111-1111-1111-1111-111111111102',
    'Demo Camera',
    NULL,
    'cameras/demo/live/sd_360p/index.m3u8',
    'cameras/demo/recordings/',
    'sd_360p',
    'ACTIVE'
)
ON CONFLICT (id) DO UPDATE SET
    r2_live_path = EXCLUDED.r2_live_path,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Sample recording segments for timeline/playback testing (paths under demo HLS prefix)
INSERT INTO recording_segments (
    id, camera_id, school_id, segment_path, quality,
    start_time, end_time, duration_seconds, expires_at
)
VALUES (
    '11111111-1111-1111-1111-111111111109',
    '11111111-1111-1111-1111-111111111105',
    '11111111-1111-1111-1111-111111111101',
    'cameras/demo/live/sd_360p/segments/segment_00001.ts',
    'sd_360p',
    (CURRENT_DATE + TIME '09:00:00') AT TIME ZONE 'Africa/Addis_Ababa',
    (CURRENT_DATE + TIME '09:00:10') AT TIME ZONE 'Africa/Addis_Ababa',
    10,
    NOW() + INTERVAL '30 days'
)
ON CONFLICT (id) DO NOTHING;
