---
phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
plan: 07
subsystem: navigation

tags: [expo-router, routes, dead-code, friends, deletion]

# Dependency graph
requires:
  - phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
    provides: Plan 30-02 (openChat helper) — JSDoc reference cleaned up to drop the deleted FriendsList.tsx callsite name
provides:
  - "Legacy `/friends` index route deleted — Squad Friends sub-tab is now the single source of truth for the friends list"
  - "One `/chat/room` callsite eliminated (FriendsList.tsx:68); Plan 30-05's migration target list shrinks by 1"
  - "FriendsList symbol fully removed from the codebase (4 references → 0)"
affects: [plan-30-05-chat-entry-migration, plan-31-tanstack-query-pilot]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dead-code elimination via grep-confirmed import inventory before deletion"

key-files:
  created: []
  modified:
    - "src/lib/openChat.ts (dropped stale FriendsList.tsx mention from JSDoc)"
  deleted:
    - "src/app/friends/index.tsx (legacy route file, 63 lines)"
    - "src/screens/friends/FriendsList.tsx (legacy screen file, 147 lines)"

key-decisions:
  - "Cleanup the stale FriendsList.tsx JSDoc reference in openChat.ts as part of this plan rather than letting Plan 30-05's verification grep fail downstream — Rule 3 (blocking issue) auto-fix"
  - "Left src/app/friends/_layout.tsx untouched — expo-router does not enumerate Stack.Screen entries, so removing the index.tsx leaves the layout valid; /friends now 404s in dev (acceptable per CONTEXT.md §Scope item 5)"

patterns-established:
  - "Pre-deletion grep audit pattern: count `FriendsList` references (expect exactly N self-references), delete, re-grep (expect 0). Documentation references in unrelated files must be either updated or counted in the expected pre-delete tally."

requirements-completed: []

# Metrics
duration: 1min
completed: 2026-05-13
---

# Phase 30 Plan 07: Delete Legacy `/friends` Index Route Summary

**Two legacy files deleted (`app/friends/index.tsx` + `screens/friends/FriendsList.tsx`), one `/chat/room` callsite eliminated (27 → 26), Squad Friends sub-tab is now the single source for the friends list.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-13T00:00:32Z
- **Completed:** 2026-05-13T00:01:08Z
- **Tasks:** 1
- **Files modified:** 1 (JSDoc cleanup in `src/lib/openChat.ts`)
- **Files deleted:** 2

## Accomplishments

- Verified zero deep links target the bare `/friends` index path (Steps 1a–1e all returned empty).
- Verified the `FriendsList` symbol inventory pre-deletion: 3 self-references + 1 unrelated JSDoc mention.
- Deleted `src/app/friends/index.tsx` and `src/screens/friends/FriendsList.tsx` atomically.
- Confirmed `grep -rn "FriendsList" src/` returns 0 matches post-deletion.
- Confirmed the four preserved files (`[id].tsx`, `add.tsx`, `requests.tsx`, `_layout.tsx`) + two preserved screen files (`AddFriend.tsx`, `FriendRequests.tsx`) all intact.
- Confirmed `npx tsc --noEmit | grep -cE "FriendsList|app/friends/index"` returns 0 — no dangling type errors.
- `/chat/room` callsite count dropped from 27 to 26 (the deleted `FriendsList.tsx:68` push), shrinking Plan 30-05's migration target list by 1.

## Task Commits

1. **Task 1: Delete legacy `/friends` index route** — `3ece4d0` (refactor)

## Files Created/Modified

- `src/lib/openChat.ts` — Updated JSDoc on `OpenChatOptions.onLoadingChange`: replaced "(squad.tsx, FriendsList.tsx)" with "(e.g. squad.tsx)" because `FriendsList.tsx` no longer exists. Functional code unchanged.

## Files Deleted

- `src/app/friends/index.tsx` — legacy route wrapping `FriendsList`, no remaining deep links.
- `src/screens/friends/FriendsList.tsx` — legacy friends-list screen, duplicated by Squad Friends sub-tab at `src/app/(tabs)/squad.tsx:180-205`.

## Decisions Made

