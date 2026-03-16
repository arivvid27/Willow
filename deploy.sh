#!/usr/bin/env bash
# =============================================================================
#  🌿 Willow — Deployment Script
#
#  Backend  → Render.com   (free tier, no credit card, Python native)
#  Frontend → Vercel       (Next.js, free forever)
#  Mobile   → EAS Build    (Android APK, Expo cloud, free tier)
#
#  Usage:
#    bash deploy.sh              — interactive menu
#    bash deploy.sh --web        — backend (Render) + frontend (Vercel)
#    bash deploy.sh --backend    — Render backend only
#    bash deploy.sh --frontend   — Vercel frontend only
#    bash deploy.sh --apk        — Android APK only (EAS)
#    bash deploy.sh --all        — everything
# =============================================================================

set -euo pipefail

RESET="\033[0m"; BOLD="\033[1m"; GREEN="\033[0;32m"
YELLOW="\033[1;33m"; RED="\033[0;31m"; CYAN="\033[0;36m"; DIM="\033[2m"
ORANGE="\033[0;33m"

step()    { echo ""; echo -e "${BOLD}${CYAN}▶ $*${RESET}"; }
info()    { echo -e "  ${CYAN}ℹ  $*${RESET}"; }
warn()    { echo -e "  ${YELLOW}⚠  $*${RESET}"; }
success() { echo -e "  ${GREEN}✔  $*${RESET}"; }
softerr() { echo -e "  ${RED}✖  $*${RESET}"; }
error()   { echo -e "  ${RED}✖  $*${RESET}"; exit 1; }
dim()     { echo -e "  ${DIM}$*${RESET}"; }
link()    { echo -e "  ${ORANGE}🔗 $*${RESET}"; }
divider() { echo -e "${DIM}────────────────────────────────────────────────────${RESET}"; }

ask_yn() {
  local msg="$1" default="${2:-y}" yn_hint
  [[ "$default" == "y" ]] && yn_hint="[Y/n]" || yn_hint="[y/N]"
  echo -ne "  ${BOLD}$msg${RESET} ${DIM}$yn_hint${RESET}: "
  read -r ans; ans="${ans:-$default}"
  [[ "$ans" =~ ^[Yy] ]]
}

prompt() {
  local msg="$1" default="${2:-}"
  [[ -n "$default" ]] \
    && echo -ne "  ${BOLD}$msg${RESET} ${DIM}[$default]${RESET}: " \
    || echo -ne "  ${BOLD}$msg${RESET}: "
}

has()      { command -v "$1" &>/dev/null; }
has_curl() { has curl; }
has_jq()   { has jq; }

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
MOBILE_DIR="$SCRIPT_DIR/../willow-mobile"
[[ ! -d "$MOBILE_DIR" && -d "$SCRIPT_DIR/willow-mobile" ]] && MOBILE_DIR="$SCRIPT_DIR/willow-mobile"
[[ ! -d "$MOBILE_DIR" && -d "$SCRIPT_DIR/mobile"        ]] && MOBILE_DIR="$SCRIPT_DIR/mobile"

BACKEND_URL_FILE="/tmp/willow_burl_$$"
trap 'rm -f "$BACKEND_URL_FILE" /tmp/eas_out_$$' EXIT

# ── Parse flags ───────────────────────────────────────────────────────────────
DO_BACKEND=false; DO_FRONTEND=false; DO_APK=false; INTERACTIVE=true

for arg in "$@"; do
  case $arg in
    --web)      DO_BACKEND=true;  DO_FRONTEND=true; INTERACTIVE=false ;;
    --backend)  DO_BACKEND=true;  INTERACTIVE=false ;;
    --frontend) DO_FRONTEND=true; INTERACTIVE=false ;;
    --apk)      DO_APK=true;      INTERACTIVE=false ;;
    --all)      DO_BACKEND=true;  DO_FRONTEND=true; DO_APK=true; INTERACTIVE=false ;;
  esac
done

