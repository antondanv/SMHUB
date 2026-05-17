#!/usr/bin/env bash

set -euo pipefail

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose не найден. Установите Docker Desktop или docker-compose." >&2
  exit 1
fi

echo "Запуск SMHUB через Docker..."
exec "${COMPOSE_CMD[@]}" up --build "$@"
