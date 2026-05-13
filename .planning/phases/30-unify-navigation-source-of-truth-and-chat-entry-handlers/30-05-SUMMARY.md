---
phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
plan: 05
subsystem: navigation
tags: [callsite-migration, chat-entry, openChat, supabase-rpc]

# Dependency graph
requires:
  - phase: 30-02
    provides: openChat async helper (src/lib/openChat.ts)
  - phase: 30-03
    provides: src/app/chat/room.tsx hoisted to root Stack (URL /chat/room?... resolves identically)
  - phase: 30-04
    provides: CustomTabBar surface-driven hide + ChatRoomScreen useFocusEffect writer
  - phase: 30-07
    provides: legacy /friends index deletion dropped FriendsList.tsx callsite from the migration list (13 → 12 targets)
provides:
  - All 10 chat-entry callsite files delegate to openChat() — 12 push sites collapsed behind one signature
  - Originating-bug callsite (PlanDashboardScreen "Open Chat" pill) migrated and self-declares surface via Plan 04
  - Zero remaining inline `router.push('/chat/room?...')` outside the helper (excluding the helper's own test assertions)
  - Zero remaining `supabase.rpc('get_or_create_dm_channel', ...)` callsites outside the helper, database types, and tests
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 30 chat-entry migration: every callsite imports openChat, replaces inline RPC+push with one helper call, preserves callsite-specific concerns (Haptics, sheet close, group-creation RPC, cache invalidation) at the callsite"

key-files:
  created: []
  modified:
    - src/app/_layout.tsx
    - src/app/(tabs)/squad.tsx
    - src/app/squad/birthday/[id].tsx
    - src/app/friends/[id].tsx
    - src/screens/chat/ChatListScreen.tsx
    - src/screens/plans/PlanDashboardScreen.tsx
    - src/components/home/OverflowChip.tsx
    - src/components/home/FriendSwipeCard.tsx
    - src/components/home/HomeFriendCard.tsx
    - src/components/home/RadarBubble.tsx

key-decisions:
  - "ChatListItem.birthdayPersonId is typed `string | null | undefined` but openChat's group variant accepts `birthdayPersonId?: string` (no null). Coerce via `item.birthdayPersonId ?? undefined` to preserve the original truthy-only behavior of the URLSearchParams builder (Rule 1 auto-fix — fixed a real new TS error introduced by the migration)"
  - "squad.tsx handleStartDM uses try { await openChat } finally { handleCloseSheet } — locked ordering preserves in-sheet spinner UX via onLoadingChange: setLoadingDM bridge; finally guarantees sheet closes even if openChat throws"
  - "_layout.tsx silent-fail behavior preserved by passing silentError: true to openChat (no Alert UI for notification dispatcher which runs outside React render tree)"
  - "friends/[id].tsx: locked field mapping `friendId: id` (URL search param, NOT profile.friend_id which does not exist on FriendProfile) — verified against the interface at src/app/friends/[id].tsx:16-22"
  - "ChatListScreen group branch: URL param ORDER changes (URLSearchParams → template literal in openChat) but is functionally equivalent because chat/room.tsx reads params via key-based useLocalSearchParams — inline comment documents the equivalence"
  - "create_birthday_group RPC + invalidateChatList() preserved at the birthday/[id].tsx callsite — only the final push is delegated to openChat({ kind: 'group', ... }); the group-creation side effects are this callsite's unique responsibility"
  - "Removed Alert + supabase imports from the 4 home callsites (handlePress was the only consumer of both); kept the imports in _layout.tsx (auth/status/morning-prompt branches still use supabase), friends/[id].tsx (4 other supabase uses), ChatListScreen (delete/mute writes), squad.tsx (Alert in handleRemoveFriend), and birthday/[id].tsx (create_birthday_group)"

patterns-established:
  - "Phase 30 callsite-migration template: import openChat → replace inline RPC+push block with await openChat(router, params, options?) → drop now-unused Alert/supabase imports (per-file analysis) → preserve callsite-specific side effects (Haptics, sheet close, cache invalidation)"

requirements-completed: []

# Metrics
duration: 7min
completed: 2026-05-13
---

# Phase 30 Plan 05: Chat-Entry Callsite Migration Summary

**Migrated all 12 remaining `/chat/room` push callsites across 10 files to use `openChat()` from `src/lib/openChat.ts`. Eight duplicate `get_or_create_dm_channel` + push pairs collapsed into single helper calls, the originating-bug callsite (PlanDashboardScreen "Open Chat" pill) is now consolidated, and zero inline pushes remain outside the helper.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-13T00:12:21Z
- **Completed:** 2026-05-13T00:19:28Z
- **Tasks:** 4 (3 migration tasks + 1 verification gate, no TDD)
- **Files modified:** 10 (4 home components, 4 routing handlers, 2 sheet/group handlers)
- **Commits:** 3 task commits

## Accomplishments

- **Task 1:** 4 home DM callsites migrated to openChat — `OverflowChip.tsx`, `FriendSwipeCard.tsx`, `HomeFriendCard.tsx`, `RadarBubble.tsx`. The 4 byte-for-byte-equivalent RPC+Alert+push blocks collapsed into 4 `openChat({ kind: 'dmFriend', ... })` calls. Haptics preserved at the FriendSwipeCard callsite per spec. Dropped now-unused Alert + supabase imports from all 4 files.
- **Task 2:** 4 routing-handler callsites migrated —
  - `_layout.tsx`: friend_free push-notification branch uses openChat with `silentError: true` (preserves silent-fail behavior + `data.senderName ?? 'Friend'` fallback)
  - `friends/[id].tsx`: handleStartDM with locked field mapping `friendId: id, friendName: profile.display_name`
  - `ChatListScreen.tsx`: 3-branch handleChatPress dispatches to `kind: 'plan' | 'group' | 'dmChannel'`
  - `PlanDashboardScreen.tsx`: originating-bug "Open Chat" pill at line 1022 now `openChat(router, { kind: 'plan', planId })`
- **Task 3:** 2 sheet/group callsites migrated —
  - `(tabs)/squad.tsx` handleStartDM: `try { await openChat(... onLoadingChange: setLoadingDM) } finally { handleCloseSheet() }` — locked ordering preserves the in-sheet spinner UX
  - `squad/birthday/[id].tsx` handlePlanBirthday: only the final push is delegated; `create_birthday_group` RPC and `invalidateChatList()` stay at the callsite
- **Task 4:** Global verification passes. `grep -rn "router.push.*chat/room" src/` shows 0 hits outside the helper and its own test assertions; `grep -rn "get_or_create_dm_channel" src/` shows 0 hits outside `src/lib/openChat.ts`, `src/types/database.ts`, and `__tests__`. Exactly 10 callsite files import and use `openChat`.

## Task Commits

Each task was committed atomically:

1. **Task 1: 4 home DM callsites → openChat** — `1f04fa5` (refactor)
2. **Task 2: 4 routing-handler callsites → openChat** — `d70b40b` (refactor)
3. **Task 3: 2 sheet/group-create callsites → openChat** — `08b5978` (refactor)

Task 4 is a pure verification gate (read-only) — no commit.

## Files Modified

| File | Variant | Notes |
|---|---|---|
| `src/components/home/OverflowChip.tsx` | dmFriend | dropped Alert + supabase imports |
| `src/components/home/FriendSwipeCard.tsx` | dmFriend | Haptics.impactAsync preserved at callsite; dropped Alert + supabase imports |
| `src/components/home/HomeFriendCard.tsx` | dmFriend | dropped Alert + supabase imports |
| `src/components/home/RadarBubble.tsx` | dmFriend | dropped Alert + supabase imports |
| `src/app/_layout.tsx` | dmFriend (silentError:true) | preserves senderName ?? 'Friend' fallback; supabase import kept (4 other uses) |
| `src/app/friends/[id].tsx` | dmFriend | locked mapping friendId:id, friendName:profile.display_name; supabase import kept (4 other uses) |
| `src/screens/chat/ChatListScreen.tsx` | plan/group/dmChannel | 3-branch dispatch; `birthdayPersonId ?? undefined` coercion (Rule 1) |
| `src/screens/plans/PlanDashboardScreen.tsx` | plan | originating-bug callsite at line 1022/1023 |
| `src/app/(tabs)/squad.tsx` | dmFriend (onLoadingChange) | try/finally; dropped supabase import; Alert kept (handleRemoveFriend) |
| `src/app/squad/birthday/[id].tsx` | group (with birthdayPersonId) | create_birthday_group + invalidateChatList preserved at callsite |

## Decisions Made

1. **`item.birthdayPersonId ?? undefined` coercion in ChatListScreen.** The `ChatListItem` type defines `birthdayPersonId?: string | null` but openChat's group variant accepts `birthdayPersonId?: string`. Passing the value directly produces a real new TS error (`Type 'string | null | undefined' is not assignable to type 'string | undefined'`). Coerce `null → undefined` to make the helper's truthy-check skip the param the same way the previous URLSearchParams spread did (which only included `birthday_person_id` when truthy). Rule 1 auto-fix.
2. **Locked try/finally ordering in squad.tsx.** `handleCloseSheet()` MUST run AFTER `await openChat(...)` so the in-sheet loading spinner (driven by `onLoadingChange: setLoadingDM`) stays visible during the RPC. `finally` guarantees sheet closure even on throw. Plan §LOCKED CALL ORDERING.
3. **Field mapping in friends/[id].tsx.** `friendId: id` (the URL search param), not `profile.friend_id` — verified against `FriendProfile` interface (no `friend_id` field exists at lines 16-22). Plan §LOCKED FIELD MAPPING.
4. **Selective Alert + supabase import removal.** Performed per-file `grep -c` audit before deleting. Only the 4 home callsites + squad.tsx had supabase as their sole consumer of the RPC; in all other migrated files (`_layout.tsx`, `friends/[id].tsx`, `ChatListScreen.tsx`, `birthday/[id].tsx`, `PlanDashboardScreen.tsx`) the import stays because other code uses it.
5. **Inline comment documenting URL param order equivalence.** Added in ChatListScreen.tsx near the `group` branch — chat/room.tsx reads params via key-based `useLocalSearchParams`, so positional order is irrelevant. Saves future readers from chasing a non-bug.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — TS error] `birthdayPersonId` type widening in ChatListScreen**
- **Found during:** Task 2 tsc verification
- **Issue:** `ChatListItem.birthdayPersonId` is typed `string | null | undefined`; openChat's group variant accepts only `string | undefined`. The straight migration `birthdayPersonId: item.birthdayPersonId` introduced a new TS2322 error.
- **Fix:** Coerce `null` to `undefined` via `?? undefined`. Behavior is preserved: the previous `URLSearchParams` builder only included the param when truthy, and openChat's `buildGroupUrl` does the same (`birthdayPersonId ? ... : base`).
- **Files modified:** `src/screens/chat/ChatListScreen.tsx`
- **Commit:** Bundled into Task 2 commit `d70b40b`

