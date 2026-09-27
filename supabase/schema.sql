-- ============================================================================
-- Z4K ESPORTS — Supabase schema
-- Run this whole file in the Supabase SQL Editor (or supabase db push).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'manager', 'user');
create type registration_status as enum ('pending', 'approved', 'rejected');
create type payment_status as enum ('unpaid', 'pending_review', 'paid');
create type content_kind as enum ('quote', 'tagline', 'block');
create type room_scope as enum ('tournament', 'match');

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'user',
  whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- member_categories / team_members (About Team page)
-- ---------------------------------------------------------------------------
create table public.member_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.member_categories(id) on delete restrict,
  name text not null,
  tag text,
  role_title text,
  bio text,
  photo_url text,
  socials jsonb not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tournament_templates
-- ---------------------------------------------------------------------------
create table public.tournament_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game text not null,
  team_size int not null,
  substitutes_max int not null default 1,
  max_teams int not null default 25,
  entry_fee_inr numeric(10,2) not null default 0,
  auto_approve boolean not null default false,
  rules_md text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tournaments
-- ---------------------------------------------------------------------------
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  game text not null,
  description text,
  team_size int not null default 4,
  substitutes_max int not null default 1,
  max_teams int not null default 25,
  entry_fee_inr numeric(10,2) not null default 0,
  upi_note text,
  registration_starts_at timestamptz,
  registration_ends_at timestamptz,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  status_override text null check (status_override in ('upcoming','ongoing','completed')),
  auto_approve boolean not null default false,
  rules_md text not null default '',
  youtube_live_id text,
  vod_url text,
  hero_image_url text,
  whatsapp_group_link text,
  manager_contact text,
  template_id uuid references public.tournament_templates(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tournaments_status_idx on public.tournaments (event_starts_at, event_ends_at);

create table public.room_credentials (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  scope room_scope not null default 'tournament',
  label text not null default 'Match Room',
  room_id text not null,
  room_password text not null,
  reveal_at timestamptz not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team_name text not null,
  team_tag text,
  whatsapp text not null,
  status registration_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  payment_note text,
  rules_accepted_at timestamptz not null default now(),
  review_note text,
  duplicate_ign boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);
create unique index registrations_whatsapp_unique
  on public.registrations (tournament_id, whatsapp);

create table public.registration_players (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  ign text not null,
  uid text not null,
  player_role text,
  sort_order int not null default 0
);
create index registration_players_uid_idx on public.registration_players (uid);
create index registration_players_ign_idx on public.registration_players (ign);

-- ---------------------------------------------------------------------------
-- team presets (user's saved squads)
-- ---------------------------------------------------------------------------
create table public.team_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  game text,
  created_at timestamptz not null default now()
);

create table public.preset_players (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.team_presets(id) on delete cascade,
  ign text not null,
  uid text not null,
  player_role text,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- results & photos
-- ---------------------------------------------------------------------------
create table public.tournament_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  placement int not null,
  team_name text not null,
  team_tag text,
  prize text,
  notes text,
  unique (tournament_id, placement)
);

create table public.tournament_photos (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- content blocks (quotes, taglines, page copy)
-- ---------------------------------------------------------------------------
create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  kind content_kind not null,
  key text unique,
  body text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  summary text,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at + new user hook + audits
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();
create trigger team_members_touch before update on public.team_members
  for each row execute function public.touch_updated_at();
create trigger tournaments_touch before update on public.tournaments
  for each row execute function public.touch_updated_at();
create trigger registrations_touch before update on public.registrations
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, users.full_name),
        avatar_url = coalesce(excluded.avatar_url, users.avatar_url);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit trigger helper (manager/admin writes)
create or replace function public.audit_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare act text; ent text; eid text; sum text;
begin
  act := tg_op; ent := tg_table_name;
  if (tg_op = 'DELETE') then eid := coalesce(old.id::text, ''); else eid := coalesce(new.id::text, ''); end if;
  if (ent = 'tournaments') then
    if (tg_op = 'DELETE') then sum := old.name; else sum := new.name; end if;
  elsif (ent = 'registrations') then
    if (tg_op = 'DELETE') then sum := old.team_name; else sum := new.team_name; end if;
  elsif (ent = 'content_blocks') then
    if (tg_op = 'DELETE') then sum := coalesce(old.key, old.body); else sum := coalesce(new.key, new.body); end if;
  else
    sum := eid;
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, summary)
  values (auth.uid(), act, ent, eid, sum);
  return coalesce(new, old);
