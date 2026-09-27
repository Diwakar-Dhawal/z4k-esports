# Z4K Esports Platform

One app, three experiences: a public esports site, a player dashboard, and a staff control room — everything editable from the website, no code changes needed for new people, quotes, tournaments, or landing imagery.

## Stack

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS v4**
- **Supabase** — Postgres + Google OAuth + Storage + **Row Level Security** (role enforcement lives in the database, not just the UI)
- **Vercel** — hosting

## Features

### Public site
- Hero slideshow of game key art running **behind** "Forge Your Legend", fully database-driven (`landing_slides` — upload/URL, tagline, sort order, show/hide from Control Room → Content)
- Rotating motivational quotes, hero taglines and page copy — all editable in Control Room → Content
- **Dedicated pages**: `/team`, `/tournaments`, `/profile` (no hash-link shortcuts)
- Sidebar navigation on desktop; hamburger (right side) opens a slide-in drawer on mobile

### Tournaments
- Per-tournament team size, substitutes, slot cap, entry fee + UPI note, markdown rules, WhatsApp group link
- **Stage model**: Upcoming (coming soon) → Live now (YouTube embed) → Ended (results & photos, slots hidden). Derives automatically from dates, or promote instantly with one-click stage buttons in the editor. **Ended hard-closes registration at the database level** regardless of registration dates.
- Generated esports banner art per tournament (deterministic, color-themed) used as fallback whenever no banner is uploaded — cards, detail hero, admin list
- Past tournaments: placements with prizes, **per-placement winner-team images**, individual **custom-titled awards** (Field Medic, Best Assaulter, MVP — anything), player photos with names, event photo gallery, VOD link

### Registration
- **Guest-friendly**: anyone can register (captain name + WhatsApp); login just adds presets and the Captain's Room
- Per-player IGN + BGMI UID, roles, team presets for logged-in users
- **BGMI UID verification** via the HL Gaming API (server-side proxy, keys never reach the browser, rate-limited, cached). Graceful degradation: retry button, manual review fallback. Optional per-tournament gate: *require verified UIDs for instant approval*
- **Anti-duplicate, DB-enforced**: one registration per WhatsApp number, per UID, per user account; duplicate IGNs flagged for staff review
- **Auto-approve mode**: instant slot granting through a Postgres transactional advisory lock — proven race-safe (N simultaneous submissions for M slots yield exactly M wins, zero overbooking)
- Duplicate error messages are clean and specific (which number/UID collided)

### Player experience
- Dashboard: team presets CRUD, my registrations with statuses and tournament thumbnails, profile link
- Profile page: emblem/avatar, role badge, editable details
- Captain's Room: room ID/password revealed only to approved captains after reveal time (RLS-enforced)

### Control room (staff)
- **Roles**: Admin (everything, incl. delete + role management) · Manager (create/edit tournaments, results, awards, approvals, content, team page — no delete, no role management, no Users tab) · User (register + presets)
- Tournaments: create from templates, full editor with stage panel, archive (never hard-delete), banner upload
- Registrations: review queue with payment tracking, approve/reject, CSV export
- Content: quotes, taglines, page blocks, and the landing games carousel (upload/URL)
- Team Page: editable categories, members with photo upload (upload or URL), name, tag, role title, socials, bio, visibility
- **Users tab: admin-only** — hidden in nav *and* server-guarded (managers are redirected), on top of RLS that blocks role changes
- Audit log of staff actions

### Navigation & loading UX
- **Instant click feedback**: a themed full-screen spinner overlay appears the moment any in-app link is clicked (`NavLoader`, portal-rendered so it covers sidebar *and* content links), with a 6 s failsafe so it can never get stuck over the page
- **Route-level loading UI** (`src/app/loading.tsx`) keeps server segment re-renders (navigation and query-param changes) from ever feeling dead during slow DB round-trips
- **Hash-link scrolling that works**: `HashScroll` re-triggers smooth anchor scrolling after async content mounts — deep links like `#results` or `#registration` land correctly even when the target renders in a second hydration pass
- **Whole card is clickable**: tournament cards are wrapped in a full-surface link; the button deep-links to `#registration` (or `#results` for completed events), and anchor targets carry `scroll-mt` so the fixed sidebar never covers them
- **Fluid type scale**: root font-size and all headings scale continuously with the viewport (`clamp()` in `globals.css`) — no more breakpoint jumps between mobile/tablet/desktop; long words and emails wrap instead of overflowing

