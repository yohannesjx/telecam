#!/usr/bin/env bash
# Quick production stack diagnostics.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

echo "==> Compose services"
"${COMPOSE[@]}" ps -a

echo ""
echo "==> Disk"
df -h / /var/lib/docker 2>/dev/null || df -h /

echo ""
echo "==> Postgres logs (last 60)"
"${COMPOSE[@]}" logs postgres --tail 60 2>/dev/null || true

echo ""
echo "==> API logs (last 30)"
"${COMPOSE[@]}" logs api --tail 30 2>/dev/null || true

echo ""
echo "==> Health"
curl -fsS "https://camera.iglooks.com/api/health" 2>/dev/null && echo || echo "health check failed"
