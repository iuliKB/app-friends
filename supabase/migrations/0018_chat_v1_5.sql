-- Phase v1.5 Migration 0018 — Chat foundation: message type, image, reply, poll, reactions.
-- Implements Phase 12 schema foundation per 12-CONTEXT.md D-01..D-09.
-- Decisions: D-01 body nullable, D-03 message_type text CHECK, D-04 DEFAULT 'text',
--            D-05 is_channel_member helper, D-07 reply FK SET NULL,
--            D-08 chat-media bucket, D-09 reactions table (strategy deferred Phase 15).

-- =============================================================
-- SECTION 1 — messages column additions (D-01, D-02, D-03, D-04, D-07)
-- Drop body NOT NULL first (D-01), then add new columns in a single ALTER.
-- poll_id FK is deferred to Step 1d after polls table is created (Pitfall 1).
-- Conditional body constraint added last (Pitfall 4).
-- =============================================================

-- Step 1a: Drop body NOT NULL (D-01)
ALTER TABLE public.messages
  ALTER COLUMN body DROP NOT NULL;

-- Step 1b: Add new columns (D-02, D-03, D-04, D-07)
-- NOTE: poll_id FK added in Step 1d after polls table is created (Pitfall 1)
ALTER TABLE public.messages
  ADD COLUMN image_url            text,
  ADD COLUMN reply_to_message_id  uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN message_type         text NOT NULL DEFAULT 'text'
                                  CHECK (message_type IN ('text', 'image', 'poll'));

-- Step 1c: Conditional body constraint — body required only for text messages (D-01, Pitfall 4)
-- Logic: message_type <> 'text' OR body IS NOT NULL
-- Reads as: "if it IS a text message, body must be set; otherwise body may be null"
ALTER TABLE public.messages
  ADD CONSTRAINT messages_body_required
  CHECK (message_type <> 'text' OR body IS NOT NULL);

-- =============================================================
-- SECTION 2 — polls, poll_options, poll_votes tables (D-09)
-- polls created before poll_id FK so Step 1d can reference it (Pitfall 1 avoidance).
-- poll_votes composite PK (poll_id, user_id) enforces single-choice vote per user per poll.
-- poll_options position CHECK (1–4) matches 2–4 options constraint in create_poll().
-- RLS policies for these tables are in SECTION 4b (after is_channel_member is defined).
-- =============================================================

CREATE TABLE public.polls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  question     text NOT NULL,
  created_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.poll_options (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label    text NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 4)
);
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.poll_votes (
  poll_id   uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Step 1d: Add poll_id FK now that polls table exists (Pitfall 1 avoidance)
ALTER TABLE public.messages
  ADD COLUMN poll_id uuid REFERENCES public.polls(id) ON DELETE SET NULL;

-- =============================================================
-- SECTION 3 — message_reactions table (D-09)
-- Composite PK (message_id, user_id, emoji) enforces one reaction per emoji per user.
-- RLS policies are in SECTION 4b (after is_channel_member is defined).
-- =============================================================

CREATE TABLE public.message_reactions (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- SECTION 4 — is_channel_member() SECURITY DEFINER helper (D-05, D-06)
-- Must appear BEFORE any CREATE POLICY that calls it (Pitfall 3).
-- Covers all 3 channel types via text discriminant.
-- STABLE + SET search_path = '' follows is_group_channel_member pattern from 0017.
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_channel_member(
  p_channel_type text,
  p_channel_id   uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_channel_type
    WHEN 'plan' THEN EXISTS (
      SELECT 1 FROM public.plan_members
      WHERE plan_id = p_channel_id
        AND user_id = (SELECT auth.uid())
    )
    WHEN 'dm' THEN EXISTS (
      SELECT 1 FROM public.dm_channels
      WHERE id = p_channel_id
        AND (user_a = (SELECT auth.uid()) OR user_b = (SELECT auth.uid()))
    )
    WHEN 'group' THEN EXISTS (
      SELECT 1 FROM public.group_channel_members
      WHERE group_channel_id = p_channel_id
        AND user_id = (SELECT auth.uid())
    )
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_channel_member(text, uuid) TO authenticated;

-- =============================================================
-- SECTION 4b — RLS policies for polls, poll_options, poll_votes, message_reactions
-- All policies reference public.is_channel_member() — safe here because SECTION 4 precedes.
-- =============================================================

-- polls: channel member can SELECT; no direct INSERT (create_poll() RPC only — T-12-03)
CREATE POLICY "polls_select_channel_member"
  ON public.polls FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = polls.message_id
        AND (
          (m.plan_id IS NOT NULL AND public.is_channel_member('plan', m.plan_id))
          OR (m.dm_channel_id IS NOT NULL AND public.is_channel_member('dm', m.dm_channel_id))
          OR (m.group_channel_id IS NOT NULL AND public.is_channel_member('group', m.group_channel_id))
        )
    )
  );

-- poll_options: same channel membership check via poll -> message (T-12-07)
CREATE POLICY "poll_options_select_channel_member"
  ON public.poll_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.messages m ON m.id = p.message_id
      WHERE p.id = poll_options.poll_id
        AND (
          (m.plan_id IS NOT NULL AND public.is_channel_member('plan', m.plan_id))
          OR (m.dm_channel_id IS NOT NULL AND public.is_channel_member('dm', m.dm_channel_id))
          OR (m.group_channel_id IS NOT NULL AND public.is_channel_member('group', m.group_channel_id))
        )
    )
  );

