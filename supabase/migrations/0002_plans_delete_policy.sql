-- Allow plan creator to delete their own plans
CREATE POLICY "plans_delete_creator"
  ON public.plans FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));
