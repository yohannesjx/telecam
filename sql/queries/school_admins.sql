-- name: AssignSchoolAdmin :one
INSERT INTO school_admins (school_id, user_id)
VALUES ($1, $2)
ON CONFLICT (school_id, user_id) DO UPDATE SET created_at = school_admins.created_at
RETURNING *;

-- name: IsUserSchoolAdmin :one
SELECT EXISTS (
    SELECT 1 FROM school_admins
    WHERE school_id = $1 AND user_id = $2
) AS is_admin;

-- name: ListSchoolsForAdmin :many
SELECT s.*
FROM schools s
INNER JOIN school_admins sa ON sa.school_id = s.id
WHERE sa.user_id = $1
ORDER BY s.created_at DESC;

-- name: ListSchoolAdminsForSchool :many
SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, sa.created_at AS assigned_at
FROM school_admins sa
INNER JOIN users u ON u.id = sa.user_id
WHERE sa.school_id = $1
ORDER BY sa.created_at;
