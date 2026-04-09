---
phase: 03
plan: 06
subsystem: notifications
tags: [notifications, ios-categories, zustand, supabase, routing]
one_liner: "Wire friend_free + expiry_warning iOS categories and extend _layout.tsx response listener to route taps and action buttons"
dependency_graph:
  requires:
    - 03-04 (expiryScheduler uses categoryIdentifier: 'expiry_warning')
    - 03-05 (useStatusStore.currentStatus.window_id populated by setStatus)
    - 01 (Phase 1 D-08 DM route contract: /chat/room?dm_channel_id=)
  provides:
    - friend_free category registered at module scope (D-17)
    - expiry_warning category + Android channel registered at module scope (D-17, D-18, L-02)
    - notification response listener routes by categoryIdentifier
  affects:
    - src/lib/notifications-init.ts
    - src/app/_layout.tsx
tech_stack:
  added: []
  patterns:
    - "Module-scope async function outside React component to avoid stale closures (Pattern 5)"
    - "useStatusStore.getState() instead of useStatusStore hook — safe outside render tree"
    - "supabase.auth.getSession() for unauthenticated guard before any upsert (T-03-35)"
    - "encodeURIComponent on senderName before router.push (T-03-33)"
key_files:
  created: []
  modified:
    - src/lib/notifications-init.ts
    - src/app/_layout.tsx
decisions:
  - "Body-tap on expiry_warning navigates to /(tabs)/ (MoodPicker) without status change — surprising to silently mutate status on body-tap (D-05 only defines action buttons)"
  - "KEEP_IT and HEADS_DOWN are mutually exclusive branches, not OR'd — per acceptance criteria"
  - "FONT_SIZE unused-var warning in _layout.tsx is pre-existing (Phase 1) — out of scope"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 2
requirements_closed: [FREE-09, EXPIRY-01]
---

# Phase 03 Plan 06: Notification Category Wiring Summary

Wire friend_free + expiry_warning iOS categories and extend _layout.tsx response listener to route taps and action buttons.

## What Was Built

### Task 1: Add friend_free + expiry_warning categories to notifications-init.ts

Added two `setNotificationCategoryAsync` calls at module scope inside the existing `Platform.OS !== 'web'` guard, immediately after the `morning_prompt` registration:

- `friend_free`: empty actions array — body-only, tap routes to DM via response listener
- `expiry_warning`: two action buttons with stable identifiers `KEEP_IT` and `HEADS_DOWN`

Added `expiry_warning` Android channel inside the existing `Platform.OS === 'android'` block:
- Name: "Status expiry warnings"
- Importance: `AndroidImportance.DEFAULT`

### Task 2: Extend _layout.tsx response listener

Added three new imports: `useStatusStore`, `computeWindowExpiry`/`nextLargerWindow`, `WindowId`.

Defined module-scope `handleNotificationResponse(response, router)` function outside `RootLayout` to eliminate stale closure risk. The function dispatches by `categoryIdentifier`:

- **Legacy planId branch**: preserved, runs first, early-return
- **friend_free branch**: calls `get_or_create_dm_channel` RPC with `senderId`, then pushes `/chat/room?dm_channel_id={id}&friend_name={enc}`
- **expiry_warning branch**:
  - Body-tap (`DEFAULT_ACTION_IDENTIFIER`): navigates to `/(tabs)/` only, no status mutation
  - `KEEP_IT`: calls `nextLargerWindow(current.window_id ?? null)`, upserts statuses row + syncs store
  - `HEADS_DOWN`: upserts `status='busy'`, `context_tag=null`, `computeWindowExpiry('3h', now)`
  - Guards: `useStatusStore.getState().currentStatus` null-check + `supabase.auth.getSession()` unauthenticated guard

Replaced the old `useEffect` notification block to delegate both warm-start listener and cold-start `getLastNotificationResponseAsync` (with 150ms setTimeout) to `handleNotificationResponse`.

## Verification

- `npx tsc --noEmit` — exit 0
- `npx eslint src/app/_layout.tsx` — exit 0 (1 pre-existing warning on FONT_SIZE, not introduced by this plan)
- All 15 grep acceptance-criteria checks pass

## Deviations from Plan

None — plan executed exactly as written.

## Threat Coverage

All mitigations in the plan's threat register were implemented:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-03-33 — senderName injection | `encodeURIComponent(data.senderName ?? 'Friend')` |
| T-03-35 — unauthenticated setStatus | `supabase.auth.getSession()` guard before any upsert |
| T-03-37 — cold-start router race | Existing 150ms setTimeout preserved on cold-start path |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 417e44b | feat(03-06): register friend_free + expiry_warning notification categories |
| 2 | a54ba71 | feat(03-06): extend notification response listener for friend_free + expiry_warning |

## Self-Check: PASSED
