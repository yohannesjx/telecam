package worker

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/hls"
)

// FFmpegExitError carries FFmpeg process exit details.
type FFmpegExitError struct {
	Err      error
	ExitCode int
}

func (e *FFmpegExitError) Error() string {
	if e.ExitCode >= 0 {
		return fmt.Sprintf("ffmpeg exited with code %d: %v", e.ExitCode, e.Err)
	}
	return fmt.Sprintf("ffmpeg exited: %v", e.Err)
}

// FFmpegRunner manages an external FFmpeg HLS process.
type FFmpegRunner struct {
	logger  *slog.Logger
	cfg     *appconfig.Config
	outDir  string
	source  StreamSource
	profile hls.Profile
	mu      sync.Mutex
	cmd     *exec.Cmd
}

// NewFFmpegRunner creates a runner for the given output directory, input source, and quality profile.
func NewFFmpegRunner(logger *slog.Logger, cfg *appconfig.Config, outDir string, source StreamSource, profile hls.Profile) *FFmpegRunner {
	return &FFmpegRunner{logger: logger, cfg: cfg, outDir: outDir, source: source, profile: profile}
}

// Run starts FFmpeg and blocks until it exits or ctx is cancelled.
func (f *FFmpegRunner) Run(ctx context.Context) error {
	segmentsDir := filepath.Join(f.outDir, "segments")
	if err := os.MkdirAll(segmentsDir, 0o755); err != nil {
		return fmt.Errorf("create segments dir: %w", err)
	}
	segmentPattern := filepath.Join(segmentsDir, hls.SegmentPattern())
	playlistPath := filepath.Join(f.outDir, "index.m3u8")

	listSize := f.cfg.LiveDelaySeconds/f.cfg.HLSSegmentSeconds + 2
	if listSize < 4 {
		listSize = 4
	}
	if listSize > 12 {
		listSize = 12
	}

	args := []string{"-hide_banner", "-loglevel", "warning"}
	switch f.source.Kind {
	case SourceDemo:
		args = append(args, "-stream_loop", "-1", "-re", "-i", f.source.Input)
	case SourceRTSP:
		args = append(args,
			"-rtsp_transport", "tcp",
			"-stimeout", "5000000",
			"-rw_timeout", "5000000",
			"-i", f.source.Input,
		)
	default:
		return fmt.Errorf("unknown stream source kind %q", f.source.Kind)
	}

	scale := fmt.Sprintf("scale=%d:%d", f.profile.Width, f.profile.Height)
	videoArgs := []string{
		"-vf", scale,
		"-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
		"-b:v", f.profile.VideoBitrate,
		"-maxrate", f.profile.MaxRate,
		"-bufsize", f.profile.BufSize,
	}
	if f.profile.AudioEnabled {
		videoArgs = append(videoArgs, "-c:a", "aac", "-b:a", f.profile.AudioBitrate)
	} else {
		videoArgs = append(videoArgs, "-an")
	}

	args = append(args, videoArgs...)
	args = append(args,
		"-f", "hls",
		"-hls_time", fmt.Sprintf("%d", f.cfg.HLSSegmentSeconds),
		"-hls_list_size", fmt.Sprintf("%d", listSize),
		"-hls_flags", "delete_segments+append_list+omit_endlist",
		"-hls_segment_filename", segmentPattern,
		playlistPath,
	)

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	f.mu.Lock()
	f.cmd = cmd
	f.mu.Unlock()

	logArgs := redactFFmpegArgs(args, f.source.Kind)
	f.logger.Info("starting ffmpeg", "source_kind", f.source.Kind, "quality", f.profile.Name, "args", logArgs)

	if err := cmd.Start(); err != nil {
		if f.source.Kind == SourceRTSP {
			return &FFmpegExitError{Err: fmt.Errorf("start ffmpeg (rtsp): %w", err), ExitCode: -1}
		}
		return fmt.Errorf("start ffmpeg: %w", err)
	}

	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	select {
	case <-ctx.Done():
		f.Stop()
		<-done
		return ctx.Err()
	case err := <-done:
		if err == nil {
			return nil
		}
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return &FFmpegExitError{Err: err, ExitCode: exitErr.ExitCode()}
		}
		return err
	}
}

func redactFFmpegArgs(args []string, kind StreamSourceKind) []string {
	if kind != SourceRTSP {
		return args
	}
	out := make([]string, len(args))
	copy(out, args)
	for i := 0; i < len(out)-1; i++ {
		if out[i] == "-i" {
			out[i+1] = "<redacted>"
			break
		}
	}
	return out
}

// Stop sends SIGTERM to the running FFmpeg process, then SIGKILL if needed.
func (f *FFmpegRunner) Stop() {
	f.mu.Lock()
	cmd := f.cmd
	f.mu.Unlock()
	if cmd == nil || cmd.Process == nil {
		return
	}
	_ = cmd.Process.Signal(syscall.SIGTERM)
	done := make(chan struct{})
	go func() {
		_ = cmd.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		_ = cmd.Process.Kill()
		<-done
	}
}
