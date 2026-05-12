-- =============================================================
-- 0025 — Fix habits_select_member so pending invitees can read the habit row
-- =============================================================
-- Phase 29.1 follow-up fix. Migration 0024 declared habits SELECT RLS as:
--   USING (is_habit_member(id) OR created_by = auth.uid())
-- where is_habit_member filters accepted_at IS NOT NULL. Result: a pending
-- invitee can SELECT their own habit_members row (RLS admits user_id = auth.uid())
-- but CANNOT SELECT the habits row they were invited to. The pending-invites
-- query in /squad/habits uses `habits!inner(...)` — RLS-dropped habit rows
-- collapse the inner join, so invitees see zero pending invites.
--
-- Fix: introduce is_habit_invitee (superset of is_habit_member — no accepted_at
-- filter) and use it in the habits SELECT policy. Other policies that gate
-- writes / check-ins continue to use is_habit_member (accepted-only).
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_habit_invitee(p_habit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.habit_members
     WHERE habit_id = p_habit_id
       AND user_id  = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_habit_invitee(uuid) TO authenticated;

DROP POLICY IF EXISTS "habits_select_member" ON public.habits;

CREATE POLICY "habits_select_member"
  ON public.habits FOR SELECT TO authenticated
  USING (
    public.is_habit_invitee(id)
    OR created_by = (SELECT auth.uid())
  );
