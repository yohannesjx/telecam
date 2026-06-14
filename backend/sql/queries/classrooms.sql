-- name: CreateClassroom :one
INSERT INTO classrooms (
    id,
    school_id,
    name,
    age_group,
    status
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetClassroom :one
SELECT * FROM classrooms
WHERE id = $1;

-- name: ListClassroomsBySchool :many
SELECT * FROM classrooms
WHERE school_id = $1
ORDER BY name;

-- name: UpdateClassroom :one
UPDATE classrooms
SET
    name = COALESCE(sqlc.narg('name'), name),
    age_group = COALESCE(sqlc.narg('age_group'), age_group),
    status = COALESCE(sqlc.narg('status'), status),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: ClassroomBelongsToSchool :one
SELECT EXISTS (
    SELECT 1 FROM classrooms
    WHERE id = $1 AND school_id = $2
) AS belongs;
