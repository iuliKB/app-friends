-- migration 0024: habits + to-dos (v1.8 phase 29.1)
-- Implements Habits + To-Dos schema foundation per 29.1-CONTEXT.md D-05..D-13.
-- Decisions: D-05 cadence enum (daily/weekly/n_per_week), D-06 per-member check-ins,
--            D-07 toggle on tile, D-10 single assignee, D-11 system message on complete,
--            D-13 single-assignee chat lists with expandable progress.
-- Pattern sources: 0015_iou_v1_4.sql (atomic RPC + RLS helper),
--                  0017_birthday_social_v1_4.sql (create_birthday_group fan-out),
--                  0018_chat_v1_5.sql (polls parent+child pattern),
--                  0019_reply_threading.sql (message_type CHECK widening).

-- =============================================================
-- SECTION 1 — Extend messages.message_type CHECK constraint (Pitfall 1)
-- Current set after 0019: ('text','image','poll','deleted')
-- New set: add 'system' and 'todo'. 'system' = RPC-inserted server-side messages
-- (e.g. "✓ X completed Y"); 'todo' = chat to-do bubble (D-11).
-- Both new types are RPC-only — the messages INSERT policy below whitelists clients
-- to ('text','image','poll') only; 'deleted' is reached via UPDATE soft-delete,
-- 'system' and 'todo' are reached via SECURITY DEFINER RPCs that bypass RLS.
-- =============================================================

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'poll', 'deleted', 'system', 'todo'));

-- Relax messages_body_required so 'image', 'poll', and 'deleted' may have NULL body
-- but 'text', 'system', and 'todo' must carry body text (system carries "✓ X completed Y";
-- todo carries the title for fallback display).
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_body_required;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_body_required
  CHECK (message_type NOT IN ('text', 'system', 'todo') OR body IS NOT NULL);

-- =============================================================
-- SECTION 2 — Recreate messages INSERT policy to forbid client-sent 'system'/'todo' (T-29.1-03)
-- Existing policy (from 0017) was permissive on message_type. Replace it with a tighter
-- WITH CHECK that whitelists only the three client-writable types. 'system' and 'todo' rows
-- are inserted exclusively by SECURITY DEFINER RPCs (complete_chat_todo, create_chat_todo_list)
-- which bypass RLS. This blocks a malicious authenticated user from spoofing a
-- system completion message via direct PostgREST INSERT.
-- =============================================================

DROP POLICY IF EXISTS "messages_insert_member_or_participant" ON public.messages;

CREATE POLICY "messages_insert_member_or_participant"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND message_type IN ('text', 'image', 'poll')
    AND (
      (
        plan_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.plan_members
          WHERE plan_id = messages.plan_id
            AND user_id = (SELECT auth.uid())
        )
      )
      OR (
        dm_channel_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.dm_channels
          WHERE id = messages.dm_channel_id
            AND (user_a = (SELECT auth.uid()) OR user_b = (SELECT auth.uid()))
        )
      )
      OR (
        group_channel_id IS NOT NULL
        AND public.is_group_channel_member(group_channel_id)
      )
    )
  );

-- =============================================================
-- SECTION 3 — Tables
-- =============================================================

-- habits: parent row created by one user; cadence defines completion rhythm.
CREATE TABLE public.habits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  cadence       text NOT NULL CHECK (cadence IN ('daily', 'weekly', 'n_per_week')),
  weekly_target smallint CHECK (weekly_target IS NULL OR (weekly_target BETWEEN 1 AND 7)),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT habits_weekly_target_present
    CHECK (
      (cadence = 'n_per_week' AND weekly_target IS NOT NULL)
      OR (cadence <> 'n_per_week' AND weekly_target IS NULL)
    )
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE INDEX habits_created_by_idx ON public.habits(created_by);

-- habit_members: composite-PK join table. accepted_at IS NULL = pending invite.
CREATE TABLE public.habit_members (
  habit_id    uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamptz,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, user_id)
);
ALTER TABLE public.habit_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX habit_members_user_idx ON public.habit_members(user_id);

