-- name: CreateSchool :one
INSERT INTO schools (
    id,
    name,
    address,
    phone,
    status
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetSchool :one
SELECT * FROM schools
WHERE id = $1;

-- name: ListSchools :many
SELECT * FROM schools
ORDER BY created_at DESC;

-- name: UpdateSchool :one
UPDATE schools
SET
    name = COALESCE(sqlc.narg('name'), name),
    address = COALESCE(sqlc.narg('address'), address),
    phone = COALESCE(sqlc.narg('phone'), phone),
    status = COALESCE(sqlc.narg('status'), status),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: UpdateSchoolLimited :one
UPDATE schools
SET
    address = COALESCE(sqlc.narg('address'), address),
    phone = COALESCE(sqlc.narg('phone'), phone),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;
