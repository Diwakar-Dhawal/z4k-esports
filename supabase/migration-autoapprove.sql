-- ============================================================================
-- Z4K ESPORTS — CONSOLIDATED MIGRATION (run this ONE file in SQL Editor)
-- Supersedes: migration-uid-verify.sql, migration-guest-registration.sql
-- Includes: verification columns, guest captains, site_media table,
--           race-safe auto-approve register_team RPC (advisory lock +
--           slot re-check inside the transaction).
-- Safe to re-run.
-- ============================================================================

-- 1) Verification columns ----------------------------------------------------
alter table public.registration_players
  add column if not exists uid_verified boolean not null default false,
  add column if not exists verified_name text,
  add column if not exists verified_at timestamptz;

alter table public.preset_players
  add column if not exists verified_at timestamptz;

-- 2) Guest captains -----------------------------------------------------------
alter table public.registrations
  alter column user_id drop not null;
alter table public.registrations
  add column if not exists guest_name text;

-- 3) Editable generic banner images (tournaments page hero, etc.) -------------
create table if not exists public.site_media (
  slot text primary key,
  url text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_media enable row level security;
create policy site_media_public_read on public.site_media for select using (true);
create policy site_media_staff_write on public.site_media for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());
insert into public.site_media (slot, url) values
  ('tournaments_hero', '/games/tournaments-hero.jpg')
on conflict (slot) do nothing;

-- 3b) Verified-UID gate for instant approval ----------------------------------
alter table public.tournaments
  add column if not exists require_verified_uids boolean not null default false;

-- 4) register_team — FINAL VERSION -------------------------------------------
-- Race-safe auto-approve: pg_advisory_xact_lock serializes concurrent
-- registrations per tournament; the slot count is re-checked inside the same
-- transaction that grants the slot, so overbooking by simultaneous
-- submissions is impossible. Set p_force_review = true to send every
-- registration to the review queue regardless of tournament auto_approve.
create or replace function public.register_team(
  p_tournament_id uuid,
  p_team_name text,
  p_team_tag text,
  p_whatsapp text,
  p_players jsonb,
  p_agree_rules boolean,
  p_verified_names jsonb default null,  -- { "<uid>": "<official username>" }
  p_guest_name text default null,
  p_force_review boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();  -- null for guests
  v_tournament public.tournaments;
  v_registration uuid;
  v_player jsonb;
  v_now timestamptz := now();
  v_status registration_status;
  v_whatsapp text := public.normalize_phone(p_whatsapp);
  v_existing_whatsapp uuid;
  v_existing_ign uuid;
begin
  if p_agree_rules is not true then
    raise exception 'RULES_NOT_ACCEPTED';
  end if;
  if length(v_whatsapp) < 10 then
    raise exception 'INVALID_WHATSAPP';
  end if;
  if v_user is null and coalesce(btrim(p_guest_name), '') = '' then
    raise exception 'GUEST_NAME_REQUIRED';
  end if;

  -- Serialize all registrations for this tournament (released at commit).
  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));

  select * into v_tournament from public.tournaments
  where id = p_tournament_id and archived_at is null
  for update;
  if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;

  if v_tournament.registration_starts_at is not null and v_now < v_tournament.registration_starts_at then
    raise exception 'NOT_OPEN_YET';
  end if;
  if v_tournament.registration_ends_at is not null and v_now > v_tournament.registration_ends_at then
    raise exception 'CLOSED';
  end if;

  -- Capacity check INSIDE the lock → no overbooking race
  if (
    select count(*) from public.registrations
    where tournament_id = p_tournament_id and status <> 'rejected'
  ) >= v_tournament.max_teams then
    raise exception 'FULL';
  end if;

  -- Optional gate: only HL-Gaming-verified squads get instant slots.
  -- When on, partially/unverified teams fall back to the review queue.
  if v_tournament.auto_approve
     and v_tournament.require_verified_uids
     and p_verified_names is not null
     and (
       select count(*) from jsonb_array_elements(p_players) el
       where not (p_verified_names ? (el->>'uid'))
     ) > 0 then
    v_tournament.auto_approve := false;
  end if;

  -- one registration per account (logged-in captains)
  if v_user is not null and exists (
    select 1 from public.registrations
    where tournament_id = p_tournament_id and user_id = v_user
  ) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  -- one registration per WhatsApp number (guests included)
  select id into v_existing_whatsapp from public.registrations
  where tournament_id = p_tournament_id and whatsapp = v_whatsapp limit 1;
  if v_existing_whatsapp is not null then
    raise exception 'DUPLICATE_WHATSAPP';
  end if;

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

  select r.id into v_existing_ign
  from public.registration_players rp
  join public.registrations r on r.id = rp.registration_id
  where r.tournament_id = p_tournament_id
    and lower(btrim(rp.ign)) in (
      select lower(btrim(p2->>'ign')) from jsonb_array_elements(p_players) p2
    )
    and r.status <> 'rejected'
  limit 1;

  v_status := case
    when v_tournament.auto_approve and not coalesce(p_force_review, false)
    then 'approved'::registration_status
    else 'pending'::registration_status
  end;

  insert into public.registrations (tournament_id, user_id, guest_name, team_name, team_tag, whatsapp, status, duplicate_ign)
  values (p_tournament_id, v_user,
          case when v_user is null then btrim(p_guest_name) end,
          btrim(p_team_name), nullif(btrim(coalesce(p_team_tag, '')), ''), v_whatsapp, v_status, v_existing_ign is not null)
  returning id into v_registration;

  insert into public.registration_players (registration_id, ign, uid, player_role, sort_order,
                                           uid_verified, verified_name, verified_at)
  select v_registration,
         btrim(p_player->>'ign'),
         p_player->>'uid',
         nullif(btrim(coalesce(p_player->>'player_role','')), ''),
         coalesce((p_player->>'sort_order')::int, ord - 1),
         coalesce(p_verified_names ? (p_player->>'uid'), false),
         p_verified_names->>(p_player->>'uid'),
         case when coalesce(p_verified_names ? (p_player->>'uid'), false) then v_now end
  from jsonb_array_elements(p_players) with ordinality as t(p_player, ord);

  return v_registration;
end $$;