# =============================================================================
#  HEADER + MENU
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  🌿 Willow — Deploy to Production                    ║${RESET}"
echo -e "${BOLD}${CYAN}║                                                       ║${RESET}"
echo -e "${BOLD}${CYAN}║  Backend  → Render.com  (free, no credit card)       ║${RESET}"
echo -e "${BOLD}${CYAN}║  Frontend → Vercel      (free forever)               ║${RESET}"
echo -e "${BOLD}${CYAN}║  APK      → EAS Build   (Expo cloud, free tier)      ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""

if $INTERACTIVE; then
  echo -e "  ${BOLD}What would you like to deploy?${RESET}"
  echo ""
  echo -e "  ${BOLD}1)${RESET} Everything (Render + Vercel + Android APK)"
  echo -e "  ${BOLD}2)${RESET} Web only  (Render backend + Vercel frontend)"
  echo -e "  ${BOLD}3)${RESET} Backend only  (Render)"
  echo -e "  ${BOLD}4)${RESET} Frontend only (Vercel)"
  echo -e "  ${BOLD}5)${RESET} Android APK only (EAS Build)"
  echo ""
  echo -ne "  ${BOLD}Choice [1-5]:${RESET} "
  read -r choice
  case "${choice:-2}" in
    1) DO_BACKEND=true; DO_FRONTEND=true; DO_APK=true ;;
    2) DO_BACKEND=true; DO_FRONTEND=true ;;
    3) DO_BACKEND=true ;;
    4) DO_FRONTEND=true ;;
    5) DO_APK=true ;;
    *) error "Invalid choice." ;;
  esac
fi

# =============================================================================
#  PRE-FLIGHT: CHECK & INSTALL TOOLS
# =============================================================================
step "Checking required tools…"
divider

# git — required to push to Render (it deploys from GitHub/GitLab)
if has git; then
  success "git $(git --version | grep -oP '\d+\.\d+\.\d+')"
else
  error "git is required. Install: sudo apt install git"
fi

# curl — for Render API calls
if has curl; then
  success "curl $(curl --version | head -1 | grep -oP '\d+\.\d+\.\d+' | head -1)"
else
  error "curl is required. Install: sudo apt install curl"
fi

# jq — for parsing Render API JSON responses
if has jq; then
  success "jq $(jq --version)"
else
  warn "jq not found — installing (needed for Render API)…"
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo apt-get install -y -q jq 2>/dev/null && success "jq installed" || {
      warn "Could not auto-install jq."
      info "Install manually: sudo apt install jq"
      info "Then re-run this script."
      # jq is optional — we can work around it
    }
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    has brew && brew install jq -q && success "jq installed" || \
      warn "Install jq: brew install jq"
  fi
fi

# Vercel CLI (frontend only)
if $DO_FRONTEND; then
  if has vercel; then
    success "vercel $(vercel --version 2>&1 | head -1)"
  else
    info "Installing Vercel CLI…"
    npm install -g vercel -q && success "Vercel CLI installed" || \
      error "Run: npm install -g vercel"
  fi
fi

# EAS CLI (mobile only)
if $DO_APK; then
  if has eas; then
    success "eas $(eas --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1 || echo 'found')"
  else
    info "Installing EAS CLI…"
    npm install -g eas-cli -q && success "EAS CLI installed" || \
      error "Run: npm install -g eas-cli"
  fi
fi

echo ""

