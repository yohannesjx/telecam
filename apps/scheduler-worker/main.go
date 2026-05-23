package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/scheduler"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}
	workerCfg := scheduler.LoadWorkerConfig(cfg)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := database.New(ctx, cfg)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	worker, err := scheduler.NewWorker(workerCfg, db.Queries, logger)
	if err != nil {
		logger.Error("init scheduler worker", "error", err)
		os.Exit(1)
	}

	logger.Info("scheduler-worker starting",
		"name", workerCfg.WorkerName,
		"timezone", workerCfg.Timezone,
		"start", workerCfg.RecordingStartTime,
		"end", workerCfg.RecordingEndTime,
		"poll", workerCfg.PollInterval.String(),
	)

	go func() {
		if err := worker.Run(ctx); err != nil && ctx.Err() == nil {
			logger.Error("scheduler worker stopped", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down scheduler-worker")
	cancel()
}
