-- name: CreateUser :one
INSERT INTO users (
    id,
    full_name,
    phone,
    email,
    password_hash,
    role,
    status,
    force_password_change,
    created_by_user_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1;

-- name: ListManagedUsers :many
SELECT * FROM users
WHERE role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TECHNICIAN')
ORDER BY created_at DESC;

-- name: UpdateUserProfile :one
UPDATE users
SET
    full_name = $2,
    email = $3,
    phone = $4,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserStatus :one
UPDATE users
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserRole :one
UPDATE users
SET role = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserPasswordFull :one
UPDATE users
SET
    password_hash = $2,
    password_changed_at = NOW(),
    force_password_change = $3,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: SetUserForcePasswordChange :one
UPDATE users
SET force_password_change = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserLastLogin :exec
UPDATE users
SET last_login_at = NOW()
WHERE id = $1;

-- name: ListParents :many
SELECT * FROM users
WHERE role = 'PARENT'
ORDER BY created_at DESC;
