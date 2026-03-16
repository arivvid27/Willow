#!/usr/bin/env bash
# =============================================================================
#  🌿 Willow — Deploy to Vercel
#
#  Frontend + Backend API routes → Vercel (free, no credit card)
#  Android APK                  → EAS Build (Expo cloud, free tier)
#
#  Usage:
#    bash deploy.sh          — deploy web app (default)
#    bash deploy.sh --apk    — build Android APK only
#    bash deploy.sh --all    — web + APK
# =============================================================================

set -euo pipefail

RESET="\033[0m"; BOLD="\033[1m"; GREEN="\033[0;32m"
YELLOW="\033[1;33m"; RED="\033[0;31m"; CYAN="\033[0;36m"; DIM="\033[2m"
ORANGE="\033[0;33m"

step()    { echo ""; echo -e "${BOLD}${CYAN}▶ $*${RESET}"; }
info()    { echo -e "  ${CYAN}ℹ  $*${RESET}"; }
warn()    { echo -e "  ${YELLOW}⚠  $*${RESET}"; }
success() { echo -e "  ${GREEN}✔  $*${RESET}"; }
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

has() { command -v "$1" &>/dev/null; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
MOBILE_DIR="$SCRIPT_DIR/../willow-mobile"
[[ ! -d "$MOBILE_DIR" && -d "$SCRIPT_DIR/willow-mobile" ]] && MOBILE_DIR="$SCRIPT_DIR/willow-mobile"
[[ ! -d "$MOBILE_DIR" && -d "$SCRIPT_DIR/mobile"        ]] && MOBILE_DIR="$SCRIPT_DIR/mobile"

VERCEL_URL_FILE="/tmp/willow_vurl_$$"
trap 'rm -f "$VERCEL_URL_FILE" /tmp/eas_out_$$' EXIT

DO_WEB=true; DO_APK=false
for arg in "$@"; do
  case $arg in
    --apk) DO_WEB=false; DO_APK=true ;;
    --all) DO_WEB=true;  DO_APK=true ;;
  esac
done

# =============================================================================
#  HEADER
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  🌿 Willow — Deploy                                  ║${RESET}"
echo -e "${BOLD}${CYAN}║  Web  → Vercel  (frontend + AI API, free forever)    ║${RESET}"
echo -e "${BOLD}${CYAN}║  APK  → EAS Build  (Expo cloud, free tier)           ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""

if [[ $# -eq 0 ]]; then
  echo -e "  ${BOLD}Deploy what?${RESET}"
  echo ""
  echo -e "  ${BOLD}1)${RESET} Web app only  (Vercel)"
  echo -e "  ${BOLD}2)${RESET} Android APK only  (EAS Build)"
  echo -e "  ${BOLD}3)${RESET} Both"
  echo ""
  echo -ne "  ${BOLD}Choice [1-3]:${RESET} "
  read -r choice
  case "${choice:-1}" in
    1) DO_WEB=true;  DO_APK=false ;;
    2) DO_WEB=false; DO_APK=true  ;;
    3) DO_WEB=true;  DO_APK=true  ;;
    *) error "Invalid choice." ;;
  esac
fi

# =============================================================================
#  CHECK TOOLS
# =============================================================================
step "Checking tools…"
divider

if $DO_WEB; then
  if has vercel; then
    success "vercel $(vercel --version 2>&1 | head -1)"
  else
    info "Installing Vercel CLI…"
    npm install -g vercel -q && success "Vercel CLI installed" || error "Run: npm install -g vercel"
  fi
fi

if $DO_APK; then
  if has eas; then
    success "eas $(eas --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1 || echo 'found')"
  else
    info "Installing EAS CLI…"
    npm install -g eas-cli -q && success "EAS CLI installed" || error "Run: npm install -g eas-cli"
  fi
fi

echo ""

