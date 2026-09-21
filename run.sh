#!/usr/bin/env bash
set -eu

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  trap - INT TERM EXIT
  echo ""
  echo "Stopping frontend and backend..."
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup INT TERM EXIT

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Missing .env at the repository root."
  echo "Create $ROOT/.env with backend and frontend variables, then run again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Install Node.js, then run again."
  exit 1
fi

find_python() {
  local candidates=(
    "$ROOT/backend/.venv/bin/python"
    "$ROOT/backend/.venv/Scripts/python.exe"
    "$ROOT/backend/venv/bin/python"
    "$ROOT/backend/venv/Scripts/python.exe"
    "$ROOT/backend/env/bin/python"
    "$ROOT/backend/env/Scripts/python.exe"
    "$ROOT/.venv/bin/python"
    "$ROOT/.venv/Scripts/python.exe"
    "$ROOT/venv/bin/python"
    "$ROOT/venv/Scripts/python.exe"
  )
  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return 0
  fi
  if command -v python >/dev/null 2>&1; then
    command -v python
    return 0
  fi
  return 1
}

PYTHON="$(find_python)" || {
  echo "Python was not found. Install Python 3, then run again."
  exit 1
}

if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT/frontend" && npm install)
fi

find_free_port() {
  local start="$1"
  shift
  "$PYTHON" - "$start" "$@" <<'PY'
import socket
import sys

start = int(sys.argv[1])
exclude = {int(value) for value in sys.argv[2:]}

for port in range(start, start + 50):
    if port in exclude:
        continue
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("0.0.0.0", port))
    except OSError:
        continue
    else:
        print(port)
        raise SystemExit(0)
    finally:
        sock.close()

raise SystemExit(1)
PY
}

BACKEND_PORT="$(find_free_port 8000)" || {
  echo "No free localhost port found for the backend (tried 8000-8049)."
  exit 1
}
FRONTEND_PORT="$(find_free_port 8080 "$BACKEND_PORT")" || {
  echo "No free localhost port found for the frontend (tried 8080-8129)."
  exit 1
}

if [[ "$BACKEND_PORT" != "8000" ]]; then
  echo "Port 8000 is busy; backend using $BACKEND_PORT."
fi
if [[ "$FRONTEND_PORT" != "8080" ]]; then
  echo "Port 8080 is busy; frontend using $FRONTEND_PORT."
fi

export FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
export VITE_API_BASE_URL="http://localhost:${BACKEND_PORT}/api/v1"

echo "Using Python: $PYTHON"
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Press Ctrl+C to stop both."
echo ""

"$PYTHON" "$ROOT/backend/manage.py" runserver "0.0.0.0:${BACKEND_PORT}" &
BACKEND_PID=$!

(cd "$ROOT/frontend" && npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" --strictPort) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
