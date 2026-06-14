package worker

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
)

// CameraStream runs FFmpeg and uploads HLS for one camera.
type CameraStream struct {
	coord      *Coordinator
	logger     *slog.Logger
	cfg        *appconfig.Config
	camera     StreamingCamera
	configKey  string
	quality    string
	source     StreamSource
	outDir     string
	ffmpeg     *FFmpegRunner
	uploader   *Uploader

	mu            sync.Mutex
	cancel        context.CancelFunc
	done          chan struct{}
	restarts      int
	lastUploadAt  atomic.Value // time.Time
	markedOffline atomic.Bool
	uploadFailStreak int
}

func (c *Coordinator) startCameraStream(ctx context.Context, camera StreamingCamera) error {
	source, err := c.resolveSource(camera)
	if err != nil {
		c.logger.Warn("skip camera", "camera_id", camera.ID, "name", camera.Name, "error", err)
		c.recordHealthEvent(ctx, camera, "STREAM_SOURCE_ERROR", "WARN", err.Error(), healthMeta{SourceKind: string(source.Kind)})
		return err
	}

	quality := camera.DefaultQuality
	if quality == "" {
		quality = hls.DefaultQuality
	}
	profile, err := hls.GetProfile(quality)
	if err != nil {
		c.logger.Warn("skip camera", "camera_id", camera.ID, "name", camera.Name, "error", err)
		return err
	}

	outDir := filepath.Join(c.cfg.HLSLocalTmpDir, camera.ID.String(), quality)
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return fmt.Errorf("create out dir: %w", err)
	}

	streamCtx, cancel := context.WithCancel(ctx)
	cs := &CameraStream{
		coord:     c,
		logger:    c.logger.With("camera_id", camera.ID, "camera_name", camera.Name, "quality", quality),
		cfg:       c.cfg,
		camera:    camera,
		configKey: camera.ConfigKey(),
		quality:   quality,
		source:    source,
		outDir:    outDir,
		done:      make(chan struct{}),
	}
	cs.lastUploadAt.Store(time.Time{})

	cs.ffmpeg = NewFFmpegRunner(cs.logger, c.cfg, outDir, source, profile)
	cs.uploader = NewUploader(cs.logger, c.cfg, c.storage, c.db.Queries, camera, outDir, c.cfg.HLSSegmentSeconds, UploaderHooks{
		OnSegmentSuccess: cs.onSegmentSuccess,
		OnUploadFailed:   cs.onUploadFailed,
		MarkUploading:    c.setUploading,
	})
	cs.cancel = cancel

	c.jobsMu.Lock()
	c.jobs[camera.ID] = cs
	c.jobsMu.Unlock()

	go cs.run(streamCtx)

	c.recordHealthEvent(ctx, camera, "CAMERA_STREAM_STARTED", "INFO", "stream started", healthMeta{
		SourceKind: string(source.Kind),
		Quality:    quality,
	})
	c.logger.Info("camera stream started",
		"camera_id", camera.ID,
		"source_kind", source.Kind,
		"quality", quality,
		"live_path", hls.LivePlaylistKey(camera.R2LivePath, quality),
	)
	return nil
}

func (c *Coordinator) resolveSource(camera StreamingCamera) (StreamSource, error) {
	if !hasRTSP(camera) {
		if _, err := os.Stat(c.cfg.SampleVideoPath); err != nil {
			return StreamSource{}, fmt.Errorf("sample video unavailable: %w", err)
		}
		return StreamSource{Kind: SourceDemo, Input: c.cfg.SampleVideoPath}, nil
	}
	if c.cipher == nil {
		return StreamSource{}, fmt.Errorf("encryption not configured for RTSP camera")
	}
	rtsp, err := c.cipher.Decrypt(camera.EncryptedRtspURL.String)
	if err != nil {
		return StreamSource{}, fmt.Errorf("decrypt RTSP credentials failed")
	}
	if rtsp == "" {
		return StreamSource{}, fmt.Errorf("empty RTSP URL after decrypt")
	}
	return StreamSource{Kind: SourceRTSP, Input: rtsp}, nil
}

func (cs *CameraStream) onSegmentSuccess() {
	cs.lastUploadAt.Store(time.Now().UTC())
	cs.uploadFailStreak = 0
	cs.coord.onSegmentUploaded()
	if cs.markedOffline.Load() {
		cs.markedOffline.Store(false)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = cs.coord.setCameraStatus(ctx, cs.camera.ID, "ACTIVE")
		cs.coord.recordHealthEvent(ctx, cs.camera, "CAMERA_ONLINE", "INFO", "segment uploads resumed", healthMeta{
			Quality: cs.quality,
		})
	}
}

