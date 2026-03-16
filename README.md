# 🌿 Willow — Special Needs Care Coordination App

A compassionate care coordination platform for special needs families and care teams. Powered by Google Gemini AI acting as a BCBA-guided analyst.

---

## ✨ Features

- **Daily Care Logs** — Track mood (1–10), sleep hours, medications, and behavior notes
- **Real-time Dashboard** — Live log feed via Supabase realtime subscriptions
- **AI Insight Panel** — Gemini 1.5 Flash analyzes the last 7 days like a compassionate BCBA
- **Care Team Access** — Multiple caregivers can be linked to one profile with role-based permissions
- **WCAG AA Accessible** — High-contrast, keyboard-navigable, screen-reader friendly

---

## 🗂 Project Structure

```
willow/
├── backend/          # FastAPI Python backend
├── frontend/         # Next.js 14 App Router frontend
└── supabase/
    └── schema.sql    # Run this in Supabase SQL Editor
```

---

## 🚀 Setup Guide

### Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Navigate to **SQL Editor → New Query**.
3. Paste and run the contents of `supabase/schema.sql`.
4. Go to **Settings → API** and copy your:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Authentication → Settings** and enable **Email/Password** sign-ins.
6. Go to **Database → Replication** and enable realtime for the `logs` table.

### Step 2 — Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API key** (free tier available).
3. Copy the key → `GEMINI_API_KEY`

### Step 3 — Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp ../.env.example .env
# Edit .env and fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY

# Run the server
uvicorn main:app --reload --port 8000
```

Backend will be running at: http://localhost:8000
API docs: http://localhost:8000/docs

### Step 4 — Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp ../.env.example .env.local
# Edit .env.local and fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL

# Run the development server
npm run dev
```

Frontend will be running at: http://localhost:3000

---

## 🔑 Environment Variables Reference

### `backend/.env`
| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `GEMINI_API_KEY` | Google AI Studio |

### `frontend/.env.local`
| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` (dev) |

---

## 🏗 Architecture Overview

```
Browser (Next.js)
    │
    ├── Supabase JS Client ──────► Supabase (Auth + DB + Realtime)
    │         ▲
    │    (realtime logs subscription)
    │
    └── fetch() ─────────────────► FastAPI (localhost:8000)
                                        │
                                        └── Google Gemini API
                                            (BCBA analysis)
```

---

## 🩺 AI Analysis Details

The `/analyze` endpoint sends structured log data to Gemini 1.5 Flash with a **BCBA (Board Certified Behavior Analyst)** system prompt. The model returns:

1. **Overview** — Plain-language summary of the week
2. **Pattern Analysis** — Mood/sleep correlations, behavioral trends, medication patterns
3. **Suggested Adjustments** — 3–6 actionable, empathy-first recommendations

> ⚠️ AI insights are supportive tools only. Always consult qualified medical professionals for clinical decisions.

---

## ♿ Accessibility

- WCAG AA color contrast ratios throughout
- All interactive elements are keyboard-navigable
- ARIA labels on all icons, forms, and dynamic regions
- `aria-live` regions for real-time log feed and AI results
- `aria-busy` on loading states
- Mobile-responsive (320px–desktop)

---

## 🧩 Adding More Caregivers to a Profile

Run this SQL in Supabase to grant access (replace IDs):

```sql
INSERT INTO public.caregiver_access (profile_id, user_id, role)
VALUES ('your-profile-uuid', 'new-caregiver-user-uuid', 'editor');
```

Roles: `owner` | `editor` | `viewer`

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Lucide React |
| Backend | FastAPI, Python 3.11+ |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| AI | Google Gemini 1.5 Flash |
| Fonts | Playfair Display + DM Sans |
