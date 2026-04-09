---
phase: 03
plan: 04
subsystem: client-primitives
tags: [types, helpers, scheduler, notifications, async-storage]
dependency_graph:
  requires: []
  provides:
    - CurrentStatus.window_id field (src/types/app.ts)
    - nextLargerWindow helper (src/lib/windows.ts)
    - scheduleExpiryNotification / cancelExpiryNotification (src/lib/expiryScheduler.ts)
  affects:
    - src/hooks/useStatus.ts (Plan 03-05 consumer)
    - src/lib/notifications-init.ts (Plan 03-06 registers expiry_warning channel)
tech_stack:
  added: []
  patterns:
    - AsyncStorage-backed notification id persistence
    - Platform.OS guard for web no-op
    - Optional field addition for backward compat
key_files:
  created:
    - src/lib/expiryScheduler.ts
  modified:
    - src/types/app.ts
    - src/lib/windows.ts
decisions:
  - window_id made optional (window_id?: WindowId | null) to preserve backward compat with legacy effective_status rows that have no window_id column
  - expiryScheduler no-ops on web (Platform.OS === 'web') since expo-notifications has no web support
  - MIN_LEAD_MS (1 min safety margin) + 30-min WARNING_OFFSET means scheduler no-ops when status expires in ≤31 min — ReEngagementBanner covers that range
  - T-03-23 mitigated: try/catch around cancelScheduledNotificationAsync handles stale OS-cleared ids
metrics:
  duration_minutes: 15
  completed_date: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 3 Plan 4: Client Primitives (Types, nextLargerWindow, expiryScheduler) Summary

**One-liner:** Added `window_id` to `CurrentStatus`, exported `nextLargerWindow` window-step helper, and created `expiryScheduler.ts` with AsyncStorage-backed cancel+reschedule local notification primitives for 30-min pre-expiry warnings.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Extend CurrentStatus + add nextLargerWindow | d3a46ef |
| 2 | Create expiryScheduler.ts with cancel+reschedule | 64a4754 |

## What Was Built

### Task 1 — CurrentStatus.window_id + nextLargerWindow

`src/types/app.ts`: Added `window_id?: WindowId | null` as an optional field at the end of the `CurrentStatus` interface. Optional to preserve backward compatibility — legacy `effective_status` rows carry no `window_id` column. Plan 03-05 writes the value on every `setStatus` call; Plan 03-06 normalizes `current.window_id ?? null` at the read site.

`src/lib/windows.ts`: Added `nextLargerWindow(current: WindowId | null): WindowId` covering all 5 WindowId values and a null/unknown fallback to `'3h'`. Used by the "Keep it" action in the expiry-warning notification response handler (Plan 03-06, CONTEXT D-03).

`src/stores/useStatusStore.ts`: No changes needed — the store is transparent over `CurrentStatus`; the optional field addition requires no setter changes.

`npx tsc --noEmit`: Zero errors. No downstream breakage from the optional field.

### Task 2 — expiryScheduler.ts

New file `src/lib/expiryScheduler.ts` (90 lines). Exports:

- **`scheduleExpiryNotification(statusExpiresAt, currentMoodLabel)`**: Cancels any previously-scheduled notification (AsyncStorage key `campfire:expiry_notification_id`), then schedules a new one at `statusExpiresAt - 30min`. No-ops on web and when the fire time is within 1 minute. Uses `categoryIdentifier: 'expiry_warning'` (iOS action buttons registered in Plan 03-06) and `channelId: 'expiry_warning'` (Android channel registered by Plan 03-06 in `notifications-init.ts` — runtime ordering is safe because `notifications-init.ts` is imported at module scope from `src/app/_layout.tsx` before any `setStatus` call fires).
- **`cancelExpiryNotification()`**: Reads the stored id, cancels it, removes the key. Called on signout as defensive cleanup.

Both functions use `try/catch` around `cancelScheduledNotificationAsync` to handle stale ids after OS-level notification clears (T-03-23 mitigation).

## Verification Results

- `npx tsc --noEmit`: EXIT 0 (zero errors)
- grep-gauntlet on expiryScheduler.ts: all 6 literal checks passed
- `nextLargerWindow` covers all 5 WindowId values explicitly + null/unknown fallback
- expiryScheduler.ts: 90 lines (minimum was 40)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. This plan creates pure infrastructure (types, helper function, async scheduler). No UI, no data rendering paths, no stubs.

## Threat Flags

No new security surface introduced beyond what is documented in the plan's threat model. The only new AsyncStorage key (`campfire:expiry_notification_id`) stores a notification id (non-sensitive opaque string). Stale-id tampering is mitigated via try/catch (T-03-23).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/types/app.ts | FOUND |
| src/lib/windows.ts | FOUND |
| src/lib/expiryScheduler.ts | FOUND |
| commit d3a46ef | FOUND |
| commit 64a4754 | FOUND |
