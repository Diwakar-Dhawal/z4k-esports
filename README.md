# Z4K Esports Platform

One app, three experiences: a public esports site, a player dashboard, and a staff control room — everything editable from the website, no code changes needed for new people, quotes, or tournaments.

## Stack

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS v4**
- **Supabase** — Postgres + Google OAuth + Storage + **Row Level Security** (role enforcement lives in the database, not just the UI)
- **Vercel** — hosting

## Features

| Area | What you get |
|---|---|
| Public site | Hero with editable taglines, rotating motivational quotes, About Team grouped by editable categories, tournaments split into Upcoming / Ongoing / Past |
| Tournaments | Per-tournament team size + substitutes + slot cap, registration windows, entry fee + UPI note, markdown rules, YouTube live embed (ongoing) / VOD link (past), winner results + photo gallery, status derived from dates with manual override |
| Registration | Google login → team form (per-player IGN + BGMI UID, presets) → transactional RPC with duplicate guards → instant or manager-reviewed approval → WhatsApp group + prefilled wa.me message |
| Anti-duplicate | One registration per user, per WhatsApp number, and per game UID within a tournament (hard, DB-enforced); duplicate IGNs flagged for review |
| Public slot list | Live approved-teams grid + capacity bar on every tournament page |
| Captain's Room | Room ID/password revealed only to approved captains after the reveal time (RLS-enforced) |
| Dashboard | Profile + WhatsApp, team presets CRUD, my registrations with statuses |
| Control room | Tournament CRUD + archive (never hard delete), review queue with payment tracking, content editor, team page editor, templates, role assignment (admin only), CSV export, audit log |
| Roles | **Admin** (everything incl. delete + roles) · **Manager** (create/edit tournaments, results, approvals, content — no delete) · **User** (register + presets) |

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run the whole of [`supabase/schema.sql`](./supabase/schema.sql). It creates every table, constraint, RLS policy, RPC, storage bucket, and seed data (sample BGMI tournament, template, roster, quotes).
3. Authentication → Providers → **Google**: enable it and paste your OAuth client ID/secret (next step).
4. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (later your production URL)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and your production callback.

### 2. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → create a project → OAuth consent screen (External) → Credentials → **OAuth Client ID** (Web application).
2. Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Paste the client ID/secret into Supabase's Google provider settings.

### 3. Environment

```bash
cp .env.example .env.local
# fill from Supabase → Settings → API
```

### 4. Run

```bash
npm install
npm run dev
```

### 5. Bootstrap your admin (one time)

Sign in with Google once, then in Supabase SQL Editor:

```sql
update public.users set role = 'admin' where email = 'you@gmail.com';
```

Promote managers the same way, or from **Control Room → Users** once you're admin.

## Deploying

- Push to GitHub → import in Vercel → add the two `NEXT_PUBLIC_SUPABASE_*` env vars.
- Update Supabase Site URL + redirect URLs + Google redirect URI to your production domain (do this early — changing OAuth redirects later is annoying).

## Operational notes

- **Backups**: Supabase's free tier has no automatic backups. Once registrations are real, schedule a weekly `pg_dump` or storage export.
- **WhatsApp**: messaging is deliberately manual (group links + wa.me deep links). Automating messages requires a Meta-approved template + BSP (AiSensy/WATI) — Phase 2.
- **Manager permission boundary**: managers cannot delete tournaments or change roles; both are enforced by RLS policies, so even a forged request fails at the database.

## Phase 2 / 3 ideas

OTP verification of WhatsApp numbers, automated WhatsApp messaging, payment gateway, brackets + points tables, player stats / Hall of Fame, Discord integration, UID screenshot uploads with OCR.
