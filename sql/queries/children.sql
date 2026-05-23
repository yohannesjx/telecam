-- name: CreateChild :one
INSERT INTO children (
    id,
    school_id,
    classroom_id,
    full_name,
    status
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetChild :one
SELECT * FROM children
WHERE id = $1;

-- name: ListChildrenBySchool :many
SELECT * FROM children
WHERE school_id = $1
  AND (sqlc.narg('classroom_id')::uuid IS NULL OR classroom_id = sqlc.narg('classroom_id'))
ORDER BY full_name;

-- name: UpdateChild :one
UPDATE children
SET
    full_name = COALESCE(sqlc.narg('full_name'), full_name),
    classroom_id = COALESCE(sqlc.narg('classroom_id'), classroom_id),
    status = COALESCE(sqlc.narg('status'), status),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: ChildBelongsToSchool :one
SELECT EXISTS (
    SELECT 1 FROM children
    WHERE id = $1 AND school_id = $2
) AS belongs;

-- name: AssignParentToChild :one
INSERT INTO parent_children (
    parent_id,
    child_id,
    relationship
) VALUES (
    $1, $2, $3
)
ON CONFLICT (parent_id, child_id) DO UPDATE
SET relationship = EXCLUDED.relationship
RETURNING *;

-- name: ListParentsForChild :many
SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, pc.relationship, pc.created_at AS linked_at
FROM parent_children pc
INNER JOIN users u ON u.id = pc.parent_id
WHERE pc.child_id = $1
ORDER BY u.full_name;

-- name: ListChildrenForParent :many
SELECT
    c.id,
    c.full_name,
    c.status,
    c.school_id,
    c.classroom_id,
    s.name AS school_name,
    cr.name AS classroom_name
FROM children c
INNER JOIN parent_children pc ON pc.child_id = c.id
INNER JOIN schools s ON s.id = c.school_id
LEFT JOIN classrooms cr ON cr.id = c.classroom_id
WHERE pc.parent_id = $1
ORDER BY c.full_name;
