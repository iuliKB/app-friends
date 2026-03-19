-- Fix: plans_select_member policy blocks the creator from seeing their own
-- plan immediately after INSERT (before plan_members row exists).
-- Also fix plan_members_select_member self-referential recursion.

-- Step 1: Drop old plans SELECT policy
DROP POLICY IF EXISTS "plans_select_member" ON public.plans;

-- Step 2: New policy — creator OR member can see the plan
CREATE POLICY "plans_select_creator_or_member"
  ON public.plans FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.plan_members
      WHERE plan_members.plan_id = id
        AND plan_members.user_id = (SELECT auth.uid())
    )
  );

-- Step 3: Drop old plan_members SELECT policy (self-referential)
DROP POLICY IF EXISTS "plan_members_select_member" ON public.plan_members;

-- Step 4: New policy using SECURITY DEFINER helper to avoid recursion
CREATE OR REPLACE FUNCTION public.is_plan_member(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plan_members
    WHERE plan_id = p_plan_id
      AND user_id = (SELECT auth.uid())
  );
$$;

CREATE POLICY "plan_members_select_member"
  ON public.plan_members FOR SELECT
  TO authenticated
  USING (
    public.is_plan_member(plan_id)
  );
