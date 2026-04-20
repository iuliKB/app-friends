---
phase: 12-schema-foundation
plan: 01
subsystem: database
tags: [migration, schema, rls, rpc, storage]
dependency_graph:
  requires: []
  provides:
    - polls table with RLS
    - poll_options table with RLS
    - poll_votes table with RLS
    - message_reactions table with RLS
    - is_channel_member() SECURITY DEFINER helper
    - create_poll() atomic RPC
    - chat-media storage bucket
    - messages.image_url column
    - messages.reply_to_message_id column
    - messages.message_type column
    - messages.poll_id column
    - messages.body nullable
  affects:
    - messages table (body nullable, 4 new columns)
    - storage.buckets (chat-media added)
    - storage.objects (3 new policies for chat-media)
tech_stack:
  added: []
  patterns:
    - SECURITY DEFINER function with SET search_path='' (is_channel_member, create_poll)
    - text CHECK column over Postgres enum (message_type)
    - Composite PK junction tables (poll_votes, message_reactions)
    - Conditional CHECK constraint (messages_body_required)
    - Atomic plpgsql RPC with FOREACH loop (create_poll)
    - Storage bucket creation in migration (chat-media)
key_files:
  created:
    - supabase/migrations/0018_chat_v1_5.sql
  modified: []
decisions:
  - "D-01: messages.body made nullable; conditional CHECK messages_body_required enforces body IS NOT NULL only for message_type='text'"
  - "D-03: message_type as text CHECK('text'|'image'|'poll') not Postgres enum — avoids ALTER TYPE friction"
  - "D-04: message_type NOT NULL DEFAULT 'text' ensures existing rows are unaffected"
  - "D-05/D-06: is_channel_member(type, id) SECURITY DEFINER + SET search_path='' covers all 3 channel types as single helper"
  - "D-07: reply_to_message_id FK ON DELETE SET NULL — replies remain with null preview when original deleted"
  - "D-08: chat-media bucket public=true with idempotent ON CONFLICT DO NOTHING"
  - "D-09: message_reactions table created; Realtime delivery strategy deferred to Phase 15"
  - "Pitfall 1 avoided: poll_id FK added after polls table creation (Step 1d pattern)"
  - "Pitfall 3 avoided: is_channel_member() defined in SECTION 4 before all policies in SECTION 4b"
  - "Migration history repair required: remote had 3 untracked migrations (20260416224132, 20260416234436, 20260417001134) marked reverted; 0017 marked applied (already in remote DB)"
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_created: 1
  files_modified: 0
  completed_date: "2026-04-20"
---

# Phase 12 Plan 01: Migration 0018 Schema Foundation Summary

**One-liner:** Supabase migration 0018 delivering polls/reactions/media/reply schema with SECURITY DEFINER channel membership helper, atomic create_poll() RPC, and chat-media storage bucket — all backwards-compatible with existing chat.

## What Was Built

### supabase/migrations/0018_chat_v1_5.sql (290 lines, 6 sections)

**SECTION 1 — messages column additions (D-01, D-02, D-03, D-04, D-07)**
- Dropped `body NOT NULL` (D-01)
- Added `image_url text`, `reply_to_message_id uuid FK ON DELETE SET NULL`, `message_type text NOT NULL DEFAULT 'text' CHECK (... IN ('text','image','poll'))` (D-03, D-04)
- Added `messages_body_required` CHECK constraint: `message_type <> 'text' OR body IS NOT NULL` (D-01, conditional)
- `poll_id` FK deferred to Step 1d after polls table creation (Pitfall 1 avoidance)

**SECTION 2 — polls, poll_options, poll_votes tables**
- `polls(id, message_id FK CASCADE, question, created_by, created_at)` + ENABLE RLS
- `poll_options(id, poll_id FK CASCADE, label, position smallint CHECK 1-4)` + ENABLE RLS
- `poll_votes(poll_id, option_id, user_id, voted_at, PRIMARY KEY (poll_id, user_id))` + ENABLE RLS — composite PK enforces single-choice vote (T-12-06)
- Step 1d: `ALTER TABLE messages ADD COLUMN poll_id uuid REFERENCES public.polls(id) ON DELETE SET NULL`

