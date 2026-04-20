---
phase: 14-reply-threading
plan: 01
subsystem: database/types
tags: [migration, rls, typescript, soft-delete]
dependency_graph:
  requires: [0018_chat_v1_5.sql]
  provides: [0019_reply_threading.sql, MessageType.deleted]
  affects: [src/types/chat.ts, public.messages]
tech_stack:
  added: []
  patterns: [ALTER TABLE DROP/ADD CONSTRAINT, CREATE POLICY FOR UPDATE, RLS USING+WITH CHECK]
key_files:
  created:
    - supabase/migrations/0019_reply_threading.sql
  modified:
    - src/types/chat.ts
decisions:
  - "Drop+recreate messages_message_type_check constraint to widen to include 'deleted' (idiomatic Postgres pattern for named CHECK widening)"
  - "messages_soft_delete_own UPDATE RLS policy uses USING+WITH CHECK (sender_id = auth.uid()) to prevent both cross-user updates and sender_id spoofing"
  - "Pre-existing TypeScript errors in friends/[id].tsx are out-of-scope; no errors introduced by this plan"
metrics:
  duration: ~2 minutes
  completed: 2026-04-20
  tasks_completed: 3
  files_changed: 2
---

# Phase 14 Plan 01: Schema Foundation for Soft-Delete Summary

**One-liner:** Migration 0019 widens the messages_message_type_check constraint to permit 'deleted', adds a scoped UPDATE RLS policy for soft-delete, and extends the TypeScript MessageType union — unblocking all subsequent reply threading plans.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write migration 0019_reply_threading.sql | 300bbe8 | supabase/migrations/0019_reply_threading.sql |
| 2 | Apply migration via supabase db push | (runtime) | live Supabase project |
| 3 | Update MessageType in src/types/chat.ts | 510cb54 | src/types/chat.ts |

## Verification Results

1. `supabase/migrations/0019_reply_threading.sql` exists and contains `messages_soft_delete_own` and `messages_message_type_check` with `'deleted'` — PASS
2. `supabase db push --dry-run` returned "Remote database is up to date" — PASS
3. `src/types/chat.ts` MessageType includes `'deleted'` — PASS
4. `npx tsc --noEmit` — no errors in plan files (chat.ts) — PASS

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what was planned. The `messages_soft_delete_own` RLS policy (T-14-01-01, T-14-01-02) was included in the plan's threat model and implemented as designed.

## Notes

- Pre-existing TypeScript errors in `src/app/friends/[id].tsx` (3 errors, TS2345/TS2322) were present before this plan and are out of scope. Logged for deferred resolution.
- The `messages_body_required` CHECK constraint (`message_type <> 'text' OR body IS NOT NULL`) required no changes — it already permits `body=NULL` when `message_type != 'text'`, so a soft-deleted message (`message_type='deleted'`, `body=NULL`) satisfies it naturally.

## Self-Check: PASSED

- [x] `supabase/migrations/0019_reply_threading.sql` exists on disk
- [x] Commit `300bbe8` exists in git log
- [x] Commit `510cb54` exists in git log
- [x] `src/types/chat.ts` line 1 contains `'deleted'`
