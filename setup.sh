#!/usr/bin/env bash
# =============================================================================
#  🌿 Willow — Development Setup Script
#  Sets up the backend, web frontend, and/or mobile app for local development.
#  Run from the root of your Willow repo: bash setup.sh
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
DIM="\033[2m"

# ── Helpers ───────────────────────────────────────────────────────────────────
print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${CYAN}║  🌿 Willow — Dev Setup                           ║${RESET}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
}

step()    { echo -e "${BOLD}${GREEN}▶ $1${RESET}"; }
info()    { echo -e "  ${CYAN}ℹ  $1${RESET}"; }
warn()    { echo -e "  ${YELLOW}⚠  $1${RESET}"; }
success() { echo -e "  ${GREEN}✔  $1${RESET}"; }
error()   { echo -e "  ${RED}✖  $1${RESET}"; }
dim()     { echo -e "  ${DIM}$1${RESET}"; }
divider() { echo -e "${DIM}────────────────────────────────────────────────────${RESET}"; }

# Prompt with a default value
prompt() {
  local msg="$1"
  local default="${2:-}"
  if [[ -n "$default" ]]; then
    echo -ne "  ${BOLD}$msg${RESET} ${DIM}[$default]${RESET}: "
  else
    echo -ne "  ${BOLD}$msg${RESET}: "
  fi
}

# Ask yes/no — returns 0 for yes, 1 for no
ask_yn() {
  local msg="$1"
  local default="${2:-y}"
  local yn_hint
  if [[ "$default" == "y" ]]; then yn_hint="[Y/n]"; else yn_hint="[y/N]"; fi
  echo -ne "  ${BOLD}$msg${RESET} ${DIM}$yn_hint${RESET}: "
  read -r answer
  answer="${answer:-$default}"
  [[ "$answer" =~ ^[Yy] ]]
}

# Check if a command exists
has() { command -v "$1" &>/dev/null; }

# Version number from command output
version_of() { "$@" 2>&1 | grep -oP '\d+\.\d+[\.\d]*' | head -1; }

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]];   then OS="mac"
elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* ]]; then OS="windows"
fi

# Detect local LAN IP for mobile backend URL
get_lan_ip() {
  if [[ "$OS" == "linux" ]]; then
    hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost"
  elif [[ "$OS" == "mac" ]]; then
    ipconfig getifaddr en0 2>/dev/null || \
    ipconfig getifaddr en1 2>/dev/null || echo "localhost"
  else
    # Windows (Git Bash / WSL)
    ipconfig 2>/dev/null | grep -oP '192\.168\.\d+\.\d+' | head -1 || echo "localhost"
  fi
}

# Script's own directory (works even when called from a different cwd)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Paths — adjust these if your folder layout differs
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
MOBILE_DIR="$SCRIPT_DIR/../willow-mobile"   # sibling folder
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

# Also accept mobile as a subfolder in case layout differs
if [[ ! -d "$MOBILE_DIR" && -d "$SCRIPT_DIR/mobile" ]]; then
  MOBILE_DIR="$SCRIPT_DIR/mobile"
fi
if [[ ! -d "$MOBILE_DIR" && -d "$SCRIPT_DIR/willow-mobile" ]]; then
  MOBILE_DIR="$SCRIPT_DIR/willow-mobile"
fi

# =============================================================================
#  STEP 0 — Print header + detect what's present
# =============================================================================
print_header

step "Scanning project layout…"

HAS_BACKEND=false
HAS_FRONTEND=false
HAS_MOBILE=false

[[ -d "$BACKEND_DIR"  ]] && HAS_BACKEND=true  && success "Backend found  → $BACKEND_DIR"
[[ -d "$FRONTEND_DIR" ]] && HAS_FRONTEND=true && success "Frontend found → $FRONTEND_DIR"
[[ -d "$MOBILE_DIR"   ]] && HAS_MOBILE=true   && success "Mobile found   → $MOBILE_DIR"

