---
phase: 30-unify-navigation-source-of-truth-and-chat-entry-handlers
verified: 2026-05-13T00:00:00Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Squad → Memories → plan section → PlanDashboard → tap 'Open Chat' pill → verify bottom tab bar is hidden in chat; tap back → verify bar restores"
    expected: "Bar hidden on chat entry from non-canonical path (the originating bug); bar restored on back"
    why_human: "Runtime navigator behavior + actual rendering of CustomTabBar across the 8 verification-anchor paths cannot be observed without a running app on hardware. Hardware smoke test consolidated in v1.3 Hardware Verification Gate per project_hardware_gate_deferral.md."
  - test: "Chat tab → chat row → chat → back; Squad Friends sub-tab → friend → DM → back; Plans tab → plan → 'Open Chat' pill → back; Home OverflowChip / FriendSwipeCard / HomeFriendCard / RadarBubble → DM → back; Birthday page → wish chat → back; Friend detail page → DM → back; Push notification deep link → chat → back"
    expected: "On every entry path the bar hides on chat focus and restores on blur; chat URL resolves identically; no double-mount of ChatRoomScreen visible"
    why_human: "8-path verification anchor from CONTEXT.md requires real-device traversal; deferred to v1.3 Hardware Verification Gate."
  - test: "Verify chat 'Couldn't open chat. Try again.' Alert copy is preserved (intentionally trigger DM RPC error by signing out, then attempting DM open from a home component)"
    expected: "Identical alert copy 'Error' / 'Couldn't open chat. Try again.' appears for non-silent callers (home components, friends/[id], squad.tsx); push-notification path silent-fails"
    why_human: "Alert UX cannot be observed without rendering the app; defer to hardware gate."
---

# Phase 30: Unify Navigation Source-of-Truth and Chat-Entry Handlers — Verification Report

**Phase Goal:** Fix the bottom navigation bar showing on ChatRoomScreen when entered from non-canonical paths. Root cause: `CustomTabBar.tsx` keyed visibility off navigator topology rather than current surface. Introduce `useNavigationStore` (zustand) as the single source of truth for bar visibility, refactor `CustomTabBar` to consume it, hoist `chat/room` to root Stack so it never mounts inside a tab's nested stack, consolidate the 12+ `/chat/room` callers (and four duplicate "create-DM-and-push" blocks) behind one helper, and remove related legacy/dead code (`FriendsList` legacy route, `RecentMemoriesSection`).

**Verified:** 2026-05-13
**Status:** human_needed — automated verification PASSES on all 14 must-haves; hardware smoke test of 8 entry paths deferred to v1.3 Hardware Verification Gate
**Re-verification:** No — initial verification

## Must-Haves Source

This phase has **no formal REQ-IDs**. Plan frontmatter `requirements:` is `[]` across all 7 plans, and ROADMAP.md's success_criteria array is empty. The roadmap explicitly states **"Requirements: TBD (no formal REQ-IDs — must-haves derived from CONTEXT.md verification anchor)"**.

Must-haves derived from:
1. ROADMAP.md Phase 30 goal text (5 explicit deliverables in the goal sentence)
2. CONTEXT.md §Scope (6 explicit scope items: store, CustomTabBar refactor, route hoist, openChat helper, FriendsList resolution, dead-code deletion) and §Verification anchor (8 entry-path smoke test)
3. Aggregated PLAN frontmatter `must_haves.truths` across all 7 plans

## Goal Achievement

### Observable Truths

