package retention

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"
)

// RunStats summarizes one retention pass.
type RunStats struct {
	ExpiredSegmentsFound int
	ObjectsDeleted       int
	DBRowsDeleted        int
	DeleteErrors         int
	TempObjectsDeleted   int
	StorageUsageUpdated  int
	DryRun               bool
	LastRunAt            time.Time
}

// Worker enforces object and row retention policies.
type Worker struct {
	cfg     WorkerConfig
	q       *sqlc.Queries
	storage *storage.Client
	logger  *slog.Logger
}

// NewWorker constructs a retention worker.
func NewWorker(cfg WorkerConfig, q *sqlc.Queries, s3 *storage.Client, logger *slog.Logger) *Worker {
	return &Worker{cfg: cfg, q: q, storage: s3, logger: logger}
}

// Run executes one full retention cycle.
func (w *Worker) Run(ctx context.Context) (RunStats, error) {
	stats := RunStats{
		DryRun:    w.cfg.DryRun,
		LastRunAt: time.Now().UTC(),
	}

	if err := w.purgeExpiredSegments(ctx, &stats); err != nil {
		w.writeHeartbeat(ctx, "ERROR", stats)
		return stats, err
	}
	if err := w.purgeTempPlayback(ctx, &stats); err != nil {
		w.writeHeartbeat(ctx, "DEGRADED", stats)
		return stats, err
	}
	if err := w.updateStorageUsage(ctx, &stats); err != nil {
		w.writeHeartbeat(ctx, "DEGRADED", stats)
		return stats, err
	}

	status := "RUNNING"
	if stats.DeleteErrors > 0 {
		status = "DEGRADED"
	}
	w.writeHeartbeat(ctx, status, stats)
	return stats, nil
}

func (w *Worker) purgeExpiredSegments(ctx context.Context, stats *RunStats) error {
	for {
		rows, err := w.q.ListExpiredRecordingSegments(ctx, w.cfg.BatchSize)
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			return nil
		}
		stats.ExpiredSegmentsFound += len(rows)

		var deletedIDs []uuid.UUID
		for _, seg := range rows {
			ok, err := w.deleteSegment(ctx, seg, stats)
			if err != nil {
				stats.DeleteErrors++
				w.logger.Warn("segment retention failed",
					"segment_id", seg.ID,
					"path", seg.SegmentPath,
					"error", err,
				)
				continue
			}
			if ok {
				deletedIDs = append(deletedIDs, seg.ID)
			}
		}

		if len(deletedIDs) > 0 && w.cfg.DeleteDBRows && !w.cfg.DryRun {
			n, err := w.q.DeleteRecordingSegmentsByIDs(ctx, deletedIDs)
			if err != nil {
				return err
			}
			stats.DBRowsDeleted += int(n)
		} else if w.cfg.DryRun {
			stats.DBRowsDeleted += len(deletedIDs)
		}

		if len(rows) < int(w.cfg.BatchSize) {
			return nil
		}
	}
}

func (w *Worker) deleteSegment(ctx context.Context, seg sqlc.RecordingSegment, stats *RunStats) (bool, error) {
	if !IsDeletableSegmentKey(seg.SegmentPath) {
		w.logger.Warn("skip unsafe segment path", "path", seg.SegmentPath)
		return false, errors.New("unsafe segment path")
	}

	if w.cfg.DryRun || !w.cfg.DeleteObjects {
		w.logger.Info("dry-run would delete segment object", "path", seg.SegmentPath, "segment_id", seg.ID)
		stats.ObjectsDeleted++
		return true, nil
	}

	if err := w.storage.DeleteObject(ctx, seg.SegmentPath); err != nil {
		return false, err
	}
	stats.ObjectsDeleted++

	if seg.PlaylistPath.Valid && !ShouldSkipPlaylistDelete(seg.PlaylistPath.String) {
		if err := w.storage.DeleteObject(ctx, seg.PlaylistPath.String); err != nil {
			w.logger.Warn("delete segment playlist path failed", "path", seg.PlaylistPath.String, "error", err)
		}
	}

	return true, nil
}

