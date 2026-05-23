-- name: CreateUser :one
INSERT INTO users (
    id,
    full_name,
    phone,
    email,
    password_hash,
    role,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1;

-- name: UpdateUserPasswordHash :exec
UPDATE users
SET password_hash = $2, updated_at = NOW()
WHERE id = $1;

-- name: ListParents :many
SELECT * FROM users
WHERE role = 'PARENT'
ORDER BY created_at DESC;
