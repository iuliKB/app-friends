-- Phase 33 — Add nullable bio column to profiles (D-05 / REQ-FP-02).
-- Migration numbering: 0025 (fix_habits_select_invitee) and 0026 (chat_todos_multi_scope)
-- are taken; 0027 is the next free slot per RESEARCH §Code-level Confirmations #1.
-- No RLS change required: profiles_select_authenticated covers SELECT for any
-- authenticated user (anyone in get_friends() already can read every profile column);
-- profiles_update_own covers owner-only UPDATE. New bio column inherits both.
-- No CHECK constraint — 160-char cap is enforced client-side on /profile/edit
-- (single source of truth) per RESEARCH §Recommendations §Bio CHECK constraint stance.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
