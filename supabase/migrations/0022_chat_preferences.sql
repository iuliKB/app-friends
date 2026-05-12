-- Migration 0022 — Chat preferences: mute and hide per-user per-chat.
-- Decisions:
--   D-01 Single table covers all chat types (dm | plan | group) via (chat_type, chat_id).
--   D-02 is_hidden soft-deletes DM/plan chats from the list without touching shared data.
--   D-03 Group delete is a hard leave (DELETE on group_channel_members), not is_hidden.
--   D-04 RLS: simple FOR ALL policy — users own their rows.
--   D-05 New DELETE policy on group_channel_members lets any member leave themselves.

-- ============================================================
-- SECTION 1 — chat_preferences table
-- ============================================================
CREATE TABLE public.chat_preferences (
  user_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_type  text    NOT NULL CHECK (chat_type IN ('dm', 'plan', 'group')),
  chat_id    uuid    NOT NULL,
  is_muted   boolean NOT NULL DEFAULT false,
  is_hidden  boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_type, chat_id)
);

ALTER TABLE public.chat_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 2 — RLS: users own their preferences
-- ============================================================
CREATE POLICY "chat_preferences_own"
  ON public.chat_preferences FOR ALL TO authenticated
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================
-- SECTION 3 — Allow group members to leave (delete own row)
-- ============================================================
CREATE POLICY "group_channel_members_delete_self"
  ON public.group_channel_members FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
