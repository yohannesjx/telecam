-- name: CreateCamera :one
INSERT INTO cameras (
    id,
    school_id,
    classroom_id,
    name,
    encrypted_rtsp_url,
    r2_live_path,
    r2_recording_path,
    default_quality,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetCamera :one
SELECT * FROM cameras
WHERE id = $1;

-- name: ListCamerasBySchool :many
SELECT * FROM cameras
WHERE school_id = $1
ORDER BY name;

-- name: ListCamerasByClassroom :many
SELECT * FROM cameras
WHERE classroom_id = $1
ORDER BY name;

-- name: UpdateCameraLastSegmentAt :exec
UPDATE cameras
SET last_segment_at = $2, updated_at = NOW()
WHERE id = $1;

-- name: UpdateCamera :one
UPDATE cameras
SET
    name = COALESCE(sqlc.narg('name'), name),
    classroom_id = COALESCE(sqlc.narg('classroom_id'), classroom_id),
    encrypted_rtsp_url = COALESCE(sqlc.narg('encrypted_rtsp_url'), encrypted_rtsp_url),
    r2_live_path = COALESCE(sqlc.narg('r2_live_path'), r2_live_path),
    r2_recording_path = COALESCE(sqlc.narg('r2_recording_path'), r2_recording_path),
    default_quality = COALESCE(sqlc.narg('default_quality'), default_quality),
    status = COALESCE(sqlc.narg('status'), status),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: CameraBelongsToSchool :one
SELECT EXISTS (
    SELECT 1 FROM cameras
    WHERE id = $1 AND school_id = $2
) AS belongs;

-- name: ListCamerasForParent :many
SELECT DISTINCT
    cam.id AS camera_id,
    cam.name AS camera_name,
    cam.default_quality,
    cam.status,
    s.name AS school_name,
    cr.name AS classroom_name
FROM cameras cam
INNER JOIN schools s ON s.id = cam.school_id
LEFT JOIN classrooms cr ON cr.id = cam.classroom_id
INNER JOIN children ch ON ch.classroom_id = cam.classroom_id
INNER JOIN parent_children pc ON pc.child_id = ch.id
WHERE pc.parent_id = $1
  AND cam.classroom_id IS NOT NULL
ORDER BY cam.name;
