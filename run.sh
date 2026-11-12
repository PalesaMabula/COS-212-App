#!/usr/bin/env sh
# COS212 Graphs and BFS: set up (first time) and run the whole app at http://localhost:8000
# Usage (macOS / Linux):  ./run.sh        Add --skip-build to start faster.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "[1/3] Back end (Python)"
cd "$ROOT/backend"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/python -m pip install --quiet --disable-pip-version-check -r requirements.txt

if [ "$1" != "--skip-build" ] || [ ! -f "$ROOT/frontend/dist/index.html" ]; then
  echo "[2/3] Front end (React build)"
  cd "$ROOT/frontend"
  [ -d node_modules ] || npm install --no-audit --no-fund
  npm run build
fi

echo "[3/3] Starting the server. Open http://localhost:8000  (Ctrl+C to stop)"
cd "$ROOT/backend"
exec .venv/bin/python -m uvicorn app.main:app --port 8000
