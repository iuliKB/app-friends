-- =============================================================
-- 0026 — Multi-scope chat to-dos (plan chats + DMs + group channels)
-- =============================================================
-- Phase 29.1 follow-up. Migration 0024 modeled chat_todo_lists with a
-- mandatory group_channel_id, so the chat to-do feature only worked in
-- birthday/group chats. Plan chats (plan_id) and DMs (dm_channel_id) had
-- no way to attach a chat to-do — even though `messages` already supports
-- all three scope columns since 0017.
--
-- This migration:
--   1. Loosens chat_todo_lists.group_channel_id to NULLABLE
--   2. Adds plan_id + dm_channel_id columns with FK + ON DELETE CASCADE
--   3. Adds an exactly-one-scope CHECK constraint mirroring messages
--   4. Adds indexes on the two new scope columns
--   5. Drops the legacy create_chat_todo_list(uuid, uuid, text, boolean, jsonb)
--      RPC signature and recreates it with three scope params (exactly one
--      must be non-null). Membership validation branches by scope:
--        group_channel_id → group_channel_members
--        plan_id          → plan_members
--        dm_channel_id    → dm_channels.user_a / user_b
--   6. Rewrites complete_chat_todo to read whichever scope column is set
--      on the parent list and insert the system message with that scope
--   7. Updates get_chat_todos to surface all three scope columns so the
--      /squad/todos list can deep-link back into the originating chat
--
-- Existing chat_todo_lists rows (group_channel_id NOT NULL) continue to pass
-- the new CHECK constraint because group_channel_id is non-null and the
-- other two are NULL — exactly one is set.
-- =============================================================

-- ---------- 1. Schema changes ----------

ALTER TABLE public.chat_todo_lists
  ALTER COLUMN group_channel_id DROP NOT NULL;

ALTER TABLE public.chat_todo_lists
  ADD COLUMN plan_id       uuid REFERENCES public.plans(id)       ON DELETE CASCADE,
  ADD COLUMN dm_channel_id uuid REFERENCES public.dm_channels(id) ON DELETE CASCADE;

ALTER TABLE public.chat_todo_lists
  ADD CONSTRAINT chat_todo_lists_exactly_one_scope CHECK (
    (
      (group_channel_id IS NOT NULL)::int
      + (plan_id IS NOT NULL)::int
      + (dm_channel_id IS NOT NULL)::int
    ) = 1
  );

CREATE INDEX chat_todo_lists_plan_idx ON public.chat_todo_lists(plan_id)
  WHERE plan_id IS NOT NULL;
CREATE INDEX chat_todo_lists_dm_idx ON public.chat_todo_lists(dm_channel_id)
  WHERE dm_channel_id IS NOT NULL;

-- ---------- 2. Rewrite create_chat_todo_list with scope union ----------

DROP FUNCTION IF EXISTS public.create_chat_todo_list(uuid, uuid, text, boolean, jsonb);

