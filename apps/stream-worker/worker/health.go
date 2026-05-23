package worker

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

type healthMeta struct {
	WorkerName    string `json:"worker_name,omitempty"`
	Quality       string `json:"quality,omitempty"`
	RestartCount  int    `json:"restart_count,omitempty"`
	Error         string `json:"error,omitempty"`
	ExitCode      int    `json:"exit_code,omitempty"`
	LastSegmentAt string `json:"last_segment_at,omitempty"`
	ObjectKey     string `json:"object_key,omitempty"`
	SourceKind    string `json:"source_kind,omitempty"`
}

func (c *Coordinator) recordHealthEvent(ctx context.Context, camera StreamingCamera, eventType, severity, message string, meta healthMeta) {
	if meta.WorkerName == "" {
		meta.WorkerName = c.cfg.StreamWorkerName
	}
	if meta.Quality == "" {
		meta.Quality = camera.DefaultQuality
	}
	raw, _ := json.Marshal(meta)
	_, err := c.db.Queries.InsertCameraHealthEvent(ctx, sqlc.InsertCameraHealthEventParams{
		ID:        uuid.New(),
		CameraID:  camera.ID,
		SchoolID:  camera.SchoolID,
		EventType: eventType,
		Severity:  severity,
		Message:   database.TextFromString(message),
		Metadata:  raw,
	})
	if err != nil {
		c.logger.Error("insert camera health event", "camera_id", camera.ID, "event_type", eventType, "error", err)
	}
}

func (c *Coordinator) setCameraStatus(ctx context.Context, cameraID uuid.UUID, status string) error {
	return c.db.Queries.UpdateCameraStreamStatus(ctx, sqlc.UpdateCameraStreamStatusParams{
		ID:     cameraID,
		Status: status,
	})
}
