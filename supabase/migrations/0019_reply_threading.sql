-- Phase v1.5 Migration 0019 — Reply threading: soft-delete support + RLS UPDATE policy.
-- Implements Phase 14 schema requirements per 14-RESEARCH.md Pitfalls 1 and 2.
-- Decisions: add 'deleted' to message_type CHECK; add messages_soft_delete_own UPDATE policy.
-- The existing messages_body_required CHECK (message_type <> 'text' OR body IS NOT NULL)
-- already permits body=NULL when message_type != 'text' — no change needed to that constraint.

-- Step 1: Widen message_type CHECK to include 'deleted'.
-- Drop the old named constraint and recreate with the extended list.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'poll', 'deleted'));

-- Step 2: Add UPDATE RLS policy for soft-delete own messages.
-- Mirrors poll_votes_update_own pattern from migration 0018 (lines 187-197).
-- USING clause ensures the row belongs to the authenticated user.
-- WITH CHECK clause ensures the update only sets sender_id to the same user (no spoofing).
CREATE POLICY "messages_soft_delete_own"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()))
  WITH CHECK (sender_id = (SELECT auth.uid()));
