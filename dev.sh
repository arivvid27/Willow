#!/usr/bin/env bash
# 🌿 Willow — Start all dev servers
# Usage: bash dev.sh [--backend] [--frontend] [--mobile]
# Default: starts whatever is available

set -euo pipefail

CYAN="\033[0;36m"; BOLD="\033[1m"; GREEN="\033[0;32m"; RESET="\033[0m"; DIM="\033[2m"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
MOBILE_DIR="$SCRIPT_DIR/../willow-mobile"
[[ ! -d "$MOBILE_DIR" && -d "$SCRIPT_DIR/willow-mobile"  ]] && MOBILE_DIR="$SCRIPT_DIR/willow-mobile"
[[ ! -d "$MOBILE_DIR" && -d "$SCRIPT_DIR/mobile"         ]] && MOBILE_DIR="$SCRIPT_DIR/mobile"

RUN_BACKEND=false
RUN_FRONTEND=false
RUN_MOBILE=false

# Parse flags
if [[ $# -eq 0 ]]; then
  # No flags — start everything available
  [[ -d "$BACKEND_DIR"  ]] && RUN_BACKEND=true
  [[ -d "$FRONTEND_DIR" ]] && RUN_FRONTEND=true
  [[ -d "$MOBILE_DIR"   ]] && RUN_MOBILE=true
else
  for arg in "$@"; do
    case $arg in
      --backend)  RUN_BACKEND=true  ;;
      --frontend) RUN_FRONTEND=true ;;
      --mobile)   RUN_MOBILE=true   ;;
      *) echo "Unknown flag: $arg" ;;
    esac
  done
fi

echo ""
echo -e "${BOLD}${CYAN}🌿 Starting Willow dev servers…${RESET}"
echo ""

PIDS=()
NAMES=()

cleanup() {
  echo ""
  echo -e "${CYAN}Shutting down all servers…${RESET}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

# ── Backend ───────────────────────────────────────────────────────────────────
if $RUN_BACKEND; then
  if [[ ! -f "$BACKEND_DIR/.env" ]]; then
    echo -e "  ⚠  backend/.env not found — run setup.sh first"
  else
    echo -e "  ${GREEN}▶ Backend${RESET}  → ${DIM}http://localhost:8000${RESET}"
    (
      cd "$BACKEND_DIR"
      source ".venv/bin/activate" 2>/dev/null || source ".venv/Scripts/activate" 2>/dev/null || true
      uvicorn main:app --reload --port 8000 --host 0.0.0.0 2>&1 | \
        sed "s/^/  ${DIM}[backend]${RESET} /"
    ) &
    PIDS+=($!)
    NAMES+=("backend")
    sleep 1
  fi
fi

# ── Frontend ──────────────────────────────────────────────────────────────────
if $RUN_FRONTEND; then
  if [[ ! -f "$FRONTEND_DIR/.env.local" ]]; then
    echo -e "  ⚠  frontend/.env.local not found — run setup.sh first"
  elif [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo -e "  ⚠  frontend/node_modules missing — run setup.sh first"
  else
    echo -e "  ${GREEN}▶ Frontend${RESET} → ${DIM}http://localhost:3000${RESET}"
    (
      cd "$FRONTEND_DIR"
      npm run dev 2>&1 | sed "s/^/  ${DIM}[frontend]${RESET} /"
    ) &
    PIDS+=($!)
    NAMES+=("frontend")
  fi
fi

# ── Mobile ────────────────────────────────────────────────────────────────────
if $RUN_MOBILE; then
  if [[ ! -f "$MOBILE_DIR/.env" ]]; then
    echo -e "  ⚠  mobile/.env not found — run setup.sh first"
  elif [[ ! -d "$MOBILE_DIR/node_modules" ]]; then
    echo -e "  ⚠  mobile/node_modules missing — run setup.sh first"
  else
    echo -e "  ${GREEN}▶ Mobile${RESET}   → ${DIM}Expo dev server (scan QR with Expo Go)${RESET}"
    (
      cd "$MOBILE_DIR"
      npx expo start 2>&1 | sed "s/^/  ${DIM}[mobile]${RESET}  /"
    ) &
    PIDS+=($!)
    NAMES+=("mobile")
  fi
fi

if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo "  Nothing to start. Run setup.sh first."
  exit 1
fi

echo ""
echo -e "${DIM}Press Ctrl+C to stop all servers.${RESET}"
echo ""

# Wait for any process to exit (crash or Ctrl+C)
wait -n "${PIDS[@]}" 2>/dev/null || wait