func (cs *CameraStream) onUploadFailed(key string, err error) {
	cs.uploadFailStreak++
	cs.coord.onUploadFailed()
	if cs.uploadFailStreak >= cs.cfg.StreamUploadMaxRetries {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		cs.coord.recordHealthEvent(ctx, cs.camera, "CAMERA_UPLOAD_FAILED", "ERROR", "repeated upload failures", healthMeta{
			ObjectKey: key,
			Error:     err.Error(),
			Quality:   cs.quality,
		})
		cs.uploadFailStreak = 0
	}
}

func (cs *CameraStream) run(ctx context.Context) {
	defer close(cs.done)
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		cs.coord.recordHealthEvent(shutdownCtx, cs.camera, "CAMERA_STREAM_STOPPED", "INFO", "stream stopped", healthMeta{
			Quality: cs.quality,
		})
		cs.coord.removeJob(cs.camera.ID)
	}()

	go cs.uploader.Watch(ctx)

	backoffAttempt := 0
	for {
		select {
		case <-ctx.Done():
			cs.ffmpeg.Stop()
			return
		default:
		}

		if cs.restarts >= cs.cfg.StreamWorkerMaxRestarts {
			cs.logger.Error("max ffmpeg restarts exceeded", "restarts", cs.restarts)
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			_ = cs.coord.setCameraStatus(shutdownCtx, cs.camera.ID, "OFFLINE")
			cs.coord.recordHealthEvent(shutdownCtx, cs.camera, "CAMERA_MAX_RESTARTS_REACHED", "ERROR", "ffmpeg exceeded max restarts", healthMeta{
				RestartCount: cs.restarts,
				Quality:      cs.quality,
			})
			cancel()
			cs.coord.setLastError(fmt.Errorf("camera %s: max restarts", cs.camera.ID))
			return
		}

		err := cs.ffmpeg.Run(ctx)
		if ctx.Err() != nil {
			cs.ffmpeg.Stop()
			return
		}

		exitCode := -1
		errMsg := ""
		if err != nil {
			errMsg = err.Error()
			var exitErr *FFmpegExitError
			if errors.As(err, &exitErr) {
				exitCode = exitErr.ExitCode
			}
		}

		cs.restarts++
		cs.coord.onFFmpegRestart()

		eventCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		cs.coord.recordHealthEvent(eventCtx, cs.camera, "CAMERA_FFMPEG_EXITED", "WARN", "ffmpeg process exited", healthMeta{
			RestartCount: cs.restarts,
			Error:        errMsg,
			ExitCode:     exitCode,
			Quality:      cs.quality,
			SourceKind:   string(cs.source.Kind),
		})
		if cs.source.Kind == SourceRTSP && err != nil {
			cs.coord.recordHealthEvent(eventCtx, cs.camera, "CAMERA_RTSP_CONNECT_FAILED", "WARN", "rtsp/ffmpeg failure", healthMeta{
				RestartCount: cs.restarts,
				Error:        errMsg,
				ExitCode:     exitCode,
				Quality:      cs.quality,
			})
		}
		cancel()

		delay := ffmpegBackoffSequence(backoffAttempt)
		backoffAttempt++
		cs.logger.Warn("ffmpeg exited, restarting", "error", err, "restarts", cs.restarts, "backoff", delay.String())

		restartCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		cs.coord.recordHealthEvent(restartCtx, cs.camera, "CAMERA_FFMPEG_RESTARTED", "INFO", "scheduling ffmpeg restart", healthMeta{
			RestartCount: cs.restarts,
			Quality:      cs.quality,
		})
		cancel()

		select {
		case <-ctx.Done():
			return
		case <-time.After(delay):
		}
	}
}

func (cs *CameraStream) stop() {
	cs.mu.Lock()
	cancel := cs.cancel
	cs.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	cs.ffmpeg.Stop()
	select {
	case <-cs.done:
	case <-time.After(15 * time.Second):
		cs.logger.Warn("camera stream stop timed out")
	}
	RemoveCameraDir(cs.outDir)
}

func (cs *CameraStream) lastUpload() time.Time {
	v := cs.lastUploadAt.Load()
	if v == nil {
		return time.Time{}
	}
	return v.(time.Time)
}

func (cs *CameraStream) markOffline(ctx context.Context) {
	if cs.markedOffline.Load() {
		return
	}
	cs.markedOffline.Store(true)
	_ = cs.coord.setCameraStatus(ctx, cs.camera.ID, "OFFLINE")
	cs.coord.recordHealthEvent(ctx, cs.camera, "CAMERA_OFFLINE", "WARN", "no successful segment upload within threshold", healthMeta{
		Quality: cs.quality,
	})
}
