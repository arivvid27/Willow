# 🌿 Willow Mobile — React Native (Expo)

Android-first mobile app for Willow care coordination.
Shares the same Supabase database and FastAPI backend as the web app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.74 + Expo 51 |
| Routing | Expo Router (file-based) |
| Auth/DB | Supabase (same project as web) |
| Storage | expo-secure-store (tokens), AsyncStorage (theme) |
| AI | Same FastAPI backend |
| Build | EAS Build (Expo Application Services) |

---

## Prerequisites

```bash
# Node 18+
node --version

# Expo CLI
npm install -g expo-cli eas-cli

# For Android: Android Studio OR just use Expo Go on your phone
```

---

## Setup

### 1 — Install dependencies
```bash
cd willow-mobile
npm install
```

### 2 — Environment variables
```bash
cp .env.example .env
# Edit .env and fill in:
#   EXPO_PUBLIC_SUPABASE_URL
#   EXPO_PUBLIC_SUPABASE_ANON_KEY
#   EXPO_PUBLIC_API_URL  ← use your machine's LAN IP, e.g. http://192.168.1.50:8000
```

> ⚠️ **Important:** Android devices/emulators cannot reach `localhost`.
> Use your computer's local network IP address instead.
> Run `ipconfig` (Windows) or `ifconfig | grep inet` (Mac/Linux) to find it.

### 3 — Start development server
```bash
npm start
# or
npx expo start
```

Then:
- **On your Android phone:** Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) and scan the QR code
- **On emulator:** Press `a` in the terminal to open Android emulator (requires Android Studio)

---

## Build an installable APK

### Option A — EAS Build (cloud, no Android Studio needed) ✅ Recommended
```bash
# Login to Expo account (free)
eas login

# Configure the project (first time only)
eas build:configure

# Build a debug APK you can install on any Android
npm run build:apk
```
EAS will give you a download link when done. Share the `.apk` with anyone to install.

### Option B — Local build (requires Android Studio)
```bash
npx expo run:android
```

---

## File Structure

```
willow-mobile/
├── app/
│   ├── _layout.tsx          # Root layout + ThemeProvider
│   ├── index.tsx            # Redirect to login
│   ├── (auth)/
│   │   ├── login.tsx        # Login screen
│   │   └── signup.tsx       # Signup screen
│   └── (tabs)/
│       ├── _layout.tsx      # Bottom tab bar + auth guard
│       ├── index.tsx        # Dashboard (logs, stats, AI summary)
│       ├── log.tsx          # New daily log form
│       ├── insights.tsx     # AI insights panel
│       ├── chat.tsx         # Chat with Willow AI
│       └── settings.tsx     # Appearance & account settings
├── lib/
│   ├── supabase.ts          # Supabase client (SecureStore)
│   ├── api.ts               # FastAPI backend calls
│   ├── theme.ts             # All 8 color schemes as JS objects
│   ├── ThemeContext.tsx     # React context + AsyncStorage persistence
│   └── types.ts             # Shared TypeScript types
├── assets/                  # App icon, splash screen
├── app.json                 # Expo config
├── eas.json                 # EAS build profiles
└── .env.example             # Environment variable template
```

---

## Screens

| Screen | Description |
|---|---|
| **Dashboard** | Log feed, 7-day stats, auto AI summary after 3+ logs, pull-to-refresh, swipe/tap delete |
| **New Log** | Full log form: day rating (faces), mood bar, sleep, time breakdown, medications, food by meal, notes |
| **Insights** | AI BCBA analysis — Overview, Pattern Analysis, Suggested Adjustments accordion |
| **Chat** | Multi-turn AI chat with full log context, suggested questions |
| **Settings** | Dark mode toggle, 8 color schemes with live preview, sign out |

---

## Using the Same Supabase Database

The mobile app uses the exact same Supabase project as the web app.
No extra setup needed — just use the same `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

---

## Apple / iOS (later)

When you're ready for iOS:
1. Get an [Apple Developer account](https://developer.apple.com) ($99/year)
2. The code is already iOS-compatible (SafeAreaView, KeyboardAvoidingView, etc.)
3. Run: `eas build --platform ios --profile production`
4. Submit to App Store: `eas submit --platform ios`

---

## Pushing to a new Git branch

```bash
# From your main repo root
git checkout -b mobile
git add willow-mobile/
git commit -m "feat: add React Native Expo mobile app"
git push origin mobile
```
