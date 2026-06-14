// Command migrate runs database migrations and optional dev seeds.
//
// Usage:
//
//	migrate up
//	migrate down
//	migrate seed
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	if len(os.Args) < 2 {
		logger.Error("usage: migrate <up|down|seed>")
		os.Exit(1)
	}

	cfg, err := appconfig.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}

	cmd := os.Args[1]
	switch cmd {
	case "up":
		if err := runMigrations(cfg.DatabaseURL, "up"); err != nil {
			logger.Error("migrate up failed", "error", err)
			os.Exit(1)
		}
		logger.Info("migrations applied")
	case "down":
		if err := runMigrations(cfg.DatabaseURL, "down"); err != nil {
			logger.Error("migrate down failed", "error", err)
			os.Exit(1)
		}
		logger.Info("migrations rolled back")
	case "seed":
		if err := runSeed(logger, cfg.DatabaseURL); err != nil {
			logger.Error("seed failed", "error", err)
			os.Exit(1)
		}
		logger.Info("seed data applied")
	default:
		logger.Error("unknown command", "command", cmd)
		os.Exit(1)
	}
}

func runMigrations(databaseURL, direction string) error {
	migrationsPath := os.Getenv("MIGRATIONS_PATH")
	if migrationsPath == "" {
		migrationsPath = "/app/migrations"
	}
	if _, err := os.Stat(migrationsPath); err != nil {
		// Local development: repo root migrations/
		if wd, werr := os.Getwd(); werr == nil {
			candidate := filepath.Join(wd, "migrations")
			if _, statErr := os.Stat(candidate); statErr == nil {
				migrationsPath = candidate
			}
		}
	}

	sourceURL := "file://" + filepath.ToSlash(migrationsPath)
	m, err := migrate.New(sourceURL, databaseURL)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}
	defer func() {
		srcErr, dbErr := m.Close()
		if srcErr != nil {
			slog.Warn("migrate source close", "error", srcErr)
		}
		if dbErr != nil {
			slog.Warn("migrate db close", "error", dbErr)
		}
	}()

	switch direction {
	case "up":
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			return err
		}
	case "down":
		if err := m.Steps(-1); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			return err
		}
	default:
		return fmt.Errorf("unsupported direction %q", direction)
	}
	return nil
}

func runSeed(logger *slog.Logger, databaseURL string) error {
	seedDir := os.Getenv("SEEDS_PATH")
	if seedDir == "" {
		seedDir = "/app/migrations/seeds"
	}
	if _, err := os.Stat(seedDir); err != nil {
		if wd, werr := os.Getwd(); werr == nil {
			candidate := filepath.Join(wd, "migrations", "seeds")
			if _, statErr := os.Stat(candidate); statErr == nil {
				seedDir = candidate
			}
		}
	}

	entries, err := os.ReadDir(seedDir)
	if err != nil {
		return fmt.Errorf("read seeds dir %q: %w", seedDir, err)
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		files = append(files, filepath.Join(seedDir, e.Name()))
	}
	sort.Strings(files)
	if len(files) == 0 {
		return fmt.Errorf("no seed files in %s", seedDir)
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return fmt.Errorf("connect for seed: %w", err)
	}
	defer pool.Close()

	for _, file := range files {
		sqlBytes, readErr := os.ReadFile(file)
		if readErr != nil {
			return readErr
		}
		logger.Info("applying seed", "file", filepath.Base(file))
		if _, execErr := pool.Exec(context.Background(), string(sqlBytes)); execErr != nil {
			return fmt.Errorf("seed %s: %w", filepath.Base(file), execErr)
		}
	}
	return nil
}
