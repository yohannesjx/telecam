// Package database provides PostgreSQL connectivity via pgx and sqlc-generated queries.
package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	appconfig "github.com/school-camera-platform/school-camera-platform/internal/config"
	"github.com/school-camera-platform/school-camera-platform/internal/database/sqlc"
)

// DB wraps the connection pool and sqlc queries.
type DB struct {
	Pool    *pgxpool.Pool
	Queries *sqlc.Queries
}

// New connects to PostgreSQL and prepares sqlc queries.
func New(ctx context.Context, cfg *appconfig.Config) (*DB, error) {
	if cfg == nil {
		return nil, fmt.Errorf("config required")
	}
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return &DB{
		Pool:    pool,
		Queries: sqlc.New(pool),
	}, nil
}

// Ping checks database connectivity.
func (db *DB) Ping(ctx context.Context) error {
	if db == nil || db.Pool == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.Pool.Ping(ctx)
}

// Close shuts down the pool.
func (db *DB) Close() {
	if db != nil && db.Pool != nil {
		db.Pool.Close()
	}
}