-- habit_checkins: append-only daily log; composite PK enforces one row per
-- (habit, user, local-date). date_local is client-provided to avoid server-tz off-by-one (Pitfall 5).
CREATE TABLE public.habit_checkins (
  habit_id   uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_local date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, user_id, date_local)
);
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;

CREATE INDEX habit_checkins_user_date_idx ON public.habit_checkins(user_id, date_local);

-- todos: personal to-dos for the "Mine" section.
CREATE TABLE public.todos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  due_date     date,
  notes        text,
  priority     text NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low', 'medium', 'high')),
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE INDEX todos_user_idx ON public.todos(user_id, completed_at, due_date);

-- chat_todo_lists: parent row attached to a group_channels message (D-10, D-13).
-- One assignee per list; list expands inline in the assignee's "From chats" section.
CREATE TABLE public.chat_todo_lists (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_channel_id  uuid NOT NULL REFERENCES public.group_channels(id) ON DELETE CASCADE,
  message_id        uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  created_by        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignee_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  is_list           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_todo_lists ENABLE ROW LEVEL SECURITY;

CREATE INDEX chat_todo_lists_assignee_idx ON public.chat_todo_lists(assignee_id);
CREATE INDEX chat_todo_lists_channel_idx ON public.chat_todo_lists(group_channel_id);

-- chat_todo_items: per-item rows under a chat_todo_lists parent.
CREATE TABLE public.chat_todo_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      uuid NOT NULL REFERENCES public.chat_todo_lists(id) ON DELETE CASCADE,
  position     smallint NOT NULL DEFAULT 0,
  title        text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  due_date     date,
  completed_at timestamptz
);
ALTER TABLE public.chat_todo_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX chat_todo_items_list_idx ON public.chat_todo_items(list_id, position);

-- =============================================================
-- SECTION 4 — SECURITY DEFINER helpers (avoid RLS recursion — Pitfall 2)
-- Both created BEFORE any policy references them (Pitfall 3 from 0018).
-- =============================================================

-- is_habit_member: caller is an ACCEPTED member of the habit. Used by SELECT
-- policies on habit_members + habit_checkins (which would otherwise self-recurse).
-- accepted_at IS NOT NULL filter ensures pending invitees do not gain read access
-- to other members' check-ins until they accept (T-29.1-12).
CREATE OR REPLACE FUNCTION public.is_habit_member(p_habit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.habit_members
    WHERE habit_id = p_habit_id
      AND user_id = (SELECT auth.uid())
      AND accepted_at IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_habit_member(uuid) TO authenticated;

-- is_chat_todo_list_owner: caller is the assignee of the list owning this list.
-- Used by chat_todo_items UPDATE policy and by complete_chat_todo callers.
CREATE OR REPLACE FUNCTION public.is_chat_todo_list_owner(p_list_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_todo_lists
    WHERE id = p_list_id
      AND assignee_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_todo_list_owner(uuid) TO authenticated;

-- =============================================================
-- SECTION 5 — RLS policies
-- =============================================================

-- habits: members can SELECT; creator can INSERT/UPDATE/DELETE (T-29.1-05).
CREATE POLICY "habits_select_member"
  ON public.habits FOR SELECT TO authenticated
  USING (public.is_habit_member(id) OR created_by = (SELECT auth.uid()));

CREATE POLICY "habits_insert_creator"
  ON public.habits FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "habits_update_creator"
  ON public.habits FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "habits_delete_creator"
  ON public.habits FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- habit_members: members can SELECT roster (via SECURITY DEFINER helper — avoids
-- recursion on this same table). No client INSERT policy (create_habit RPC only).
-- UPDATE allowed for self (accept invite). DELETE allowed for self (leave habit).
CREATE POLICY "habit_members_select_member"
  ON public.habit_members FOR SELECT TO authenticated
  USING (
    public.is_habit_member(habit_id)
    OR user_id = (SELECT auth.uid())   -- pending invitee can see their own row
  );

CREATE POLICY "habit_members_update_self"
  ON public.habit_members FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "habit_members_delete_self"
  ON public.habit_members FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- habit_checkins: members can SELECT (via helper to avoid recursion through habit_members).
-- INSERT/DELETE restricted to caller's own rows AND requires habit membership.
-- The toggle RPC is SECURITY DEFINER and bypasses these (its body re-verifies membership);
-- direct client INSERT/DELETE is still permitted for the user's own checkins so an
-- offline-replayed write can land without round-tripping the RPC.
CREATE POLICY "habit_checkins_select_member"
  ON public.habit_checkins FOR SELECT TO authenticated
  USING (public.is_habit_member(habit_id));

CREATE POLICY "habit_checkins_insert_own"
  ON public.habit_checkins FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_habit_member(habit_id)
  );

CREATE POLICY "habit_checkins_delete_own"
  ON public.habit_checkins FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.is_habit_member(habit_id)
  );

