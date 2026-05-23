package worker

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"
)

// UploaderHooks are coordinator callbacks for upload lifecycle events.
type UploaderHooks struct {
	OnSegmentSuccess func()
	OnUploadFailed   func(objectKey string, err error)
	MarkUploading    func(localPath string, uploading bool)
}

// Uploader watches local HLS output and uploads new files to object storage.
type Uploader struct {
	logger         *slog.Logger
	cfg            *appconfig.Config
	storage        *storage.Client
	db             *sqlc.Queries
	camera         StreamingCamera
	outDir         string
	segmentSeconds int
	pollInterval   time.Duration
	hooks          UploaderHooks
	uploaded       map[string]int64
	mu             sync.Mutex
}

// NewUploader creates an uploader for a camera output directory.
func NewUploader(
	logger *slog.Logger,
	cfg *appconfig.Config,
	s3 *storage.Client,
	db *sqlc.Queries,
	camera StreamingCamera,
	outDir string,
	segmentSeconds int,
	hooks UploaderHooks,
) *Uploader {
	return &Uploader{
		logger:         logger,
		cfg:            cfg,
		storage:        s3,
		db:             db,
		camera:         camera,
		outDir:         outDir,
		segmentSeconds: segmentSeconds,
		pollInterval:   2 * time.Second,
		hooks:          hooks,
		uploaded:       make(map[string]int64),
	}
}

// Watch polls for new/changed HLS files and uploads them until ctx is cancelled.
func (u *Uploader) Watch(ctx context.Context) {
	ticker := time.NewTicker(u.pollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			u.scanAndUpload(ctx)
		}
	}
}

func (u *Uploader) scanAndUpload(ctx context.Context) {
	u.walkDir(ctx, u.outDir)
	segDir := filepath.Join(u.outDir, "segments")
	u.walkDir(ctx, segDir)
}

func (u *Uploader) walkDir(ctx context.Context, dir string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if !os.IsNotExist(err) {
			u.logger.Error("read hls dir", "dir", dir, "error", err)
		}
		return
	}
	for _, ent := range entries {
		if ent.IsDir() {
			continue
		}
		name := ent.Name()
		if !strings.HasSuffix(name, ".ts") && name != "index.m3u8" {
			continue
		}
		u.uploadIfChanged(ctx, filepath.Join(dir, name), name)
	}
}

func (u *Uploader) uploadIfChanged(ctx context.Context, localPath, fileName string) {
	info, err := os.Stat(localPath)
	if err != nil {
		return
	}
	size := info.Size()
	if size == 0 {
		return
	}
	u.mu.Lock()
	prev, seen := u.uploaded[localPath]
	if seen && prev == size {
		u.mu.Unlock()
		return
	}
	u.mu.Unlock()

	if u.hooks.MarkUploading != nil {
		u.hooks.MarkUploading(localPath, true)
		defer u.hooks.MarkUploading(localPath, false)
	}

	data, err := os.ReadFile(localPath)
	if err != nil {
		u.logger.Error("read file for upload", "path", localPath, "error", err)
		return
	}

	quality := u.camera.DefaultQuality
	var key string
	contentType := "application/vnd.apple.mpegurl"
	if fileName == "index.m3u8" {
		key = PlaylistObjectKey(u.camera.R2LivePath, quality)
	} else {
		key = SegmentObjectKey(u.camera.R2LivePath, quality, fileName)
		contentType = "video/mp2t"
	}

	if err := u.putWithRetry(ctx, key, data, contentType); err != nil {
		u.logger.Error("upload failed", "key", key, "error", err)
		if u.hooks.OnUploadFailed != nil {
			u.hooks.OnUploadFailed(key, err)
		}
		return
	}

	u.mu.Lock()
	u.uploaded[localPath] = size
	u.mu.Unlock()
	u.logger.Info("uploaded", "key", key, "bytes", len(data))

	if strings.HasSuffix(fileName, ".ts") {
		u.persistSegment(ctx, key, int64(len(data)))
	}
}

func (u *Uploader) putWithRetry(ctx context.Context, key string, data []byte, contentType string) error {
	maxRetries := u.cfg.StreamUploadMaxRetries
	if maxRetries < 1 {
		maxRetries = 5
	}
	baseSec := u.cfg.StreamUploadRetryBaseSeconds
	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			delay := uploadRetryDelay(baseSec, attempt-1)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}
		lastErr = u.storage.PutObject(ctx, key, data, contentType)
		if lastErr == nil {
			return nil
		}
	}
	return lastErr
}

func (u *Uploader) persistSegment(ctx context.Context, segmentKey string, sizeBytes int64) {
	now := time.Now().UTC()
	dur := time.Duration(u.segmentSeconds) * time.Second
	start := now.Add(-dur)
	expires := start.Add(7 * 24 * time.Hour)

	_, err := u.db.InsertRecordingSegment(ctx, sqlc.InsertRecordingSegmentParams{
		ID:              uuid.New(),
		CameraID:        u.camera.ID,
		SchoolID:        u.camera.SchoolID,
		SegmentPath:     segmentKey,
		PlaylistPath:    database.TextFromString(PlaylistObjectKey(u.camera.R2LivePath, u.camera.DefaultQuality)),
		Quality:         u.camera.DefaultQuality,
		StartTime:       database.TimestamptzFromTime(start),
		EndTime:         database.TimestamptzFromTime(now),
		DurationSeconds: int32(u.segmentSeconds),
		SizeBytes:       sizeBytes,
		ExpiresAt:       database.TimestamptzFromTime(expires),
	})
	if err != nil {
		u.logger.Error("insert recording segment", "key", segmentKey, "error", err)
		return
	}

	if err := u.db.UpdateCameraLastSegmentAt(ctx, sqlc.UpdateCameraLastSegmentAtParams{
		ID:            u.camera.ID,
		LastSegmentAt: database.TimestamptzFromTime(now),
	}); err != nil {
		u.logger.Error("update camera last_segment_at", "error", err)
	}

	if u.hooks.OnSegmentSuccess != nil {
		u.hooks.OnSegmentSuccess()
	}
}
