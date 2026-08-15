#!/usr/bin/env bash
# CareerPilot one-command deployment for a fresh Ubuntu 22.04/24.04 VPS.
#
# Usage:
#   sudo bash deploy.sh            # first run (creates .env and stops)
#   sudo bash deploy.sh            # second run after filling in .env
#   sudo bash deploy.sh            # later: pulls latest code and redeploys
#
# Idempotent and safe to re-run.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/careerpilot}"
REPO_URL="https://github.com/vipulchandra437/Careerpilot.git"
BRANCH="${BRANCH:-master}"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[deploy] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root: sudo bash deploy.sh"
command -v git >/dev/null 2>&1 || { log "Installing git..."; apt-get update -y >/dev/null && apt-get install -y git >/dev/null; }

# 1. Install Docker + compose plugin.
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing; install it with: apt-get install -y docker-compose-plugin"
systemctl enable --now docker >/dev/null 2>&1 || true

# 2. Clone or update the app.
if [ -d "$APP_DIR/.git" ]; then
  log "Updating existing checkout at $APP_DIR"
  git -C "$APP_DIR" fetch --quiet origin
  git -C "$APP_DIR" checkout --quiet "$BRANCH"
  git -C "$APP_DIR" pull --quiet --ff-only origin "$BRANCH"
else
  log "Cloning repository into $APP_DIR"
  mkdir -p "$APP_DIR"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# 3. First-run .env bootstrap.
if [ ! -f .env ]; then
  log "Creating .env from .env.example"
  cp .env.example .env
  cat <<EOF

============================================================
  Next: edit $APP_DIR/.env and set at minimum:
    POSTGRES_PASSWORD=<a long random password>
    AUTH_SECRET=<>= 32 chars (generate with: npx auth secret)
    OPENROUTER_API_KEY=<your key from https://openrouter.ai/keys>
    NEXT_PUBLIC_APP_URL=http://<your-server-ip-or-domain>

  Then re-run:  sudo bash $0
============================================================
EOF
  exit 0
fi

# 4. Validate required values.
grep -Eq '^AUTH_SECRET=.\{32,\}' .env || die "AUTH_SECRET in .env must be at least 32 characters"
grep -Eq '^OPENROUTER_API_KEY=.+' .env || die "OPENROUTER_API_KEY is empty in .env"
grep -Eq '^POSTGRES_PASSWORD=.+' .env || die "POSTGRES_PASSWORD is empty in .env"

# 5. Build and start the stack.
log "Building images and starting the stack..."
docker compose up -d --build --remove-orphans

# 6. Wait for every service to become healthy.
log "Waiting for services to become healthy (first boot installs Piston runtimes, allow a few minutes)..."
HEALTHY=0
for _ in $(seq 1 120); do
  HEALTHY=1
  for c in db redis piston app; do
    s="$(docker inspect --format '{{.State.Health.Status}}' "careerpilot-$c-1" 2>/dev/null || echo missing)"
    [ "$s" = "healthy" ] || { HEALTHY=0; break; }
  done
  [ "$HEALTHY" -eq 1 ] && break
  sleep 5
done

docker compose ps
URL="$(grep -E '^NEXT_PUBLIC_APP_URL=' .env | cut -d= -f2- | tr -d '"')"
if [ "$HEALTHY" -eq 1 ]; then
  log "All services healthy. App: $URL"
else
  log "Timed out waiting for health. Check: cd $APP_DIR && docker compose logs --tail=200"
fi
log "Health check: curl -s $URL/api/health"
