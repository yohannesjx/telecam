-- name: CreatePaymentRequest :one
INSERT INTO school_camera_payment_requests (
    id,
    parent_id,
    school_id,
    super_app_user_id,
    amount_minor,
    currency,
    months,
    status,
    idempotency_key,
    expires_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9
)
RETURNING *;

-- name: GetPaymentRequest :one
SELECT * FROM school_camera_payment_requests WHERE id = $1;

-- name: GetPaymentRequestByIdempotencyKey :one
SELECT * FROM school_camera_payment_requests WHERE idempotency_key = $1;

-- name: GetPaymentRequestByReference :one
SELECT * FROM school_camera_payment_requests
WHERE super_app_payment_reference = $1
LIMIT 1;

-- name: MarkPaymentRequestPaid :one
UPDATE school_camera_payment_requests
SET status = 'paid',
    super_app_payment_reference = $2,
    paid_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND status = 'pending'
RETURNING *;

-- name: MarkPaymentRequestCompleted :one
UPDATE school_camera_payment_requests
SET completed_at = NOW(),
    updated_at   = NOW()
WHERE id = $1
RETURNING *;

-- name: ExpireStalePaymentRequests :execrows
UPDATE school_camera_payment_requests
SET status     = 'expired',
    updated_at = NOW()
WHERE status = 'pending'
  AND expires_at < NOW();
