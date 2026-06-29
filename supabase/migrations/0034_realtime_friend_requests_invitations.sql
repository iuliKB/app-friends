-- Phase 33 Part B — Realtime for friend requests & plan invitations.
--
-- Neither `friendships` nor `plan_members` was published, AND no subscriber code
-- existed, so a recipient never saw an incoming friend request / plan invite until
-- a manual pull-to-refresh or a cold start (queries have only a 60s staleTime).
--
-- This migration publishes both tables and sets REPLICA IDENTITY FULL so the
-- client-side filters survive UPDATE/DELETE (accept/reject flips `status`/`rsvp`,
-- whose old row under default REPLICA IDENTITY ships PK only — the addressee_id /
-- user_id filter would then never match and the event would be dropped).
--
-- RLS already permits delivery: friendships_select_participant (requester OR
-- addressee) and plan_members_select_member (is_plan_member) — verified before
-- writing this migration. Client subscribers land in src/lib/realtimeBridge.ts
-- (subscribeFriendRequests / subscribePlanInvitations).

alter table public.friendships  replica identity full;
alter table public.plan_members replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array['friendships', 'plan_members']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
