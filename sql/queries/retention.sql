-- name: ListExpiredRecordingSegments :many
SELECT *
FROM recording_segments
WHERE expires_at < NOW()
ORDER BY expires_at ASC
LIMIT $1;

-- name: DeleteRecordingSegmentsByIDs :execrows
DELETE FROM recording_segments
WHERE id = ANY($1::uuid[]);

-- name: CountStorageUsageBySchool :one
SELECT
    COALESCE(SUM(size_bytes), 0)::bigint AS total_bytes,
    COUNT(*)::bigint AS segment_count
FROM recording_segments
WHERE school_id = $1
  AND expires_at > NOW();

-- name: UpsertStorageUsage :one
INSERT INTO storage_usage (
    id,
    school_id,
    date,
    total_bytes,
    segment_count,
    estimated_cost_usd,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
ON CONFLICT (school_id, date) DO UPDATE SET
    total_bytes = EXCLUDED.total_bytes,
    segment_count = EXCLUDED.segment_count,
    estimated_cost_usd = EXCLUDED.estimated_cost_usd,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
RETURNING *;

-- name: ListSchoolsForStorageReport :many
SELECT id, name, status
FROM schools
ORDER BY name;

-- name: ListStorageUsageReport :many
SELECT
    su.id,
    su.school_id,
    s.name AS school_name,
    su.date,
    su.total_bytes,
    su.segment_count,
    su.estimated_cost_usd,
    su.metadata,
    su.created_at,
    su.updated_at
FROM storage_usage su
INNER JOIN schools s ON s.id = su.school_id
WHERE (sqlc.narg('school_ids')::uuid[] IS NULL OR su.school_id = ANY(sqlc.narg('school_ids')::uuid[]))
  AND (sqlc.narg('school_id')::uuid IS NULL OR su.school_id = sqlc.narg('school_id'))
  AND (sqlc.narg('date_from')::date IS NULL OR su.date >= sqlc.narg('date_from')::date)
  AND (sqlc.narg('date_to')::date IS NULL OR su.date <= sqlc.narg('date_to')::date)
ORDER BY su.date DESC, s.name ASC
LIMIT sqlc.arg('row_limit');