if ! $HAS_BACKEND && ! $HAS_FRONTEND && ! $HAS_MOBILE; then
  error "Could not find backend/, frontend/, or willow-mobile/."
  error "Run this script from the root of your Willow repo."
  exit 1
fi

echo ""

# =============================================================================
#  STEP 1 — Check required tools
# =============================================================================
step "Checking system tools…"
divider

MISSING_TOOLS=()

# ── Python ────────────────────────────────────────────────────────────────────
if $HAS_BACKEND; then
  if has python3; then
    PY_VER=$(version_of python3 --version)
    success "python3 $PY_VER"
    # Warn if < 3.11
    PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
    if [[ "$PY_MAJOR" -lt 3 || ("$PY_MAJOR" -eq 3 && "$PY_MINOR" -lt 11) ]]; then
      warn "Python 3.11+ recommended (you have $PY_VER)"
    fi
  else
    error "python3 not found"
    MISSING_TOOLS+=("python3")
  fi

  if has pip3; then
    success "pip3 $(version_of pip3 --version)"
  elif has pip; then
    success "pip  $(version_of pip --version)"
  else
    error "pip not found"
    MISSING_TOOLS+=("pip")
  fi
fi

# ── Node / npm ────────────────────────────────────────────────────────────────
if $HAS_FRONTEND || $HAS_MOBILE; then
  if has node; then
    NODE_VER=$(version_of node --version)
    success "node $NODE_VER"
    NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
    if [[ "$NODE_MAJOR" -lt 18 ]]; then
      warn "Node 18+ required (you have $NODE_VER). Please upgrade."
      MISSING_TOOLS+=("node>=18")
    fi
  else
    error "node not found"
    MISSING_TOOLS+=("node")
  fi

  if has npm; then
    success "npm  $(version_of npm --version)"
  else
    error "npm not found"
    MISSING_TOOLS+=("npm")
  fi
fi

# ── Expo CLI (mobile only, optional — we can install it) ──────────────────────
EXPO_AVAILABLE=false
if $HAS_MOBILE; then
  if has expo; then
    success "expo $(version_of expo --version 2>/dev/null || echo '(found)')"
    EXPO_AVAILABLE=true
  else
    warn "Expo CLI not found globally — will install via npx"
    EXPO_AVAILABLE=false
  fi
fi

# ── Git ───────────────────────────────────────────────────────────────────────
if has git; then
  success "git  $(version_of git --version)"
else
  warn "git not found — optional but recommended"
fi

echo ""

# Bail if critical tools are missing
if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then
  error "Missing required tools: ${MISSING_TOOLS[*]}"
  echo ""
  if [[ "$OS" == "linux" ]]; then
    info "Install Node 20 on Ubuntu/Debian:"
    dim "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    dim "  sudo apt install -y nodejs python3 python3-pip python3-venv"
  elif [[ "$OS" == "mac" ]]; then
    info "Install with Homebrew:"
    dim "  brew install node python@3.12"
  fi
  echo ""
  error "Please install the missing tools and re-run this script."
  exit 1
fi

# =============================================================================
#  STEP 2 — Collect environment variables
# =============================================================================
step "Environment configuration…"
divider

# Check which .env files already exist
BACKEND_ENV="$BACKEND_DIR/.env"
FRONTEND_ENV="$FRONTEND_DIR/.env.local"
MOBILE_ENV="$MOBILE_DIR/.env"

BACKEND_ENV_EXISTS=false
FRONTEND_ENV_EXISTS=false
MOBILE_ENV_EXISTS=false

$HAS_BACKEND  && [[ -f "$BACKEND_ENV"  ]] && BACKEND_ENV_EXISTS=true
$HAS_FRONTEND && [[ -f "$FRONTEND_ENV" ]] && FRONTEND_ENV_EXISTS=true
$HAS_MOBILE   && [[ -f "$MOBILE_ENV"   ]] && MOBILE_ENV_EXISTS=true

