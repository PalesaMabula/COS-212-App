#!/usr/bin/env bash
# COS212 Graphs and BFS: run the browser (end-to-end) tests (macOS / Linux).
# Usage:  ./run-e2e.sh [--skip-build] [--headed]
# Stop the app first: the tests start their own copy on port 8000 with an empty
# database, and delete it afterwards. Set E2E_CHROME=/path/to/chrome to use an
# installed Chrome instead of downloading Playwright's Chromium.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SKIP=0; HEADED=0
for a in "$@"; do case "$a" in --skip-build) SKIP=1 ;; --headed) HEADED=1 ;; esac; done

if (echo > /dev/tcp/127.0.0.1/8000) 2>/dev/null; then
  echo "Port 8000 is in use. Stop the running app and try again." >&2; exit 1
fi

echo "[1/4] Python packages and the test browser"
cd "$ROOT/backend"
[ -d .venv ] || python3 -m venv .venv
PY="$ROOT/backend/.venv/bin/python"
"$PY" -m pip install --quiet --disable-pip-version-check -r requirements.txt -r "$ROOT/e2e/requirements.txt"
[ -n "${E2E_CHROME:-}" ] || "$PY" -m playwright install chromium

if [ "$SKIP" = 0 ] || [ ! -f "$ROOT/frontend/dist/index.html" ]; then
  echo "[2/4] Front end (React build)"
  cd "$ROOT/frontend"; [ -d node_modules ] || npm install --no-audit --no-fund; npm run build
else
  echo "[2/4] Front end: using the existing build"
fi

echo "[3/4] Starting the app on http://localhost:8000 with an empty test database"
DB="$(mktemp -t cos212-e2e-XXXXXX).db"
cd "$ROOT/backend"
COS212_DB="$DB" "$PY" -m uvicorn app.main:app --port 8000 --log-level warning &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; rm -f "$DB"' EXIT
for _ in $(seq 60); do curl -sf http://localhost:8000/api/health >/dev/null && break; sleep 0.5; done
curl -sf http://localhost:8000/api/health >/dev/null || { echo "The app did not start." >&2; exit 1; }

echo "[4/4] Running the tests"
[ "$HEADED" = 1 ] && export E2E_HEADED=1 E2E_SLOWMO=150
"$PY" -m pytest "$ROOT/e2e" -v -p no:cacheprovider
