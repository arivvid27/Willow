# Google OAuth Setup — Willow

Two things to configure: Google Cloud Console + Supabase. Takes about 10 minutes.

---

## Part 1 — Google Cloud Console (get OAuth credentials)

1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one) — name it "Willow"
3. Go to **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `Willow`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through all steps
   - On the last step click **Back to Dashboard**

4. Go to **APIs & Services → Credentials**
5. Click **+ Create Credentials → OAuth 2.0 Client ID**
6. Application type: **Web application**
7. Name: `Willow Web`
8. Under **Authorised redirect URIs** add:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   *(Replace YOUR_PROJECT_ID with your actual Supabase project ID)*

9. Click **Create**
10. Copy the **Client ID** and **Client Secret** — you need these next

---

## Part 2 — Supabase (enable Google provider)

1. Go to https://supabase.com → your project
2. **Authentication → Providers → Google**
3. Toggle **Enable Sign in with Google** → ON
4. Paste your **Client ID** and **Client Secret** from Google
5. Copy the **Callback URL** shown — it looks like:
   `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   *(This is what you added to Google in step 8 above)*
6. Click **Save**

---

## Part 3 — Supabase redirect URLs

1. **Authentication → URL Configuration**
2. **Site URL**: `https://your-app.vercel.app`
3. **Redirect URLs** — add ALL of these:
   ```
   https://your-app.vercel.app/**
   http://localhost:3000/**
   willow://auth/callback
   exp+willow://auth/callback
   ```
   The `willow://` entries are for the mobile app.

---

## Part 4 — Vercel environment (already set if you ran deploy.sh)

No extra env vars needed — Supabase handles the OAuth flow.
Your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are sufficient.

---

## Part 5 — Mobile app (Android)

For the Android APK to use Google OAuth, add your app's SHA-1 fingerprint to Google Cloud:

1. In Google Cloud Console → **Credentials → your OAuth client**
2. Add an **Android** OAuth client:
   - Package name: `com.willowcare.app`
   - SHA-1: run `cd android && ./gradlew signingReport` to get it
   
   For EAS builds, you can get the SHA-1 from:
   `eas credentials --platform android`

> Note: During development with Expo Go, Google OAuth opens in the system
> browser which then redirects back via the `willow://` deep link scheme.
> This works without the SHA-1 during testing.

---

## Testing

After setup, the **Sign in with Google** / **Sign up with Google** button
on both web and mobile will open Google's consent screen.

- **New users** are redirected to a "Who are you coordinating care for?" screen
- **Returning users** go straight to the dashboard

---

## Troubleshooting

| Error | Fix |
|---|---|
| `redirect_uri_mismatch` | Make sure the Supabase callback URL exactly matches what's in Google Console |
| `Error 400: invalid_request` | Check the redirect URLs in Supabase Authentication → URL Configuration |
| Mobile: browser doesn't redirect back | Make sure `willow://` is in Supabase redirect URLs |
| New user lands on dashboard with no profile | Check `/auth/callback` route is deployed on Vercel |
