-- HOTFIX: Ended tournaments hard-close registration.
-- If the tournament's effective stage is "completed" (override OR derived from
-- event end date), registration is rejected even if the registration window
-- is still open. Run this whole file once in the SQL Editor.

drop function if exists public.register_team(uuid, text, text, text, jsonb, boolean);
drop function if exists public.register_team(uuid, text, text, text, jsonb, boolean, jsonb);
drop function if exists public.register_team(uuid, text, text, text, jsonb, boolean, jsonb, text);
drop function if exists public.register_team(uuid, text, text, text, jsonb, boolean, jsonb, text, boolean);

create or replace function public.register_team(
  p_tournament_id uuid,
  p_team_name text,
  p_team_tag text,
  p_whatsapp text,
  p_players jsonb,
  p_agree_rules boolean,
  p_verified_names jsonb default null,
  p_guest_name text default null,
  p_force_review boolean default false
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
  v_stage text;
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

  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));

  select * into v_tournament from public.tournaments
  where id = p_tournament_id and archived_at is null
  for update;
  if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;

  -- Effective stage: manual override wins, else derived from event dates.
  -- "completed" hard-closes registration regardless of the window.
  v_stage := coalesce(
    v_tournament.status_override,
    case
      when v_tournament.event_starts_at is not null and v_now < v_tournament.event_starts_at then 'upcoming'
      when v_tournament.event_ends_at is not null and v_now > v_tournament.event_ends_at then 'completed'
      else 'ongoing'
    end
  );

  if v_stage = 'completed' then
    raise exception 'CLOSED';
  end if;

  if v_tournament.registration_starts_at is not null and v_now < v_tournament.registration_starts_at then
    raise exception 'NOT_OPEN_YET';
  end if;
  if v_tournament.registration_ends_at is not null and v_now > v_tournament.registration_ends_at then
    raise exception 'CLOSED';
  end if;

  if (
    select count(*) from public.registrations
    where tournament_id = p_tournament_id and status <> 'rejected'
  ) >= v_tournament.max_teams then
    raise exception 'FULL';
  end if;

  if v_tournament.auto_approve
     and v_tournament.require_verified_uids
     and p_verified_names is not null
     and (
       select count(*) from jsonb_array_elements(p_players) el
       where not (p_verified_names ? (el->>'uid'))
     ) > 0 then
    v_tournament.auto_approve := false;
  end if;

  if v_user is not null and exists (
    select 1 from public.registrations
    where tournament_id = p_tournament_id and user_id = v_user
  ) then
    raise exception 'ALREADY_REGISTERED';
  end if;

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