| # | Truth (Source: CONTEXT.md + Plan frontmatter) | Status | Evidence |
|---|------------------------------------------------|--------|----------|
| 1 | A zustand store exposes the canonical current navigation surface for the bottom bar to consume | VERIFIED | `src/stores/useNavigationStore.ts:30` exports `useNavigationStore` with `currentSurface` defaulting to `'tabs'`, `setSurface`, `reset`; `NavigationSurface` union exports 5 literals; matches `useStatusStore` conventions verbatim |
| 2 | A single helper consolidates every `/chat/room` entry path (DM-by-channel, DM-by-friend with RPC, plan, group, birthday-group) | VERIFIED | `src/lib/openChat.ts:78` exports `openChat(router, params, options?)` with discriminated-union `OpenChatParams` covering 4 kinds (`dmChannel`, `dmFriend`, `plan`, `group` with optional `birthdayPersonId`); `OpenChatOptions` exposes `silentError`, `onLoadingChange` |
| 3 | ChatRoomScreen mounts at the ROOT Stack level (never inside a tab's nested stack) | VERIFIED | `src/app/chat/room.tsx` exists at root level; `src/app/(tabs)/chat/room.tsx` deleted (confirmed `test ! -f`); `src/app/_layout.tsx:231` declares `<Stack.Screen name="chat" options={{ headerShown: false }} />` inside `<Stack.Protected guard={!!session && !needsProfileSetup}>` |
| 4 | `src/app/chat/_layout.tsx` exists and mirrors `plans/_layout.tsx` (Stack with themed headerStyle/headerTintColor/headerShadowVisible) | VERIFIED | `src/app/chat/_layout.tsx:1-15` declares `ChatStackLayout` returning `<Stack>` with the exact three header options; no `headerShown: false` (route file owns title via `navigation.setOptions`) |
| 5 | CustomTabBar reads visibility from `useNavigationStore` rather than inspecting nested navigator state | VERIFIED | `src/components/common/CustomTabBar.tsx:14` imports `useNavigationStore`; line 124 reads `const surface = useNavigationStore((s) => s.currentSurface)`; line 125 returns null when `surface !== 'tabs'`; old `nestedRoute`/`nestedState`/`nestedIndex` references count = 0 |
| 6 | ChatRoomScreen sets `currentSurface='chat'` on focus and restores `'tabs'` on blur via useFocusEffect | VERIFIED | `src/screens/chat/ChatRoomScreen.tsx:21` imports `useFocusEffect`; line 28 imports `useNavigationStore`; line 124 reads `setSurface` via selector; lines 126-131 declare `useFocusEffect(useCallback(() => { setSurface('chat'); return () => setSurface('tabs'); }, [setSurface]))` |
| 7 | `useCallback` imported as bare named import from 'react' (alphabetised) and called bare — never `React.useCallback` | VERIFIED | Line 1 of ChatRoomScreen reads `import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';`; `grep -c "React.useCallback"` returns 0 |
| 8 | Every `router.push('/chat/room?...')` callsite is replaced by a call to `openChat(router, ...)` | VERIFIED | 10 callsite files import + use `openChat` (verified `grep -rlE "openChat\(" src/` excluding helper/tests returns exactly 10 files: `_layout.tsx`, `(tabs)/squad.tsx`, `squad/birthday/[id].tsx`, `friends/[id].tsx`, `ChatListScreen.tsx`, `PlanDashboardScreen.tsx`, `OverflowChip.tsx`, `HomeFriendCard.tsx`, `RadarBubble.tsx`, `FriendSwipeCard.tsx`) |
| 9 | Zero remaining `router.push.*chat/room` outside the helper + tests | VERIFIED | `grep -rn "router.push.*chat/room" src/` excluding `openChat.ts` and `__tests__` returns empty |
| 10 | Zero remaining `get_or_create_dm_channel` callsites outside helper/types/tests (8 duplicate "create-DM-and-push" blocks collapsed) | VERIFIED | `grep -rn "get_or_create_dm_channel" src/` excluding `openChat.ts`, `database.ts`, `__tests__` returns empty |
| 11 | `squad.tsx` handleStartDM calls `handleCloseSheet()` STRICTLY AFTER `await openChat(...)` inside try/finally — preserves in-sheet spinner UX | VERIFIED | `src/app/(tabs)/squad.tsx` shows `try { await openChat(... onLoadingChange: setLoadingDM) } finally { handleCloseSheet(); }` block; ordering inspection confirms `await openChat` BEFORE `handleCloseSheet` |
| 12 | `friends/[id].tsx` calls `openChat` with `friendId: id` (URL search param) and `friendName: profile.display_name` — never `profile.friend_id` | VERIFIED | `src/app/friends/[id].tsx:89-96` `handleStartDM` matches locked mapping; `profile.friend_id` is absent (FriendProfile interface has only `display_name`, `username`, `avatar_url`, `birthday_month`, `birthday_day`) |
| 13 | `src/components/home/RecentMemoriesSection.tsx` no longer exists; `MemoriesSection.tsx` sibling intact | VERIFIED | `test ! -f .../RecentMemoriesSection.tsx` passes; `test -f .../MemoriesSection.tsx` passes; `grep -rn "RecentMemoriesSection" src/` returns 0 |
| 14 | `src/app/friends/index.tsx` and `src/screens/friends/FriendsList.tsx` no longer exist; sub-routes `[id].tsx`, `add.tsx`, `requests.tsx`, `_layout.tsx` preserved; `AddFriend.tsx`, `FriendRequests.tsx` preserved | VERIFIED | All `test ! -f` checks pass for the 2 deleted files; all 6 preservation `test -f` checks pass; `grep -rn "FriendsList" src/` returns 0 |

**Score:** 14 / 14 truths verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/stores/useNavigationStore.ts` | Zustand slice for navigation surface state | VERIFIED | 35 lines; exports `useNavigationStore` + `NavigationSurface`; create<NavigationState>((set) => ...) pattern; no middleware, no persist |
| `src/lib/openChat.ts` | Single chat-entry helper | VERIFIED | 113 lines; exports `openChat`, `OpenChatParams`, `OpenChatOptions`; 5 entry shapes via `kind` discriminator; RPC invocation correct |
| `src/app/chat/room.tsx` | Root-level route hoisted | VERIFIED | 22 lines; identical content to former `(tabs)/chat/room.tsx`; sets per-route title via `navigation.setOptions({ title: friend_name })` |
| `src/app/chat/_layout.tsx` | Stack layout mirroring plans/_layout.tsx | VERIFIED | 15 lines; `ChatStackLayout`; themed header chrome; no `headerShown: false` (preserves per-route title) |
| `src/app/_layout.tsx` | New `chat` Stack.Screen entry inside auth-protected block | VERIFIED | Line 231: `<Stack.Screen name="chat" options={{ headerShown: false }} />` placed inside `<Stack.Protected>` |
| `src/components/common/CustomTabBar.tsx` | Visibility reads from `useNavigationStore` | VERIFIED | Line 14 import; lines 124-125 selector + non-tabs return null; 7-line nested-state block removed |
| `src/screens/chat/ChatRoomScreen.tsx` | useFocusEffect surface writer | VERIFIED | Lines 21/28 imports; line 124 selector; lines 126-131 useFocusEffect block |
| `src/components/home/RecentMemoriesSection.tsx` | Deleted | VERIFIED | File absent; no references |
| `src/app/friends/index.tsx` | Deleted | VERIFIED | File absent |
| `src/screens/friends/FriendsList.tsx` | Deleted | VERIFIED | File absent; zero `FriendsList` references in src/ |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/components/common/CustomTabBar.tsx` | `src/stores/useNavigationStore.ts` | `useNavigationStore((s) => s.currentSurface)` | WIRED | Import present; selector pattern used; return null when not 'tabs' |
| `src/screens/chat/ChatRoomScreen.tsx` | `src/stores/useNavigationStore.ts` | `useFocusEffect setSurface('chat') / setSurface('tabs')` | WIRED | Import present; selector returns stable `setSurface`; cleanup restores tabs |
| `src/lib/openChat.ts` | `supabase.rpc('get_or_create_dm_channel')` | DM-by-friend-id branch | WIRED | Line 102 calls the RPC with `other_user_id`; correct error handling on lines 107-110 |
| `src/lib/openChat.ts` | `router.push('/chat/room?...')` | All 5 param shapes via build* helpers | WIRED | `buildDmUrl`, `buildPlanUrl`, `buildGroupUrl` produce byte-for-byte identical URLs to former inline implementations |
| 10 callsite files | `src/lib/openChat.ts` | `openChat(router, params, options?)` | WIRED | Verified via `grep -rlE "openChat\("` returning 10 files |
| `src/app/_layout.tsx` | `src/app/chat/room.tsx` | `<Stack.Screen name="chat" options={{ headerShown: false }} />` | WIRED | Registration inside auth-protected block confirmed |
| `src/app/chat/room.tsx` | `src/screens/chat/ChatRoomScreen.tsx` | default export wraps `ChatRoomScreen` | WIRED | Line 3 import + line 21 render |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|---------------------|--------|
| `CustomTabBar.tsx` | `surface` | `useNavigationStore((s) => s.currentSurface)` — fed by `ChatRoomScreen.useFocusEffect` writer | Yes (verified by jest tests `ChatRoomScreen.surface.test.tsx` — focus pushes 'chat', cleanup restores 'tabs'; CustomTabBar test verifies bar visibility flips with each surface literal) | FLOWING |
| `ChatRoomScreen.tsx` | `setSurface` | `useNavigationStore((s) => s.setSurface)` — stable zustand setter | Yes (the surface state is the data variable, populated by the focus/blur lifecycle) | FLOWING |
| `openChat.ts` dmFriend path | `data` (returned channel id) | `supabase.rpc('get_or_create_dm_channel', { other_user_id })` — real DB RPC | Yes (RPC call wired; result fed into `buildDmUrl`; error path branches to Alert or silent) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| useNavigationStore default surface is 'tabs' | jest test `useNavigationStore.test.ts` "default state" | passing | PASS |
| openChat helper produces 5 URL shapes correctly | jest test `openChat.test.ts` (10 tests covering each branch + error/silentError/onLoadingChange) | 10 passing | PASS |
| CustomTabBar hides for non-'tabs' surfaces | jest test `CustomTabBar.test.tsx` (5 tests) | 5 passing | PASS |
| ChatRoomScreen pushes 'chat' on focus, restores 'tabs' on blur | jest test `ChatRoomScreen.surface.test.tsx` (3 tests) | 3 passing | PASS |
| Full project test suite regression gate | `npx jest --no-coverage` | 96 passed, 24/24 suites | PASS |

### Requirements Coverage

This phase has **no formal REQ-IDs** declared in PLAN frontmatter (all 7 plans use `requirements: []`). The roadmap explicitly documents: **"Requirements: TBD (no formal REQ-IDs — must-haves derived from CONTEXT.md verification anchor)"**.

**Note on REQUIREMENTS.md drift (INFO):** REQUIREMENTS.md's Traceability table maps SQUAD-05, SQUAD-06, SQUAD-07, SQUAD-08 to "Phase 30". Phase 30's actual scope (per ROADMAP.md and CONTEXT.md) is the navigation source-of-truth refactor, NOT a Squad screen overhaul. These four SQUAD requirements remain unmapped to any active or planned phase in the current ROADMAP. This is a documentation-drift issue for the user to resolve in REQUIREMENTS.md — it is not a verification gap for Phase 30 because the phase explicitly declared "no formal REQ-IDs" up front. SQUAD-05..08 are NOT regressions or omissions of this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (production new/modified files) | — | None found | — | Clean |

Anti-pattern scan on new files (`useNavigationStore.ts`, `openChat.ts`, `chat/room.tsx`, `chat/_layout.tsx`) and modified files (`CustomTabBar.tsx`, `ChatRoomScreen.tsx`) returned ZERO TODO/FIXME/HACK markers, ZERO placeholder returns, ZERO unwired props.

### Code Review Findings (Advisory — NON-blocking)

Per the input note, the standard-depth code review (`30-REVIEW.md`) recorded 0 critical, 5 warnings, 7 info findings. These are advisory and do NOT block phase completion. They are surfaced here for visibility and follow-up:

| Finding | Severity | Location | Summary |
|---------|----------|----------|---------|
| WR-01 | Warning | `ChatRoomScreen.tsx:126-131` | `useFocusEffect` cleanup unconditionally restores `'tabs'`; could leak the tab bar momentarily if user pushes a NON-tabs surface on top of chat. Fix requires adding the missing producers for `'plan'`/`'modal'`/`'auth'` (WR-04) or guarding cleanup conditionally |
| WR-02 | Warning | `openChat.ts:101-110` | `onLoadingChange(false)` not invoked if `supabase.rpc` THROWS (vs returns `{ error }`); leaks `loadingDM=true` in caller. Fix: wrap RPC call in try/finally |
| WR-03 | Warning | `squad/birthday/[id].tsx:35` | Pre-existing double-decode bug: `decodeURIComponent(name)` on already-decoded param crashes for names containing literal `%`. Pre-existing, not introduced by Phase 30, but in reviewed callsite |
| WR-04 | Warning | `useNavigationStore.ts` + screens | The `'plan'`/`'modal'`/`'auth'` surface literals declared in the union are TYPED but have NO PRODUCERS — only `'chat'` has a `useFocusEffect` writer. CustomTabBar tests for these surfaces pass (the test manually sets the surface), but the integration path is dead. Per ROADMAP `setSurface !== 'tabs'` is future-proof — adding writers for these surfaces is FUTURE WORK, not part of Phase 30 scope (CONTEXT.md §Scope only mandates the chat writer) |
| WR-05 | Warning | `friends/[id].tsx:89-96` | `friendId: id` is `string \| undefined` (from `useLocalSearchParams`); pre-existing tsc warning class — guard `if (!profile \|\| !id)` would narrow it |
| IN-01..IN-07 | Info | various | minor lint/style/observability items; none affect goal achievement |

**Verdict:** No findings block goal achievement. WR-01 + WR-04 are tightly coupled — both reflect the same architectural decision that ONLY the chat surface has a producer this phase. CONTEXT.md scope explicitly LIMITS the chat writer to this phase; other surfaces are future work. WR-02 has zero observed impact today because all 10 callsites either invoke from contexts that already supply `setLoadingDM` (squad.tsx) or no `loadingDM` state at all (the rest); a future RPC throw would surface this latent bug.

### Human Verification Required

Hardware-bound runtime verification cannot be observed by automated checks:

1. **Originating bug**
   - Test: Squad → Memories → plan section → PlanDashboard → tap "Open Chat" pill → verify bottom tab bar is HIDDEN in chat; tap back → verify bar restores
   - Expected: Bar hidden on chat entry from non-canonical path; bar restored on back
   - Why human: Runtime navigator behavior + actual rendering of CustomTabBar across the 8 entry paths cannot be observed without a running app

2. **Full 8-path verification anchor (from CONTEXT.md §Verification anchor)**
   - Test: Chat tab → chat row → back; Squad Friends sub-tab → friend → DM → back; Plans tab → plan → "Open Chat" pill → back; Home OverflowChip / FriendSwipeCard / HomeFriendCard / RadarBubble → DM → back; Birthday page → wish chat → back; Friend detail page → DM → back; Push notification deep link → chat → back
   - Expected: Bar hides on entry, restores on exit, for every path
   - Why human: Real-device traversal required

3. **DM error UX preserved**
   - Test: Trigger DM RPC failure (e.g., sign out, attempt DM from a home component)
   - Expected: Identical alert "Error" / "Couldn't open chat. Try again." appears for non-silent callers; push-notification path silent-fails
   - Why human: Alert rendering observable only on hardware

**These hardware items are consolidated in v1.3 Hardware Verification Gate per the project memory rule `project_hardware_gate_deferral.md`** — they do not block individual phase completion but must be tested before milestone close. User memory rule `user_no_apple_dev_account.md` also indicates no iOS hardware testing until near-publication.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | TanStack Query / server-state caching adoption | Phase 31 | ROADMAP Phase 31 goal: "Adopt TanStack Query for server-state caching and cross-screen reactivity" |
| 2 | Producers for `'plan'`/`'modal'`/`'auth'` surfaces (WR-04) | Future work | CONTEXT.md §Scope explicitly limits this phase's writer to the chat surface; future surfaces ARE typed in the union but not required by Phase 30 |

### Gaps Summary

**No blocking gaps.** All 14 must-haves verified against the codebase:

- **Topology fix:** Chat route hoisted to root Stack (`src/app/chat/room.tsx` + `_layout.tsx` + root `<Stack.Screen name="chat" />`); old `(tabs)/chat/room.tsx` deleted. Dual-mount risk structurally eliminated.
- **State source-of-truth:** `useNavigationStore` zustand slice created with `currentSurface` defaulting to `'tabs'`, `setSurface` and `reset`; `NavigationSurface` type union exported with 5 literals.
- **Producer/consumer wiring:** `CustomTabBar` reads via selector and returns null for any non-`'tabs'` surface; `ChatRoomScreen` declares `useFocusEffect` that pushes `'chat'` on focus and restores `'tabs'` on blur. Bare `useCallback` import-style locked.
- **Entry-point consolidation:** `openChat()` helper consolidates 5 entry shapes with discriminated union; 10 callsite files migrated to `await openChat(router, ...)`; 8 duplicate `get_or_create_dm_channel` + push pairs collapsed; zero remaining inline pushes outside the helper.
- **Originating-bug callsite migrated:** `PlanDashboardScreen.tsx:1023` `onPress={() => openChat(router, { kind: 'plan', planId })}` — combined with the consumer/writer wiring, the "Open Chat" pill no longer leaks the bar.
- **Dead-code deletion:** `RecentMemoriesSection.tsx` deleted (zero importers confirmed); legacy `/friends` index route + `FriendsList.tsx` deleted (zero references confirmed); sub-routes and `MemoriesSection.tsx` preserved.
- **Regression gate:** Full jest suite 96/96 passing, 24/24 suites; zero new tsc errors in production files (pre-existing baseline errors in `friends/[id].tsx` and `ChatRoomScreen.tsx` documented in deferred-items.md).

**Why status is `human_needed`:** Automated verification is GREEN across all must-haves; however the goal achievement on physical hardware (the 8-path verification anchor in CONTEXT.md) requires runtime testing per project policy (`project_hardware_gate_deferral.md`). Per the memory rule, this hardware smoke test is consolidated in the v1.3 Hardware Verification Gate, not blocking individual phases. Marking `human_needed` is the correct contractual status per the verifier decision tree: any non-empty human verification section takes priority over `passed`.

---

_Verified: 2026-05-13_
_Verifier: Claude (gsd-verifier)_