NEED_KEYS=false
$HAS_BACKEND  && ! $BACKEND_ENV_EXISTS  && NEED_KEYS=true
$HAS_FRONTEND && ! $FRONTEND_ENV_EXISTS && NEED_KEYS=true
$HAS_MOBILE   && ! $MOBILE_ENV_EXISTS   && NEED_KEYS=true

if $BACKEND_ENV_EXISTS && $FRONTEND_ENV_EXISTS; then
  info "Found existing .env files — skipping key entry."
  if ask_yn "Re-enter API keys anyway?" "n"; then
    NEED_KEYS=true
    BACKEND_ENV_EXISTS=false
    FRONTEND_ENV_EXISTS=false
    MOBILE_ENV_EXISTS=false
  fi
fi

if $NEED_KEYS; then
  echo ""
  info "You'll need two things before continuing:"
  dim "  1. Supabase project keys → https://supabase.com → Settings → API"
  dim "  2. Google Gemini API key → https://aistudio.google.com/app/apikey"
  echo ""

  prompt "Supabase Project URL (https://xxxx.supabase.co)"
  read -r SUPABASE_URL
  SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"

  prompt "Supabase anon/public key"
  read -r SUPABASE_ANON_KEY
  SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-your-anon-key}"

  prompt "Google Gemini API key"
  read -r GEMINI_KEY
  GEMINI_KEY="${GEMINI_KEY:-your-gemini-key}"

  echo ""

  # ── Write frontend .env.local ─────────────────────────────────────────────
  # All keys now go in one file — no separate backend server needed
  if $HAS_FRONTEND && ! $FRONTEND_ENV_EXISTS; then
    cat > "$FRONTEND_ENV" << EOF
# Willow — generated by setup.sh
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
GEMINI_API_KEY=$GEMINI_KEY
NEXT_PUBLIC_SITE_URL=
EOF
    success "Created $FRONTEND_ENV"
  fi

  # ── Write mobile .env ─────────────────────────────────────────────────────
  if $HAS_MOBILE && ! $MOBILE_ENV_EXISTS; then
    cat > "$MOBILE_ENV" << EOF
# Willow Mobile — generated by setup.sh
# NOTE: Uses LAN IP so Android devices can reach your backend
EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL=$MOBILE_API_URL
EOF
    success "Created $MOBILE_ENV"
  fi
else
  success "Using existing .env files"
fi

echo ""

# =============================================================================
#  STEP 3 — Backend setup
# =============================================================================
if $HAS_BACKEND; then
  step "Setting up backend (FastAPI)…"
  divider
  cd "$BACKEND_DIR"

  # Create venv if it doesn't exist
  if [[ ! -d ".venv" ]]; then
    info "Creating Python virtual environment…"
    python3 -m venv .venv
    success "Created .venv"
  else
    success ".venv already exists"
  fi

  # Activate venv
  # shellcheck source=/dev/null
  source ".venv/bin/activate" 2>/dev/null || source ".venv/Scripts/activate" 2>/dev/null || {
    warn "Could not activate venv automatically — activate it manually:"
    dim "  source backend/.venv/bin/activate"
  }

  # Upgrade pip silently
  info "Upgrading pip…"
  pip install --upgrade pip -q

  # Install requirements
  info "Installing Python packages…"
  if pip install -r requirements.txt -q; then
    success "Python packages installed"
  else
    warn "Some packages failed. Retrying with --break-system-packages…"
    pip install -r requirements.txt -q --break-system-packages || true
  fi

  # Verify key packages are importable
  BACKEND_OK=true
  for pkg in fastapi uvicorn google.generativeai supabase dotenv; do
    if ! python3 -c "import ${pkg//./_}" 2>/dev/null && \
       ! python3 -c "import $pkg" 2>/dev/null; then
      warn "Could not verify package: $pkg"
      BACKEND_OK=false
    fi
  done
  $BACKEND_OK && success "All backend packages verified"

  cd "$SCRIPT_DIR"
  echo ""
