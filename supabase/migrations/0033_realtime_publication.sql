-- Phase 33 — Fix Realtime publication membership.
--
-- Root cause (verified against prod via pg_publication_tables): only `messages`
-- was ever added to the `supabase_realtime` publication. Every other subscribeXxx()
-- helper in src/lib/realtimeBridge.ts (statuses, habit_checkins, poll_votes,
-- message_reactions) opened a channel that connected but received ZERO events,
-- because its table was not published. The code looked live; at runtime only chat
-- messages were.
--
-- This migration publishes the remaining subscribed tables so the existing client
-- subscriptions actually fire. REPLICA IDENTITY FULL is required so UPDATE/DELETE
-- events carry the columns the client-side `=eq.` / `in.(…)` filters match on
-- (Postgres default REPLICA IDENTITY ships PK only). `statuses` already had FULL
-- (migration 0001); re-stating it is harmless and idempotent.
--
-- Part B (friendships, plan_members) lands in a separate migration alongside the
-- new subscriber code for friend requests / plan invitations.

alter table public.statuses          replica identity full;
alter table public.habit_checkins    replica identity full;
alter table public.poll_votes        replica identity full;
alter table public.message_reactions replica identity full;

-- Idempotent publish: ALTER PUBLICATION ADD TABLE errors if the table is already a
-- member, so guard each add. Safe to re-run (e.g. a later `supabase db push`).
do $$
declare
  t text;
begin
  foreach t in array array['statuses', 'habit_checkins', 'poll_votes', 'message_reactions']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
