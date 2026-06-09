#!/usr/bin/env bash
# Safely reclaim disk space on a Docker host (does NOT remove named volumes).
#
# Usage: ./scripts/free-disk-space.sh

set -euo pipefail

echo "==> Disk before"
df -h / /var/lib/docker 2>/dev/null || df -h /

echo ""
echo "==> Docker disk usage"
docker system df 2>/dev/null || true

echo ""
echo "==> Truncate large container logs (>50MB)"
find /var/lib/docker/containers -name '*-json.log' -size +50M 2>/dev/null | while read -r f; do
  echo "  truncate: $f"
  truncate -s 0 "$f" 2>/dev/null || true
done

echo ""
echo "==> Prune stopped containers, unused networks, dangling images, build cache"
docker system prune -af 2>/dev/null || docker system prune -f

echo ""
echo "==> Vacuum systemd journal (keep last 100MB)"
if command -v journalctl >/dev/null 2>&1; then
  journalctl --vacuum-size=100M 2>/dev/null || true
fi

echo ""
echo "==> Disk after"
df -h / /var/lib/docker 2>/dev/null || df -h /

echo ""
echo "Named volumes (postgres data is preserved):"
docker volume ls 2>/dev/null || true

echo ""
echo "If / is still above 90% full, inspect large dirs:"
echo "  du -xh /var/lib/docker | sort -h | tail -20"
echo "  du -xh / | sort -h | tail -20"