-- poll_votes: channel member can SELECT; authenticated user can INSERT/UPDATE own vote
-- Composite PK enforces one active vote row per user per poll (T-12-06)
CREATE POLICY "poll_votes_select_channel_member"
  ON public.poll_votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.messages m ON m.id = p.message_id
      WHERE p.id = poll_votes.poll_id
        AND (
          (m.plan_id IS NOT NULL AND public.is_channel_member('plan', m.plan_id))
          OR (m.dm_channel_id IS NOT NULL AND public.is_channel_member('dm', m.dm_channel_id))
          OR (m.group_channel_id IS NOT NULL AND public.is_channel_member('group', m.group_channel_id))
        )
    )
  );

CREATE POLICY "poll_votes_insert_own"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "poll_votes_update_own"
  ON public.poll_votes FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- message_reactions: channel member can SELECT (T-12-01); INSERT own reaction (T-12-02);
-- DELETE own reaction only
CREATE POLICY "message_reactions_select_channel_member"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND (
          (m.plan_id IS NOT NULL AND public.is_channel_member('plan', m.plan_id))
          OR (m.dm_channel_id IS NOT NULL AND public.is_channel_member('dm', m.dm_channel_id))
          OR (m.group_channel_id IS NOT NULL AND public.is_channel_member('group', m.group_channel_id))
        )
    )
  );

CREATE POLICY "message_reactions_insert_channel_member"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
        AND (
          (m.plan_id IS NOT NULL AND public.is_channel_member('plan', m.plan_id))
          OR (m.dm_channel_id IS NOT NULL AND public.is_channel_member('dm', m.dm_channel_id))
          OR (m.group_channel_id IS NOT NULL AND public.is_channel_member('group', m.group_channel_id))
        )
    )
  );

CREATE POLICY "message_reactions_delete_own"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =============================================================
-- SECTION 5 — create_poll() atomic RPC (D-09)
-- Atomically inserts poll row + option rows + links message.poll_id in one transaction.
-- Validates auth.uid() and option count before any DML (T-12-04).
-- Follows create_expense() pattern from 0015 (plpgsql, SECURITY DEFINER, FOREACH loop).
-- =============================================================

CREATE OR REPLACE FUNCTION public.create_poll(
  p_message_id  uuid,
  p_question    text,
  p_options     text[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller  uuid := auth.uid();
  v_poll_id uuid;
  v_label   text;
  v_pos     int := 1;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF array_length(p_options, 1) < 2 OR array_length(p_options, 1) > 4 THEN
    RAISE EXCEPTION 'polls require 2-4 options';
  END IF;

  INSERT INTO public.polls (message_id, question, created_by)
  VALUES (p_message_id, p_question, v_caller)
  RETURNING id INTO v_poll_id;

  FOREACH v_label IN ARRAY p_options LOOP
    INSERT INTO public.poll_options (poll_id, label, position)
    VALUES (v_poll_id, v_label, v_pos);
    v_pos := v_pos + 1;
  END LOOP;

  UPDATE public.messages SET poll_id = v_poll_id WHERE id = p_message_id;

  RETURN v_poll_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_poll(uuid, text, text[]) TO authenticated;

-- =============================================================
-- SECTION 6 — chat-media Storage bucket (D-08)
-- Public read access. UUID-namespaced paths (mirrors plan-covers pattern from 0014).
-- ON CONFLICT DO NOTHING ensures idempotency if migration is replayed.
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Authenticated users can update chat media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media');

CREATE POLICY "Public read access for chat media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');
