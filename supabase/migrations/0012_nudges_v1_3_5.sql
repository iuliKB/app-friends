-- Phase 03 v1.3.5 — Nudge ping feature.
-- Lightweight nudge notification: sender swipes right on a friend's card,
-- a record is inserted into `nudges`. Push delivery and in-app inbox
-- are deferred to a future phase — this migration stores the data.
--
-- RPC: send_nudge(receiver_id uuid) → uuid (nudge id)
-- Guards: auth.uid() required, no self-nudge, rate-limited to 1 nudge
--         per sender→receiver pair per 5 minutes.

-- 1. Nudges table
create table if not exists public.nudges (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  seen_at     timestamptz,
  constraint  nudges_no_self_nudge check (sender_id <> receiver_id)
);

-- Index for receiver inbox queries (unseen nudges)
create index if not exists idx_nudges_receiver_unseen
  on public.nudges (receiver_id, created_at desc)
  where seen_at is null;

-- Index for rate-limit check (sender→receiver recent)
create index if not exists idx_nudges_rate_limit
  on public.nudges (sender_id, receiver_id, created_at desc);

-- RLS: users can read nudges they sent or received
alter table public.nudges enable row level security;

create policy "Users can read own nudges"
  on public.nudges for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert nudges they send"
  on public.nudges for insert
  with check (auth.uid() = sender_id and sender_id <> receiver_id);

-- 2. send_nudge RPC — rate-limited, returns nudge id
create or replace function public.send_nudge(receiver_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_recent timestamptz;
  v_nudge_id uuid;
begin
  -- Auth guard
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  -- No self-nudge
  if v_caller = receiver_id then
    raise exception 'Cannot nudge yourself';
  end if;

  -- Rate limit: 1 nudge per sender→receiver per 5 minutes
  select created_at into v_recent
  from public.nudges
  where nudges.sender_id = v_caller
    and nudges.receiver_id = send_nudge.receiver_id
  order by created_at desc
  limit 1;

  if v_recent is not null and v_recent > now() - interval '5 minutes' then
    raise exception 'Nudge rate limited — wait a few minutes';
  end if;

  -- Insert nudge
  insert into public.nudges (sender_id, receiver_id)
  values (v_caller, send_nudge.receiver_id)
  returning id into v_nudge_id;

  return v_nudge_id;
end;
$$;
