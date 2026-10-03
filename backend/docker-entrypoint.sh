#!/bin/sh
set -e

# Check if auto migration is requested via environment variable
if [ "${AUTO_MIGRATE}" = "true" ] || [ "${AUTO_MIGRATE}" = "1" ]; then
    echo "[entrypoint] AUTO_MIGRATE is enabled. Running migrations..."
    if [ -x "/app/migrate" ]; then
        /app/migrate
        echo "[entrypoint] Migrations completed successfully."
    else
        echo "[entrypoint] Warning: /app/migrate binary not found. Skipping."
    fi
fi

# Execute the specified container command (defaults to /app/api)
exec "$@"