fi

# =============================================================================
#  STEP 4 — Frontend setup
# =============================================================================
if $HAS_FRONTEND; then
  step "Setting up web frontend (Next.js)…"
  divider
  cd "$FRONTEND_DIR"

  if [[ ! -d "node_modules" ]]; then
    info "Installing Node packages (this may take a minute)…"
    npm install --legacy-peer-deps 2>&1 | tail -5
    success "Frontend packages installed"
  else
    info "node_modules found — checking for updates…"
    npm install --legacy-peer-deps -q 2>&1 | tail -3
    success "Frontend packages up to date"
  fi

  cd "$SCRIPT_DIR"
  echo ""
fi

# =============================================================================
#  STEP 5 — Mobile setup
# =============================================================================
if $HAS_MOBILE; then
  step "Setting up mobile app (Expo / React Native)…"
  divider
  cd "$MOBILE_DIR"

  if [[ ! -d "node_modules" ]]; then
    info "Installing Node packages for Expo (this may take a minute)…"
    npm install --legacy-peer-deps 2>&1 | tail -5
    success "Mobile packages installed"
  else
    info "node_modules found — checking for updates…"
    npm install --legacy-peer-deps -q 2>&1 | tail -3
    success "Mobile packages up to date"
  fi

  # Check for Expo Go hint
  echo ""
  info "To run on your phone without a cable:"
  dim "  1. Install Expo Go on your Android device"
  dim "     → Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent"
  dim "  2. Make sure your phone and computer are on the same WiFi"
  dim "  3. Scan the QR code shown when you run: npm start"

  cd "$SCRIPT_DIR"
  echo ""
fi

# =============================================================================
#  STEP 6 — Supabase reminder
# =============================================================================
step "Supabase checklist…"
divider
echo ""
info "Make sure you've done these in your Supabase dashboard:"
echo ""
echo -e "  ${BOLD}Required:${RESET}"
dim "  □ SQL Editor → run supabase/schema.sql"
dim "  □ SQL Editor → run supabase/migration_extended_logs.sql"
dim "  □ Authentication → Settings → disable 'Enable email confirmations' (for dev)"
dim "  □ Database → Replication → enable 'logs' table for realtime"
echo ""
echo -e "  ${BOLD}RLS delete fix (required for log deletion to work):${RESET}"
dim "  □ SQL Editor → run:"
dim "      create policy \"Caregivers can delete logs\""
dim "        on public.logs for delete"
dim "        using ("
dim "          profile_id in ("
dim "            select profile_id from public.caregiver_access"
dim "            where user_id = auth.uid()"
dim "          )"
dim "        );"
echo ""

# =============================================================================
#  STEP 7 — Write start script
# =============================================================================
step "Writing start scripts…"
divider

# ── dev.sh — starts everything in parallel ───────────────────────────────────
cat > "$SCRIPT_DIR/dev.sh" << 'DEVSCRIPT'
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
DEVSCRIPT

chmod +x "$SCRIPT_DIR/dev.sh"
success "Created dev.sh"

# ── start-backend.sh ─────────────────────────────────────────────────────────
cat > "$SCRIPT_DIR/start-backend.sh" << 'BACKENDSCRIPT'
#!/usr/bin/env bash
# 🌿 Start only the Willow backend
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"
source ".venv/bin/activate" 2>/dev/null || source ".venv/Scripts/activate" 2>/dev/null
echo "🌿 Backend → http://localhost:8000  |  API docs → http://localhost:8000/docs"
uvicorn main:app --reload --port 8000 --host 0.0.0.0
BACKENDSCRIPT
chmod +x "$SCRIPT_DIR/start-backend.sh"
success "Created start-backend.sh"

