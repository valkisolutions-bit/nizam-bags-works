#!/usr/bin/env bash
# Nizam Bags POS - Production Update & Deployment Script for Linux
set -e

IMAGE_TAG="${1:-latest}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================================="
echo "    Nizam Bags POS - Production Deployment & Updater"
echo "=========================================================="
echo "Target Image Tag : $IMAGE_TAG"
echo "Working Directory: $PROJECT_ROOT"
echo ""

# 1. Check Docker daemon
echo "[1/6] Checking Docker Engine daemon..."
until docker info >/dev/null 2>&1; do
    echo "Waiting for Docker daemon..."
    sleep 3
done
echo "Docker Engine is active."

COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi
echo "Using Compose file: $COMPOSE_FILE"

# 2. Pull updated images
echo ""
echo "[2/6] Pulling updated images from Docker Hub..."
docker pull "valkisolutions/nizam-backend:$IMAGE_TAG"
docker pull "valkisolutions/nizam-frontend:$IMAGE_TAG"

# 3. Stop and remove only old frontend and backend (PRESERVING MySQL!)
echo ""
echo "[3/6] Stopping and removing old frontend & backend containers..."
echo "[IMPORTANT] MySQL container and db_data volume are PRESERVED."
docker compose -f "$COMPOSE_FILE" stop backend frontend 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" rm -f backend frontend 2>/dev/null || true

# 4. Start updated services
echo ""
echo "[4/6] Starting updated Nizam Bags POS services..."
IMAGE_TAG="$IMAGE_TAG" docker compose -f "$COMPOSE_FILE" up -d

echo "Cleaning up old/dangling docker images..."
docker image prune -f >/dev/null 2>&1 || true

# 5. Wait for application to be ready
echo ""
echo "[5/6] Waiting for POS application to be ready..."
until curl -fsS http://localhost >/dev/null 2>&1; do
    sleep 2
done
echo "POS application is running at http://localhost!"

# 6. Launch browser
echo ""
echo "[6/6] Launching POS interface..."
if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app=http://localhost >/dev/null 2>&1 &
elif command -v google-chrome-stable >/dev/null 2>&1; then
    google-chrome-stable --app=http://localhost >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
    chromium --app=http://localhost >/dev/null 2>&1 &
else
    echo "Chrome not found. Open http://localhost manually in your browser."
fi

echo ""
echo "=========================================================="
echo "   UPDATE COMPLETED SUCCESSFULLY! POS IS READY FOR USE.   "
echo "=========================================================="
