package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/school-camera-platform/school-camera-platform/internal/alertdelivery"
	"github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}
	workerCfg := alertdelivery.LoadWorkerConfig(cfg)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := database.New(ctx, cfg)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	worker, err := alertdelivery.NewWorker(workerCfg, db.Queries, logger)
	if err != nil {
		logger.Error("init alert worker", "error", err)
		os.Exit(1)
	}

	logger.Info("alert-worker starting",
		"name", workerCfg.WorkerName,
		"poll", workerCfg.PollInterval.String(),
		"telegram_enabled", workerCfg.TelegramEnabled,
	)

	go func() {
		if err := worker.Run(ctx); err != nil && ctx.Err() == nil {
			logger.Error("alert worker stopped", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down alert-worker")
	cancel()
}
