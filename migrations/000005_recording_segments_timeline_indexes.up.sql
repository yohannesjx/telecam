CREATE INDEX IF NOT EXISTS idx_recording_segments_camera_quality_start
    ON recording_segments (camera_id, quality, start_time);

CREATE INDEX IF NOT EXISTS idx_recording_segments_camera_quality_expires
    ON recording_segments (camera_id, quality, expires_at);
