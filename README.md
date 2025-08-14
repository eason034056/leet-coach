# LeetCoach

Spaced-repetition coach for LeetCode. Add problems, review with SM2 scheduling, track mistakes and progress — secured by Supabase RLS.

Status: Beta · Deploy target: Vercel · DB/Auth: Supabase

## TL;DR
- Problem: It’s hard to retain LeetCode patterns; practice is inconsistent and feedback is unstructured.
- Solution: A per-user spaced-repetition system (SM2-like) tailored for coding interview problems with tagging and analytics.
- What you get: daily review queue, self‑grading (Q 0–5), error tagging, charts/heatmap, email + web push reminders.
- Tech: Next.js 15 (App Router), React 19, Supabase (Auth/Postgres/RLS), Tailwind 4, Recharts, Zod, Resend, Web Push.

## Features
- Add LeetCode problems by URL, auto‑derive slug/title, tag and set difficulty
- Review queue with SM2-based scheduling (per‑user cards) and Q 0–5 self‑grading
- Error types logging (Logic/Edge Case/Complexity/etc.) and notes
- Dashboard: streak, 7‑day activity chart, error breakdown, 30‑day heatmap
- Library: search/filter by title/tags; quick open/delete
- Reports: weekly summary, top tags by fail rate and time spent
- Daily reminders via Email (Resend) and Web Push (VAPID)
- Supabase RLS: strict per‑user data isolation
- Auth: email magic link + GitHub OAuth

## Screenshots
Add 2–4 images or GIFs here once available, e.g. `docs/dashboard.png`, `docs/review.gif`.

## Tech Stack
- Frontend: Next.js 15, React 19, Tailwind CSS 4, App Router
- Backend: Next.js Route Handlers, Supabase (Auth/Postgres/RLS)
- Scheduling: SM2 variant (`lib/sm2.ts`), Vercel Cron (`vercel.json`) or external
- Notifications: Resend (email), Web Push (`web-push` + VAPID)
- Validation & Charts: Zod, Recharts

## Architecture
```mermaid
graph TD
  A[Client (Next.js App)] --> B[/Route Handlers /api/*/]
  B --> C[(Supabase Postgres)]
  B --> D[Supabase Auth]
  B --> E[Resend (Email)]
  B --> F[Web Push (VAPID)]
  G[Vercel Cron / External Cron] --> B
```

## Setup
Prerequisites
- Node.js 20+
- A Supabase project (URL and anon key)
- Resend API key and from email (for emails)
- VAPID key pair (for Web Push)

1) Clone and install
```bash
git clone https://github.com/yourname/leetcoach.git
cd leetcoach
npm install
```

2) Environment variables (.env.local)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Service role key is used server-side for cron job aggregation
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL (used in emails/links)
APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your_resend_key
FROM_EMAIL=LeetCoach <no-reply@yourdomain.com>

# Web Push (VAPID)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@yourdomain.com

# Cron auth (protects /api/cron/daily)
CRON_SECRET=some-strong-secret
```

Generate VAPID keys (example):
```bash
npx web-push generate-vapid-keys
```

3) Create database schema
- Open Supabase SQL editor and run `schema.sql` (tables: `problems`, `cards`, `reviews`, `push_subscriptions`; RLS policies included)

4) Run the app
```bash
npm run dev
# open http://localhost:3000 and sign in (magic link or GitHub)
```

## Usage
- Add Problem: paste a LeetCode URL; title/slug auto‑parsed; set difficulty/tags
- Review: use timer, pick result and Q (0–5), tag error types, add short notes; submit schedules the next review
- Dashboard: monitor due count, streak, activity, and error breakdown
- Library: search and manage saved problems
- Reports: see weekly stats, top tags by fail rate and time spent

## API
All endpoints require authenticated Supabase session cookies.

- POST `/api/problems`
  - body: `{ url, title, difficulty: "Easy|Medium|Hard", tags: string[] }`
  - upserts problem and ensures a per‑user card exists

- GET `/api/problems`
  - returns `{ problems: [...] }` with joined `card`

- DELETE `/api/problems/[id]`

- GET `/api/review-queue?date=YYYY-MM-DD`
  - returns `{ items: [{ id: cardId, problem: {...} }] }` due on or before date

- POST `/api/reviews`
  - body: `{ cardId, result: "pass|fail|partial", q: 0..5, durationSec, errorTypes: string[], notes? }`
  - writes review and updates card via SM2 schedule

- GET `/api/reviews?from=ISO&to=ISO`

- POST `/api/push/subscribe`
  - body: `{ endpoint, keys: { p256dh, auth } }` stores Web Push subscription

- POST `/api/cron/daily`
  - headers: `x-cron-key: $CRON_SECRET`
  - aggregates per‑user due stats, sends email (Resend) and Web Push

Example curl
```bash
curl -X POST http://localhost:3000/api/problems \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://leetcode.com/problems/two-sum/","title":"Two Sum","difficulty":"Easy","tags":["Array","HashMap"]}'
```

## Scheduling
- Production: `vercel.json` includes a cron entry hitting `/api/cron/daily`
```json
{
  "crons": [
    { "path": "/api/cron/daily", "schedule": "5 16 * * *" }
  ]
}
```
- Local options:
  - trigger manually: `curl -X POST "$APP_URL/api/cron/daily" -H "x-cron-key: $CRON_SECRET"`
  - or run your own scheduler to call the same endpoint daily

## Scheduling logic (SM2 variant)
See `lib/sm2.ts`.
- If `q < 3`: reset repetitions to 0, next interval = 1 day, lower ease factor
- Else: grow interval by ease factor; increment repetitions and adjust ease factor
- Difficulty/tag tweaks: reduce interval for `Hard` and `Graph`-tagged problems

## Security & Privacy
- Row Level Security (RLS) enforced on all tables; policies restrict access to `auth.uid()`
- Auth via Supabase (email OTP and GitHub OAuth)
- Secrets via environment variables; never checked into source

## Roadmap
- Import problems from LeetCode CSV/API
- More presets for error types and insights
- PWA polish and mobile UX
- Data export (CSV/JSON)
- Internationalization (i18n)

## License
No license specified yet.

## Contact
Yu-Sen (Eason) Wu · [LinkedIn](www.linkedin.com/in/yu-sen-wu) · yu-senwu2026@u.northwestern.edu

