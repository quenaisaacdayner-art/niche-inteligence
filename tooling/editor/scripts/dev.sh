#!/bin/bash
set -e

EDITOR_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$EDITOR_DIR/../.." && pwd)"

FIXTURE=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --fixture) FIXTURE="$2"; shift ;;
    esac
    shift
done

export PROJECT_ROOT
if [ -n "$FIXTURE" ]; then
    export FIXTURE_DIR="$EDITOR_DIR/fixtures/$FIXTURE"
    echo "Using fixture: $FIXTURE_DIR"
fi

echo "Starting backend (FastAPI :8000)..."
cd "$EDITOR_DIR/backend"
python -m uvicorn server:app --reload --port 8000 --host 127.0.0.1 &
BACKEND_PID=$!

echo "Starting frontend (Vite :5173)..."
cd "$EDITOR_DIR/frontend"
npx vite --host 127.0.0.1 &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  Editor ready:"
echo "  http://localhost:5173?slug=demo"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop both"

cleanup() { kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; }
trap cleanup EXIT
wait