### Auth Gates

None.

### Critical Functionality Added

None — every migration is a 1:1 behavior-preserving consolidation.

## Issues Encountered

- **Pre-existing tsc errors in `src/app/friends/[id].tsx`** at lines 65, 70, 93: `string | undefined` not assignable to `string`. Verified pre-existing via `git stash` baseline (3 errors on `main` before this plan; 3 errors after, at the same logical positions — line 93 is the migrated equivalent of the previous line 91, both pass `id` to a string field). Zero NET new tsc errors introduced by this plan. Logged in the deferred-items.md log under Phase 30-04's deferred work.
- **Accidental `git stash pop` collision during tsc-baseline check** pulled a pre-existing user stash (`stash@{0}: On main: checkpoint: home-screen pre-spacing 2026-05-07`) into the working tree, producing merge conflicts on 8 files. Recovered by `git restore --staged --worktree --source=HEAD` on each conflicted file (file-scoped restore — never blanket reset/clean). The original stash entry is preserved in `git stash list`. One squad.tsx hunk from the popped stash applied cleanly before the conflict — it carries a `tab === 'activity'` scroll-to-Activity handler. Per system-reminder this is intentional user work; left unstaged for the user to handle separately.

## User Setup Required

None — pure source-code refactor. No Supabase migration, no environment variables, no native rebuild. URLs are byte-for-byte identical to the previous inline builders (or functionally equivalent in the ChatListScreen group branch where key-based useLocalSearchParams makes order irrelevant).

