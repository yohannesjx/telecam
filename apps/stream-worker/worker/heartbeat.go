package worker

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

type heartbeatMetadata struct {
	Mode                 string `json:"mode"`
	ActiveCameraCount    int    `json:"active_camera_count"`
	RunningCameraCount   int    `json:"running_camera_count"`
	OfflineCameraCount   int    `json:"offline_camera_count"`
	UploadedSegments     int64  `json:"uploaded_segments_total"`
	UploadErrorsTotal    int64  `json:"upload_errors_total"`
	FFmpegRestartsTotal  int64  `json:"ffmpeg_restarts_total"`
	LastError            string `json:"last_error,omitempty"`
}

func (c *Coordinator) heartbeatLoop(ctx context.Context) {
	interval := time.Duration(c.cfg.StreamWorkerPollSeconds) * time.Second
	if interval < 15*time.Second {
		interval = 20 * time.Second
	}
	if interval > 30*time.Second {
		interval = 30 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	c.writeHeartbeat(ctx, c.workerStatus())
	for {
		select {
		case <-ctx.Done():
			c.writeHeartbeat(context.Background(), "STOPPING")
			return
		case <-ticker.C:
			c.writeHeartbeat(ctx, c.workerStatus())
		}
	}
}

func (c *Coordinator) workerStatus() string {
	_, running, offline, _, uploadErrors, _, _ := c.stats.snapshot()
	if uploadErrors > 0 && offline > 0 {
		return "DEGRADED"
	}
	if running == 0 && offline > 0 {
		return "DEGRADED"
	}
	return "RUNNING"
}

func (c *Coordinator) writeHeartbeat(ctx context.Context, status string) {
	active, running, offline, uploaded, uploadErrors, ffmpegRestarts, lastErr := c.stats.snapshot()
	meta := heartbeatMetadata{
		Mode:                c.cfg.StreamWorkerMode,
		ActiveCameraCount:   active,
		RunningCameraCount:  running,
		OfflineCameraCount:  offline,
		UploadedSegments:    uploaded,
		UploadErrorsTotal:   uploadErrors,
		FFmpegRestartsTotal: ffmpegRestarts,
		LastError:           lastErr,
	}
	raw, err := json.Marshal(meta)
	if err != nil {
		c.logger.Error("marshal heartbeat metadata", "error", err)
		return
	}
	c.insertHeartbeat(ctx, status, raw)
}

func (c *Coordinator) insertHeartbeat(ctx context.Context, status string, meta []byte) {
	_, err := c.db.Queries.InsertWorkerHeartbeat(ctx, sqlc.InsertWorkerHeartbeatParams{
		ID:         uuid.New(),
		WorkerName: c.cfg.StreamWorkerName,
		WorkerType: "STREAM_WORKER",
		Status:     status,
		Metadata:   meta,
	})
	if err != nil {
		c.logger.Error("insert worker heartbeat", "error", err)
	}
}

func (c *Coordinator) onSegmentUploaded() {
	c.stats.incSegments()
}

func (c *Coordinator) onUploadFailed() {
	c.stats.incUploadErrors()
}

func (c *Coordinator) onFFmpegRestart() {
	c.stats.incFFmpegRestarts()
}

func (c *Coordinator) setLastError(err error) {
	c.stats.setLastError(err)
}