# =============================================================================
#  DEPLOY WEB → VERCEL
# =============================================================================
if $DO_WEB; then
  step "Deploying to Vercel…"
  divider

  [[ ! -d "$FRONTEND_DIR" ]] && error "frontend/ directory not found."
  cd "$FRONTEND_DIR"

  # Login
  vercel whoami &>/dev/null 2>&1 || { info "Logging in to Vercel (browser will open)…"; vercel login; }
  success "Logged in as: $(vercel whoami 2>/dev/null || echo 'verified')"

  # ── Read env vars from .env.local ─────────────────────────────────────────
  get_env() { grep "^${1}=" ".env.local" 2>/dev/null | cut -d= -f2- | xargs || echo ""; }

  SUPA_URL=$(get_env NEXT_PUBLIC_SUPABASE_URL)
  SUPA_ANON=$(get_env NEXT_PUBLIC_SUPABASE_ANON_KEY)
  GEMINI_KEY=$(get_env GEMINI_API_KEY)

  # Treat placeholder values as empty
  [[ "$SUPA_URL"   == "https://your-project"* ]] && SUPA_URL=""
  [[ "$SUPA_ANON"  == "your-"*               ]] && SUPA_ANON=""
  [[ "$GEMINI_KEY" == "your-"*               ]] && GEMINI_KEY=""

  # Prompt for any missing values
  if [[ -z "$SUPA_URL" || -z "$SUPA_ANON" || -z "$GEMINI_KEY" ]]; then
    echo ""
    info "Some environment variables are missing. Enter them now:"
    dim "  (They'll be set as Vercel environment variables)"
    echo ""
  fi

  [[ -z "$SUPA_URL"   ]] && { prompt "Supabase URL";      read -r SUPA_URL;   }
  [[ -z "$SUPA_ANON"  ]] && { prompt "Supabase anon key"; read -r SUPA_ANON;  }
  [[ -z "$GEMINI_KEY" ]] && { prompt "Gemini API key";    read -r GEMINI_KEY; }
  echo ""

  # ── Deploy ────────────────────────────────────────────────────────────────
  info "Deploying frontend + API routes to Vercel…"
  echo ""

  ENV_FLAGS=(
    --env "NEXT_PUBLIC_SUPABASE_URL=$SUPA_URL"
    --env "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPA_ANON"
    --env "GEMINI_API_KEY=$GEMINI_KEY"
    --build-env "NEXT_PUBLIC_SUPABASE_URL=$SUPA_URL"
    --build-env "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPA_ANON"
    --build-env "GEMINI_API_KEY=$GEMINI_KEY"
  )

  if [[ ! -f ".vercel/project.json" ]]; then
    info "First deploy — Vercel will ask a few setup questions:"
    dim "  Set up and deploy? Yes"
    dim "  Which scope?       your personal account"
    dim "  Link to existing?  No (unless you already created one)"
    dim "  Project name?      willow  (or anything you like)"
    dim "  Directory?         ./  (just press Enter)"
    echo ""
    vercel "${ENV_FLAGS[@]}"
    # Promote preview to production
    vercel --prod --yes 2>/dev/null || true
  else
    vercel --prod --yes "${ENV_FLAGS[@]}"
  fi

  # ── Get the deployed URL ──────────────────────────────────────────────────
  VERCEL_URL=$(vercel ls 2>/dev/null | grep -oP 'https://[^\s]+\.vercel\.app' | head -1 || echo "")
  echo "$VERCEL_URL" > "$VERCEL_URL_FILE"

  echo ""
  success "Web app deployed!"
  [[ -n "$VERCEL_URL" ]] && link "$VERCEL_URL" || link "https://vercel.com/dashboard"

  # ── Update NEXT_PUBLIC_SITE_URL so server-side fetch works ───────────────
  if [[ -n "$VERCEL_URL" ]]; then
    SITE_HOST="${VERCEL_URL#https://}"
    info "Setting NEXT_PUBLIC_SITE_URL=$SITE_HOST on Vercel…"
    vercel env add NEXT_PUBLIC_SITE_URL production <<< "$SITE_HOST" 2>/dev/null || \
      warn "Could not auto-set NEXT_PUBLIC_SITE_URL. Set it manually in Vercel dashboard → Settings → Environment Variables → NEXT_PUBLIC_SITE_URL = $SITE_HOST"
  fi

  # ── Supabase Auth reminder ────────────────────────────────────────────────
  if [[ -n "$VERCEL_URL" ]]; then
    echo ""
    warn "One manual step — add your URL to Supabase Auth:"
    dim "  Supabase dashboard → Authentication → URL Configuration"
    dim "  Site URL:      $VERCEL_URL"
    dim "  Redirect URLs: $VERCEL_URL/**"
  fi

  # ── Test the API routes ───────────────────────────────────────────────────
  if [[ -n "$VERCEL_URL" ]]; then
    echo ""
    info "Testing /api/health…"
    sleep 3  # Give Vercel a moment to propagate
    HTTP=$(curl -sf -o /dev/null -w "%{http_code}" "$VERCEL_URL/api/health" 2>/dev/null || echo "000")
    if [[ "$HTTP" == "200" ]]; then
      success "API routes are live!"
    else
      warn "Health check returned $HTTP — may still be building. Check in a minute."
    fi
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
    info "Configuring EAS for first time…"
    eas build:configure --platform android
  }

  # ── Point the APK at the Vercel deployment ────────────────────────────────
  if [[ -f ".env" ]]; then
    API_URL=$(grep "^EXPO_PUBLIC_API_URL=" ".env" | cut -d= -f2- | xargs || echo "")
    if [[ "$API_URL" == *"localhost"* || "$API_URL" == *"192.168"* || -z "$API_URL" ]]; then
      warn "Mobile API URL is local: $API_URL"

      # Try to use the Vercel URL from the web deploy step
      VERCEL_URL=""
      [[ -f "$VERCEL_URL_FILE" ]] && VERCEL_URL=$(cat "$VERCEL_URL_FILE")

      if [[ -n "$VERCEL_URL" ]]; then
        info "Using Vercel URL: $VERCEL_URL"
        if ask_yn "Update mobile API URL to $VERCEL_URL?" "y"; then
          sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$VERCEL_URL|" ".env"
          success "Updated to: $VERCEL_URL"
        fi
      else
        link "https://vercel.com/dashboard — copy your deployment URL"
        prompt "Your Vercel app URL (https://willow-xxxx.vercel.app)"
        read -r PROD_URL
        if [[ -n "$PROD_URL" ]]; then
          sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$PROD_URL|" ".env"
          success "Updated to: $PROD_URL"
        fi
      fi
    else
      success "API URL: $API_URL"
    fi
  fi

  echo ""
  info "Submitting APK build to EAS (~5–10 min)…"
  dim "  Expo will email you the APK download link when done."
  echo ""

  eas build --platform android --profile apk --non-interactive \
    2>&1 | tee "/tmp/eas_out_$$"

  APK_URL=$(grep -oP 'https://expo\.dev/artifacts/[^\s]+' "/tmp/eas_out_$$" | head -1 || echo "")
  BUILD_URL=$(grep -oP 'https://expo\.dev/accounts/[^\s]+/builds/[^\s]+' "/tmp/eas_out_$$" | head -1 || echo "")

  echo ""
  if   [[ -n "$APK_URL"   ]]; then success "APK ready!";         link "$APK_URL"
  elif [[ -n "$BUILD_URL" ]]; then success "Build in progress!"; link "$BUILD_URL"
  else success "Build submitted!"; link "https://expo.dev/accounts/$EAS_USER/builds"; fi

  cd "$SCRIPT_DIR"
  echo ""
fi

# =============================================================================
#  SUMMARY
# =============================================================================
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  🌿 Done!                                            ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""

if $DO_WEB; then
  VURL=$(cat "$VERCEL_URL_FILE" 2>/dev/null || echo "see Vercel dashboard")
  echo -e "  ${GREEN}✔ Web app${RESET} → Vercel (frontend + AI, 100% free)"
  link "$VURL"
  link "Manage: https://vercel.com/dashboard"
fi
if $DO_APK; then
  echo -e "  ${GREEN}✔ APK${RESET} → EAS Build"
  link "https://expo.dev"
fi

echo ""
echo -e "  ${BOLD}Installing the APK on Android:${RESET}"
dim "  Download .apk → send to phone → Settings → Security → Unknown sources → tap to install"
echo ""
echo -e "  ${DIM}Redeploy anytime: bash deploy.sh${RESET}"
echo ""