# =============================================================================
#  GIT CHECK — Render deploys from a Git repo
# =============================================================================
if $DO_BACKEND || $DO_FRONTEND; then
  step "Checking Git repository…"
  divider

  # Check if we're inside a git repo
  if ! git -C "$SCRIPT_DIR" rev-parse --git-dir &>/dev/null 2>&1; then
    warn "This project is not in a Git repository yet."
    echo ""
    info "Render deploys directly from GitHub. You need to:"
    dim "  1. Create a repo at https://github.com/new"
    dim "  2. Run the commands below, then re-run this script"
    echo ""
    echo -e "  ${BOLD}git init"
    echo -e "  git add ."
    echo -e "  git commit -m \"Initial Willow commit\""
    echo -e "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    echo -e "  git push -u origin main${RESET}"
    echo ""
    error "Push to GitHub first, then re-run deploy.sh"
  fi

  # Check for remote
  REMOTE_URL=$(git -C "$SCRIPT_DIR" remote get-url origin 2>/dev/null || echo "")
  if [[ -z "$REMOTE_URL" ]]; then
    warn "No git remote 'origin' found."
    info "Create a GitHub repo and run:"
    dim "  git remote add origin https://github.com/YOU/willow.git"
    dim "  git push -u origin main"
    error "Add a GitHub remote then re-run."
  fi

  # Check for uncommitted changes
  if ! git -C "$SCRIPT_DIR" diff-index --quiet HEAD -- 2>/dev/null; then
    warn "You have uncommitted changes."
    if ask_yn "Commit and push everything now?" "y"; then
      git -C "$SCRIPT_DIR" add -A
      git -C "$SCRIPT_DIR" commit -m "chore: deploy $(date '+%Y-%m-%d %H:%M')"
      git -C "$SCRIPT_DIR" push
      success "Changes pushed to $(git -C "$SCRIPT_DIR" remote get-url origin)"
    else
      warn "Deploying without pushing — Render will use your last pushed commit."
    fi
  else
    # Push latest commits if any
    LOCAL=$(git -C "$SCRIPT_DIR" rev-parse HEAD 2>/dev/null)
    REMOTE=$(git -C "$SCRIPT_DIR" rev-parse "@{u}" 2>/dev/null || echo "")
    if [[ "$LOCAL" != "$REMOTE" && -n "$REMOTE" ]]; then
      info "Pushing latest commits…"
      git -C "$SCRIPT_DIR" push && success "Pushed to origin"
    else
      success "Git repo up to date: $REMOTE_URL"
    fi
  fi

  echo ""
fi

