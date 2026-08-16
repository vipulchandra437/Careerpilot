#!/bin/bash
# CareerPilot Piston bootstrap.
# 1) Mirrors the stock entrypoint's cgroup v2 setup (required by isolate).
# 2) Starts the piston API as the `piston` user.
# 3) Installs the runtimes we need (python, node) IDEMPOTENTLY, in the
#    background with HARD timeouts so a stalled download can never block the
#    API supervisor. The API stays healthy even while packages download.
#    NOTE: the install endpoint keys on the package directory name ("node"),
#    while the app executes with language "javascript" (an alias of node).
# 4) Keeps the API process alive if a package install crashes it (piston v3's
#    node-fetch dies on a failed download), so the container never exits.
#
# Deliberately no `set -e` — a crashed API or failed download must never kill
# this bootstrap. This image has no wget/curl, so HTTP uses python3/urllib.

CGROUP_FS="/sys/fs/cgroup"
if [ ! -e "$CGROUP_FS" ]; then
  echo "Cannot find $CGROUP_FS. Please make sure your system is using cgroup v2"
  exit 1
fi
if [ -e "$CGROUP_FS/unified" ]; then
  echo "Combined cgroup v1+v2 mode is not supported"
  exit 1
fi
if [ ! -e "$CGROUP_FS/cgroup.subtree_control" ]; then
  echo "Cgroup v2 not found"
  exit 1
fi

cd /sys/fs/cgroup
mkdir -p isolate
echo 1 > isolate/cgroup.procs
echo '+cpuset +cpu +io +memory +pids' > cgroup.subtree_control
cd isolate
mkdir -p init
echo 1 > init/cgroup.procs
echo '+cpuset +memory' > cgroup.subtree_control
chown -R piston:piston /piston || true

API="http://localhost:2000/api/v2"
API_PID=""
LOG=/tmp/piston-bootstrap.log

log() { echo "$(date -u +%H:%M:%S) $*"; }

start_api() {
  su -- piston -c 'ulimit -n 65536 && node /piston_api/src' &
  API_PID=$!
}

api_get() {
  python3 -c "import sys,urllib.request
try:
    print(urllib.request.urlopen(sys.argv[1], timeout=10).read().decode())
except Exception:
    pass" "$1" 2>/dev/null
}

# Hard-capped install: `timeout` kills it after 180s even if urllib stalls.
api_install() {
  timeout 180 python3 -c "import sys,urllib.request,json
try:
    req = urllib.request.Request(sys.argv[1], data=json.dumps({'language': sys.argv[2], 'version': sys.argv[3]}).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    urllib.request.urlopen(req, timeout=150).read()
    sys.exit(0)
except Exception:
    sys.exit(1)" "$1" "$2" "$3" 2>/dev/null
}

start_api

for _ in $(seq 1 30); do
  if [ -n "$(api_get "$API/runtimes")" ]; then
    break
  fi
  sleep 2
done

pkg_installed() {
  local lang="$1"
  if [ -n "$(api_get "$API/runtimes" | grep "\"$lang\"")" ]; then
    return 0
  fi
  [ -d "/piston/packages/$lang" ]
}

install_pkg() {
  local lang="$1"
  local ver="$2"
  if pkg_installed "$lang"; then
    log "$lang-$ver already installed"
    return 0
  fi
  log "installing $lang-$ver (background, 3 attempts)"
  for attempt in 1 2 3; do
    log "  attempt $attempt"
    if api_install "$API/packages" "$lang" "$ver"; then
      log "$lang-$ver installed"
      return 0
    fi
    sleep 5
  done
  log "WARNING could not install $lang-$ver (will retry on next start)"
  return 1
}

# Run installs in the background so the API supervisor below is never blocked.
(
  install_pkg python 3.10.0
  install_pkg node 18.15.0
) >> "$LOG" 2>&1 &

log "bootstrap ready; supervising API (pid $API_PID)"

while :; do
  wait "$API_PID" || true
  log "API process exited; restarting"
  start_api
  sleep 1
done
