#!/usr/bin/env bash
# 🌿 Start only the Willow mobile (Expo)
set -euo pipefail
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../willow-mobile"
[[ ! -d "$MOBILE_DIR" ]] && MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/willow-mobile"
[[ ! -d "$MOBILE_DIR" ]] && MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mobile"
echo "🌿 Mobile (Expo) — scan the QR code with Expo Go on your phone"
cd "$MOBILE_DIR"
npx expo start
