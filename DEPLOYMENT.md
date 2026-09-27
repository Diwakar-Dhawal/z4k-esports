# Deploying Z4K Esports to Vercel

The stack is Next.js 15 (App Router) + Supabase, with Vercel as the host. Total time: ~30 minutes the first time.

## 0. Prerequisites

- A GitHub repo with this code pushed
- A Supabase project with the schema + migrations applied (see [README → Setup](./README.md#1-supabase))
- A Google OAuth client (see [README → Google OAuth](./README.md#2-google-oauth))
- Your final domain (e.g. `z4kesports.in`) — decide it now, OAuth redirects depend on it

## 1. Deploy to Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. Framework preset: **Next.js** (auto-detected). Build command and output are defaults — don't override.
3. Before the first deploy, add **Environment Variables** (Project → Settings → Environment Variables). Add the same values for *Production*, *Preview*, and *Development*:

   | Name | Value | Where it comes from |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon/public) | Supabase → Settings → API |
   | `HL_GAMING_DEV_UID` | your dev UID | hlgamingofficial.com developer portal |
   | `HL_GAMING_API_KEY` | your secret key | hlgamingofficial.com developer portal |

   > The two `NEXT_PUBLIC_*` vars are safe to expose (that's their design — they're public client config). The `HL_GAMING_*` pair is read **server-side only**; never prefix them with `NEXT_PUBLIC_`.

4. **Deploy.** First build takes a few minutes.

## 2. Point the domain

1. Vercel → Project → **Settings → Domains** → add your domain (e.g. `z4kesports.in` and `www.z4kesports.in`).
2. At your registrar, add the records Vercel shows (usually `A 76.76.21.21` for the apex and a `CNAME → cname.vercel-dns.com` for `www`).
3. Wait for the certificate (automatic, usually minutes).
4. In Vercel's domain settings, redirect `www` → apex (or vice versa) so there's exactly one canonical URL.

## 3. Re-wire Supabase auth to production

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://z4kesports.in`
- **Redirect URLs:** add `https://z4kesports.in/auth/callback`
  - keep `http://localhost:3000/auth/callback` for local dev
  - also add `https://<your-project>.vercel.app/auth/callback` if you'll use preview deployments signed-in

Google Cloud Console → Credentials → your OAuth client:

- **Authorized redirect URIs** — add nothing new; the callback is Supabase's, and it hasn't changed. But if your Supabase project URL differs per environment, make sure the URI `https://<ref>.supabase.co/auth/v1/callback` is present.
- **Authorized JavaScript origins** — add `https://z4kesports.in` (and the vercel.app domain if used).

## 4. Harden before real users

- [ ] **Delete the demo accounts** (`z4k.admin.demo@gmail.com`, `z4k.manager.demo@gmail.com`, `z4k.user.demo@gmail.com`) — Control Room → Users as admin, or SQL: `delete from auth.users where email like '%demo%';`
- [ ] **Bootstrap your real admin**: sign in with Google on production, then `update public.users set role='admin' where email='you@gmail.com';`
- [ ] Supabase → Authentication → Providers → Email: keep **"Confirm email"** off only if you rely purely on Google login; otherwise enable it.
- [ ] Supabase → Settings → API: never commit the `service_role` key anywhere; this app doesn't need it.
- [ ] Swap demo content (roster names/photos, quotes, landing slides) for real content in Control Room — the demo portraits live in `public/members/` and are wired by `supabase/seed-member-photos.sql`.
- [ ] Take the site out of "tournament season 0": create your first real tournament from a template.

## 5. Post-deploy checklist

1. Sign in with Google on the production domain — must complete the redirect loop.
2. Register a test team as a guest on your test tournament; verify the instant-approve/slot behavior matches the tournament's settings.
3. Upload one image (tournament banner) and confirm it appears on cards + detail page.
4. Promote the tournament through Upcoming → Live → Ended and watch the sections move.
5. Check `/admin/users` as a manager — you should be bounced (admin-only).
6. Open the site on a real phone — drawer, forms, no horizontal scroll.
7. Click any tournament card — the full-surface link should navigate, and the button should land on the registration (or results) section, not the top of the page.
8. Click sidebar links and watch for the loading overlay — it should appear instantly and clear after navigation (never stuck; 6 s failsafe).
9. Spot-check headings on a mid-size viewport (~768 px): type should scale smoothly, no jump between breakpoints.

## Updating the app

- Push to `main` → Vercel auto-deploys to production.
- Open a PR → Vercel creates an isolated **preview deployment** per commit (safe to try risky changes; the only shared state is the Supabase project).
- Schema changes: run new migrations in the Supabase SQL Editor **before/with** the deploy that needs them (keep migrations additive when possible).

## Operational notes

- **Region**: for an India-focused org, set the Vercel project's function region to `bom1` (Mumbai) — Project → Settings → Functions — and pick a Supabase region close to your players. Lower latency on every RPC.
- **Bandwidth/storage**: Vercel free tier includes generous bandwidth; Supabase free tier includes ~1 GB storage and ~5 GB egress. Uploaded images count against Supabase, not Vercel — the app already purges uploads when their row is deleted.
- **Backups**: free-tier Supabase has none. Once real registrations exist, schedule weekly `pg_dump`s (Supabase → Database → Backups is paid; a GitHub Action with `pg_dump` + storage export works on free).
