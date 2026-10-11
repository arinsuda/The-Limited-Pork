package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mookrob/backend/internal/infrastructure/config"
	"github.com/mookrob/backend/internal/infrastructure/persistence/postgres"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	if cfg.DatabaseURL == "" && (cfg.DBHost == "localhost" || cfg.DBHost == "127.0.0.1") && cfg.AppEnv == "production" {
		fmt.Fprintf(os.Stderr, "[migrate] ERROR: DATABASE_URL is not configured in Render environment variables!\n")
		fmt.Fprintf(os.Stderr, "[migrate] Please set DATABASE_URL in Render Dashboard -> Environment -> Environment Variables\n")
		os.Exit(1)
	}

	slog.Info("starting database migration", "has_database_url", cfg.DatabaseURL != "", "host", cfg.DBHost)

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DSN())
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to connect to postgres: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "failed to ping postgres: %v\n", err)
		os.Exit(1)
	}

	migrator := postgres.NewMigrator(pool)
	if err := migrator.Up(ctx); err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}

	slog.Info("migrations completed successfully")
}