end $$;

create trigger tournaments_audit after insert or update or delete on public.tournaments
  for each row execute function public.audit_write();
create trigger registrations_audit after insert or update or delete on public.registrations
  for each row execute function public.audit_write();
create trigger content_blocks_audit after insert or update or delete on public.content_blocks
  for each row execute function public.audit_write();
create trigger team_members_audit after insert or update or delete on public.team_members
  for each row execute function public.audit_write();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'admin';
$$;

create or replace function public.is_manager_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin','manager');
$$;

create or replace function public.normalize_phone(p text) returns text
language sql immutable as $$
  select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.member_categories enable row level security;
alter table public.team_members enable row level security;
alter table public.tournament_templates enable row level security;
alter table public.tournaments enable row level security;
alter table public.room_credentials enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_players enable row level security;
alter table public.team_presets enable row level security;
alter table public.preset_players enable row level security;
alter table public.tournament_results enable row level security;
alter table public.tournament_photos enable row level security;
alter table public.content_blocks enable row level security;
alter table public.audit_log enable row level security;

-- users: self read/update-limited; admin full; managers can list users
create policy users_select_self_or_staff on public.users for select
  using (id = auth.uid() or public.is_manager_or_admin());
create policy users_update_self on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());
create policy users_admin_all on public.users for all
  using (public.is_admin()) with check (public.is_admin());

-- team page: public read, staff write
create policy member_categories_public_read on public.member_categories for select using (true);
create policy member_categories_staff_write on public.member_categories for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
create policy team_members_public_read on public.team_members for select using (true);
create policy team_members_staff_write on public.team_members for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- templates: staff full
create policy tournament_templates_staff on public.tournament_templates for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- tournaments: public read (non-archived), staff write
create policy tournaments_public_read on public.tournaments for select
  using (archived_at is null or public.is_manager_or_admin());
create policy tournaments_staff_write on public.tournaments for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- room credentials: staff write; select gated by approved captain OR staff
create policy room_credentials_select on public.room_credentials for select
  using (
    public.is_manager_or_admin()
    or exists (
      select 1 from public.registrations r
      where r.tournament_id = room_credentials.tournament_id
        and r.user_id = auth.uid()
        and r.status = 'approved'
    )
  );
create policy room_credentials_staff_write on public.room_credentials for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- registrations: captains see own; staff see all; users can't self-write via tables (RPC only)
create policy registrations_select on public.registrations for select
  using (user_id = auth.uid() or public.is_manager_or_admin());
create policy registrations_staff_write on public.registrations for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

create policy registration_players_select on public.registration_players for select
  using (
    exists (
      select 1 from public.registrations r
      where r.id = registration_players.registration_id
        and (r.user_id = auth.uid() or public.is_manager_or_admin())
    )
  );
create policy registration_players_staff_write on public.registration_players for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- presets: owner only
create policy team_presets_owner on public.team_presets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy preset_players_owner on public.preset_players for all
  using (
    exists (
      select 1 from public.team_presets tp
      where tp.id = preset_players.preset_id and tp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.team_presets tp
      where tp.id = preset_players.preset_id and tp.user_id = auth.uid()
    )
  );

-- results & photos: public read, staff write
create policy tournament_results_read on public.tournament_results for select using (true);
create policy tournament_results_staff on public.tournament_results for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
create policy tournament_photos_read on public.tournament_photos for select using (true);
create policy tournament_photos_staff on public.tournament_photos for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- content: public read active, staff write
create policy content_blocks_read on public.content_blocks for select
  using (is_active or public.is_manager_or_admin());
