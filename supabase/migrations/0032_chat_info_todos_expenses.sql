-- =============================================================
-- 0032 — Chat-info To-Dos & Expenses sections
-- =============================================================
-- Backs the new To-Dos + Expenses sections on the DM and Group chat info
-- screens. Two concerns:
--
--   1. Expenses had NO link to a chat. iou_groups connected people by
--      membership only, so a group chat could not list "its" expenses. We add
--      a nullable iou_groups.group_channel_id FK and thread it through
--      create_expense so expenses created from a group chat are tagged with
--      that channel. Existing rows + DM/standalone expenses keep NULL.
--
--   2. To-dos were already channel-scoped (chat_todo_lists.group_channel_id /
--      dm_channel_id), but the only reader (get_chat_todos) filtered to the
--      caller's assigned lists across ALL channels. The info screens need the
--      lists for ONE channel that the caller can see — i.e. where the caller
--      is the creator OR the assignee (mirrors the chat_todo_lists SELECT RLS).
--      get_chat_todos_for_channel returns those with item rows inlined.
-- =============================================================

-- ---------- 1. iou_groups.group_channel_id ----------

ALTER TABLE public.iou_groups
  ADD COLUMN group_channel_id uuid REFERENCES public.group_channels(id) ON DELETE SET NULL;

CREATE INDEX idx_iou_groups_group_channel
  ON public.iou_groups(group_channel_id)
  WHERE group_channel_id IS NOT NULL;

-- ---------- 2. Recreate create_expense with an optional channel tag ----------
-- Drop the old 5-arg signature first so adding the 6th (defaulted) param does
-- not leave an ambiguous overload behind.

DROP FUNCTION IF EXISTS public.create_expense(text, integer, uuid[], text, integer[]);

CREATE OR REPLACE FUNCTION public.create_expense(
  p_title              text,
  p_total_amount_cents integer,
  p_participant_ids    uuid[],
  p_split_mode         text DEFAULT 'even',
  p_custom_cents       integer[] DEFAULT NULL,
  p_group_channel_id   uuid DEFAULT NULL
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

  INSERT INTO public.iou_groups (created_by, title, total_amount_cents, split_mode, group_channel_id)
  VALUES (v_caller, p_title, p_total_amount_cents, p_split_mode, p_group_channel_id)
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
  public.create_expense(text, integer, uuid[], text, integer[], uuid)
  TO authenticated;

-- ---------- 3. get_chat_todos_for_channel ----------
-- Returns the chat to-do lists for a single channel that the caller is allowed
-- to see (creator OR assignee — matches chat_todo_lists_select_party RLS).
-- Exactly one of p_group_channel_id / p_dm_channel_id is expected; the other
-- is NULL. Item rows are inlined as a jsonb array so the client renders each
-- item without an N+1 round-trip. is_assignee marks lists the caller can
-- complete (complete_chat_todo is assignee-only).

CREATE OR REPLACE FUNCTION public.get_chat_todos_for_channel(
  p_group_channel_id uuid,
  p_dm_channel_id    uuid
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

GRANT EXECUTE ON FUNCTION public.get_chat_todos_for_channel(uuid, uuid) TO authenticated;
