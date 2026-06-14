-- name: GetCameraWithSchoolClassroom :one
SELECT
    cam.id,
    cam.school_id,
    cam.classroom_id,
    cam.name,
    cam.r2_live_path,
    cam.r2_recording_path,
    cam.default_quality,
    cam.status AS camera_status,
    s.name AS school_name,
    s.status AS school_status,
    cr.name AS classroom_name,
    cr.status AS classroom_status
FROM cameras cam
INNER JOIN schools s ON s.id = cam.school_id
LEFT JOIN classrooms cr ON cr.id = cam.classroom_id
WHERE cam.id = $1;

-- name: ParentCanAccessCamera :one
SELECT EXISTS (
    SELECT 1
    FROM parent_children pc
    INNER JOIN children ch ON ch.id = pc.child_id AND ch.status = 'ACTIVE'
    INNER JOIN cameras cam ON cam.classroom_id = ch.classroom_id AND cam.id = $2
    WHERE pc.parent_id = $1
) AS can_access;

-- name: GetParentChildIDForCamera :one
SELECT ch.id
FROM parent_children pc
INNER JOIN children ch ON ch.id = pc.child_id AND ch.status = 'ACTIVE'
INNER JOIN cameras cam ON cam.classroom_id = ch.classroom_id AND cam.id = $2
WHERE pc.parent_id = $1
LIMIT 1;

-- name: ListRecordingSegmentsByCameraRange :many
SELECT *
FROM recording_segments
WHERE camera_id = $1
  AND expires_at > NOW()
  AND start_time < $3
  AND end_time > $2
  AND ($4::text = '' OR quality = $4)
ORDER BY start_time ASC;

-- name: ListRecordingSegmentsByCameraDate :many
SELECT *
FROM recording_segments
WHERE camera_id = $1
  AND expires_at > NOW()
  AND start_time >= $2
  AND start_time < $3
  AND ($4::text = '' OR quality = $4)
ORDER BY start_time ASC;
