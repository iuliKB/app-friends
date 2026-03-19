-- Fix: plans_update_member policy has RLS recursion.
-- Inline EXISTS subquery into plan_members triggers plan_members SELECT policy.
-- Replace with SECURITY DEFINER helper (same pattern as migrations 0004/0005).

DROP POLICY IF EXISTS "plans_update_member" ON public.plans;

CREATE POLICY "plans_update_member"
  ON public.plans FOR UPDATE
  TO authenticated
  USING (
    public.is_plan_member(id)
  )
  WITH CHECK (
    public.is_plan_member(id)
  );
