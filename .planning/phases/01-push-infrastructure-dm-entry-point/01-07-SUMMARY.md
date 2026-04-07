---
phase: 01-push-infrastructure-dm-entry-point
plan: 07
subsystem: edge-function-update
tags: [supabase-edge-function, plan-invite, ticket-errors, channel-routing, stale-token-cleanup]
requires:
  - "supabase/migrations/0008_push_tokens_v1_3.sql (invalidated_at column must exist on the remote)"
  - "Plan 02 (migration applied — done)"
  - "Plan 03 (notifications-init defines the four Android channels — done)"
provides:
  - "notify-plan-invite filters out invalidated tokens (PUSH-09 consumer)"
  - "Outbound push payload includes channelId: 'plan_invites' (D-19)"
  - "Ticket-level DeviceNotRegistered errors mark tokens invalidated_at (D-22 / PUSH-09 producer)"
affects:
  - "Active plan-invite delivery on the linked Supabase project (after manual deploy)"
  - "Future Edge Functions can copy the ticket-error parsing pattern (Plan 03 of Phase 3 — Friend went Free)"
tech-stack:
  added: []
  patterns:
    - "ExpoTicket / ExpoSendResponse type definitions for ticket-level error parsing"
    - "Index-aligned token-to-ticket correlation (Expo guarantees response order matches submission order)"
    - "Batch UPDATE WHERE token IN (...) for marking invalidated tokens in one round-trip"
key-files:
  modified:
    - "supabase/functions/notify-plan-invite/index.ts (additive: filter, channelId, ticket parsing)"
decisions:
  - "channelId is included on every outbound message — legacy installs ignore unknown channels, new installs route to plan_invites MAX (D-19)"
  - "DeviceNotRegistered is the only error code that maps to permanent invalidation in v1.3 — other ticket errors (MessageRateExceeded, MessageTooBig, etc.) are left transient since they don't indicate token death"
  - "Response body shape changed from text passthrough to JSON stringification — webhook caller still receives the same JSON content, just no longer relies on Expo's response being text"
  - "Edge Function code is output for manual review/deploy per the v1.3 milestone non-negotiable — Task 2 is a checkpoint, not auto-executed"
metrics:
  duration: "~5 min (sequential inline)"
  completed: "2026-04-07"
  tasks: 2 (Task 1 code, Task 2 deferred manual deploy)
---

# Phase 01 Plan 07: notify-plan-invite Edge Function Update Summary

Three additive changes to `supabase/functions/notify-plan-invite/index.ts` close the loop between Plan 02's `invalidated_at` schema column, Plan 03's `plan_invites` Android channel, and Plan 05's client-side device-keyed registration. Closes PUSH-05 (the silent plan-invite delivery gap on fresh installs) and the producer half of PUSH-09 (stale token reaping).

## What Was Built

### Task 1: Edge Function update (committed)

Three minimal changes layered onto the existing 64-line function — structure, bearer auth, webhook contract, self-invite short-circuit, and no-tokens short-circuit are all preserved:

1. **Tokens query filters invalidated rows.** Added `.is('invalidated_at', null)` to the parallel-fetch tokens query so already-marked-stale tokens are silently skipped on every send. This means: a token marked invalidated by a previous send's ticket-error pass will never be retried.

2. **`channelId: 'plan_invites'` in every outbound message.** Per D-19, new Android installs (post Plan 03) own a dedicated MAX-importance channel for plan invites. Adding `channelId` routes to that channel. Legacy installs that were registered before Plan 03 (using the dormant `default` channel) ignore unknown channelId values gracefully — the push still delivers, just on the legacy channel until the user reinstalls.

3. **Ticket-level error parsing → mark invalidated.** Expo's push service returns errors inside HTTP 200 responses. The new code:
   - Parses the response JSON as `ExpoSendResponse` (typed)
   - Iterates `body.data[]` (Expo guarantees the array order matches the submitted message order)
   - Collects tokens whose ticket has `status === 'error'` AND `details.error === 'DeviceNotRegistered'`
   - Issues a single batch `UPDATE push_tokens SET invalidated_at = now() WHERE token IN (...)`

   This is the producer side of the stale-token cleanup loop. The consumer side (the `is('invalidated_at', null)` filter from change 1) means the next send naturally excludes the token without any extra logic.

The function still returns the Expo response body to the webhook caller — the only difference is it's now JSON-stringified explicitly rather than passed through as text. Same content, slightly stricter typing.

### Task 2: Manual deploy checkpoint (DEFERRED)

Per the v1.3 milestone non-negotiable ("Edge function code + SQL migrations are output for manual review and apply, never auto-deployed"), the plan declares `autonomous: false` and Task 2 is a `checkpoint:human-action`. The user must run:

```
supabase functions deploy notify-plan-invite
```

The user has chosen to defer all runtime verification (including this deploy) to the end of v1.3 alongside the EAS development build and the Wave 5 smoke test. Until the function is deployed:

- The remote project still runs the v1.2-era version of `notify-plan-invite` which:
  - Does NOT filter invalidated tokens (won't matter until tokens start getting marked invalidated, which only happens after this version is deployed)
  - Does NOT set `channelId` (Android plan-invite pushes on new installs land on the legacy `default` channel until deployed)
  - Does NOT parse ticket errors (stale tokens accumulate forever)

None of these are blocking for Wave 3 / Wave 4 client-side work — they're observable effects that only matter once a real device is exercising the system.

## Deviations from Plan

None. Task 1 executed verbatim. Task 2 is deferred per the user's pacing decision.

## Commits

| Task | Description                                                                       | Commit  |
| ---- | --------------------------------------------------------------------------------- | ------- |
| 1    | feat(01-07): filter invalidated tokens, add channelId, parse ticket errors        | b81aedc |
| 2    | (deferred) `supabase functions deploy notify-plan-invite`                         | —       |

## Verification

Acceptance criteria spot-check (grep):

- [x] `.is('invalidated_at', null)` present in tokens query
- [x] `channelId: 'plan_invites'` present in message construction
- [x] `interface ExpoTicket` type definition present
- [x] `'DeviceNotRegistered'` string literal present in ticket parsing
- [x] `.update({ invalidated_at: new Date().toISOString() })` present
- [x] `.in('token', invalidatedTokens)` present
- [x] Self-invite skip preserved
- [x] No-tokens early return preserved
- [x] Still POSTs to `https://exp.host/--/api/v2/push/send`
- [x] Still uses `EXPO_ACCESS_TOKEN` bearer auth

`npx tsc --noEmit` is not run on Edge Functions (Deno runtime, separate type system). The function is small and pattern-matches the existing one — runtime correctness will be verified at deploy time.

## Self-Check: PARTIAL

Task 1 is COMPLETE. Task 2 is intentionally DEFERRED to end-of-v1.3 per the user's pacing decision. The Edge Function file on disk is ready to deploy at any time with the single `supabase functions deploy notify-plan-invite` command.
