package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/retention"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	appCfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}
	workerCfg := retention.LoadWorkerConfig()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := database.New(ctx, appCfg)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	s3Client, err := storage.NewClient(ctx, appCfg)
	if err != nil {
		logger.Error("init storage client", "error", err)
		os.Exit(1)
	}

	worker := retention.NewWorker(workerCfg, db.Queries, s3Client, logger)
	logger.Info("retention-worker starting",
		"name", workerCfg.WorkerName,
		"interval", workerCfg.RunInterval.String(),
		"dry_run", workerCfg.DryRun,
		"recording_days", workerCfg.RecordingDays,
	)

	runOnce := func() {
		stats, err := worker.Run(ctx)
		if err != nil {
			logger.Error("retention run failed", "error", err)
			return
		}
		logger.Info("retention run completed",
			"expired_segments", stats.ExpiredSegmentsFound,
			"objects_deleted", stats.ObjectsDeleted,
			"db_rows_deleted", stats.DBRowsDeleted,
			"temp_deleted", stats.TempObjectsDeleted,
			"delete_errors", stats.DeleteErrors,
			"dry_run", stats.DryRun,
		)
	}

	runOnce()

	ticker := time.NewTicker(workerCfg.RunInterval)
	defer ticker.Stop()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runOnce()
			}
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down retention-worker")
	cancel()
}
