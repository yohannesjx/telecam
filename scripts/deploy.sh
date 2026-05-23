#!/usr/bin/env bash
# Pull latest code and redeploy with Docker Compose (production overlay).
#
# First time on the server:
#   mkdir -p ~/cam && cd ~/cam
#   git clone https://github.com/yohannesjx/telecam.git .
#   cp .env.example .env && nano .env
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
#
# Later updates:
#   cd ~/cam && ./scripts/deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPO_URL="${REPO_URL:-https://github.com/yohannesjx/telecam.git}"
BRANCH="${BRANCH:-main}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

if [[ ! -d .git ]]; then
  echo "error: $ROOT is not a git repository."
  echo "  git clone $REPO_URL $ROOT"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — set production values, then run this script again."
  echo "  Required: APP_ENV=production, DOMAIN, CADDY_EMAIL, JWT_ACCESS_SECRET, APP_ENCRYPTION_KEY"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

if [[ "${APP_ENV:-local}" != "production" ]]; then
  echo "warning: APP_ENV is not 'production' — using production compose overlay anyway."
fi

echo "==> Pulling $BRANCH from origin"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Building images"
"${COMPOSE[@]}" build

echo "==> Starting stack (migrations run automatically)"
"${COMPOSE[@]}" up -d

echo "==> Service status"
"${COMPOSE[@]}" ps

if [[ -n "${DOMAIN:-}" && "${DOMAIN}" != "localhost" ]]; then
  echo "==> Health check"
  curl -fsS "https://${DOMAIN}/api/health" && echo
else
  echo "==> Set DOMAIN in .env for HTTPS health check (Caddy needs DNS pointing to this server)."
fi

echo "Done."
