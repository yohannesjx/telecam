-- name: CreateSubscription :one
INSERT INTO subscriptions (
    id,
    parent_id,
    school_id,
    status,
    starts_at,
    ends_at
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetSubscription :one
SELECT * FROM subscriptions WHERE id = $1;

-- name: GetSubscriptionByParentSchool :one
SELECT *
FROM subscriptions
WHERE parent_id = $1 AND school_id = $2
ORDER BY created_at DESC
LIMIT 1;

-- name: HasActiveSubscriptionForParentSchool :one
SELECT EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE parent_id = $1
      AND school_id = $2
      AND status IN ('ACTIVE', 'TRIAL')
      AND (ends_at IS NULL OR ends_at > NOW())
) AS exists;

-- name: GetActiveSubscriptionForParentSchool :one
SELECT *
FROM subscriptions
WHERE parent_id = $1
  AND school_id = $2
  AND status IN ('ACTIVE', 'TRIAL')
  AND (ends_at IS NULL OR ends_at > NOW())
LIMIT 1;

-- name: ListSubscriptionsBySchool :many
SELECT s.*, u.full_name AS parent_name, u.email AS parent_email, sch.name AS school_name
FROM subscriptions s
INNER JOIN users u ON u.id = s.parent_id
INNER JOIN schools sch ON sch.id = s.school_id
WHERE s.school_id = $1
  AND (sqlc.narg('status')::text IS NULL OR s.status = sqlc.narg('status'))
  AND (sqlc.narg('parent_id')::uuid IS NULL OR s.parent_id = sqlc.narg('parent_id'))
ORDER BY s.created_at DESC;

-- name: ListSubscriptionsByParent :many
SELECT s.*, sch.name AS school_name
FROM subscriptions s
INNER JOIN schools sch ON sch.id = s.school_id
WHERE s.parent_id = $1
ORDER BY s.created_at DESC;

-- name: ListSubscriptionsAdmin :many
SELECT s.*, u.full_name AS parent_name, sch.name AS school_name
FROM subscriptions s
INNER JOIN users u ON u.id = s.parent_id
INNER JOIN schools sch ON sch.id = s.school_id
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR s.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR s.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('parent_id')::uuid IS NULL OR s.parent_id = sqlc.narg('parent_id'))
  AND (sqlc.narg('status')::text IS NULL OR s.status = sqlc.narg('status'))
ORDER BY s.created_at DESC
LIMIT sqlc.arg('row_limit');

-- name: UpdateSubscriptionStatus :one
UPDATE subscriptions
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ExtendSubscription :one
UPDATE subscriptions
SET ends_at = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ActivateSubscription :one
UPDATE subscriptions
SET status = 'ACTIVE', ends_at = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;