func (w *Worker) purgeTempPlayback(ctx context.Context, stats *RunStats) error {
	objects, err := w.storage.ListObjects(ctx, TempPlaybackPrefix)
	if err != nil {
		return err
	}
	cutoff := time.Now().UTC().Add(-w.cfg.TempPlaybackRetention)
	for _, obj := range objects {
		if !IsTempPlaybackKey(obj.Key) {
			continue
		}
		if !obj.LastModified.IsZero() && obj.LastModified.After(cutoff) {
			continue
		}
		if w.cfg.DryRun || !w.cfg.DeleteObjects {
			w.logger.Info("dry-run would delete temp playback object", "key", obj.Key)
			stats.TempObjectsDeleted++
			continue
		}
		if err := w.storage.DeleteObject(ctx, obj.Key); err != nil {
			stats.DeleteErrors++
			w.logger.Warn("delete temp playback object failed", "key", obj.Key, "error", err)
			continue
		}
		stats.TempObjectsDeleted++
	}
	return nil
}

func (w *Worker) updateStorageUsage(ctx context.Context, stats *RunStats) error {
	loc, err := time.LoadLocation(w.cfg.Timezone)
	if err != nil {
		loc = time.UTC
	}
	today := time.Now().In(loc)
	reportDate := pgtype.Date{
		Time:  time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC),
		Valid: true,
	}

	if w.cfg.StorageUsageReportHour >= 0 && today.Hour() < w.cfg.StorageUsageReportHour {
		// Still update every run per "every run if easier" — no hour gate enforced.
	}

	schools, err := w.q.ListSchoolsForStorageReport(ctx)
	if err != nil {
		return err
	}

	for _, school := range schools {
		usage, err := w.q.CountStorageUsageBySchool(ctx, school.ID)
		if err != nil {
			return err
		}
		cost := estimateCostUSD(usage.TotalBytes)
		meta, _ := json.Marshal(map[string]any{
			"recording_days": w.cfg.RecordingDays,
			"reported_at":    time.Now().UTC().Format(time.RFC3339),
		})
		if w.cfg.DryRun {
			stats.StorageUsageUpdated++
			continue
		}
		_, err = w.q.UpsertStorageUsage(ctx, sqlc.UpsertStorageUsageParams{
			ID:               uuid.New(),
			SchoolID:         school.ID,
			Date:             reportDate,
			TotalBytes:       usage.TotalBytes,
			SegmentCount:     usage.SegmentCount,
			EstimatedCostUsd: cost,
			Metadata:         meta,
		})
		if err != nil {
			return err
		}
		stats.StorageUsageUpdated++
	}
	return nil
}

func estimateCostUSD(totalBytes int64) pgtype.Numeric {
	if totalBytes <= 0 {
		return pgtype.Numeric{}
	}
	gb := float64(totalBytes) / (1024 * 1024 * 1024)
	daily := gb * 0.015 / 30
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.4f", daily))
	return n
}

func (w *Worker) writeHeartbeat(ctx context.Context, status string, stats RunStats) {
	meta, _ := json.Marshal(map[string]any{
		"dry_run":                 stats.DryRun,
		"expired_segments_found":  stats.ExpiredSegmentsFound,
		"objects_deleted":         stats.ObjectsDeleted,
		"db_rows_deleted":         stats.DBRowsDeleted,
		"delete_errors":           stats.DeleteErrors,
		"temp_objects_deleted":    stats.TempObjectsDeleted,
		"storage_usage_updated":   stats.StorageUsageUpdated,
		"last_run_at":             stats.LastRunAt.Format(time.RFC3339),
		"recording_days":          w.cfg.RecordingDays,
	})
	_, err := w.q.InsertWorkerHeartbeat(ctx, sqlc.InsertWorkerHeartbeatParams{
		ID:         uuid.New(),
		WorkerName: w.cfg.WorkerName,
		WorkerType: WorkerTypeRetention,
		Status:     status,
		Metadata:   meta,
	})
	if err != nil {
		w.logger.Error("insert retention heartbeat", "error", err)
	}
}

// LatestHeartbeat returns the most recent retention worker heartbeat.
func (w *Worker) LatestHeartbeat(ctx context.Context) (sqlc.WorkerHeartbeat, error) {
	hb, err := w.q.GetLatestWorkerHeartbeatByType(ctx, WorkerTypeRetention)
	if err != nil {
		return sqlc.WorkerHeartbeat{}, err
	}
	return hb, nil
}
