-- ============================================================================
-- Z4K ESPORTS — Migration: landing slides (games carousel, editable in admin)
-- Run once in the SQL Editor. Safe to re-run. Seeds the current defaults.
-- ============================================================================

create table if not exists public.landing_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tagline text not null default '',
  image_url text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.landing_slides enable row level security;

create policy landing_slides_read on public.landing_slides for select using (true);
create policy landing_slides_staff on public.landing_slides for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

insert into public.landing_slides (title, tagline, image_url, sort_order) values
  ('Battlegrounds Mobile India', 'BGMI · Battle Royale', '/games/bgmi.jpg', 0),
  ('Valorant', 'Tactical FPS · 5v5', '/games/valorant.jpg', 1),
  ('Counter-Strike 2', 'Tactical FPS · 5v5', '/games/csgo.jpg', 2),
  ('Call of Duty: Mobile', 'CODM · Multiplayer', '/games/codm.jpg', 3),
  ('Free Fire MAX', 'Battle Royale', '/games/freefire.jpg', 4),
  ('eFootball', 'Sports · 1v1', '/games/efootball.jpg', 5)
on conflict do nothing;
