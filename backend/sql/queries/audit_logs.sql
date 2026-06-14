-- name: CreateAuditLog :one
INSERT INTO audit_logs (
    id,
    user_id,
    school_id,
    classroom_id,
    camera_id,
    child_id,
    device_id,
    action,
    ip_address,
    user_agent,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
RETURNING *;