# ── start-web.sh ─────────────────────────────────────────────────────────────
if $HAS_FRONTEND; then
  cat > "$SCRIPT_DIR/start-web.sh" << 'WEBSCRIPT'
#!/usr/bin/env bash
# 🌿 Start only the Willow web frontend
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"
echo "🌿 Web → http://localhost:3000"
npm run dev
WEBSCRIPT
  chmod +x "$SCRIPT_DIR/start-web.sh"
  success "Created start-web.sh"
fi

# ── start-mobile.sh ──────────────────────────────────────────────────────────
if $HAS_MOBILE; then
  cat > "$SCRIPT_DIR/start-mobile.sh" << 'MOBILESCRIPT'
#!/usr/bin/env bash
# 🌿 Start only the Willow mobile (Expo)
set -euo pipefail
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../willow-mobile"
[[ ! -d "$MOBILE_DIR" ]] && MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/willow-mobile"
[[ ! -d "$MOBILE_DIR" ]] && MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mobile"
echo "🌿 Mobile (Expo) — scan the QR code with Expo Go on your phone"
cd "$MOBILE_DIR"
npx expo start
MOBILESCRIPT
  chmod +x "$SCRIPT_DIR/start-mobile.sh"
  success "Created start-mobile.sh"
fi

echo ""

# =============================================================================
#  STEP 8 — Health check
# =============================================================================
step "Verifying setup…"
divider

ALL_OK=true

# Backend: check venv + key files exist
if $HAS_BACKEND; then
  if [[ -d "$BACKEND_DIR/.venv" && -f "$BACKEND_DIR/.env" ]]; then
    success "Backend ready"
  else
    warn "Backend may need attention"
    ALL_OK=false
  fi
fi

# Frontend: check node_modules + .env.local
if $HAS_FRONTEND; then
  if [[ -d "$FRONTEND_DIR/node_modules" && -f "$FRONTEND_ENV" ]]; then
    success "Frontend ready"
  else
    warn "Frontend may need attention"
    ALL_OK=false
  fi
fi

# Mobile: check node_modules + .env
if $HAS_MOBILE; then
  if [[ -d "$MOBILE_DIR/node_modules" && -f "$MOBILE_ENV" ]]; then
    success "Mobile ready"
  else
    warn "Mobile may need attention"
    ALL_OK=false
  fi
fi

echo ""

# =============================================================================
#  FINAL SUMMARY
# =============================================================================
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  Setup complete! Here's how to start Willow       ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

if $ALL_OK; then
  echo -e "  ${BOLD}Start everything at once:${RESET}"
  echo -e "  ${GREEN}bash dev.sh${RESET}"
  echo ""
  echo -e "  ${BOLD}Or start individually:${RESET}"
  $HAS_BACKEND  && echo -e "  ${GREEN}bash start-backend.sh${RESET}   → http://localhost:8000"
  $HAS_FRONTEND && echo -e "  ${GREEN}bash start-web.sh${RESET}       → http://localhost:3000"
  $HAS_MOBILE   && echo -e "  ${GREEN}bash start-mobile.sh${RESET}    → Expo QR code"
  echo ""
  if $HAS_BACKEND && $HAS_FRONTEND; then
    echo -e "  ${BOLD}Or pass flags to start only what you need:${RESET}"
    echo -e "  ${DIM}bash dev.sh --backend --frontend${RESET}"
    echo -e "  ${DIM}bash dev.sh --mobile${RESET}"
    echo -e "  ${DIM}bash dev.sh --backend --mobile${RESET}"
  fi
else
  warn "Some parts may not be fully set up. Check the warnings above."
  echo ""
  echo -e "  Try running: ${GREEN}bash setup.sh${RESET} again after fixing any issues."
fi

echo ""
echo -e "  ${DIM}Need help? See README.md or the Supabase checklist above.${RESET}"
echo ""
