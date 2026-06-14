-- name: CreateParentInvitationCode :one
INSERT INTO parent_invitation_codes (
    id, parent_id, school_id, code_hash, code_prefix, status, expires_at, created_by
) VALUES (
    $1, $2, $3, $4, $5, 'active', $6, $7
)
RETURNING *;

-- name: RevokeActiveParentInvitationCodesForParent :exec
UPDATE parent_invitation_codes
SET status = 'revoked',
    revoked_at = NOW(),
    updated_at = NOW()
WHERE parent_id = $1
  AND school_id = $2
  AND status = 'active';

-- name: GetParentInvitationCodeByHash :one
SELECT * FROM parent_invitation_codes
WHERE code_hash = $1;

-- name: GetParentInvitationCodeByID :one
SELECT * FROM parent_invitation_codes
WHERE id = $1;

-- name: MarkParentInvitationCodeUsed :one
UPDATE parent_invitation_codes
SET status = 'used',
    used_at = NOW(),
    used_by_super_app_user_id = $2,
    updated_at = NOW()
WHERE id = $1
  AND status = 'active'
RETURNING *;

-- name: RevokeParentInvitationCode :one
UPDATE parent_invitation_codes
SET status = 'revoked',
    revoked_at = NOW(),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListParentInvitationCodesByParent :many
SELECT * FROM parent_invitation_codes
WHERE parent_id = $1
ORDER BY created_at DESC;

-- name: ListParentInvitationCodesBySchool :many
SELECT * FROM parent_invitation_codes
WHERE school_id = $1
ORDER BY created_at DESC;