- **JSDoc cleanup tied to deletion.** `src/lib/openChat.ts:34` named `FriendsList.tsx` as a sheet-based callsite reference. With the file deleted, the JSDoc became stale and would have made `grep -rn "FriendsList" src/` return 1 — failing Plan 30-05's downstream verification. Updated the doc string to drop the dead reference (Rule 3: blocking-issue auto-fix).
- **No layout edit.** `src/app/friends/_layout.tsx` declares the Stack chrome but does NOT enumerate child screens — removing `index.tsx` simply makes the URL `/friends` 404 in dev. No layout changes required.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cleaned up stale `FriendsList.tsx` reference in `src/lib/openChat.ts` JSDoc**

- **Found during:** Task 1 — Step 2 (FriendsList import inventory)
- **Issue:** The plan expected EXACTLY TWO `FriendsList` hits from the pre-deletion grep (`index.tsx:6` import + `FriendsList.tsx:16` export). Actual grep returned FOUR hits:
  1. `src/app/friends/index.tsx:6` — import (expected)
  2. `src/app/friends/index.tsx:60` — `<FriendsList />` JSX usage (expected — same file)
  3. `src/screens/friends/FriendsList.tsx:16` — export (expected)
  4. `src/lib/openChat.ts:34` — JSDoc-only mention naming the file as a sheet-callsite reference
- **Fix:** Hit #4 is a non-code documentation reference left over from Plan 30-02 when `FriendsList.tsx` was still alive. Updated the JSDoc from "(squad.tsx, FriendsList.tsx) that toggle a `loadingDM` flag" to "(e.g. squad.tsx) that toggle a `loadingDM` flag". Functional code unchanged.
- **Files modified:** `src/lib/openChat.ts`
- **Verification:** Re-ran `grep -rn "FriendsList" src/ 2>/dev/null` post-deletion + JSDoc edit — returns 0 hits. Acceptance criterion `wc -l == 0` now satisfied.
- **Committed in:** `3ece4d0` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The auto-fix was necessary to satisfy the plan's own Step 4 acceptance criterion (zero `FriendsList` references post-deletion). No scope creep — the JSDoc fix is mechanically the same kind of dead-reference cleanup as the file deletions themselves.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Verification Results

| Check | Expected | Actual | Status |
|---|---|---|---|
| `test ! -f src/app/friends/index.tsx` | exit 0 | exit 0 | PASS |
| `test ! -f src/screens/friends/FriendsList.tsx` | exit 0 | exit 0 | PASS |
| `grep -rn "FriendsList" src/ \| wc -l` | 0 | 0 | PASS |
| `test -f 'src/app/friends/[id].tsx'` | exit 0 | exit 0 | PASS |
| `test -f src/app/friends/add.tsx` | exit 0 | exit 0 | PASS |
| `test -f src/app/friends/requests.tsx` | exit 0 | exit 0 | PASS |
| `test -f src/app/friends/_layout.tsx` | exit 0 | exit 0 | PASS |
| `test -f src/screens/friends/AddFriend.tsx` | exit 0 | exit 0 | PASS |
| `test -f src/screens/friends/FriendRequests.tsx` | exit 0 | exit 0 | PASS |
| `npx tsc --noEmit \| grep -cE "FriendsList\|app/friends/index"` | 0 | 0 | PASS |
| `/chat/room` callsite count | 26 (was 27) | 26 | PASS |

## Next Phase Readiness

- Plan 30-05 (chat-entry callsite migration) now has 12 targets instead of 13 — the deleted `FriendsList.tsx:68` no longer needs migrating.
- `/friends/<id>`, `/friends/add`, `/friends/requests` sub-routes preserved and functional.
- Squad Friends sub-tab at `src/app/(tabs)/squad.tsx:180-205` remains the single source of truth for the friends list — visible navigation entry point unchanged for users.

## Self-Check: PASSED

- File `src/app/friends/index.tsx` confirmed deleted.
- File `src/screens/friends/FriendsList.tsx` confirmed deleted.
- Commit `3ece4d0` confirmed in `git log`.
- All four preserved-file checks confirmed `test -f` exit 0.
- All grep verifications confirmed at expected counts.

---
*Phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers*
*Completed: 2026-05-13*
