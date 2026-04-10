---
phase: 03-friend-went-free-loop
plan: "03"
subsystem: edge-functions
tags: [supabase, edge-function, push-notifications, rate-limiting, expo, webhook]

requires:
  - phase: 03-friend-went-free-loop
    provides: "Migration 0010 applied — free_transitions + friend_free_pushes tables live, get_friend_free_candidates RPC available (Plan 03-02)"

provides:
  - "supabase/functions/notify-friend-free/index.ts — fan-out engine implementing FREE-01..08 with 8-stage rate-limit gauntlet"
  - "Every suppression decision logged to friend_free_pushes (suppressed=true/false + suppression_reason)"
  - "DeviceNotRegistered ticket parser invalidates push_tokens on receipt"
  - "Outbox row (free_transitions) marked sent_at on success, last_error on catch"

affects:
  - "03-02 (dispatch_free_transition trigger routes INSERTs here once deployed)"
  - "03-07 (profile toggle — notify_friend_free controls recipient_disabled_pref stage)"

tech-stack:
  added: []
  patterns:
    - "Deno.serve handler with module-scope createClient (mirrors notify-plan-invite)"
    - "logDecision() helper writes one friend_free_pushes row per candidate per gauntlet decision"
    - "8-stage rate-limit gauntlet: self / disabled_pref / busy-or-dead / quiet_hours / pair_15min / recipient_5min / daily_cap / invalidated_token / SEND"

key-files:
  created:
    - supabase/functions/notify-friend-free/index.ts
  modified: []

decisions:
  - "busy/DEAD conflation logged as 'recipient_busy' — NOTE (CONTEXT D-11) in code documents this; dedicated 'recipient_dead' enum deferred to v1.4"
  - "Fail-open quiet hours: local_hour === null skips the quiet-hours gate rather than suppressing — matches CONTEXT D-16"
  - "No deployment in this plan — operator runs deploy command (see Deployment section below)"

metrics:
  duration: "~8 minutes"
  completed: "2026-04-09"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 3 Plan 03: notify-friend-free Edge Function Summary

JWT-authenticated Edge Function implementing the friend-went-free fan-out engine: consumes `free_transitions` INSERT webhook, runs an 8-stage rate-limit gauntlet per recipient, sends Expo pushes, parses DeviceNotRegistered ticket errors for token invalidation, and logs every decision to `friend_free_pushes`.

## Tasks Executed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Author notify-friend-free Edge Function (236 lines) | `bb5c1eb` |

## Rate-Limit Gauntlet (in order)

| Stage | Suppression Reason | Requirement |
|-------|--------------------|-------------|
| 1 | `self` | defense-in-depth (RPC already excludes sender) |
| 2 | `recipient_disabled_pref` | FREE-07 |
| 3 | `recipient_busy` | FREE-02 (busy OR DEAD heartbeat — see NOTE D-11) |
| 4 | `quiet_hours` | FREE-06 (22:00-08:00 local; fail-open on null timezone) |
| 5 | `pair_15min` | FREE-03 (pairwise 15-min rolling cap) |
| 6 | `recipient_5min` | FREE-04 (per-recipient 5-min throttle) |
| 7 | `daily_cap` | FREE-05 (3 pushes per recipient per 24h) |
| 8 | `recipient_invalidated_token` | PUSH-09 (no valid tokens remain) |
| SEND | `suppressed=false, reason=null` | FREE-01 |

## Push Shape

```
title: "Friend is Free"
body:  "${senderName} is Free • ${context_tag}"  // when tag set
       "${senderName} is Free"                    // when tag null
channelId: "friend_free"
categoryId: "friend_free"
data: { kind: "friend_free", senderId, senderName }
```

## Deployment

This function is NOT deployed automatically. After Plan 03-02 is confirmed live (GUCs set), the operator runs:

```bash
SUPABASE_ACCESS_TOKEN=<your_personal_access_token> \
  npx supabase functions deploy notify-friend-free --linked
```

Or with the Supabase CLI configured:

```bash
supabase functions deploy notify-friend-free --linked
```

Verify deployment in Supabase Dashboard → Edge Functions → `notify-friend-free` (should show status "Active").

The `dispatch_free_transition` trigger (migration 0010) routes `free_transitions` INSERTs to:
```
https://zqmaauaopyolutfoizgq.supabase.co/functions/v1/notify-friend-free
```
This URL is already baked into the `app.edge_functions_url` GUC set in Plan 03-02.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — function is fully wired. All data flows from real DB (free_transitions webhook → profiles RPC → friend_free_pushes log).

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model (T-03-15 through T-03-22). The function never logs env vars or request headers — catch block logs only `String(e)` per T-03-16.

## Self-Check: PASSED

- [x] `supabase/functions/notify-friend-free/index.ts` created (236 lines, >= 150 required)
- [x] All 8 suppression reason string literals present: `pair_15min`, `recipient_5min`, `daily_cap`, `quiet_hours`, `recipient_busy`, `recipient_disabled_pref`, `recipient_invalidated_token`, `self`
- [x] `supabase.rpc('get_friend_free_candidates', { p_sender: senderId })` call present
- [x] `exp.host/--/api/v2/push/send` with `channelId: 'friend_free'` and `categoryId: 'friend_free'`
- [x] Push body format matches spec (`is Free` literal present)
- [x] `DeviceNotRegistered` branch updates `push_tokens` with `invalidated_at`
- [x] `NOTE (CONTEXT D-11)` literal present in file
- [x] Outbox row gets `sent_at` on success (line ~197) and `last_error` in catch block
- [x] Commit `bb5c1eb` exists in git log
