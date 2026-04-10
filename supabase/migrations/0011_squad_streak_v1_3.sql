-- Phase 4 v1.3 — STREAK-01..08 computed weekly streak per viewer's friend circle.
-- D-01: no squad entity; "squad" = viewer's friend circle (friend circle only, no separate table).
-- D-02: plans where viewer is plans.created_by OR a plan_members row (any rsvp).
-- D-03: active week = >=1 plan with scheduled_for < now(), scheduled_for inside
--       Mon 00:00 -> Sun 23:59 viewer-tz window, >=2 plan_members rsvp='going',
--       and viewer is creator or plan_member.
--       NOTE: plan_members column is `rsvp` (typed as public.rsvp_status);
--       the predicate checks rsvp_status = 'going' via pm2.rsvp = 'going'.
-- D-04: viewer counts toward the >=2 attendee threshold; solo plans do NOT count.
-- D-05: SECURITY DEFINER, computed not materialized, returns (current_weeks, best_weeks).
-- D-06: tz is the viewer's device tz at query time (passed by client).
-- D-07: best_weeks is computed by walking full history; no persisted counter.
-- D-08: sliding 4-week miss counter. Streak continues while misses_in_window <= 1.
--       Streak breaks on misses_in_window >= 2 (resets current run; preserves best).
-- D-09: SECURITY DEFINER with hardened search_path = ''. Explicit auth.uid() guard.

create or replace function public.get_squad_streak(
  viewer_id uuid,
  tz        text
)
returns table (
  current_weeks int,
  best_weeks    int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_this_week_start timestamptz;
  v_oldest_week_start timestamptz;
  v_week_start timestamptz;
  v_active boolean;
  v_misses_in_window int := 0;
  v_best int := 0;
  v_run int := 0;
  v_window boolean[] := array[]::boolean[];
begin
  -- D-09 auth guard
  if v_caller is null or v_caller <> viewer_id then
    raise exception 'not authorized';
  end if;

  -- Current week start (Mon 00:00) in viewer tz, re-expressed as UTC timestamptz
  v_this_week_start :=
    (date_trunc('week', (now() at time zone tz)))::timestamp at time zone tz;

  -- Earliest week from viewer involvement (creator OR plan_member)
  -- D-03 requires rsvp_status = 'going' for active-week predicate (column: plan_members.rsvp typed as public.rsvp_status)
  select min(
    (date_trunc(
      'week',
      (least(p.created_at, coalesce(pm.joined_at, p.created_at)) at time zone tz)
    ))::timestamp at time zone tz
  )
  into v_oldest_week_start
  from public.plans p
  left join public.plan_members pm
    on pm.plan_id = p.id and pm.user_id = viewer_id
  where p.created_by = viewer_id or pm.user_id = viewer_id;

  if v_oldest_week_start is null then
    current_weeks := 0;
    best_weeks := 0;
    return next;
    return;
  end if;

  v_week_start := v_oldest_week_start;
  while v_week_start <= v_this_week_start loop
    -- D-03 active-week predicate: scheduled_for NOT NULL, < now(), within week window,
    -- viewer is creator or plan_member, and count(plan_members where rsvp_status = 'going') >= 2.
    -- Schema note: plan_members.rsvp is the column (typed public.rsvp_status enum).
    select exists (
      select 1
      from public.plans p
      where p.scheduled_for is not null
        and p.scheduled_for < now()
        and p.scheduled_for >= v_week_start
        and p.scheduled_for <  v_week_start + interval '7 days'
        and (
          p.created_by = viewer_id
          or exists (
            select 1
            from public.plan_members pm
            where pm.plan_id = p.id and pm.user_id = viewer_id
          )
        )
        and (
          select count(*)
          from public.plan_members pm2
          where pm2.plan_id = p.id and pm2.rsvp = 'going'
        ) >= 2
    ) into v_active;

    -- Rolling 4-week window, oldest-first
    v_window := array_append(v_window, v_active);
    if array_length(v_window, 1) > 4 then
      v_window := v_window[2:];
    end if;

    select count(*) into v_misses_in_window
    from unnest(v_window) as w where w = false;

    if v_active then
      v_run := v_run + 1;
      if v_run > v_best then v_best := v_run; end if;
    elsif v_misses_in_window >= 2 then
      -- D-08 break: reset current run and window
      v_run := 0;
      v_window := array[]::boolean[];
    end if;
    -- else: miss but within grace -> v_run unchanged

    v_week_start := v_week_start + interval '7 days';
  end loop;

  current_weeks := v_run;
  best_weeks := v_best;
  return next;
end;
$$;

grant execute on function public.get_squad_streak(uuid, text) to authenticated;
