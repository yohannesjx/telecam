-- name: CreateParentSuperAppLink :one
INSERT INTO parent_superapp_links (
    id, parent_id, school_id, super_app_user_id, status
) VALUES (
    $1, $2, $3, $4, 'active'
)
RETURNING *;

-- name: GetParentSuperAppLinkBySuperAppUserAndSchool :one
SELECT * FROM parent_superapp_links
WHERE super_app_user_id = $1
  AND school_id = $2
  AND status = 'active';

-- name: GetActiveParentSuperAppLinkBySuperAppUser :one
SELECT * FROM parent_superapp_links
WHERE super_app_user_id = $1
  AND status = 'active'
LIMIT 1;

-- name: GetParentSuperAppLinkByParent :one
SELECT * FROM parent_superapp_links
WHERE parent_id = $1
  AND status = 'active';

-- name: RevokeParentSuperAppLink :one
UPDATE parent_superapp_links
SET status = 'revoked',
    revoked_at = NOW(),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListParentSuperAppLinksBySchool :many
SELECT psl.*, u.full_name AS parent_name
FROM parent_superapp_links psl
JOIN users u ON u.id = psl.parent_id
WHERE psl.school_id = $1
ORDER BY psl.linked_at DESC;