# =============================================================================
#  BACKEND → Render
# =============================================================================
if $DO_BACKEND; then
  step "Deploying backend → Render.com"
  divider

  echo ""
  echo -e "  ${BOLD}How Render deployment works:${RESET}"
  dim "  Render connects to your GitHub repo and auto-deploys on every push."
  dim "  No Docker, no CLI required. It reads render.yaml for config."
  echo ""

  # ── Render API token ──────────────────────────────────────────────────────
  # Try to read a saved token first
  RENDER_TOKEN_FILE="$HOME/.willow_render_token"
  RENDER_API_TOKEN=""

  if [[ -f "$RENDER_TOKEN_FILE" ]]; then
    RENDER_API_TOKEN=$(cat "$RENDER_TOKEN_FILE")
    # Validate it still works
    STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $RENDER_API_TOKEN" \
      "https://api.render.com/v1/services?limit=1" 2>/dev/null || echo "000")
    if [[ "$STATUS" == "200" ]]; then
      success "Using saved Render API token"
    else
      warn "Saved token is invalid — need a new one"
      RENDER_API_TOKEN=""
    fi
  fi

  if [[ -z "$RENDER_API_TOKEN" ]]; then
    echo ""
    echo -e "  ${BOLD}Step 1 — Get a Render API token:${RESET}"
    link "https://dashboard.render.com/u/settings#api-keys"
    dim "  → Click 'Create API Key' → name it 'willow-deploy' → copy the key"
    echo ""
    prompt "Paste your Render API key"
    read -r RENDER_API_TOKEN
    [[ -z "$RENDER_API_TOKEN" ]] && error "API token is required."
    # Save for future runs
    echo "$RENDER_API_TOKEN" > "$RENDER_TOKEN_FILE"
    chmod 600 "$RENDER_TOKEN_FILE"
    success "Token saved to $RENDER_TOKEN_FILE"
  fi

  # ── Render API helper ─────────────────────────────────────────────────────
  render_api() {
    local method="$1" path="$2" data="${3:-}"
    if [[ -n "$data" ]]; then
      curl -sf -X "$method" \
        -H "Authorization: Bearer $RENDER_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "https://api.render.com/v1$path"
    else
      curl -sf -X "$method" \
        -H "Authorization: Bearer $RENDER_API_TOKEN" \
        "https://api.render.com/v1$path"
    fi
  }

  # ── Read env vars from backend/.env ──────────────────────────────────────
  get_env() {
    local key="$1" val
    val=$(grep "^${key}=" "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2- | xargs || echo "")
    [[ "$val" == "your-"* || "$val" == "https://your-project"* ]] && val=""
    echo "$val"
  }

  SUPA_URL=$(get_env SUPABASE_URL)
  SUPA_SRK=$(get_env SUPABASE_SERVICE_ROLE_KEY)
  GEM_KEY=$(get_env GEMINI_API_KEY)

  [[ -z "$SUPA_URL" ]] && { prompt "Supabase URL";              read -r SUPA_URL; }
  [[ -z "$SUPA_SRK" ]] && { prompt "Supabase service_role key"; read -r SUPA_SRK; }
  [[ -z "$GEM_KEY"  ]] && { prompt "Gemini API key";            read -r GEM_KEY;  }
  echo ""

  # ── Get GitHub repo URL from git remote ──────────────────────────────────
  GITHUB_REPO_URL=$(git -C "$SCRIPT_DIR" remote get-url origin 2>/dev/null || echo "")
  # Normalize SSH → HTTPS  (git@github.com:user/repo.git → https://github.com/user/repo)
  if [[ "$GITHUB_REPO_URL" == git@github.com:* ]]; then
    GITHUB_REPO_URL="https://github.com/${GITHUB_REPO_URL#git@github.com:}"
  fi
  GITHUB_REPO_URL="${GITHUB_REPO_URL%.git}"  # strip .git suffix

  # Extract owner/name
  REPO_OWNER=$(echo "$GITHUB_REPO_URL" | grep -oP 'github\.com/\K[^/]+')
  REPO_NAME=$(echo "$GITHUB_REPO_URL"  | grep -oP 'github\.com/[^/]+/\K[^/]+')

  success "GitHub repo: $REPO_OWNER/$REPO_NAME"

  # ── Check if service already exists ──────────────────────────────────────
  info "Checking for existing Render service…"
  EXISTING_SERVICE=""
  EXISTING_URL=""

  SERVICES_JSON=$(render_api GET "/services?limit=20&name=willow-backend" 2>/dev/null || echo "[]")

  if has jq && [[ "$SERVICES_JSON" != "[]" && -n "$SERVICES_JSON" ]]; then
    EXISTING_SERVICE=$(echo "$SERVICES_JSON" | jq -r '.[0].service.id // empty' 2>/dev/null || echo "")
    EXISTING_URL=$(echo "$SERVICES_JSON"     | jq -r '.[0].service.serviceDetails.url // empty' 2>/dev/null || echo "")
  fi

  if [[ -n "$EXISTING_SERVICE" ]]; then
    success "Found existing service: $EXISTING_SERVICE"
    info "Triggering a new deploy…"

    DEPLOY_JSON=$(render_api POST "/services/$EXISTING_SERVICE/deploys" '{"clearCache":"do_not_clear"}' 2>/dev/null || echo "{}")
    DEPLOY_ID=$(echo "$DEPLOY_JSON" | jq -r '.id // empty' 2>/dev/null || echo "")
    [[ -n "$DEPLOY_ID" ]] && success "Deploy triggered: $DEPLOY_ID" || warn "Could not trigger deploy via API — push to GitHub will auto-deploy."

    BACKEND_URL="$EXISTING_URL"

    # Update env vars on existing service
    info "Updating environment variables…"
    ENV_PAYLOAD=$(cat <<ENVJSON
[
  {"key":"SUPABASE_URL","value":"$SUPA_URL"},
  {"key":"SUPABASE_SERVICE_ROLE_KEY","value":"$SUPA_SRK"},
  {"key":"GEMINI_API_KEY","value":"$GEM_KEY"}
]
ENVJSON
)
    render_api PUT "/services/$EXISTING_SERVICE/env-vars" "$ENV_PAYLOAD" &>/dev/null && \
      success "Env vars updated" || warn "Could not update env vars via API — set them in Render dashboard."

  else
    # ── First deploy — guide the user through the Render dashboard ──────────
    echo ""
    echo -e "  ${BOLD}${CYAN}First-time Render setup (takes ~3 minutes):${RESET}"
    echo ""
    echo -e "  ${BOLD}1.${RESET} Go to: ${ORANGE}https://dashboard.render.com/new/web${RESET}"
    echo -e "  ${BOLD}2.${RESET} Connect your GitHub account if not already connected"
    echo -e "  ${BOLD}3.${RESET} Select your repo: ${BOLD}$REPO_OWNER/$REPO_NAME${RESET}"
    echo -e "  ${BOLD}4.${RESET} Render will detect ${BOLD}render.yaml${RESET} automatically — click ${BOLD}Apply${RESET}"
    echo -e "  ${BOLD}5.${RESET} Add these environment variables:"
    echo ""
    echo -e "     ${BOLD}SUPABASE_URL${RESET}              = $SUPA_URL"
    echo -e "     ${BOLD}SUPABASE_SERVICE_ROLE_KEY${RESET} = $SUPA_SRK"
    echo -e "     ${BOLD}GEMINI_API_KEY${RESET}            = $GEM_KEY"
    echo ""
    echo -e "  ${BOLD}6.${RESET} Click ${BOLD}Create Web Service${RESET}"
    echo ""

    # Open browser if possible
    if has xdg-open; then
      if ask_yn "Open Render dashboard in browser now?" "y"; then
        xdg-open "https://dashboard.render.com/new/web" 2>/dev/null &
      fi
    fi

    echo ""
    info "Waiting for you to create the service…"
    dim "  Once created, Render gives you a URL like: https://willow-backend.onrender.com"
    echo ""
    prompt "Paste your Render service URL when ready"
    read -r BACKEND_URL
    BACKEND_URL="${BACKEND_URL%/}"  # strip trailing slash
    [[ -z "$BACKEND_URL" ]] && error "Backend URL is required to continue."
  fi

  # Save URL for later steps
  echo "$BACKEND_URL" > "$BACKEND_URL_FILE"

  success "Backend: $BACKEND_URL"
  echo ""
  info "Verifying backend is responding…"

  # Poll health endpoint up to 90 seconds (Render cold starts take ~30s)
  HEALTH_OK=false
  for i in $(seq 1 9); do
    HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null || echo "000")
    if [[ "$HTTP_STATUS" == "200" ]]; then
      HEALTH_OK=true
      break
    fi
    echo -ne "  ${DIM}Waiting for backend to start… attempt $i/9${RESET}\r"
    sleep 10
  done
  echo ""

  if $HEALTH_OK; then
    success "Backend is live and healthy!"
    link "$BACKEND_URL/health"
    link "$BACKEND_URL/docs"
  else
    warn "Backend not responding yet — it may still be starting (Render free tier can take 1-2 min)."
    link "Watch logs at: https://dashboard.render.com"
    dim "  First deploy takes longer. Subsequent deploys are faster."
  fi

  echo ""
