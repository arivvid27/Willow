#!/usr/bin/env bash
# 🌿 Start only the Willow web frontend
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"
echo "🌿 Web → http://localhost:3000"
npm run dev