create policy content_blocks_staff on public.content_blocks for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- audit log: admin read-only
create policy audit_log_admin_read on public.audit_log for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- register_team RPC — transactional registration with duplicate guard
-- ---------------------------------------------------------------------------
create or replace function public.register_team(
  p_tournament_id uuid,
  p_team_name text,
  p_team_tag text,
  p_whatsapp text,
  p_players jsonb,  -- [{ign, uid, player_role}]
  p_agree_rules boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tournament public.tournaments;
  v_registration uuid;
  v_player jsonb;
  v_now timestamptz := now();
  v_status registration_status;
  v_whatsapp text := public.normalize_phone(p_whatsapp);
  v_existing_whatsapp uuid;
  v_existing_ign uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_agree_rules is not true then
    raise exception 'RULES_NOT_ACCEPTED';
  end if;
  if length(v_whatsapp) < 10 then
    raise exception 'INVALID_WHATSAPP';
  end if;

  select * into v_tournament from public.tournaments
  where id = p_tournament_id and archived_at is null
  for update;
  if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;

  -- registration window
  if v_tournament.registration_starts_at is not null and v_now < v_tournament.registration_starts_at then
    raise exception 'NOT_OPEN_YET';
  end if;
  if v_tournament.registration_ends_at is not null and v_now > v_tournament.registration_ends_at then
    raise exception 'CLOSED';
  end if;

  -- capacity: count non-rejected registrations
  if (
    select count(*) from public.registrations
    where tournament_id = p_tournament_id and status <> 'rejected'
  ) >= v_tournament.max_teams then
    raise exception 'FULL';
  end if;

  -- one registration per user per tournament
  if exists (
    select 1 from public.registrations
    where tournament_id = p_tournament_id and user_id = v_user
  ) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  -- one registration per WhatsApp number per tournament
  select id into v_existing_whatsapp from public.registrations
  where tournament_id = p_tournament_id and whatsapp = v_whatsapp limit 1;
  if v_existing_whatsapp is not null then
    raise exception 'DUPLICATE_WHATSAPP';
  end if;

  -- validate players
  if p_players is null or jsonb_array_length(p_players) < v_tournament.team_size then
    raise exception 'TOO_FEW_PLAYERS';
  end if;
  if jsonb_array_length(p_players) > v_tournament.team_size + v_tournament.substitutes_max then
    raise exception 'TOO_MANY_PLAYERS';
  end if;

  for v_player in select * from jsonb_array_elements(p_players) loop
    if coalesce(v_player->>'ign', '') = '' then raise exception 'MISSING_IGN'; end if;
    if coalesce(v_player->>'uid', '') !~ '^[0-9]{5,12}$' then raise exception 'INVALID_UID'; end if;
  end loop;

  -- duplicate UID inside this tournament (across teams)
  for v_player in select * from jsonb_array_elements(p_players) loop
    if exists (
      select 1
      from public.registration_players rp
      join public.registrations r on r.id = rp.registration_id
      where r.tournament_id = p_tournament_id
        and rp.uid = v_player->>'uid'
        and r.status <> 'rejected'
    ) then
      raise exception 'DUPLICATE_UID:%', v_player->>'uid';
    end if;
  end loop;

  -- soft warn: IGN used by another team in this tournament
  select r.id into v_existing_ign
  from public.registration_players rp
  join public.registrations r on r.id = rp.registration_id
  where r.tournament_id = p_tournament_id
    and lower(btrim(rp.ign)) in (
      select lower(btrim(p2->>'ign')) from jsonb_array_elements(p_players) p2
    )
    and r.status <> 'rejected'
  limit 1;

  v_status := case when v_tournament.auto_approve then 'approved'::registration_status else 'pending'::registration_status end;

  insert into public.registrations (tournament_id, user_id, team_name, team_tag, whatsapp, status, duplicate_ign)
  values (p_tournament_id, v_user, btrim(p_team_name), nullif(btrim(coalesce(p_team_tag, '')), ''), v_whatsapp, v_status, v_existing_ign is not null)
  returning id into v_registration;

  insert into public.registration_players (registration_id, ign, uid, player_role, sort_order)
  select v_registration,
         btrim(p_player->>'ign'),
         p_player->>'uid',
         nullif(btrim(coalesce(p_player->>'player_role','')), ''),
         coalesce((p_player->>'sort_order')::int, ord - 1)
  from jsonb_array_elements(p_players) with ordinality as t(p_player, ord);

  return v_registration;
end $$;

-- ---------------------------------------------------------------------------
-- Public slot RPCs (security definer → bypass RLS, expose no PII)
-- ---------------------------------------------------------------------------
create or replace function public.slot_counts()
returns table (tournament_id uuid, approved bigint, pending bigint)
language sql
security definer
set search_path = public
as $$
  select tournament_id,
         count(*) filter (where status = 'approved'),
         count(*) filter (where status = 'pending')
  from public.registrations
  group by tournament_id;
$$;

create or replace function public.public_slots(p_tournament_id uuid)
returns table (team_name text, team_tag text, whatsapp text, approved_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select team_name, team_tag, whatsapp, updated_at
  from public.registrations
  where tournament_id = p_tournament_id and status = 'approved'
  order by updated_at asc;
$$;

revoke all on function public.slot_counts() from anon, authenticated;
grant execute on function public.slot_counts() to anon, authenticated;
revoke all on function public.public_slots(uuid) from anon, authenticated;
grant execute on function public.public_slots(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('site', 'site', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('tournament-media', 'tournament-media', true)
  on conflict (id) do nothing;

create policy storage_public_read on storage.objects for select
  using (bucket_id in ('site','tournament-media'));
create policy storage_staff_write on storage.objects for all
  using (bucket_id in ('site','tournament-media') and public.is_manager_or_admin())
  with check (bucket_id in ('site','tournament-media') and public.is_manager_or_admin());

-- ---------------------------------------------------------------------------
-- Seed: content, categories, members, template, sample BGMI tournament
-- ---------------------------------------------------------------------------
insert into public.content_blocks (kind, key, body, sort_order) values
  ('tagline', 'hero_title', 'FORGE YOUR LEGEND', 1),
  ('tagline', 'hero_subtitle', 'Z4K Esports — where raw talent meets ruthless discipline.', 2),
  ('quote', null, 'Champions don''t wait for opportunities. They take the last circle.', 1),
  ('quote', null, 'A squad is only as strong as its calmest player.', 2),
  ('quote', null, 'Lose the fight, learn the drop. Win the war.', 3),
  ('quote', null, 'Sweat in the scrims so you bleed less on stage.', 4),
  ('block', 'about_org', 'Z4K Esports is a competitive gaming organization built on grind, discipline and squad-first culture. We scout raw talent, forge rosters, and take them to the biggest battlegrounds in India.', 1),
  ('block', 'about_cta', 'Think you have what it takes? Watch this space for tryouts.', 2)
on conflict (key) do nothing;

insert into public.member_categories (name, sort_order) values
  ('Ownership', 1), ('Management', 2), ('Players', 3), ('Content & Media', 4)
on conflict (name) do nothing;

with c as (select id, name from public.member_categories)
insert into public.team_members (category_id, name, tag, role_title, bio, sort_order)
select c.id, v.name, v.tag, v.role_title, v.bio, v.sort_order
from (values
  ('Ownership', 'Arjun "Z4K Vortex" Mehta', 'VORTEX', 'Founder & Owner', 'Built Z4K from a living-room scrim group into a full roster factory.', 1),
  ('Ownership', 'Karan "Z4K Titan" Rao', 'TITAN', 'Co-Owner', 'Runs strategy, partnerships and everything business.', 2),
  ('Management', 'Sana "Z4K Nova" Qureshi', 'NOVA', 'Team Manager', 'Keeps the roster fed, scrimmed and on time.', 1),
  ('Players', 'Rohit "Z4K Blaze" Sharma', 'BLAZE', 'Assaulter / IGL', 'Reads the lobby like a book, ends it like a highlight reel.', 1),
  ('Players', 'Aman "Z4K Ghost" Verma', 'GHOST', 'Sniper', 'One shot, one rotation saved.', 2),
  ('Players', 'Dev "Z4K Storm" Patel', 'STORM', 'Support', 'The utility brain — smokes, heals and revives on instinct.', 3),
  ('Players', 'Yash "Z4K Havoc" Nair', 'HAVOC', 'Rusher', 'First in, last standing.', 4),
  ('Content & Media', 'Ishaan "Z4K Reel" Kulkarni', 'REEL', 'Content Lead', 'Turns highlight moments into channel fuel.', 1)
) as v(cat, name, tag, role_title, bio, sort_order)
join c on c.name = v.cat;

insert into public.tournament_templates (name, game, team_size, substitutes_max, max_teams, entry_fee_inr, auto_approve, rules_md)
values (
  'BGMI Squad (4+1, 25 slots)',
  'Battlegrounds Mobile India (BGMI)',
  4, 1, 25, 0, false,
  E'## Format\n- Squad (4 players + 1 substitute max)\n- Erangel / Miramar / Sanhok — TPP\n- Room ID & password shared to approved captains 15 minutes before match time\n\n## Fair Play\n- Emulators, hacks, panels and teaming are instant DQ\n- Record your gameplay if requested by admins\n\n## General\n- Be in the room 10 minutes before match time\n- Admin decisions are final'
)
on conflict do nothing;

with t as (
  insert into public.tournaments (
    slug, name, game, description, team_size, substitutes_max, max_teams,
    entry_fee_inr, registration_starts_at, registration_ends_at,
    event_starts_at, event_ends_at, auto_approve, rules_md, youtube_live_id,
    whatsapp_group_link, manager_contact, upi_note,
    template_id, hero_image_url
  ) values (
    'z4k-bgmi-clash-s1',
    'Z4K BGMI Clash — Season 1',
    'Battlegrounds Mobile India (BGMI)',
    'The flagship Z4K squad tournament. 25 slots, 4+1 format, TPP. Winner takes the crown and the champion banner on this page.',
    4, 1, 25,
    0,
    now() - interval '2 days',
    now() + interval '5 days',
    now() + interval '7 days',
    now() + interval '7 days' + interval '4 hours',
    false,
    (select rules_md from public.tournament_templates limit 1),
    null, null, '+911234567890',
    'UPI: z4kesports@upi (send screenshot to the manager WhatsApp)',
    (select id from public.tournament_templates limit 1),
    null
  )
  returning id
)
insert into public.room_credentials (tournament_id, scope, label, room_id, room_password, reveal_at, sort_order)
select t.id, 'tournament', 'Match Room 1', 'SEED-ROOM-1', 'SEED-PASS-1', now() - interval '1 hour', 1
from t;

with w as (
  insert into public.tournaments (
    slug, name, game, description, team_size, substitutes_max, max_teams,
    entry_fee_inr, registration_starts_at, registration_ends_at,
    event_starts_at, event_ends_at, auto_approve, rules_md, vod_url,
    template_id
  ) values (
    'z4k-bgmi-showdown-s1',
    'Z4K BGMI Showdown — Season 1',
    'Battlegrounds Mobile India (BGMI)',
    'Completed invitational. VOD available on YouTube.',
    4, 1, 16, 0,
    now() - interval '40 days', now() - interval '35 days',
    now() - interval '30 days', now() - interval '30 days' + interval '4 hours',
    true,
    '## Standard squad rules.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    (select id from public.tournament_templates limit 1)
  )
  returning id
)
insert into public.tournament_results (tournament_id, placement, team_name, team_tag, prize)
select w.id, v.placement, v.team_name, v.team_tag, v.prize
from (values
  (1, 'GodLike Esports', 'GL', 'Champion trophy + banner'),
  (2, 'Team SouL', 'SOUL', 'Runner-up trophy'),
  (3, 'Orangutan', 'ORNG', 'Third place medal')
) as v(placement, team_name, team_tag, prize)
cross join w;

-- ---------------------------------------------------------------------------
-- IMPORTANT (one-time bootstrap)
-- ---------------------------------------------------------------------------
-- 1. Sign in with Google once via the app.
-- 2. Then promote yourself (run in SQL Editor):
--      update public.users set role = 'admin' where email = 'your-email@gmail.com';