fi

# =============================================================================
#  FRONTEND → Vercel
# =============================================================================
if $DO_FRONTEND; then
  step "Deploying frontend → Vercel"
  divider

  [[ ! -d "$FRONTEND_DIR" ]] && error "frontend/ directory not found."
  cd "$FRONTEND_DIR"

  # Auth
  vercel whoami &>/dev/null 2>&1 || { info "Logging in to Vercel…"; vercel login; }
  success "Vercel: $(vercel whoami 2>/dev/null || echo 'logged in')"

  # Backend URL
  BACKEND_URL=""
  [[ -f "$BACKEND_URL_FILE" ]] && BACKEND_URL=$(cat "$BACKEND_URL_FILE")
  if [[ -z "$BACKEND_URL" ]]; then
    link "https://dashboard.render.com — copy your service URL"
    prompt "Render backend URL (https://willow-backend.onrender.com)"
    read -r BACKEND_URL
    BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
  fi

  # Supabase keys
  get_fe_env() { grep "^${1}=" ".env.local" 2>/dev/null | cut -d= -f2- | xargs || echo ""; }
  SUPA_URL=$(get_fe_env NEXT_PUBLIC_SUPABASE_URL)
  SUPA_ANON=$(get_fe_env NEXT_PUBLIC_SUPABASE_ANON_KEY)
  [[ "$SUPA_URL"  == "https://your-project"* ]] && SUPA_URL=""
  [[ "$SUPA_ANON" == "your-"*               ]] && SUPA_ANON=""

  [[ -z "$SUPA_URL"  ]] && { prompt "Supabase URL";      read -r SUPA_URL;  }
  [[ -z "$SUPA_ANON" ]] && { prompt "Supabase anon key"; read -r SUPA_ANON; }
  echo ""

  info "Deploying to Vercel…"
  info "Backend: $BACKEND_URL"
  echo ""

  ENV_FLAGS=(
    --env "NEXT_PUBLIC_API_URL=$BACKEND_URL"
    --env "NEXT_PUBLIC_SUPABASE_URL=$SUPA_URL"
    --env "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPA_ANON"
    --build-env "NEXT_PUBLIC_API_URL=$BACKEND_URL"
    --build-env "NEXT_PUBLIC_SUPABASE_URL=$SUPA_URL"
    --build-env "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPA_ANON"
  )

  if [[ ! -f ".vercel/project.json" ]]; then
    info "First deploy — answer Vercel's setup questions:"
    dim "  Set up and deploy? Yes | Link to existing? No | Dir? ./"
    echo ""
    vercel "${ENV_FLAGS[@]}"
    vercel --prod --yes 2>/dev/null || true
  else
    vercel --prod --yes "${ENV_FLAGS[@]}"
  fi

  VERCEL_URL=$(vercel ls 2>/dev/null | grep -oP 'https://[^\s]+\.vercel\.app' | head -1 || echo "")
  success "Frontend deployed!"
  [[ -n "$VERCEL_URL" ]] && link "$VERCEL_URL" || link "https://vercel.com/dashboard"

  # ── Update Render FRONTEND_URL for CORS ──────────────────────────────────
  if $DO_BACKEND && [[ -n "$VERCEL_URL" ]]; then
    echo ""
    info "Updating Render FRONTEND_URL for CORS → $VERCEL_URL"

    # Try via API if we have token and service ID
    if [[ -f "$HOME/.willow_render_token" ]]; then
      RENDER_API_TOKEN=$(cat "$HOME/.willow_render_token")
      SVC_JSON=$(curl -sf \
        -H "Authorization: Bearer $RENDER_API_TOKEN" \
        "https://api.render.com/v1/services?limit=20&name=willow-backend" 2>/dev/null || echo "[]")

      SVC_ID=""
      has jq && SVC_ID=$(echo "$SVC_JSON" | jq -r '.[0].service.id // empty' 2>/dev/null || echo "")

      if [[ -n "$SVC_ID" ]]; then
        ENV_PATCH=$(printf '[{"key":"FRONTEND_URL","value":"%s"}]' "$VERCEL_URL")
        curl -sf -X PUT \
          -H "Authorization: Bearer $RENDER_API_TOKEN" \
          -H "Content-Type: application/json" \
          -d "$ENV_PATCH" \
          "https://api.render.com/v1/services/$SVC_ID/env-vars" &>/dev/null && \
          success "CORS updated on Render" || \
          warn "Could not update via API."
      fi
    fi

    # Always show the manual fallback
    warn "Also verify in Render dashboard: Environment → FRONTEND_URL = $VERCEL_URL"
  fi

  # ── Supabase Auth reminder ────────────────────────────────────────────────
  if [[ -n "$VERCEL_URL" ]]; then
    echo ""
    warn "Add your Vercel URL to Supabase Auth settings:"
    dim "  Supabase → Authentication → URL Configuration"
    dim "  Site URL:      $VERCEL_URL"
    dim "  Redirect URLs: $VERCEL_URL/**"
  fi

  cd "$SCRIPT_DIR"
  echo ""
