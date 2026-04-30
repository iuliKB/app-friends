-- Phase v1.6 Migration 0021 — Plan photo gallery foundation.
-- Creates plan_photos table, storage bucket, RLS policies, and add_plan_photo RPC.
-- Requirements: GALL-01 (table + RLS), GALL-02 (private bucket + storage RLS), GALL-03 (10-photo cap RPC).

-- ============================================================
-- SECTION 1 — plan_photos table (Phase 21: Gallery Foundation)
-- ============================================================
CREATE TABLE public.plan_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  uploader_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 2 — Index (D-08: composite on plan_id, created_at)
-- ============================================================
CREATE INDEX idx_plan_photos_plan_created
  ON public.plan_photos(plan_id, created_at);

-- ============================================================
-- SECTION 3 — is_plan_member helper (already defined in 0005; CREATE OR REPLACE is safe)
-- ============================================================
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

-- ============================================================
-- SECTION 4 — Table RLS policies
-- ============================================================
-- SELECT: plan members only
CREATE POLICY "plan_photos_select_member"
  ON public.plan_photos FOR SELECT TO authenticated
  USING (public.is_plan_member(plan_id));

-- INSERT: no direct insert policy — absence means denied when RLS is enabled.
-- All writes go through add_plan_photo SECURITY DEFINER RPC which bypasses RLS.

-- DELETE: uploader only (D-03, D-16)
CREATE POLICY "plan_photos_delete_own"
  ON public.plan_photos FOR DELETE TO authenticated
  USING (uploader_id = (SELECT auth.uid()));

-- ============================================================
-- SECTION 5 — Private storage bucket (D-01: plan-gallery is private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('plan-gallery', 'plan-gallery', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 6 — Storage RLS policies
-- CRITICAL: use is_plan_member() SECURITY DEFINER helper — direct plan_members check
-- in storage policies causes RLS recursion (same bug as migration 0004).
-- foldername(name) returns ARRAY[plan_id, user_id] — Postgres arrays are 1-based.
-- ============================================================

-- SELECT: plan members may read objects in their plan's folder
CREATE POLICY "plan_gallery_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'plan-gallery'
    AND public.is_plan_member((storage.foldername(name))[1]::uuid)
  );

-- INSERT: plan members may upload to their plan's folder, path[2] must match their own uid
CREATE POLICY "plan_gallery_insert_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plan-gallery'
    AND public.is_plan_member((storage.foldername(name))[1]::uuid)
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- DELETE: path owner only — segment [2] = user_id (D-03, D-04)
-- No plan_members join needed; path encodes ownership.
CREATE POLICY "plan_gallery_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'plan-gallery'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ============================================================
-- SECTION 7 — add_plan_photo RPC (D-09: atomic membership check + cap + insert)
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_plan_photo(
  p_plan_id      uuid,
  p_storage_path text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_count  int;
  v_id     uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Step 1: verify membership
  IF NOT EXISTS (
    SELECT 1 FROM public.plan_members
    WHERE plan_id = p_plan_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'not a plan member';
  END IF;

  -- Step 2: enforce 10-photo cap per participant per plan (D-09)
  SELECT COUNT(*) INTO v_count
  FROM public.plan_photos
  WHERE plan_id = p_plan_id AND uploader_id = v_caller;

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'photo_cap_exceeded' USING ERRCODE = 'P0001';
  END IF;

  -- Step 3: insert row (uploader_id taken from auth.uid() — not a client parameter)
  INSERT INTO public.plan_photos (plan_id, uploader_id, storage_path)
  VALUES (p_plan_id, v_caller, p_storage_path)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_plan_photo(uuid, text) TO authenticated;
