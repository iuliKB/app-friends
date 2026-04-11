-- Phase v1.4 Migration 0015 — IOU tables, RPCs, plans.iou_notes → general_notes rename.
-- Implements IOU-01..IOU-05 schema foundation per 05-CONTEXT.md D-03..D-09, D-14.
-- Decisions: D-03 table naming, D-04 atomic RPC, D-05 summary RPC, D-06 audit columns,
--            D-07 creator-only settlement RLS, D-08 INTEGER cents, D-09 largest-remainder.

-- =============================================================
-- SECTION 2 — iou_groups table
-- =============================================================

CREATE TABLE public.iou_groups (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title              text NOT NULL,
  total_amount_cents integer NOT NULL CHECK (total_amount_cents > 0),
  split_mode         text NOT NULL DEFAULT 'even'
                     CHECK (split_mode IN ('even', 'custom')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.iou_groups ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- SECTION 3 — iou_members table (composite PK — no separate id column)
-- =============================================================

CREATE TABLE public.iou_members (
  iou_group_id       uuid NOT NULL REFERENCES public.iou_groups(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_amount_cents integer NOT NULL CHECK (share_amount_cents >= 0),
  settled_at         timestamptz,
  settled_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (iou_group_id, user_id)
);
ALTER TABLE public.iou_members ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- SECTION 4 — Indexes (per D-DISCRETION index strategy)
-- =============================================================

CREATE INDEX idx_iou_groups_created_by ON public.iou_groups(created_by);
CREATE INDEX idx_iou_members_user_id ON public.iou_members(user_id);
CREATE INDEX idx_iou_members_group_id ON public.iou_members(iou_group_id);

-- =============================================================
-- SECTION 5 — updated_at trigger (reuse existing public.update_updated_at function)
-- =============================================================

CREATE TRIGGER iou_groups_updated_at
  BEFORE UPDATE ON public.iou_groups
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- =============================================================
-- SECTION 6 — SECURITY DEFINER helpers (avoid RLS recursion — Pitfall 1)
--
-- is_iou_group_creator() — used by the UPDATE policy on iou_members; reads iou_groups (no recursion)
-- is_iou_member() — used by the SELECT policy on iou_members; reads iou_members.user_id directly
--   via SECURITY DEFINER, bypassing RLS to avoid self-referencing recursion
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_iou_group_creator(p_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.iou_groups
    WHERE id = p_group_id
      AND created_by = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_iou_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.iou_members
    WHERE iou_group_id = p_group_id
      AND user_id = (SELECT auth.uid())
  );
$$;

-- =============================================================
-- SECTION 7 — RLS policies
-- =============================================================

-- iou_groups: only members can SELECT; only creator can INSERT
CREATE POLICY "iou_groups_select_member"
  ON public.iou_groups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.iou_members
      WHERE iou_group_id = id
        AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "iou_groups_insert_own"
  ON public.iou_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- iou_members: any participant can SELECT; only expense creator can UPDATE (D-07)
-- SELECT uses is_iou_member() SECURITY DEFINER helper to avoid self-referencing RLS recursion
CREATE POLICY "iou_members_select_participant"
  ON public.iou_members FOR SELECT TO authenticated
  USING (public.is_iou_member(iou_group_id));

CREATE POLICY "iou_members_update_creator_settles"
  ON public.iou_members FOR UPDATE TO authenticated
  USING (public.is_iou_group_creator(iou_group_id))
  WITH CHECK (public.is_iou_group_creator(iou_group_id));

-- =============================================================
-- SECTION 8 — create_expense() RPC (atomic, largest-remainder split, D-04, D-09)
-- =============================================================

CREATE OR REPLACE FUNCTION public.create_expense(
  p_title              text,
  p_total_amount_cents integer,
  p_participant_ids    uuid[],
  p_split_mode         text DEFAULT 'even',
  p_custom_cents       integer[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_group_id    uuid;
  v_n_people    int;
  v_base_share  int;
  v_remainder   int;
  v_participant uuid;
  v_idx         int := 0;
  v_share       int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_total_amount_cents <= 0 THEN
    RAISE EXCEPTION 'total_amount_cents must be positive';
  END IF;

  INSERT INTO public.iou_groups (created_by, title, total_amount_cents, split_mode)
  VALUES (v_caller, p_title, p_total_amount_cents, p_split_mode)
  RETURNING id INTO v_group_id;

  v_n_people := array_length(p_participant_ids, 1);

  IF p_split_mode = 'even' THEN
    v_base_share := p_total_amount_cents / v_n_people;
    v_remainder  := p_total_amount_cents - (v_base_share * v_n_people);
    FOREACH v_participant IN ARRAY p_participant_ids LOOP
      v_idx := v_idx + 1;
      v_share := v_base_share + (CASE WHEN v_idx <= v_remainder THEN 1 ELSE 0 END);
      INSERT INTO public.iou_members (iou_group_id, user_id, share_amount_cents)
      VALUES (v_group_id, v_participant, v_share);
    END LOOP;
  ELSE
    FOR v_idx IN 1..v_n_people LOOP
      INSERT INTO public.iou_members (iou_group_id, user_id, share_amount_cents)
      VALUES (v_group_id, p_participant_ids[v_idx], p_custom_cents[v_idx]);
    END LOOP;
  END IF;

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_expense(text, integer, uuid[], text, integer[]) TO authenticated;

-- =============================================================
-- SECTION 9 — get_iou_summary() RPC (per-friend net balance, D-05)
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_iou_summary()
RETURNS TABLE (
  friend_id          uuid,
  display_name       text,
  net_amount_cents   int,
  unsettled_count    int
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH caller AS (
    SELECT (SELECT auth.uid()) AS uid
  ),
  expenses AS (
    -- Expenses where caller is a participant
    SELECT
      g.id             AS group_id,
      g.created_by     AS payer_id,
      m.user_id        AS participant_id,
      m.share_amount_cents,
      m.settled_at
    FROM public.iou_groups g
    JOIN public.iou_members m ON m.iou_group_id = g.id
    WHERE EXISTS (
      SELECT 1 FROM public.iou_members im2
      WHERE im2.iou_group_id = g.id
        AND im2.user_id = (SELECT uid FROM caller)
    )
      AND m.settled_at IS NULL
  ),
  pairwise AS (
    -- Positive: friend owes caller (caller paid, friend is participant)
    SELECT
      participant_id AS friend_id,
      share_amount_cents AS amount
    FROM expenses
    WHERE payer_id = (SELECT uid FROM caller)
      AND participant_id <> (SELECT uid FROM caller)
    UNION ALL
    -- Negative: caller owes friend (friend paid, caller is participant)
    SELECT
      payer_id AS friend_id,
      -share_amount_cents AS amount
    FROM expenses
    WHERE participant_id = (SELECT uid FROM caller)
      AND payer_id <> (SELECT uid FROM caller)
  )
  SELECT
    pw.friend_id,
    p.display_name,
    SUM(pw.amount)::int          AS net_amount_cents,
    COUNT(*)::int                AS unsettled_count
  FROM pairwise pw
  JOIN public.profiles p ON p.id = pw.friend_id
  GROUP BY pw.friend_id, p.display_name
  ORDER BY ABS(SUM(pw.amount)) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_iou_summary() TO authenticated;

-- =============================================================
-- SECTION 10 — Column rename (D-01, D-14)
-- Rename plans.iou_notes → general_notes (non-destructive; existing data preserved)
-- =============================================================

ALTER TABLE public.plans
  RENAME COLUMN iou_notes TO general_notes;
