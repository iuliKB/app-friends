---
phase: 01-push-infrastructure-dm-entry-point
plan: 02
subsystem: push-infrastructure
tags: [supabase, migration, push-tokens, schema, rls]
dependency-graph:
  requires:
    - "supabase/migrations/0003_push_tokens.sql (existing push_tokens table + RLS)"
  provides:
    - "push_tokens.device_id (TEXT NOT NULL)"
    - "push_tokens.last_seen_at (TIMESTAMPTZ NOT NULL DEFAULT now())"
    - "push_tokens.invalidated_at (TIMESTAMPTZ NULL)"
    - "Composite unique (user_id, device_id) via idx_push_tokens_user_device"
    - "Partial index idx_push_tokens_active WHERE invalidated_at IS NULL"
  affects:
    - "src/hooks/usePushNotifications.ts (Plan 05 — will upsert on user_id+device_id)"
    - "supabase/functions/notify-plan-invite/index.ts (Plan 07 — will filter invalidated_at IS NULL)"
tech-stack:
  added: []
  patterns:
    - "Three-step migration: ADD nullable → UPDATE backfill → ALTER SET NOT NULL"
    - "PostgreSQL default constraint name (push_tokens_user_id_token_key) for safe DROP IF EXISTS"
    - "Partial index for cheap active-token fan-out reads"
key-files:
  created:
    - "supabase/migrations/0004_push_tokens_v1_3.sql"
  modified: []
decisions:
  - "Used three-step add/backfill/not-null pattern to avoid data loss on existing rows (D-14)"
  - "Backfill legacy device_id as 'legacy:' || id::text for stable, identifiable migration"
  - "RLS policy left untouched — existing 'Users manage own push tokens' covers new columns (D-15)"
  - "Partial index instead of full index — only active tokens are read in fan-out"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-06"
  tasks-completed: "1 of 2 (Task 2 is human-action checkpoint, awaiting `supabase db push`)"
---

# Phase 1 Plan 02: push_tokens v1.3 Schema Migration Summary

Migration `0004_push_tokens_v1_3.sql` evolves `public.push_tokens` from token-keyed to device-keyed uniqueness, adding the `device_id`, `last_seen_at`, and `invalidated_at` columns required for stale-token reaping (Plan 07) and per-device opt-out (Plan 05).

## What Changed

Created `supabase/migrations/0004_push_tokens_v1_3.sql` containing the verbatim shape from `01-RESEARCH.md`, validated against the existing `0003_push_tokens.sql` schema:

1. **Step 1 — ADD COLUMN nullable:** `device_id TEXT`, `last_seen_at TIMESTAMPTZ`, `invalidated_at TIMESTAMPTZ` added without `NOT NULL` so existing rows are not rejected.
2. **Step 2 — Backfill:** `UPDATE` sets `device_id = 'legacy:' || id::text` and `last_seen_at = COALESCE(last_seen_at, created_at)` for any pre-existing rows.
3. **Step 3 — SET NOT NULL + DEFAULT:** `device_id` and `last_seen_at` made `NOT NULL`; `last_seen_at` gets `DEFAULT now()` for future inserts.
4. **Step 4 — Constraint swap:** `DROP CONSTRAINT IF EXISTS push_tokens_user_id_token_key` (PostgreSQL default name from the original `UNIQUE(user_id, token)` clause), then `CREATE UNIQUE INDEX idx_push_tokens_user_device ON public.push_tokens (user_id, device_id)`.
5. **Step 5 — Partial active index:** `CREATE INDEX idx_push_tokens_active ON public.push_tokens (user_id) WHERE invalidated_at IS NULL` enables cheap fan-out filtering for Plan 07's `notify-plan-invite` Edge Function.
6. **RLS:** Untouched. The existing `Users manage own push tokens` policy from `0003_push_tokens.sql` already covers SELECT/INSERT/UPDATE/DELETE on the new columns (D-15).

## Acceptance Criteria

All Task 1 acceptance criteria pass:

- File exists at `supabase/migrations/0004_push_tokens_v1_3.sql`
- Contains `ADD COLUMN device_id`, `ADD COLUMN last_seen_at`, `ADD COLUMN invalidated_at`
- Contains `CREATE UNIQUE INDEX idx_push_tokens_user_device`
- Contains `CREATE INDEX idx_push_tokens_active` and `WHERE invalidated_at IS NULL`
- Contains `legacy:` backfill prefix
- Contains `DROP CONSTRAINT IF EXISTS push_tokens_user_id_token_key`
- Does NOT contain `DROP TABLE` or `CREATE POLICY` (RLS unchanged, verified by absence)

## Deviations from Plan

None — plan executed exactly as written. The migration content matches the verbatim block in `01-02-PLAN.md`.

**Note on filename:** A pre-existing migration `0004_fix_plan_members_rls_recursion.sql` already lives in `supabase/migrations/`. Supabase orders migrations lexicographically, so `0004_fix_plan_members_rls_recursion.sql` and `0004_push_tokens_v1_3.sql` coexist without conflict — the `fix_*` file applies before the `push_*` file alphabetically. No rename needed.

## Authentication Gates

None during Task 1. Task 2 (`supabase db push`) is a human-action checkpoint, not an auth gate — `SUPABASE_ACCESS_TOKEN` is already configured per planning context.

## Commits

- `0b53bcb` — feat(01-02): add push_tokens v1.3 schema migration

## Next Step

**Task 2 is a blocking human-action checkpoint.** The user must:

1. Review `supabase/migrations/0004_push_tokens_v1_3.sql` end-to-end
2. Run `supabase db push`
3. Verify schema in Supabase SQL editor (`\d public.push_tokens`)
4. Spot-check legacy backfill (`SELECT id, device_id FROM public.push_tokens LIMIT 5;`)
5. Reply with "schema pushed" to resume

Plans 05 and 07 depend on the new columns existing in the live database before they can be implemented.

## Self-Check: PASSED

- FOUND: supabase/migrations/0004_push_tokens_v1_3.sql
- FOUND: commit 0b53bcb