CREATE OR REPLACE FUNCTION public.create_chat_todo_list(
  p_group_channel_id uuid,
  p_plan_id          uuid,
  p_dm_channel_id    uuid,
  p_assignee_id      uuid,
  p_title            text,
  p_is_list          boolean,
  p_items            jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_msg_id    uuid;
  v_list_id   uuid;
  v_item      jsonb;
  v_idx       smallint := 0;
  v_item_count int;
  v_scope_count int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_title IS NULL OR length(p_title) < 1 OR length(p_title) > 120 THEN
    RAISE EXCEPTION 'title must be 1-120 characters';
  END IF;

  -- Exactly one scope must be non-null (matches table CHECK).
  v_scope_count := (p_group_channel_id IS NOT NULL)::int
                 + (p_plan_id          IS NOT NULL)::int
                 + (p_dm_channel_id    IS NOT NULL)::int;
  IF v_scope_count <> 1 THEN
    RAISE EXCEPTION 'exactly one of group_channel_id, plan_id, dm_channel_id must be provided';
  END IF;

  -- Membership validation per scope. Caller AND assignee must both be in the chat.
  IF p_group_channel_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.group_channel_members
       WHERE group_channel_id = p_group_channel_id AND user_id = v_caller
    ) THEN
      RAISE EXCEPTION 'caller not in chat';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.group_channel_members
       WHERE group_channel_id = p_group_channel_id AND user_id = p_assignee_id
    ) THEN
      RAISE EXCEPTION 'assignee not in chat';
    END IF;
  ELSIF p_plan_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.plan_members
       WHERE plan_id = p_plan_id AND user_id = v_caller
    ) THEN
      RAISE EXCEPTION 'caller not in plan';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.plan_members
       WHERE plan_id = p_plan_id AND user_id = p_assignee_id
    ) THEN
      RAISE EXCEPTION 'assignee not in plan';
    END IF;
  ELSE  -- p_dm_channel_id
    IF NOT EXISTS (
      SELECT 1 FROM public.dm_channels
       WHERE id = p_dm_channel_id
         AND (user_a = v_caller OR user_b = v_caller)
    ) THEN
      RAISE EXCEPTION 'caller not in dm';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.dm_channels
       WHERE id = p_dm_channel_id
         AND (user_a = p_assignee_id OR user_b = p_assignee_id)
    ) THEN
      RAISE EXCEPTION 'assignee not in dm';
    END IF;
  END IF;

  -- Validate item count (1-30).
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a jsonb array';
  END IF;
  v_item_count := jsonb_array_length(p_items);
  IF v_item_count < 1 OR v_item_count > 30 THEN
    RAISE EXCEPTION 'p_items must contain between 1 and 30 items';
  END IF;
  IF NOT p_is_list AND v_item_count <> 1 THEN
    RAISE EXCEPTION 'single-item to-do requires exactly 1 item';
  END IF;

  -- Insert parent message in the matching scope.
  INSERT INTO public.messages
    (group_channel_id, plan_id, dm_channel_id, sender_id, body, message_type)
  VALUES
    (p_group_channel_id, p_plan_id, p_dm_channel_id, v_caller, p_title, 'todo')
  RETURNING id INTO v_msg_id;

  INSERT INTO public.chat_todo_lists
    (group_channel_id, plan_id, dm_channel_id, message_id, created_by, assignee_id, title, is_list)
  VALUES
    (p_group_channel_id, p_plan_id, p_dm_channel_id, v_msg_id, v_caller, p_assignee_id, p_title, p_is_list)
  RETURNING id INTO v_list_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.chat_todo_items (list_id, position, title, due_date)
    VALUES (
      v_list_id,
      v_idx,
      v_item->>'title',
      CASE WHEN v_item ? 'due_date' AND v_item->>'due_date' IS NOT NULL AND v_item->>'due_date' <> ''
           THEN (v_item->>'due_date')::date
           ELSE NULL
      END
    );
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_list_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_chat_todo_list(uuid, uuid, uuid, uuid, text, boolean, jsonb) TO authenticated;

-- ---------- 3. Rewrite complete_chat_todo to read scope from the list ----------

