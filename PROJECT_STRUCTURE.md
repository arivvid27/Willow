# Willow — Special Needs Care Coordination App

## File Structure

```
willow/
├── README.md
├── .env.example
│
├── backend/                        # FastAPI Python backend
│   ├── main.py                     # FastAPI app, routes, CORS
│   ├── models.py                   # Pydantic models
│   ├── ai_service.py               # Gemini AI integration
│   ├── supabase_client.py          # Supabase client setup
│   ├── requirements.txt
│   └── .env                        # Backend env vars
│
└── frontend/                       # Next.js 14 App Router
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── next.config.ts
    ├── .env.local                   # Frontend env vars
    │
    ├── app/
    │   ├── layout.tsx               # Root layout
    │   ├── page.tsx                 # Home → redirects to /dashboard
    │   ├── globals.css
    │   │
    │   ├── (auth)/
    │   │   ├── login/page.tsx       # Login page
    │   │   └── signup/page.tsx      # Signup page
    │   │
    │   └── dashboard/
    │       ├── layout.tsx           # Dashboard shell (sidebar)
    │       ├── page.tsx             # Dashboard home / log feed
    │       ├── log/page.tsx         # New daily log form
    │       └── insights/page.tsx    # AI insights panel
    │
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── LogForm.tsx
    │   ├── LogCard.tsx
    │   ├── InsightCard.tsx
    │   ├── MoodBadge.tsx
    │   └── LoadingSpinner.tsx
    │
    ├── lib/
    │   ├── supabase.ts              # Supabase browser client
    │   ├── api.ts                   # FastAPI fetch helpers
    │   └── types.ts                 # Shared TypeScript types
    │
    └── supabase/
        └── schema.sql               # Database schema for Supabase
```
