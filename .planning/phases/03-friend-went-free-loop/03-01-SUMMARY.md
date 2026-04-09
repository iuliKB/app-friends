---
phase: 03-friend-went-free-loop
plan: "01"
subsystem: database
tags: [postgres, supabase, migrations, pg_net, rls, security-definer, triggers, rpc, webhooks]

requires:
  - phase: 02-status-liveness-ttl
    provides: "public.statuses table with status/context_tag/updated_at columns, effective_status view, public.push_tokens table with invalidated_at, availability_status enum, is_friend_of() helper"
  - phase: 01-push-infrastructure-dm-entry-point
    provides: "public.push_tokens table schema (user_id, token, platform, device_id, invalidated_at)"

provides:
  - "Migration 0010_friend_went_free_v1_3.sql — complete Phase 3 DB schema layer"
  - "public.free_transitions outbox table with partial index on unsent rows"
  - "public.friend_free_pushes rate-limit log table with pair+recipient indexes"
  - "profiles.timezone TEXT NULL + profiles.notify_friend_free BOOLEAN NOT NULL DEFAULT true"
  - "on_status_went_free AFTER UPDATE trigger on statuses (status='free' guard)"
  - "get_friend_free_candidates(p_sender uuid) SECURITY DEFINER RPC"
  - "dispatch_free_transition() webhook trigger via extensions.http_post to notify-friend-free Edge Function"
  - "pg_net extension enabled in extensions schema"

affects:
  - "03-02 (applies migration via supabase db push)"
  - "03-03 (notify-friend-free Edge Function reads free_transitions + friend_free_pushes, calls get_friend_free_candidates)"
  - "03-04 (client primitives write profiles.timezone, read/write profiles.notify_friend_free)"

tech-stack:
  added: ["pg_net 0.20.0 (webhook dispatch via extensions.http_post)"]
  patterns:
    - "SECURITY DEFINER SET search_path='' for all trigger functions and RPCs (Phase 2 T-02-09 hardening)"
    - "Outbox pattern: INSERT-only table with sent_at NULL partial index, consumed by Edge Function"
    - "Rate-limit log: every push decision recorded (sent or suppressed) with suppression_reason"
    - "Fail-soft webhook: if GUC unset, leave row unsent for monitoring query"
    - "Deny-by-default RLS: ENABLE ROW LEVEL SECURITY with zero client policies on service-internal tables"

key-files:
  created:
    - supabase/migrations/0010_friend_went_free_v1_3.sql
  modified: []

key-decisions:
  - "pg_net installed under 'extensions' schema (Supabase standard) — dispatcher uses extensions.http_post()"
  - "Webhook dispatcher reads GUCs app.edge_functions_url + app.service_role_key; fails-soft (returns NEW) if unset"
  - "get_friend_free_candidates REVOKED from PUBLIC + anon + authenticated — service-role only"
  - "No retention rollup on friend_free_pushes deferred to v1.4 per D-13 (v1.3 scale safe)"
  - "Zero CREATE POLICY on free_transitions / friend_free_pushes — deny-by-default to all clients"

patterns-established:
  - "Outbox table with sent_at NULL partial index for efficient sweep by Edge Function"
  - "SECURITY DEFINER function with pinned search_path='' for all DB trust-zone functions"
  - "REVOKE ALL from PUBLIC + anon + authenticated on service-only RPCs"

requirements-completed: [FREE-02, FREE-03, FREE-04, FREE-05, FREE-06, FREE-07, FREE-10, FREE-11]

duration: 8min
completed: 2026-04-08
---

# Phase 03 Plan 01: Friend Went Free Loop — DB Schema Summary

**Postgres schema layer for the friend-went-free push loop: outbox table, rate-limit log, profiles timezone/toggle columns, AFTER UPDATE trigger, SECURITY DEFINER RPC, and pg_net webhook dispatcher — all in a single migration file ready for Plan 03-02 to apply.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08T00:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Authored `supabase/migrations/0010_friend_went_free_v1_3.sql` with all Phase 3 schema in one version-controlled file
- Three SECURITY DEFINER functions with `SET search_path=''` covering T-03-01, T-03-02, T-03-03 threat mitigations
- Deny-by-default RLS on `free_transitions` and `friend_free_pushes` (T-03-04, T-03-05)
- get_friend_free_candidates RPC returns full candidate set (friends + effective_status + push_tokens + local_hour) in one query — Edge Function needs zero extra round-trips

## Task Commits

Each task was committed atomically:

1. **Task 1: Author migration 0010 with schema, trigger, RPC, webhook dispatch** - `0d17be2` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `supabase/migrations/0010_friend_went_free_v1_3.sql` - Complete Phase 3 schema: pg_net, profiles columns, free_transitions outbox, friend_free_pushes log, on_status_went_free trigger, get_friend_free_candidates RPC, dispatch_free_transition webhook trigger

## Decisions Made

- Webhook dispatcher uses `extensions.http_post()` per Supabase standard pg_net placement. Plan 03-02 attestation note: if extension landed in `net` schema instead, call is patched to `net.http_post()` (one-character change).
- Fail-soft pattern: if `app.edge_functions_url` or `app.service_role_key` GUCs are unset at INSERT time, dispatcher returns NEW without calling pg_net — row stays unsent and surfaces in D-19 monitoring query.
- `get_friend_free_candidates` REVOKED from PUBLIC, anon, and authenticated roles — only service-role callers (Edge Function) can invoke it.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None at this stage. Plan 03-02 owns GUC configuration (`app.edge_functions_url`, `app.service_role_key`) and `supabase db push` execution behind a human checkpoint.

## Next Phase Readiness

- Migration 0010 authored and committed — Plan 03-02 unblocked to apply via `supabase db push`
- Plans 03-03 (Edge Function) and 03-04 (client primitives) can develop in parallel against the known schema contract from this file
- Schema contract: `free_transitions(id, sender_id, occurred_at, context_tag, sent_at, attempts, last_error)`, `friend_free_pushes(id, recipient_id, sender_id, sent_at, suppressed, suppression_reason)`, `profiles.{timezone, notify_friend_free}`, RPC `get_friend_free_candidates(uuid)`

## Known Stubs

None — migration file is complete SQL with no placeholder values or stub data.

## Threat Flags

None — all new surface documented in the plan's threat model (T-03-01..T-03-10). All `mitigate` dispositions implemented: SECURITY DEFINER + search_path hardening on all three functions, deny-by-default RLS on both tables, REVOKE on RPC.

## Self-Check: PASSED

- `/Users/iulian/Develop/campfire/.claude/worktrees/agent-adbc8e18/supabase/migrations/0010_friend_went_free_v1_3.sql` — FOUND
- Commit `0d17be2` — FOUND (git log confirms)

---
*Phase: 03-friend-went-free-loop*
*Completed: 2026-04-08*