CREATE OR REPLACE FUNCTION public.complete_chat_todo(
  p_item_id uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller         uuid := auth.uid();
  v_list_id        uuid;
  v_item_title     text;
  v_group_chan_id  uuid;
  v_plan_id        uuid;
  v_dm_id          uuid;
  v_list_title     text;
  v_is_list        boolean;
  v_assignee_id    uuid;
  v_assignee_name  text;
  v_msg_id         uuid;
  v_remaining      int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.chat_todo_items
     SET completed_at = now()
   WHERE id = p_item_id
     AND completed_at IS NULL
     AND list_id IN (
       SELECT id FROM public.chat_todo_lists WHERE assignee_id = v_caller
     )
  RETURNING list_id, title INTO v_list_id, v_item_title;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT group_channel_id, plan_id, dm_channel_id, title, is_list, assignee_id
    INTO v_group_chan_id, v_plan_id, v_dm_id, v_list_title, v_is_list, v_assignee_id
    FROM public.chat_todo_lists
   WHERE id = v_list_id;

  SELECT display_name INTO v_assignee_name
    FROM public.profiles
   WHERE id = v_assignee_id;

  IF v_assignee_name IS NULL THEN
    v_assignee_name := 'Someone';
  END IF;

  -- Per-item system message in whichever scope the list lives in.
  INSERT INTO public.messages
    (group_channel_id, plan_id, dm_channel_id, sender_id, body, message_type)
  VALUES
    (v_group_chan_id, v_plan_id, v_dm_id, v_caller,
     '✓ ' || v_assignee_name || ' completed ' || v_item_title, 'system')
  RETURNING id INTO v_msg_id;

  -- "List finished" message when last item of a list completes.
  IF v_is_list THEN
    SELECT COUNT(*) INTO v_remaining
      FROM public.chat_todo_items
     WHERE list_id = v_list_id AND completed_at IS NULL;
    IF v_remaining = 0 THEN
      INSERT INTO public.messages
        (group_channel_id, plan_id, dm_channel_id, sender_id, body, message_type)
      VALUES
        (v_group_chan_id, v_plan_id, v_dm_id, v_caller,
         '✓ ' || v_assignee_name || ' finished ' || v_list_title, 'system');
    END IF;
  END IF;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_chat_todo(uuid) TO authenticated;

-- ---------- 4. Rewrite get_chat_todos to surface all three scope columns ----------

DROP FUNCTION IF EXISTS public.get_chat_todos(date);

CREATE OR REPLACE FUNCTION public.get_chat_todos(p_today date)
RETURNS TABLE (
  list_id           uuid,
  group_channel_id  uuid,
  plan_id           uuid,
  dm_channel_id     uuid,
  message_id        uuid,
  created_by        uuid,
  title             text,
  is_list           boolean,
  created_at        timestamptz,
  total_count       int,
  done_count        int,
  next_due_date     date,
  is_overdue        boolean,
  is_due_today      boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH lists AS (
    SELECT l.id, l.group_channel_id, l.plan_id, l.dm_channel_id,
           l.message_id, l.created_by, l.title, l.is_list, l.created_at
      FROM public.chat_todo_lists l
     WHERE l.assignee_id = (SELECT auth.uid())
  ),
  item_stats AS (
    SELECT i.list_id,
           COUNT(*)::int                                            AS total_count,
           COUNT(*) FILTER (WHERE i.completed_at IS NOT NULL)::int  AS done_count,
           MIN(i.due_date) FILTER (WHERE i.completed_at IS NULL)    AS next_due_date
      FROM public.chat_todo_items i
     WHERE i.list_id IN (SELECT id FROM lists)
     GROUP BY i.list_id
  )
  SELECT
    l.id                AS list_id,
    l.group_channel_id,
    l.plan_id,
    l.dm_channel_id,
    l.message_id,
    l.created_by,
    l.title,
    l.is_list,
    l.created_at,
    COALESCE(s.total_count, 0)                       AS total_count,
    COALESCE(s.done_count, 0)                        AS done_count,
    s.next_due_date,
    (s.next_due_date IS NOT NULL
       AND s.next_due_date < p_today
       AND COALESCE(s.done_count, 0) < COALESCE(s.total_count, 0)) AS is_overdue,
    (s.next_due_date = p_today
       AND COALESCE(s.done_count, 0) < COALESCE(s.total_count, 0)) AS is_due_today
  FROM lists l
  LEFT JOIN item_stats s ON s.list_id = l.id
  ORDER BY
    (COALESCE(s.done_count, 0) >= COALESCE(s.total_count, 0)),
    (s.next_due_date IS NULL),
    s.next_due_date ASC,
    l.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_todos(date) TO authenticated;
