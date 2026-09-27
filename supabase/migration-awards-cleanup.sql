-- ============================================================================
-- Z4K ESPORTS — Migration: individual awards + result images
-- Run once in the SQL Editor. Safe to re-run.
-- ============================================================================

-- 1) Per-placement image (winner team photo etc.) ----------------------------
alter table public.tournament_results
  add column if not exists image_url text;

-- 2) Individual performances / custom awards ---------------------------------
-- title is free text: "Field Medic", "Best Assaulter", "Rising Star", …
create table if not exists public.tournament_awards (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  title text not null,                -- custom award/role name
  player_name text not null,
  team_name text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tournament_awards enable row level security;

create policy tournament_awards_read on public.tournament_awards for select using (true);
create policy tournament_awards_staff on public.tournament_awards for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