-- todos: simple owner-only ALL policy (no helper needed).
CREATE POLICY "todos_all_owner"
  ON public.todos FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- chat_todo_lists: creator and assignee can SELECT. No client INSERT (RPC-only).
-- No client UPDATE/DELETE (lists are immutable once posted; v1).
CREATE POLICY "chat_todo_lists_select_party"
  ON public.chat_todo_lists FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR assignee_id = (SELECT auth.uid())
  );

-- chat_todo_items: assignee or list creator can SELECT (via helper).
-- UPDATE for assignee only (complete_chat_todo RPC primarily; direct UPDATE also
-- permitted because the user is acting on their own assigned items).
-- No client INSERT (create_chat_todo_list RPC only).
CREATE POLICY "chat_todo_items_select_party"
  ON public.chat_todo_items FOR SELECT TO authenticated
  USING (
    public.is_chat_todo_list_owner(list_id)
    OR EXISTS (
      SELECT 1 FROM public.chat_todo_lists
      WHERE id = chat_todo_items.list_id
        AND created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "chat_todo_items_update_assignee"
  ON public.chat_todo_items FOR UPDATE TO authenticated
  USING (public.is_chat_todo_list_owner(list_id))
  WITH CHECK (public.is_chat_todo_list_owner(list_id));

-- =============================================================
-- SECTION 6 — create_habit() RPC (Pattern 1)
-- Atomic creation: validate caller + cadence → INSERT habit → INSERT caller as
-- accepted member → FOREACH invitee INSERT as pending (accepted_at NULL).
-- =============================================================

CREATE OR REPLACE FUNCTION public.create_habit(
  p_title         text,
  p_cadence       text,
  p_weekly_target smallint,
  p_member_ids    uuid[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_habit_id uuid;
  v_member   uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_cadence NOT IN ('daily', 'weekly', 'n_per_week') THEN
    RAISE EXCEPTION 'invalid cadence: %', p_cadence;
  END IF;
  IF p_cadence = 'n_per_week' AND (p_weekly_target IS NULL OR p_weekly_target < 1 OR p_weekly_target > 7) THEN
    RAISE EXCEPTION 'weekly_target must be 1-7 for n_per_week cadence';
  END IF;
  IF p_cadence <> 'n_per_week' AND p_weekly_target IS NOT NULL THEN
    RAISE EXCEPTION 'weekly_target must be NULL unless cadence is n_per_week';
  END IF;
  IF p_title IS NULL OR length(p_title) < 1 OR length(p_title) > 80 THEN
    RAISE EXCEPTION 'title must be 1-80 characters';
  END IF;

  INSERT INTO public.habits (created_by, title, cadence, weekly_target)
  VALUES (v_caller, p_title, p_cadence, p_weekly_target)
  RETURNING id INTO v_habit_id;

  -- Creator auto-accepts membership.
  INSERT INTO public.habit_members (habit_id, user_id, accepted_at)
  VALUES (v_habit_id, v_caller, now());

  -- Fan-out invitees as pending (accepted_at NULL). Skip caller-dup.
  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member IN ARRAY p_member_ids LOOP
      IF v_member <> v_caller THEN
        INSERT INTO public.habit_members (habit_id, user_id, accepted_at)
        VALUES (v_habit_id, v_member, NULL);
      END IF;
    END LOOP;
  END IF;

  RETURN v_habit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_habit(text, text, smallint, uuid[]) TO authenticated;

-- =============================================================
-- SECTION 7 — toggle_habit_today_checkin() RPC (Pattern 3 + Pitfall 8)
-- Two-phase toggle: DELETE today's row; if FOUND → return false (un-check),
-- else INSERT and return true (check-in). Idempotent within a date_local.
-- date_local is caller-provided so client timezone wins (Pitfall 5).
-- T-29.1-02: no user_id parameter; user_id is always auth.uid().
-- =============================================================

CREATE OR REPLACE FUNCTION public.toggle_habit_today_checkin(
  p_habit_id   uuid,
  p_date_local date
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.is_habit_member(p_habit_id) THEN
    RAISE EXCEPTION 'not a member of this habit';
  END IF;

  DELETE FROM public.habit_checkins
   WHERE habit_id   = p_habit_id
     AND user_id    = v_caller
     AND date_local = p_date_local;
  IF FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.habit_checkins (habit_id, user_id, date_local)
  VALUES (p_habit_id, v_caller, p_date_local);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_habit_today_checkin(uuid, date) TO authenticated;

-- =============================================================
-- SECTION 8 — create_todo() RPC
-- Simple personal-to-do create. Owner is always auth.uid().
-- =============================================================

CREATE OR REPLACE FUNCTION public.create_todo(
  p_title    text,
  p_due_date date,
  p_notes    text,
  p_priority text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller  uuid := auth.uid();
  v_todo_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_title IS NULL OR length(p_title) < 1 OR length(p_title) > 120 THEN
    RAISE EXCEPTION 'title must be 1-120 characters';
  END IF;
  IF p_priority IS NOT NULL AND p_priority NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'invalid priority: %', p_priority;
  END IF;

  INSERT INTO public.todos (user_id, title, due_date, notes, priority)
  VALUES (
    v_caller,
    p_title,
    p_due_date,
    p_notes,
    COALESCE(p_priority, 'medium')
  )
  RETURNING id INTO v_todo_id;

  RETURN v_todo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_todo(text, date, text, text) TO authenticated;

-- =============================================================
-- SECTION 9 — create_chat_todo_list() RPC (D-09, D-10, D-13)
-- Atomic: validate caller in chat AND assignee in chat (T-29.1-01) →
-- INSERT messages row (message_type='todo') → INSERT chat_todo_lists →
-- INSERT chat_todo_items (one for single, many for list).
-- p_items is a jsonb array; for is_list=false the array must have exactly 1 element.
-- T-29.1-09: enforces 1-30 items cap.
-- =============================================================

CREATE OR REPLACE FUNCTION public.create_chat_todo_list(
  p_group_channel_id uuid,
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
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_title IS NULL OR length(p_title) < 1 OR length(p_title) > 120 THEN
    RAISE EXCEPTION 'title must be 1-120 characters';
  END IF;

  -- D-10: caller must be a member of the group chat.
  IF NOT EXISTS (
    SELECT 1 FROM public.group_channel_members
    WHERE group_channel_id = p_group_channel_id
      AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'caller not in chat';
  END IF;

  -- T-29.1-01: assignee must also be a member of the group chat.
  IF NOT EXISTS (
    SELECT 1 FROM public.group_channel_members
    WHERE group_channel_id = p_group_channel_id
      AND user_id = p_assignee_id
  ) THEN
    RAISE EXCEPTION 'assignee not in chat';
  END IF;

  -- T-29.1-09: validate item count (1-30).
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

  -- Insert parent message with message_type='todo'. Body carries the title so
  -- text-only fallback (older clients) still renders something readable.
  INSERT INTO public.messages (group_channel_id, sender_id, body, message_type)
  VALUES (p_group_channel_id, v_caller, p_title, 'todo')
  RETURNING id INTO v_msg_id;

  INSERT INTO public.chat_todo_lists (
    group_channel_id, message_id, created_by, assignee_id, title, is_list
  )
  VALUES (
    p_group_channel_id, v_msg_id, v_caller, p_assignee_id, p_title, p_is_list
  )
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

GRANT EXECUTE ON FUNCTION public.create_chat_todo_list(uuid, uuid, text, boolean, jsonb) TO authenticated;

-- =============================================================
-- SECTION 10 — complete_chat_todo() RPC (Pattern 4, D-11)
-- Idempotent: UPDATE WHERE completed_at IS NULL; if NOT FOUND → return NULL.
-- After UPDATE: INSERT system message in same txn. If all items now complete AND
-- the parent list is_list = true, insert a second "list finished" system message.
-- T-29.1-06: atomicity ensures completion + system message are inseparable.
-- =============================================================

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

  -- Update only if the item exists, belongs to a list assigned to the caller,
  -- AND is not already completed. This makes the call idempotent.
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

  -- Fetch list context for the system message.
  SELECT group_channel_id, title, is_list, assignee_id
    INTO v_group_chan_id, v_list_title, v_is_list, v_assignee_id
    FROM public.chat_todo_lists
   WHERE id = v_list_id;

  SELECT display_name INTO v_assignee_name
    FROM public.profiles
   WHERE id = v_assignee_id;

  IF v_assignee_name IS NULL THEN
    v_assignee_name := 'Someone';
  END IF;

  -- Per-item system message ("✓ Sam completed Buy bread").
  INSERT INTO public.messages (group_channel_id, sender_id, body, message_type)
  VALUES (
    v_group_chan_id,
    v_caller,
    '✓ ' || v_assignee_name || ' completed ' || v_item_title,
    'system'
  )
  RETURNING id INTO v_msg_id;

  -- If this was a multi-item list and all items are now complete, fire a
  -- "list finished" system message in addition (UI-SPEC §"List variant").
  IF v_is_list THEN
    SELECT COUNT(*) INTO v_remaining
      FROM public.chat_todo_items
     WHERE list_id = v_list_id
       AND completed_at IS NULL;
    IF v_remaining = 0 THEN
      INSERT INTO public.messages (group_channel_id, sender_id, body, message_type)
      VALUES (
        v_group_chan_id,
        v_caller,
        '✓ ' || v_assignee_name || ' finished ' || v_list_title,
        'system'
      );
    END IF;
  END IF;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_chat_todo(uuid) TO authenticated;

-- =============================================================
-- SECTION 11 — get_habits_overview() RPC (aggregate read, D-08)
-- Returns one row per accepted habit for the caller, with derived metrics:
--   - members_total / accepted_total
--   - completed_today: count across all accepted members for p_date_local
--   - did_me_check_in_today: caller's own checkin status for p_date_local
--   - last_checkin_date_local: caller's most recent checkin date for this habit
--   - current_week_completions: caller's checkins this ISO week (B2, required by
--     Plan 03 OQ4 — isHabitAboutToBreak derivation)
-- p_date_local is mandatory (Pitfall 5).
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_habits_overview(p_date_local date)
RETURNS TABLE (
  habit_id                 uuid,
  title                    text,
  cadence                  text,
  weekly_target            smallint,
  is_solo                  boolean,
  members_total            int,
  accepted_total           int,
  completed_today          int,
  did_me_check_in_today    boolean,
  last_checkin_date_local  date,
  current_week_completions smallint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH caller AS (
    SELECT (SELECT auth.uid()) AS uid
  ),
  my_habits AS (
    SELECT h.id, h.title, h.cadence, h.weekly_target
      FROM public.habits h
      JOIN public.habit_members hm ON hm.habit_id = h.id
     WHERE hm.user_id = (SELECT uid FROM caller)
       AND hm.accepted_at IS NOT NULL
  ),
  member_counts AS (
    SELECT hm.habit_id,
           COUNT(*)::int                                                   AS members_total,
           COUNT(*) FILTER (WHERE hm.accepted_at IS NOT NULL)::int         AS accepted_total
      FROM public.habit_members hm
     WHERE hm.habit_id IN (SELECT id FROM my_habits)
     GROUP BY hm.habit_id
  ),
  today_counts AS (
    SELECT c.habit_id,
           COUNT(*)::int AS completed_today
      FROM public.habit_checkins c
      JOIN public.habit_members hm
        ON hm.habit_id = c.habit_id AND hm.user_id = c.user_id
     WHERE c.habit_id IN (SELECT id FROM my_habits)
       AND c.date_local = p_date_local
       AND hm.accepted_at IS NOT NULL
     GROUP BY c.habit_id
  ),
  my_today AS (
    SELECT c.habit_id
      FROM public.habit_checkins c
     WHERE c.user_id = (SELECT uid FROM caller)
       AND c.date_local = p_date_local
       AND c.habit_id IN (SELECT id FROM my_habits)
  ),
  my_last AS (
    SELECT c.habit_id,
           MAX(c.date_local) AS last_date
      FROM public.habit_checkins c
     WHERE c.user_id = (SELECT uid FROM caller)
       AND c.habit_id IN (SELECT id FROM my_habits)
     GROUP BY c.habit_id
  ),
  my_week AS (
    SELECT c.habit_id,
           COUNT(*)::smallint AS week_count
      FROM public.habit_checkins c
     WHERE c.user_id = (SELECT uid FROM caller)
       AND c.habit_id IN (SELECT id FROM my_habits)
       AND c.date_local >= (date_trunc('week', p_date_local::timestamp))::date
       AND c.date_local <= p_date_local
     GROUP BY c.habit_id
  )
  SELECT
    h.id                                       AS habit_id,
    h.title,
    h.cadence,
    h.weekly_target,
    (COALESCE(mc.accepted_total, 1) = 1)       AS is_solo,
    COALESCE(mc.members_total, 1)              AS members_total,
    COALESCE(mc.accepted_total, 1)             AS accepted_total,
    COALESCE(tc.completed_today, 0)            AS completed_today,
    (mt.habit_id IS NOT NULL)                  AS did_me_check_in_today,
    ml.last_date                               AS last_checkin_date_local,
    COALESCE(mw.week_count, 0::smallint)       AS current_week_completions
  FROM my_habits h
  LEFT JOIN member_counts mc ON mc.habit_id = h.id
  LEFT JOIN today_counts  tc ON tc.habit_id = h.id
  LEFT JOIN my_today      mt ON mt.habit_id = h.id
  LEFT JOIN my_last       ml ON ml.habit_id = h.id
  LEFT JOIN my_week       mw ON mw.habit_id = h.id
  ORDER BY h.title ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_habits_overview(date) TO authenticated;

-- =============================================================
-- SECTION 12 — get_my_todos() RPC (D-04 "Mine" section)
-- Returns caller's personal todos with overdue/dueToday derivation done client-side.
-- p_today required for consistency with get_habits_overview (no server-tz dependency).
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_my_todos(p_today date)
RETURNS TABLE (
  id           uuid,
  title        text,
  due_date     date,
  notes        text,
  priority     text,
  completed_at timestamptz,
  created_at   timestamptz,
  is_overdue   boolean,
  is_due_today boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    t.id,
    t.title,
    t.due_date,
    t.notes,
    t.priority,
    t.completed_at,
    t.created_at,
    (t.completed_at IS NULL AND t.due_date IS NOT NULL AND t.due_date < p_today) AS is_overdue,
    (t.completed_at IS NULL AND t.due_date = p_today)                            AS is_due_today
  FROM public.todos t
  WHERE t.user_id = (SELECT auth.uid())
  ORDER BY
    (t.completed_at IS NULL) DESC,             -- open first
    (t.due_date IS NULL),                       -- with due dates first
    t.due_date ASC,
    t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_todos(date) TO authenticated;

-- =============================================================
-- SECTION 13 — get_chat_todos() RPC (D-04 "From chats" section, D-13)
-- One row per chat_todo_list assigned to the caller. done_count / total_count
-- power the progress chip ("📋 Trip prep · 2/5 done").
-- For single-item lists (is_list=false) the consumer treats the row as a single
-- to-do with that item's due_date.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_chat_todos(p_today date)
RETURNS TABLE (
  list_id           uuid,
  group_channel_id  uuid,
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
    SELECT l.id, l.group_channel_id, l.message_id, l.created_by,
           l.title, l.is_list, l.created_at
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
    (COALESCE(s.done_count, 0) >= COALESCE(s.total_count, 0)),  -- open lists first
    (s.next_due_date IS NULL),
    s.next_due_date ASC,
    l.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_todos(date) TO authenticated;
