-- Fix infinite recursion in plan_members INSERT policy.
-- The old policy queries `plans` table, which triggers `plans_select_member`
-- policy, which queries `plan_members` — causing circular RLS recursion.
--
-- Solution: SECURITY DEFINER helper function bypasses RLS when checking
-- plan ownership, same pattern as is_friend_of() for friendships.

-- Step 1: Create SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.is_plan_creator(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plans
    WHERE id = p_plan_id
      AND created_by = (SELECT auth.uid())
  );
$$;

-- Step 2: Drop the old recursive policy
DROP POLICY IF EXISTS "plan_members_insert_creator" ON public.plan_members;

-- Step 3: Create new policy using the helper
CREATE POLICY "plan_members_insert_creator"
  ON public.plan_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_plan_creator(plan_id)
  );
