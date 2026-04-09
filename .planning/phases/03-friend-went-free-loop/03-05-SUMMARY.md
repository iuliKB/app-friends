---
phase: 03
plan: 05
subsystem: client-hooks
tags: [useStatus, expiry-scheduler, timezone, notifications, profiles]
dependency_graph:
  requires:
    - src/lib/expiryScheduler.ts (03-04 — scheduleExpiryNotification, cancelExpiryNotification)
    - src/types/app.ts CurrentStatus.window_id (03-04)
    - src/types/database.ts profiles.timezone (03-02)
  provides:
    - useStatus.setStatus now schedules EXPIRY-01 local notification on every commit
    - useStatus signout path cancels expiry notification
    - profiles.timezone synced on session hydrate with Hermes iOS guard
  affects:
    - src/hooks/useStatus.ts (this plan)
    - Plan 03-06 (reads window_id from CurrentStatus for Keep-it response)
tech_stack:
  added: []
  patterns:
    - Fire-and-forget async call pattern (.catch(() => {})) for non-blocking side effects
    - Module-scope async helper (syncDeviceTimezone) to avoid closure capture in effect
    - SELECT-then-UPDATE pattern to avoid write amplification (T-03-29 mitigation)
    - Hermes iOS UTC guard (tz === 'UTC' && getTimezoneOffset() !== 0)
key_files:
  created: []
  modified:
    - src/hooks/useStatus.ts
decisions:
  - window_id set to null on hydrate (server effective_status view carries no window_id column); only re-derived on client setStatus call
  - syncDeviceTimezone placed at module scope (not inside hook body) to avoid useCallback capture issues and keep the effect clean
  - Fire-and-forget for both scheduleExpiryNotification and syncDeviceTimezone — failures are silent to avoid blocking the happy path
  - Hermes guard discards timezone entirely (returns early) rather than falling back to an offset-derived string — fail-open matches D-16 exactly
metrics:
  duration_minutes: 2
  completed_date: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 1
---

# Phase 3 Plan 5: useStatus Expiry Scheduler Wiring + Timezone Sync Summary

**One-liner:** Wired `scheduleExpiryNotification` / `cancelExpiryNotification` into `useStatus.setStatus` and signout, carried `window_id` through the in-memory `CurrentStatus`, and added a module-scope `syncDeviceTimezone` helper with Hermes iOS UTC guard that fires on every session hydrate.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Wire expiry scheduler into setStatus and signout | e761758 |
| 2 | Sync profiles.timezone on session hydrate with Hermes UTC guard | 4ee57d5 |

## What Was Built

### Task 1 — Expiry scheduler wiring

`src/hooks/useStatus.ts` received four targeted changes:

1. **Import** — `scheduleExpiryNotification` and `cancelExpiryNotification` imported from `@/lib/expiryScheduler`.

2. **Signout cleanup** — `installAuthListenerOnce` extended: the signout branch now calls `cancelExpiryNotification().catch(() => {})` immediately after `useStatusStore.getState().clear()`. This tears down any pending expiry notification when the user signs out (T-03-30 mitigation).

3. **Hydrate sets `window_id: null`** — The `effective_status` hydrate path now passes `window_id: null` to `setCurrentStatus`. The server view carries no `window_id` column; the field is only meaningful after a fresh client `setStatus` call.

4. **`setStatus` success branch** — Replaced the bare `setCurrentStatus({...})` call with one that includes `window_id: windowId`. Immediately after, `scheduleExpiryNotification(expiry, mood).catch(() => {})` fires. The `expiry` value is the same `Date` object already computed by `computeWindowExpiry(windowId, now)` — no extra computation. D-02 (cancel + reschedule on every setStatus) is satisfied because `scheduleExpiryNotification` always cancels the previous notification before scheduling the new one.

`touch()` is intentionally not touched — it only updates `last_active_at`, not the expiry timestamp, so no reschedule is needed.

### Task 2 — Timezone sync

Added module-scope `async function syncDeviceTimezone(userId: string): Promise<void>` (lines 41-64). Implementation:

- `Intl.DateTimeFormat().resolvedOptions().timeZone` in a `try/catch` (Hermes may throw on first call)
- Hermes iOS guard: if result is `'UTC'` but `new Date().getTimezoneOffset() !== 0`, the value is a known lie — discard it and return (fail-open per D-16)
- SELECT existing `profiles.timezone` for the user; if it already matches the device value, no UPDATE is issued (T-03-29 mitigation — avoids write amplification)
- UPDATE `profiles.timezone` only when different

Called fire-and-forget from the hydrate `useEffect` immediately after the `if (!session)` guard exits — before `setLoading(true)` — so it runs on cold launch and every sign-in without gating the loading state.

## Verification Results

- `npx tsc --noEmit`: EXIT 0 (zero errors) — verified after each task
- grep confirmed all 5 literal patterns:
  - `scheduleExpiryNotification` (line 17 import, line 162 call)
  - `cancelExpiryNotification` (line 17 import, line 32 call)
  - `window_id: windowId` (line 159)
  - `window_id: null` (line 119)
  - `syncDeviceTimezone` (line 41 definition, line 105 call)
  - `resolvedOptions().timeZone` (line 44)
  - `getTimezoneOffset` (line 50)
  - `timezone: tz` (line 63)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All four behaviors are fully wired end-to-end. No placeholder returns, no TODO data paths.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model. All STRIDE items were accounted for:

- T-03-27 (malicious timezone string): Postgres `AT TIME ZONE` throws on invalid IANA names; fail-open guard handles null/invalid.
- T-03-29 (write amplification): SELECT-then-UPDATE pattern implemented exactly.
- T-03-30 (stale notification after status update): `scheduleExpiryNotification` always cancels previous before scheduling new.
- T-03-31 (Hermes UTC bug): Guard implemented exactly as specified.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/hooks/useStatus.ts | FOUND |
| commit e761758 | FOUND |
| commit 4ee57d5 | FOUND |