fi

# =============================================================================
#  APK → EAS Build
# =============================================================================
if $DO_APK; then
  step "Building Android APK → EAS cloud"
  divider

  [[ ! -d "$MOBILE_DIR" ]] && error "Mobile directory not found: $MOBILE_DIR"
  cd "$MOBILE_DIR"

  [[ ! -d "node_modules" ]] && { info "Installing deps…"; npm install --legacy-peer-deps -q; }

  eas whoami &>/dev/null 2>&1 || {
    info "Need a free Expo account → https://expo.dev/signup"
    eas login
  }
  EAS_USER=$(eas whoami 2>/dev/null || echo "unknown")
  success "Expo: $EAS_USER"

  grep -q '"projectId"' app.json 2>/dev/null || {
    info "Configuring EAS (first time)…"
    eas build:configure --platform android
  }

  # Fix API URL if still local
  if [[ -f ".env" ]]; then
    API_URL=$(grep "^EXPO_PUBLIC_API_URL=" ".env" | cut -d= -f2- | xargs || echo "")
    if [[ "$API_URL" == *"localhost"* || "$API_URL" == *"192.168"* || -z "$API_URL" ]]; then
      warn "API URL is a local address: $API_URL"
      PROD_URL=""
      [[ -f "$BACKEND_URL_FILE" ]] && PROD_URL=$(cat "$BACKEND_URL_FILE")
      if [[ -n "$PROD_URL" ]]; then
        ask_yn "Update to production URL ($PROD_URL)?" "y" && {
          sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$PROD_URL|" ".env"
          success "Updated: $PROD_URL"
        } || true
      else
        link "https://dashboard.render.com — find your service URL"
        prompt "Production Render backend URL"
        read -r PROD_URL
        [[ -n "$PROD_URL" ]] && {
          sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$PROD_URL|" ".env"
          success "Updated: $PROD_URL"
        }
      fi
    else
      success "API URL: $API_URL"
    fi
  fi

  echo ""
  info "Submitting APK build to EAS cloud (~5–10 min)…"
  dim "  Expo will email you the download link when done."
  echo ""

  eas build --platform android --profile apk --non-interactive \
    2>&1 | tee "/tmp/eas_out_$$"

  APK_URL=$(grep -oP 'https://expo\.dev/artifacts/[^\s]+' "/tmp/eas_out_$$" | head -1 || echo "")
  BUILD_URL=$(grep -oP 'https://expo\.dev/accounts/[^\s]+/builds/[^\s]+' "/tmp/eas_out_$$" | head -1 || echo "")

  echo ""
  if   [[ -n "$APK_URL"   ]]; then success "APK ready!"; link "$APK_URL"
  elif [[ -n "$BUILD_URL" ]]; then success "Build in progress!"; link "$BUILD_URL"
  else success "Build submitted!"; link "https://expo.dev/accounts/$EAS_USER/builds"; fi

  cd "$SCRIPT_DIR"
  echo ""
