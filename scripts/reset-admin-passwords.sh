#!/usr/bin/env bash
# Reset admin dashboard logins to default seed credentials on the server.
#
# Usage (on production host, e.g. ~/cam):
#   ./scripts/reset-admin-passwords.sh
#
# Defaults restored:
#   admin@example.com / admin123          (SUPER_ADMIN)
#   schooladmin@example.com / password123   (SCHOOL_ADMIN)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

if [[ ! -f .env ]]; then
  echo "error: .env not found in $ROOT"
  exit 1
fi

env_val() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env 2>/dev/null | head -1 || true)"
  [[ -n "$line" ]] || return 0
  line="${line#*=}"
  line="${line%$'\r'}"
  if [[ "$line" == \"*\" && "$line" == *\" ]]; then
    line="${line:1:${#line}-2}"
  elif [[ "$line" == \'*\' && "$line" == *\' ]]; then
    line="${line:1:${#line}-2}"
  fi
  printf '%s' "$line"
}

POSTGRES_USER="$(env_val POSTGRES_USER)"
POSTGRES_DB="$(env_val POSTGRES_DB)"
POSTGRES_USER="${POSTGRES_USER:-school}"
POSTGRES_DB="${POSTGRES_DB:-school_camera}"

echo "==> Resetting admin passwords in Postgres"
"${COMPOSE[@]}" exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < "$ROOT/scripts/reset-admin-passwords.sql"

echo "==> Clearing auth login rate limits in Redis (if any)"
"${COMPOSE[@]}" exec -T redis sh -c '
  redis-cli --scan --pattern "auth:login:*" | while read -r key; do
    [ -n "$key" ] && redis-cli DEL "$key" >/dev/null
  done
' || echo "warning: could not clear Redis rate limits (non-fatal)"

echo ""
echo "Admin logins reset:"
echo "  SUPER_ADMIN:  admin@example.com / admin123"
echo "  SCHOOL_ADMIN: schooladmin@example.com / password123"
echo ""
echo "Sign in at: https://admin.iglooks.com/login"
