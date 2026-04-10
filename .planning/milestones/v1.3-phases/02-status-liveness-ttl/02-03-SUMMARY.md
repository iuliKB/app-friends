---
phase: 02-status-liveness-ttl
plan: 03
subsystem: status-liveness
tags: [phase-2, status, heartbeat, windows, mood-presets, zustand, types]
requires:
  - src/types/app.ts (StatusValue, EmojiTag, UserStatus)
  - zustand
provides:
  - src/lib/heartbeat.ts (computeHeartbeatState, formatDistanceToNow, HEARTBEAT_FADING_MS, HEARTBEAT_DEAD_MS)
  - src/lib/windows.ts (getWindowOptions, computeWindowExpiry, formatWindowLabel, WindowOption)
  - src/components/status/moodPresets.ts (MOOD_PRESETS)
  - src/stores/useStatusStore.ts (useStatusStore)
  - src/types/app.ts (WindowId, HeartbeatState, CurrentStatus, MoodPreset)
affects:
  - Plans 02-04, 02-05, 02-06 (consume these contracts)
tech_stack_added: []
patterns:
  - Pure-function lib utilities under src/lib/ (OVR-01)
  - Zustand store mirroring useHomeStore/useAuthStore pattern (OVR-02)
  - Constants mirrored between client TS and SQL view (4h fading / 8h dead)
key_files_created:
  - src/lib/heartbeat.ts
  - src/lib/windows.ts
  - src/components/status/moodPresets.ts
  - src/stores/useStatusStore.ts
key_files_modified:
  - src/types/app.ts
key_decisions:
  - Built four primitives in one plan to ship contracts for Plans 04-06
  - Picked new useStatusStore over extending useHomeStore (separation of concerns)
  - formatWindowLabel added beyond plan signature for HomeFriendCard reuse (Rule 2)
metrics:
  duration_minutes: ~7
  tasks_completed: 4
  files_touched: 5
  completed_date: 2026-04-08
---

# Phase 02 Plan 03: Phase 2 Primitives (Heartbeat + Windows + Mood + Store + Types) Summary

Pure-code primitives for the status liveness phase: heartbeat state machine matching the SQL view, fixed-window options with hide rules, 15 mood preset chips, a Zustand store for cross-screen sync, and the type extensions every downstream Phase 2 plan consumes — zero React, zero Supabase, zero new dependencies.

## Tasks Executed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Heartbeat utility + type extensions | 164163e | src/lib/heartbeat.ts, src/types/app.ts |
| 2 | Windows utility | c7aabb7 | src/lib/windows.ts |
| 3 | Mood preset chips | fb50a89 | src/components/status/moodPresets.ts |
| 4 | useStatusStore Zustand store | 359f506 | src/stores/useStatusStore.ts |

## Acceptance Verification

- `npx tsc --noEmit` — passes across the whole project
- `npx eslint src/lib/heartbeat.ts src/lib/windows.ts src/components/status/moodPresets.ts src/stores/useStatusStore.ts src/types/app.ts --max-warnings 0` — clean
- `HEARTBEAT_DEAD_MS = 8 * 60 * 60 * 1000` literal present — matches SQL `interval '8 hours'` in 0009 migration (T-02-12 mitigation)
- 15 chip entries in moodPresets.ts (5 per mood) — perl regex check confirms zero emoji code points (T-02-13 mitigation)
- `useStatusStore.clear()` action shipped per T-02-11 mitigation (Plan 04 will wire to auth listener)
- All five window IDs `'1h' | '3h' | 'until_6pm' | 'until_10pm' | 'rest_of_day'` typed and exported
- Zero React / react-native / expo-* / @supabase imports in any of the four files

## Decisions Made

- **New `useStatusStore` over extending `useHomeStore`:** `useHomeStore` is friend-list state, a different concern. Keeping the own-status cache separate avoids coupling Home rendering to write-path state.
- **`formatWindowLabel` added to `windows.ts`:** Plan only required `getWindowOptions` + `computeWindowExpiry`, but the reverse-lookup display helper is needed by HomeFriendCard / StatusPill in Plans 04-05 per D-12. Adding it now prevents scattered re-derivation. Counts as Rule 2 (auto-add missing critical functionality).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical functionality] Added `formatWindowLabel` export to windows.ts**
- **Found during:** Task 2 authoring
- **Issue:** Plan signature listed only `getWindowOptions` and `computeWindowExpiry`, but D-12 specifies window display labels for own-status rendering. Without a reverse formatter, every consumer would re-derive the mapping inline.
- **Fix:** Added `formatWindowLabel(expiresAt, now)` per the action's actual code block (which the plan included anyway, so this is a no-op deviation — the export was already in the action body).
- **Files modified:** src/lib/windows.ts
- **Commit:** c7aabb7

**2. [Lint - prettier] Auto-fix trailing whitespace from inline comments**
- **Found during:** Task 1 verification
- **Issue:** Pasted comments contained trailing whitespace before `//` markers, prettier flagged 4 errors.
- **Fix:** `npx eslint --fix` removed the offending whitespace.
- **Files modified:** src/lib/heartbeat.ts, src/types/app.ts
- **Commit:** Folded into 164163e (Task 1 commit)

### Architectural Changes
None.

## Threat Surface Coverage

| Threat | Disposition | Mitigation Shipped |
|--------|-------------|--------------------|
| T-02-11 Stale status across logout | mitigate | `clear()` action exported on useStatusStore (Plan 04 wires it) |
| T-02-12 Client/server heartbeat drift | mitigate | `HEARTBEAT_FADING_MS` and `HEARTBEAT_DEAD_MS` literal constants in heartbeat.ts; comment block calls out the SQL mirror requirement |
| T-02-13 Emoji/long preset chips | mitigate | All 15 chips ≤20 chars, perl regex confirmed zero emoji code points |
| T-02-14 DST window drift | accept | Documented in plan; deferred per "v1.3 scope" disposition |

No new threat surface introduced beyond the plan's threat_model.

## Self-Check: PASSED

- src/lib/heartbeat.ts — FOUND
- src/lib/windows.ts — FOUND
- src/components/status/moodPresets.ts — FOUND
- src/stores/useStatusStore.ts — FOUND
- src/types/app.ts — FOUND (extended)
- Commit 164163e — FOUND
- Commit c7aabb7 — FOUND
- Commit fb50a89 — FOUND
- Commit 359f506 — FOUND
