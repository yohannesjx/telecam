package worker

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// TempCleaner removes stale files from HLS scratch directories.
type TempCleaner struct {
	logger    *slog.Logger
	rootDir   string
	maxAge    time.Duration
	uploading func(string) bool
}

func NewTempCleaner(logger *slog.Logger, rootDir string, maxAgeMinutes int, uploading func(string) bool) *TempCleaner {
	if maxAgeMinutes < 1 {
		maxAgeMinutes = 30
	}
	return &TempCleaner{
		logger:    logger,
		rootDir:   rootDir,
		maxAge:    time.Duration(maxAgeMinutes) * time.Minute,
		uploading: uploading,
	}
}

// RunOnce deletes old files under rootDir, skipping paths currently uploading.
func (t *TempCleaner) RunOnce() {
	if t.rootDir == "" {
		return
	}
	cutoff := time.Now().Add(-t.maxAge)
	_ = filepath.WalkDir(t.rootDir, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		name := d.Name()
		if !strings.HasSuffix(name, ".ts") && name != "index.m3u8" && !strings.HasSuffix(name, ".tmp") {
			return nil
		}
		if t.uploading != nil && t.uploading(path) {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		if info.ModTime().Before(cutoff) {
			if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
				t.logger.Debug("temp cleanup remove failed", "path", path, "error", err)
			}
		}
		return nil
	})
}

// RemoveCameraDir deletes an entire camera scratch directory (on shutdown).
func RemoveCameraDir(dir string) {
	_ = os.RemoveAll(dir)
}