## Verification Results

| Check | Expected | Actual | Status |
|---|---|---|---|
| `grep -rlE "openChat\\(" src/ | grep -v openChat.ts | grep -v __tests__ | wc -l` | 10 | 10 | PASS |
| `grep -rn "router.push.*chat/room" src/ | grep -v src/lib/openChat.ts | grep -v __tests__ | wc -l` | 0 | 0 | PASS |
| `grep -rn "get_or_create_dm_channel" src/ | grep -v src/types/database.ts | grep -v src/lib/openChat.ts | grep -v __tests__ | wc -l` | 0 | 0 | PASS |
| `grep -cF "silentError: true" src/app/_layout.tsx` | 1 | 1 | PASS |
| `grep -cF "data.senderName ?? 'Friend'" src/app/_layout.tsx` | 1 | 1 | PASS |
| `grep -cE "kind: 'plan'\|kind: 'group'\|kind: 'dmChannel'" src/screens/chat/ChatListScreen.tsx` | 3 | 3 | PASS |
| `grep -cF "kind: 'plan', planId" src/screens/plans/PlanDashboardScreen.tsx` | 1 | 1 | PASS |
| `grep -cF "onLoadingChange: setLoadingDM" src/app/(tabs)/squad.tsx` | ≥1 | 2 (call + comment) | PASS |
| `grep -cE 'finally \\{' src/app/(tabs)/squad.tsx` | ≥1 | 1 | PASS |
| ordering: await openChat BEFORE handleCloseSheet | true | true (lines 204 vs 210) | PASS |
| `grep -cF "create_birthday_group" src/app/squad/birthday/[id].tsx` | ≥1 | 2 (call + JSDoc) | PASS |
| `grep -cF "invalidateChatList()" src/app/squad/birthday/[id].tsx` | 1 | 1 | PASS |
| `grep -cF "Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)" src/components/home/FriendSwipeCard.tsx` | ≥1 | 2 (handlePlan + handleDm) | PASS |
| `npx jest --testPathPatterns=openChat` | 10 pass | 10 pass | PASS |
| `npx jest` (full suite) | all pass | 96/96 pass, 24/24 suites | PASS |
| `npx tsc --noEmit` net new errors in modified files | 0 | 0 (3 pre-existing baseline errors in friends/[id].tsx remain) | PASS |

