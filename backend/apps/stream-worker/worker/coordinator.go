// Package worker runs database-driven FFmpeg HLS generation and uploads segments to object storage.
package worker

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/encryption"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"

	"github.com/google/uuid"
)

// Coordinator manages per-camera stream workers.
type Coordinator struct {
	logger  *slog.Logger
	cfg     *appconfig.Config
	db      *database.DB
	storage *storage.Client
	cipher  *encryption.Cipher

	jobsMu          sync.Mutex
	jobs            map[uuid.UUID]*CameraStream
	stats           workerStats
	uploadingMu     sync.Mutex
	uploadingPaths  map[string]int
}

// New constructs the stream worker coordinator.
func New(ctx context.Context, logger *slog.Logger, cfg *appconfig.Config) (*Coordinator, error) {
	db, err := database.New(ctx, cfg)
	if err != nil {
		return nil, err
	}

	s3, err := storage.NewClient(ctx, cfg)
	if err != nil {
		db.Close()
		return nil, err
	}

	var cipher *encryption.Cipher
	if cfg.AppEncryptionKey != "" {
		cipher, err = encryption.NewCipher(cfg.AppEncryptionKey)
		if err != nil {
			db.Close()
			return nil, fmt.Errorf("encryption cipher: %w", err)
		}
	}

	logger.Info("stream-worker starting",
		"mode", cfg.StreamWorkerMode,
		"worker_name", cfg.StreamWorkerName,
		"storage_provider", cfg.StorageProvider,
		"poll_seconds", cfg.StreamWorkerPollSeconds,
	)

	return &Coordinator{
		logger:         logger,
		cfg:            cfg,
		db:             db,
		storage:        s3,
		cipher:         cipher,
		jobs:           make(map[uuid.UUID]*CameraStream),
		uploadingPaths: make(map[string]int),
	}, nil
}

// Run polls the database and manages camera streams until ctx is cancelled.
func (c *Coordinator) Run(ctx context.Context) error {
	go c.heartbeatLoop(ctx)
	go c.tempCleanupLoop(ctx)

	poll := time.Duration(c.cfg.StreamWorkerPollSeconds) * time.Second
	if poll < 5*time.Second {
		poll = 15 * time.Second
	}
	ticker := time.NewTicker(poll)
	defer ticker.Stop()

	c.refreshCameras(ctx)
	for {
		select {
		case <-ctx.Done():
			c.stopAll()
			return ctx.Err()
		case <-ticker.C:
			c.refreshCameras(ctx)
			c.checkCameraOffline(ctx)
		}
	}
}

func (c *Coordinator) refreshCameras(ctx context.Context) {
	rows, err := c.db.Queries.ListActiveCamerasForStreaming(ctx)
	if err != nil {
		c.logger.Error("list active cameras", "error", err)
		c.setLastError(err)
		return
	}

	cameras := make([]StreamingCamera, 0, len(rows))
	for _, row := range rows {
		cameras = append(cameras, cameraFromRow(row))
	}
	filtered := filterCamerasForMode(cameras, c.cfg.StreamWorkerMode)

	desired := make(map[uuid.UUID]StreamingCamera, len(filtered))
	for _, cam := range filtered {
		desired[cam.ID] = cam
	}

	var toStop []*CameraStream
	c.jobsMu.Lock()
	for id, job := range c.jobs {
		cam, ok := desired[id]
		if !ok {
			delete(c.jobs, id)
			toStop = append(toStop, job)
			continue
		}
		if job.configKey != cam.ConfigKey() {
			delete(c.jobs, id)
			toStop = append(toStop, job)
		}
	}
	c.jobsMu.Unlock()

	for _, job := range toStop {
		go job.stop()
	}

	for _, cam := range filtered {
		c.jobsMu.Lock()
		_, running := c.jobs[cam.ID]
		c.jobsMu.Unlock()
		if running {
			continue
		}
		if err := c.startCameraStream(ctx, cam); err != nil {
			c.logger.Warn("failed to start camera", "camera_id", cam.ID, "error", err)
		}
	}

	c.updateJobCounts()
}

func (c *Coordinator) checkCameraOffline(ctx context.Context) {
	threshold := time.Duration(c.cfg.CameraOfflineAfterSeconds) * time.Second
	if threshold < 30*time.Second {
		threshold = 120 * time.Second
	}
	now := time.Now().UTC()

	c.jobsMu.Lock()
	jobs := make([]*CameraStream, 0, len(c.jobs))
	for _, j := range c.jobs {
		jobs = append(jobs, j)
	}
	c.jobsMu.Unlock()

	for _, job := range jobs {
		last := job.lastUpload()
		if last.IsZero() {
			continue
		}
		if now.Sub(last) > threshold {
			checkCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			job.markOffline(checkCtx)
			cancel()
		}
	}
}

func (c *Coordinator) updateJobCounts() {
	c.jobsMu.Lock()
	defer c.jobsMu.Unlock()
	running := len(c.jobs)
	offline := 0
	for _, j := range c.jobs {
		if j.markedOffline.Load() {
			offline++
		}
	}
	active := running
	c.stats.setCounts(active, running, offline)
}

func (c *Coordinator) removeJob(id uuid.UUID) {
	c.jobsMu.Lock()
	delete(c.jobs, id)
	c.jobsMu.Unlock()
	c.updateJobCounts()
}

func (c *Coordinator) setUploading(path string, uploading bool) {
	c.uploadingMu.Lock()
	defer c.uploadingMu.Unlock()
	if uploading {
		c.uploadingPaths[path]++
		return
	}
	if n, ok := c.uploadingPaths[path]; ok {
		if n <= 1 {
			delete(c.uploadingPaths, path)
		} else {
			c.uploadingPaths[path] = n - 1
		}
	}
}

func (c *Coordinator) isUploading(path string) bool {
	c.uploadingMu.Lock()
	defer c.uploadingMu.Unlock()
	return c.uploadingPaths[path] > 0
}

func (c *Coordinator) tempCleanupLoop(ctx context.Context) {
	interval := time.Duration(c.cfg.StreamTempCleanupIntervalSec) * time.Second
	if interval < 60*time.Second {
		interval = 300 * time.Second
	}
	cleaner := NewTempCleaner(c.logger, c.cfg.HLSLocalTmpDir, c.cfg.StreamTempMaxAgeMinutes, c.isUploading)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			cleaner.RunOnce()
		}
	}
}

func (c *Coordinator) stopAll() {
	c.jobsMu.Lock()
	jobs := make([]*CameraStream, 0, len(c.jobs))
	for _, j := range c.jobs {
		jobs = append(jobs, j)
	}
	c.jobs = make(map[uuid.UUID]*CameraStream)
	c.jobsMu.Unlock()

	var wg sync.WaitGroup
	for _, j := range jobs {
		wg.Add(1)
		go func(cs *CameraStream) {
			defer wg.Done()
			cs.stop()
		}(j)
	}
	wg.Wait()
	c.updateJobCounts()
}

// Stop shuts down all camera streams and closes the database pool.
func (c *Coordinator) Stop(ctx context.Context) {
	c.stopAll()
	c.writeHeartbeat(ctx, "STOPPING")
	RemoveCameraDir(c.cfg.HLSLocalTmpDir)
	c.db.Close()
}
