ALTER TABLE cameras
    DROP CONSTRAINT IF EXISTS cameras_default_quality_check;

ALTER TABLE cameras
    ADD CONSTRAINT cameras_default_quality_check
    CHECK (default_quality IN ('low_240p', 'sd_360p', 'sd_480p'));
