-- name: CreatePayment :one
INSERT INTO payments (
    id,
    parent_id,
    school_id,
    subscription_id,
    amount_cents,
    currency,
    method,
    status,
    reference,
    proof_url,
    notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
RETURNING *;

-- name: GetPayment :one
SELECT * FROM payments WHERE id = $1;

-- name: ListPayments :many
SELECT p.*, u.full_name AS parent_name, sch.name AS school_name
FROM payments p
LEFT JOIN users u ON u.id = p.parent_id
LEFT JOIN schools sch ON sch.id = p.school_id
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR p.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR p.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('parent_id')::uuid IS NULL OR p.parent_id = sqlc.narg('parent_id'))
  AND (sqlc.narg('status')::text IS NULL OR p.status = sqlc.narg('status'))
  AND (sqlc.narg('method')::text IS NULL OR p.method = sqlc.narg('method'))
ORDER BY p.created_at DESC
LIMIT sqlc.arg('row_limit');

-- name: ListPaymentsForParent :many
SELECT p.*, sch.name AS school_name
FROM payments p
LEFT JOIN schools sch ON sch.id = p.school_id
WHERE p.parent_id = $1
ORDER BY p.created_at DESC
LIMIT $2;

-- name: ApprovePayment :one
UPDATE payments
SET status = 'APPROVED',
    approved_by = $2,
    approved_at = NOW(),
    notes = COALESCE($3, notes),
    updated_at = NOW()
WHERE id = $1 AND status = 'PENDING'
RETURNING *;

-- name: RejectPayment :one
UPDATE payments
SET status = 'REJECTED',
    rejected_by = $2,
    rejected_at = NOW(),
    notes = COALESCE($3, notes),
    updated_at = NOW()
WHERE id = $1 AND status = 'PENDING'
RETURNING *;

-- name: CreateInvoice :one
INSERT INTO invoices (
    id,
    parent_id,
    school_id,
    subscription_id,
    invoice_number,
    amount_cents,
    currency,
    status,
    due_date
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetInvoice :one
SELECT * FROM invoices WHERE id = $1;

-- name: GetInvoiceByNumber :one
SELECT * FROM invoices WHERE invoice_number = $1;

-- name: CountInvoicesForDatePrefix :one
SELECT COUNT(*)::bigint
FROM invoices
WHERE invoice_number LIKE $1;

-- name: ListInvoices :many
SELECT i.*, u.full_name AS parent_name, sch.name AS school_name
FROM invoices i
LEFT JOIN users u ON u.id = i.parent_id
LEFT JOIN schools sch ON sch.id = i.school_id
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR i.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR i.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('parent_id')::uuid IS NULL OR i.parent_id = sqlc.narg('parent_id'))
  AND (sqlc.narg('status')::text IS NULL OR i.status = sqlc.narg('status'))
ORDER BY i.created_at DESC
LIMIT sqlc.arg('row_limit');

-- name: ListInvoicesForParent :many
SELECT i.*, sch.name AS school_name
FROM invoices i
LEFT JOIN schools sch ON sch.id = i.school_id
WHERE i.parent_id = $1
ORDER BY i.created_at DESC
LIMIT $2;

-- name: MarkInvoicePaid :one
UPDATE invoices
SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
WHERE id = $1 AND status IN ('OPEN', 'OVERDUE')
RETURNING *;

-- name: VoidInvoice :one
UPDATE invoices
SET status = 'VOID', updated_at = NOW()
WHERE id = $1 AND status IN ('OPEN', 'OVERDUE')
RETURNING *;

-- name: FindOpenInvoiceForParentSchool :one
SELECT *
FROM invoices
WHERE parent_id = $1
  AND school_id = $2
  AND status IN ('OPEN', 'OVERDUE')
ORDER BY created_at DESC
LIMIT 1;

-- name: CloseSchoolRevenueShares :execrows
UPDATE school_revenue_share
SET active_to = $2, updated_at = NOW()
WHERE school_id = $1
  AND (active_to IS NULL OR active_to > $2);

-- name: CreateSchoolRevenueShare :one
INSERT INTO school_revenue_share (
    id,
    school_id,
    percentage,
    active_from,
    active_to
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetActiveSchoolRevenueShare :one
SELECT *
FROM school_revenue_share
WHERE school_id = $1
  AND active_from <= CURRENT_DATE
  AND (active_to IS NULL OR active_to >= CURRENT_DATE)
ORDER BY active_from DESC
LIMIT 1;

-- name: ListSchoolRevenueShares :many
SELECT *
FROM school_revenue_share
WHERE school_id = $1
ORDER BY active_from DESC;