fi

# =============================================================================
#  SUMMARY
# =============================================================================
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  🌿 Deployment complete!                             ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""

if $DO_BACKEND; then
  BURL=$(cat "$BACKEND_URL_FILE" 2>/dev/null || echo "see Render dashboard")
  echo -e "  ${GREEN}✔ Backend${RESET}  → Render"
  link "$BURL"
  link "Dashboard: https://dashboard.render.com"
fi
if $DO_FRONTEND; then
  echo -e "  ${GREEN}✔ Frontend${RESET} → Vercel"
  link "Dashboard: https://vercel.com/dashboard"
fi
if $DO_APK; then
  echo -e "  ${GREEN}✔ APK${RESET}      → EAS Build"
  link "Dashboard: https://expo.dev"
fi

echo ""
echo -e "  ${BOLD}⚠  Render free tier note:${RESET}"
dim "  Free services spin down after 15 min of inactivity."
dim "  The first request after idle takes ~30 seconds to wake up."
dim "  This is fine for personal/family use."
echo ""
echo -e "  ${BOLD}Installing the APK on Android:${RESET}"
dim "  Download .apk → send to phone → Settings → Security → Unknown sources → Install"
echo ""
echo -e "  ${DIM}Redeploy anytime: bash deploy.sh${RESET}"
echo ""
