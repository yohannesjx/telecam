-- name: InsertRecordingSegment :one
INSERT INTO recording_segments (
    id,
    camera_id,
    school_id,
    segment_path,
    playlist_path,
    quality,
    start_time,
    end_time,
    duration_seconds,
    size_bytes,
    expires_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
RETURNING *;

-- name: ListSegmentsByCameraAndTimeRange :many
SELECT * FROM recording_segments
WHERE camera_id = $1
  AND start_time >= $2
  AND end_time <= $3
ORDER BY start_time ASC;