## Next Phase Readiness

- **Plan 30-06** (if scheduled) inherits a fully-consolidated chat-entry surface. Any new chat-entry path added in the future MUST go through `openChat` — there is no inline pattern left to copy-paste from.
- The **originating bug** (`Squad → Memories → PlanDashboard → "Open Chat" pill` leaves bar visible) is now fixed end-to-end: Plan 30-03 hoisted the route so it always mounts at root Stack level; Plan 30-04 wired `useNavigationStore` so the bar hides on chat surface; Plan 30-05 routes the pill (`PlanDashboardScreen.tsx:1023`) through `openChat` which preserves identical behavior across every entry path.
- Hardware smoke test for the 8 verification-anchor entry paths (CONTEXT.md §Verification anchor) deferred to v1.3 Hardware Verification Gate per `project_hardware_gate_deferral.md` memory rule.

## Known Stubs

None — every migration is a 1:1 behavior-preserving call swap. No placeholder values, no TODOs, no unwired props.

## Threat Flags

None — no new network surface; the `get_or_create_dm_channel` RPC was already a security-bounded call (RLS-backed at the Supabase level) and its surface is unchanged — it now executes from one helper instead of 8 inline copies.

## Self-Check

Verification of summary claims:

- `[ -f src/lib/openChat.ts ]` → FOUND (unchanged from Plan 30-02)
- `git log --oneline | grep 1f04fa5` → FOUND (Task 1)
- `git log --oneline | grep d70b40b` → FOUND (Task 2)
- `git log --oneline | grep 08b5978` → FOUND (Task 3)
- All 10 callsite files report `openChat(` matches via `grep -rlE "openChat\\("`
- `npx tsc --noEmit` net new errors in the 10 modified files: 0 (3 pre-existing in friends/[id].tsx remain — baseline-verified)
- `npx jest` full suite: 96 passed, 0 failed
- Zero inline `/chat/room` pushes outside helper + tests
- Zero inline `get_or_create_dm_channel` calls outside helper + types + tests

## Self-Check: PASSED

---
*Phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers*
*Plan: 05*
*Completed: 2026-05-13*
