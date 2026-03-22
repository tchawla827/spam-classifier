#!/bin/bash
set -e

# Run Alembic migrations only when a database is configured
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

exec gunicorn \
  -w 1 \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout 120 \
  --log-level "${LOG_LEVEL:-info}" \
  app.main:app
