-- =============================================================
-- 0035 — Plan-chat To-Dos & Expenses (extends 0032 to plan scope)
-- =============================================================
-- Migration 0032 wired the chat-info To-Dos & Expenses sections for DM and
-- group chats only. Plan chats are a first-class chat type too (messages.plan_id),
-- so this extends both readers to the plan scope:
--
--   1. get_chat_todos_for_channel gains a p_plan_id arg. chat_todo_lists already
--      carries a nullable plan_id (migration 0026), so plan-chat to-dos already
--      exist — they just had no per-channel reader. Defaulted so existing 2-arg
--      DM/group callers are unaffected.
--
--   2. iou_groups gains a nullable plan_id FK (mirroring 0032's group_channel_id)
--      and create_expense gains a matching p_plan_id arg, so an expense created
--      from a plan chat is tagged with that plan and the plan-info Expenses
--      section can list it.
-- =============================================================

-- ---------- 1. get_chat_todos_for_channel + p_plan_id ----------
-- Adding a parameter changes the signature, so drop the 2-arg overload first to
-- avoid leaving an ambiguous pair behind. The new p_plan_id defaults to NULL so
-- the existing DM/group call sites (two named args) keep resolving here.

DROP FUNCTION IF EXISTS public.get_chat_todos_for_channel(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_chat_todos_for_channel(
  p_group_channel_id uuid,
  p_dm_channel_id    uuid,
  p_plan_id          uuid DEFAULT NULL
)
RETURNS TABLE (
  list_id       uuid,
  created_by    uuid,
  assignee_id   uuid,
  assignee_name text,
  title         text,
  is_list       boolean,
  created_at    timestamptz,
  is_assignee   boolean,
  total_count   int,
  done_count    int,
  items         jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH lists AS (
    SELECT l.id, l.created_by, l.assignee_id, l.title, l.is_list, l.created_at
      FROM public.chat_todo_lists l
     WHERE (
             (p_group_channel_id IS NOT NULL AND l.group_channel_id = p_group_channel_id)
          OR (p_dm_channel_id    IS NOT NULL AND l.dm_channel_id    = p_dm_channel_id)
          OR (p_plan_id          IS NOT NULL AND l.plan_id          = p_plan_id)
           )
       AND (
             l.created_by  = (SELECT auth.uid())
          OR l.assignee_id = (SELECT auth.uid())
           )
  )
  SELECT
    l.id            AS list_id,
    l.created_by,
    l.assignee_id,
    p.display_name  AS assignee_name,
    l.title,
    l.is_list,
    l.created_at,
    (l.assignee_id = (SELECT auth.uid())) AS is_assignee,
    COALESCE((
      SELECT COUNT(*)::int FROM public.chat_todo_items i WHERE i.list_id = l.id
    ), 0) AS total_count,
    COALESCE((
      SELECT COUNT(*)::int FROM public.chat_todo_items i
       WHERE i.list_id = l.id AND i.completed_at IS NOT NULL
    ), 0) AS done_count,
    COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id',           i.id,
                 'list_id',      i.list_id,
                 'position',     i.position,
                 'title',        i.title,
                 'due_date',     i.due_date,
                 'completed_at', i.completed_at
               ) ORDER BY i.position
             )
        FROM public.chat_todo_items i
       WHERE i.list_id = l.id
    ), '[]'::jsonb) AS items
  FROM lists l
  LEFT JOIN public.profiles p ON p.id = l.assignee_id
  ORDER BY l.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_todos_for_channel(uuid, uuid, uuid) TO authenticated;

-- ---------- 2. iou_groups.plan_id ----------

ALTER TABLE public.iou_groups
  ADD COLUMN plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;

CREATE INDEX idx_iou_groups_plan
  ON public.iou_groups(plan_id)
  WHERE plan_id IS NOT NULL;

-- ---------- 3. Recreate create_expense with an optional plan tag ----------
-- Drop the 6-arg signature from 0032 first, then add the 7th (defaulted) param.

DROP FUNCTION IF EXISTS public.create_expense(text, integer, uuid[], text, integer[], uuid);

CREATE OR REPLACE FUNCTION public.create_expense(
  p_title              text,
  p_total_amount_cents integer,
  p_participant_ids    uuid[],
  p_split_mode         text DEFAULT 'even',
  p_custom_cents       integer[] DEFAULT NULL,
  p_group_channel_id   uuid DEFAULT NULL,
  p_plan_id            uuid DEFAULT NULL
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

  -- If tagging to a group chat, the caller must be a member of that chat.
  IF p_group_channel_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.group_channel_members
       WHERE group_channel_id = p_group_channel_id AND user_id = v_caller
    ) THEN
      RAISE EXCEPTION 'caller not in chat';
    END IF;
  END IF;

  -- If tagging to a plan chat, the caller must be a member of that plan.
  IF p_plan_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.plan_members
       WHERE plan_id = p_plan_id AND user_id = v_caller
    ) THEN
      RAISE EXCEPTION 'caller not in plan';
    END IF;
  END IF;

  INSERT INTO public.iou_groups (created_by, title, total_amount_cents, split_mode, group_channel_id, plan_id)
  VALUES (v_caller, p_title, p_total_amount_cents, p_split_mode, p_group_channel_id, p_plan_id)
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

GRANT EXECUTE ON FUNCTION
  public.create_expense(text, integer, uuid[], text, integer[], uuid, uuid)
  TO authenticated;
