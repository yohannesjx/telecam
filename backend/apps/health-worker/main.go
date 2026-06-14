package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
	"github.com/school-camera-platform/school-camera-platform/internal/health"
	"github.com/school-camera-platform/school-camera-platform/internal/storage"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := appconfig.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}
	workerCfg := health.LoadWorkerConfig(cfg)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := database.New(ctx, cfg)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	s3Client, err := storage.NewClient(ctx, cfg)
	if err != nil {
		logger.Error("init storage client", "error", err)
		os.Exit(1)
	}

	monitor, err := health.NewMonitor(cfg, workerCfg, db.Queries, s3Client, logger)
	if err != nil {
		logger.Error("init health monitor", "error", err)
		os.Exit(1)
	}

	logger.Info("health-worker starting",
		"name", workerCfg.WorkerName,
		"interval", workerCfg.CheckInterval.String(),
	)

	go func() {
		if err := monitor.Run(ctx); err != nil && ctx.Err() == nil {
			logger.Error("health monitor stopped", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down health-worker")
	cancel()
}
