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
POSTGRES_USER="${POSTGRES_USER:-school_camera_user}"
POSTGRES_DB="${POSTGRES_DB:-school_camera}"

show_diagnostics() {
  echo ""
  echo "==> Container status"
  "${COMPOSE[@]}" ps -a || true
  echo ""
  echo "==> Postgres logs (last 40 lines)"
  "${COMPOSE[@]}" logs postgres --tail 40 2>/dev/null || true
  echo ""
  echo "==> Disk space"
  df -h / /var/lib/docker 2>/dev/null || df -h /
  echo ""
  echo "Try fixing Postgres first, then re-run this script:"
  echo "  ${COMPOSE[*]} restart postgres"
  echo "  ${COMPOSE[*]} logs postgres --tail 100"
}

wait_for_postgres() {
  local attempts=24
  local i
  echo "==> Waiting for Postgres to accept connections (up to 2 min)"
  for ((i = 1; i <= attempts; i++)); do
    if "${COMPOSE[@]}" exec -T postgres \
      pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      echo "    Postgres is ready."
      return 0
    fi
    local state
    state="$("${COMPOSE[@]}" ps postgres --format '{{.State}}' 2>/dev/null || echo unknown)"
    echo "    attempt $i/$attempts — state: $state"
    if [[ "$state" == *"Restarting"* ]] || [[ "$state" == "exited" ]]; then
      echo "    Postgres is not stable. Check logs below if this keeps failing."
    fi
    sleep 5
  done
  return 1
}

echo "==> Clearing auth login rate limits in Redis"
if "${COMPOSE[@]}" exec -T redis sh -c '
  count=0
  redis-cli --scan --pattern "auth:login:*" | while read -r key; do
    if [ -n "$key" ]; then
      redis-cli DEL "$key" >/dev/null
      count=$((count + 1))
    fi
  done
  echo "Cleared auth:login:* keys"
' 2>/dev/null; then
  echo "    Redis rate limits cleared."
else
  echo "    warning: could not clear Redis (non-fatal)"
fi

if ! wait_for_postgres; then
  echo "error: Postgres is not running or keeps restarting."
  show_diagnostics
  exit 1
fi

echo "==> Resetting admin passwords in Postgres"
if ! "${COMPOSE[@]}" exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < "$ROOT/scripts/reset-admin-passwords.sql"; then
  echo "error: SQL reset failed."
  show_diagnostics
  exit 1
fi

echo ""
echo "==> Verifying admin user exists"
"${COMPOSE[@]}" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT email, role, status FROM users WHERE email IN ('admin@example.com', 'schooladmin@example.com');"

echo ""
echo "Admin logins reset:"
echo "  SUPER_ADMIN:  admin@example.com / admin123"
echo "  SCHOOL_ADMIN: schooladmin@example.com / password123"
echo ""
echo "Sign in at: https://admin.iglooks.com/login"
echo "If login still fails, wait 1 minute (rate limit) and try again."