**SECTION 3 — message_reactions table**
- `message_reactions(message_id, user_id, emoji, created_at, PRIMARY KEY (message_id, user_id, emoji))` + ENABLE RLS
- Composite 3-column PK enforces one-reaction-per-emoji-per-user at database level

**SECTION 4 — is_channel_member() SECURITY DEFINER helper (D-05, D-06)**
- `is_channel_member(p_channel_type text, p_channel_id uuid) RETURNS boolean`
- LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
- CASE dispatch on 'plan'/'dm'/'group' → EXISTS subquery against plan_members / dm_channels / group_channel_members
- GRANT EXECUTE TO authenticated (T-12-05 mitigation)

**SECTION 4b — RLS policies for all new tables**
- `polls_select_channel_member`: EXISTS join through messages → is_channel_member (T-12-07)
- `poll_options_select_channel_member`: EXISTS join through polls → messages → is_channel_member
- `poll_votes_select_channel_member`, `poll_votes_insert_own`, `poll_votes_update_own` (Phase 17 vote change support)
- `message_reactions_select_channel_member` (T-12-01), `message_reactions_insert_channel_member` (T-12-02), `message_reactions_delete_own`
- No direct INSERT on polls or poll_options — only create_poll() SECURITY DEFINER can write (T-12-03)

**SECTION 5 — create_poll() atomic RPC (D-09)**
- `create_poll(p_message_id uuid, p_question text, p_options text[]) RETURNS uuid`
- LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
- Validates auth.uid() not null, validates 2-4 options
- INSERT polls → FOREACH INSERT poll_options → UPDATE messages.poll_id — all in one transaction
- GRANT EXECUTE TO authenticated

**SECTION 6 — chat-media storage bucket (D-08)**
- `INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING`
- Three storage.objects policies: INSERT authenticated, UPDATE authenticated, SELECT public

## Migration Push Result

- `supabase db push` applied 0018_chat_v1_5.sql with **zero errors**
- Migration history repair required before push (see deviations below)

### Verification Queries (all passed)

| Check | Result |
|-------|--------|
| Tables: polls, poll_options, poll_votes, message_reactions | 4 rows returned |
| Functions: is_channel_member, create_poll | 2 rows returned |
| storage.buckets WHERE id='chat-media' | 1 row: public=true |
| messages.body is_nullable | YES |
| messages.message_type is_nullable | NO |
| messages new columns (image_url, reply_to_message_id, message_type, poll_id) | 4 rows returned |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Migration History Deviation (expected, not a bug)

**Found during:** Task 2 (supabase db push)

**Issue:** Remote database had 3 migration history entries (20260416224132, 20260416234436, 20260417001134) not present in local migrations directory. Also, migration 0017 was absent from remote migration history despite its schema changes already being applied.

**Fix:** Ran `supabase migration repair --status reverted` for the 3 unknown remote entries, then `supabase migration repair --status applied 0017` to mark 0017 as already applied. Then re-ran `supabase db push` which applied only 0018.

**Root cause:** These appear to be migrations applied via the Supabase dashboard or another tooling path during v1.4 development that were not tracked in the local CLI history.

**Files modified:** None (migration history is database state, not file state)

## Known Stubs

None — this plan is pure infrastructure (migration + database objects). No UI or TypeScript changes in this plan.

## Threat Flags

No new threat surface introduced beyond what is documented in the plan's threat model. All STRIDE threats (T-12-01 through T-12-09) are mitigated in the migration as designed.

## Self-Check: PASSED

- File exists: `/Users/iulian/Develop/campfire/supabase/migrations/0018_chat_v1_5.sql` ✓
- Commit 3c5224c exists ✓
- Migration applied: 0018 | 0018 in `supabase migration list` ✓
- 4 new tables verified in live DB ✓
- 2 new functions verified in live DB ✓
- chat-media bucket verified in live DB ✓
- messages new columns verified in live DB ✓
