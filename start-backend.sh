#!/usr/bin/env bash
# 🌿 Start only the Willow backend
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"
source ".venv/bin/activate" 2>/dev/null || source ".venv/Scripts/activate" 2>/dev/null
echo "🌿 Backend → http://localhost:8000  |  API docs → http://localhost:8000/docs"
uvicorn main:app --reload --port 8000 --host 0.0.0.0
