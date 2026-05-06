#!/usr/bin/env bash
# Local UI + API without Docker: uses SQLite at ./data/idp.sqlite3 from repo root.
# (PostgreSQL is recommended for production; install Docker Desktop + `docker compose up` when ready.)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p data

export DATABASE_URL="${DATABASE_URL:-sqlite:///./data/idp.sqlite3}"
export PYTHONPATH="${ROOT}/backend"
export JWT_SECRET="${JWT_SECRET:-dev-local-change-me}"

NODE_HOME="${NODE_HOME:-$HOME/.local/node-v20.18.1}"
export PATH="$NODE_HOME/bin:$PATH"

if [[ ! -x "$NODE_HOME/bin/node" ]]; then
  echo "Node not found at $NODE_HOME/bin/node — run the bundled installer or install Node 20+." >&2
  exit 1
fi

if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  echo "Python venv missing at $ROOT/.venv — create it and pip install -r backend/requirements.txt" >&2
  exit 1
fi

for p in 8000 5173; do
  if lsof -ti ":$p" >/dev/null 2>&1; then
    echo "Port $p is busy; stopping listeners on this laptop for this dev session."
    lsof -ti ":$p" | xargs kill -9 2>/dev/null || true
  fi
done

# shellcheck disable=SC1091
source "$ROOT/.venv/bin/activate"

cleanup() {
  kill "${UV_PID:-0}" "${FE_PID:-0}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "DATABASE_URL=$DATABASE_URL"
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
UV_PID=$!

cd "$ROOT/frontend"
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort &
FE_PID=$!

sleep 2
if command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:5173"
fi

echo ""
echo "Frontend: http://127.0.0.1:5173"
echo "API docs: http://127.0.0.1:8000/docs"
echo "Press Ctrl+C to stop."

wait "$FE_PID"