### Polish
- All destructive/important actions use themed dark modals — no native `confirm()`/`alert()` anywhere (deletes, archive, role changes, category removal)
- Every modal Edit/Add flow opens centered (member editor, slide editor, etc.)
- **Storage hygiene**: deleting a member, award, result image, or gallery photo purges the uploaded file from Supabase Storage (external URLs untouched); tournament archive is intentionally reversible
- **Honest sign-in**: the login page is Google-first; email/password is labeled "staff sign-in" and creates no accounts (sign-up flow removed)
- Mobile-optimized: 16px inputs (no iOS zoom), touch-sized controls, 16:9 carousels, capped-height hero/carousel banners (220→340px, responsive), single-column grids, no horizontal overflow at 390px

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run the schema and migrations **in this exact order**:

   | # | File | Purpose |
   |---|---|---|
   | 1 | [`supabase/schema.sql`](./supabase/schema.sql) | Base schema: tables, RLS, storage buckets, seed data |
   | 2 | [`supabase/migration-autoapprove.sql`](./supabase/migration-autoapprove.sql) | UID-verification columns, guest registration, `site_media`, `require_verified_uids`, race-safe `register_team` (supersedes the older uid-verify and guest migrations — fresh installs can skip those) |
   | 3 | [`supabase/hotfix-uid-verified.sql`](./supabase/hotfix-uid-verified.sql) | Drops **all** `register_team` overloads and recreates the single final version (fixes PostgREST `PGRST203` ambiguity if migrations stacked) |
   | 4 | [`supabase/migration-awards-cleanup.sql`](./supabase/migration-awards-cleanup.sql) | `tournament_awards` table, `results.image_url`, policies |
   | 5 | [`supabase/hotfix-ended-closes.sql`](./supabase/hotfix-ended-closes.sql) | `register_team` rejects ended tournaments regardless of registration dates |
   | 6 | [`supabase/migration-landing-slides.sql`](./supabase/migration-landing-slides.sql) | `landing_slides` table + seeds the six starter game slides |

   [`seed-member-photos.sql`](./supabase/seed-member-photos.sql) is optional demo content (wires the bundled demo portraits to the roster).

   > **Note:** the `supabase/` directory is tracked in git — every `.sql` file referenced above ships with the repo. `migration-guest-registration.sql` and `migration-uid-verify.sql` are kept only as historical references; fresh installs should follow the table order.

3. Authentication → Providers → **Google**: enable and paste your OAuth client ID/secret.
4. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (later your production URL)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and your production callback.

### 2. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → OAuth consent screen (External) → Credentials → **OAuth Client ID** (Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Paste the client ID/secret into Supabase's Google provider settings.

### 3. Environment

```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase → Settings → API
# HL_GAMING_DEV_UID / HL_GAMING_API_KEY — hlgamingofficial.com developer portal (server-only; blank = verification soft-off)
```

Restart the dev server after editing env — values are read at boot.

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

Promote managers from **Control Room → Users** (admin-only).

### Demo accounts

The seed data creates one account per role:

| Role | Email | Password |
|---|---|---|
| Admin | `z4k.admin.demo@gmail.com` | `Z4kDemo!2026` |
| Manager | `z4k.manager.demo@gmail.com` | `Z4kDemo!2026` |
| User | `z4k.user.demo@gmail.com` | `Z4kDemo!2026` |

**Delete these before going live** (Control Room → Users, or `delete from auth.users where email like '%demo%'` in the SQL Editor). Deployment docs: [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Code map (UI shell)

Where the shared experience lives, for when you're editing layout-level behavior:

| File | Role |
|---|---|
| `src/app/layout.tsx` | Mounts sidebar, footer, `HashScroll` + `NavLoader` (in a `Suspense` boundary) |
| `src/components/site-sidebar.tsx` | Desktop rail + mobile drawer; sign-in button for guests, profile block for signed-in users |
| `src/components/nav-loader.tsx` | Global click-spinner overlay (portal, 6 s failsafe) |
| `src/components/hash-scroll.tsx` | Re-scrolls to `#hash` after async content renders |
| `src/app/loading.tsx` | Route-level loading spinner for server segments |
| `src/components/tournament-card.tsx` | Whole-card link wrapper + `#registration` / `#results` deep links |
| `src/components/esports-art.tsx` | `TournamentThumb` — generated SVG banner art, `fill` mode for capped heroes |
| `src/app/globals.css` | Fluid root font-size + fluid `h1`–`h3` scale (`clamp()`), container + touch-target rules |

## Testing

`scripts/e2e-test.sh` is an end-to-end suite that authenticates as the manager demo account, creates a scratch auto-approve tournament, and verifies:
1. Guest registration with instant slot grant
2. Duplicate-WhatsApp rejection
3. Duplicate-UID rejection
4. Missing-guest-name rejection
5. **Race condition**: 8 simultaneous registrations for the last 2 slots → exactly 2 wins, 6 clean "FULL" rejections, zero overbooking

It cleans up after itself (scratch tournament + registrations are deleted). Requires the demo accounts to exist. Note the HL Gaming verify API is third-party — if their upstream is down, UID checks degrade to manual review (by design).

## Deploying

- Push to GitHub → import in Vercel → add the two `NEXT_PUBLIC_SUPABASE_*` env vars (and the two `HL_GAMING_*` ones).
- Update Supabase Site URL + redirect URLs + Google redirect URI to your production domain (do this early — changing OAuth redirects later is annoying).

## Operational notes

- **Backups**: Supabase's free tier has no automatic backups. Once registrations are real, schedule a weekly `pg_dump` or storage export.
- **Storage budget**: free tier has ~1 GB. Uploads are purged automatically when their row is deleted; use "Compress before upload" where possible, and prefer the generated art when you don't have real media.
- **WhatsApp**: messaging is deliberately manual (group links + wa.me deep links). Automating messages requires a Meta-approved template + BSP (AiSensy/WATI) — Phase 2.
- **Permission boundaries**: managers cannot delete tournaments, manage users, or change roles — all enforced by RLS policies, so even a forged request fails at the database.
- **Stage semantics**: registration is controlled by the *effective stage* — Ended hard-closes entries; Live still accepts them (late registration during a live event is intentional). Set the registration window dates to control flow within Upcoming.

## Phase 2 / 3 ideas

OTP verification of WhatsApp numbers, automated WhatsApp messaging, payment gateway, brackets + points tables, player stats / Hall of Fame, Discord integration, UID screenshot uploads with OCR.
