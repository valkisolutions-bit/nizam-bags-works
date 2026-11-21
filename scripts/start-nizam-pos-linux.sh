#!/usr/bin/env bash
# Nizam Bags POS - Linux automatic startup
set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Starting Nizam Bags POS..."
until docker info >/dev/null 2>&1; do
  sleep 5
done
COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
  COMPOSE_FILE="docker-compose.yml"
fi
docker compose -f "$COMPOSE_FILE" up -d

until curl -fsS http://localhost >/dev/null 2>&1; do
  sleep 2
done

if command -v google-chrome >/dev/null 2>&1; then
  google-chrome --app=http://localhost >/dev/null 2>&1 &
elif command -v google-chrome-stable >/dev/null 2>&1; then
  google-chrome-stable --app=http://localhost >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
  chromium --app=http://localhost >/dev/null 2>&1 &
else
  echo "Chrome/Chromium not found. Open http://localhost manually."
fi
