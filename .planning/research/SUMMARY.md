# Project Research Summary

**Project:** Campfire v1.2 — Squad & Navigation
**Domain:** React Native top-tab navigation within Expo Router; bottom-nav restructuring; social screen migration
**Researched:** 2026-04-04
**Confidence:** HIGH

> **Note:** This file supersedes the v1.1 summary (researched 2026-03-24). The v1.1 summary covered the design system extraction milestone. This summary covers v1.2 only: Squad tab with top tabs, friend management relocation from Profile to Squad, and bottom-nav restructuring.

## Executive Summary

The v1.2 milestone is a navigation and information architecture migration, not a feature build. The goal is to move an existing, working friend management system from the Profile tab into a dedicated Squad tab — and to restructure the bottom navigation to reflect the app's actual social-first priorities. All underlying data, hooks, and screen components already exist and work correctly; no new product logic needs to be invented. The work is purely structural: converting `squad.tsx` into a nested top-tab layout, relocating screen components, reordering tab entries in `_layout.tsx`, and removing the now-redundant friend rows from Profile.

The recommended approach for top-tab navigation is `@react-navigation/material-top-tabs` with the `withLayoutContext` wrapper, integrated as a proper Expo Router layout (`squad/_layout.tsx`). This is the only approach that correctly fires `useFocusEffect` per sub-tab, preserves per-tab scroll position, and integrates with Expo Router's file-based route tree. A custom `useState` toggle (the "fake tabs" pattern used in `AddFriend`) is explicitly wrong for a screen-level navigation structure and must not be used here, even though it avoids a new dependency.

The dominant risks are all in the migration path rather than the implementation: stale `router.push` strings that break silently after route renames, Playwright tests tightly coupled to old tab labels, duplicate Supabase Realtime subscriptions if the badge hook is called in multiple places, and the conflicting file state if `squad.tsx` is not deleted when `squad/` is created. All of these are preventable with explicit grep audits, atomic commits, and a strict "one hook call at layout level" rule. None require novel solutions — they require discipline.

## Key Findings

### Recommended Stack

The existing stack requires three new dependencies. Everything else is a config change or file migration. Install: `@react-navigation/material-top-tabs ^7.4.23`, `react-native-tab-view ^4.0.6`, and `react-native-pager-view ^6.x` (use `npx expo install react-native-pager-view` for the SDK-55-pinned version; use `npm install` for the react-navigation packages). `react-native-pager-view` is a native module, but it is pre-bundled in Expo Go SDK 55 — no custom dev build is required.

**Core technologies:**
- `@react-navigation/material-top-tabs`: top-tab navigator for Squad (Friends / Goals) — aligns with existing `@react-navigation/native ^7.x`; no version conflict
- `react-native-tab-view`: underlying pager for material-top-tabs — compatible with `react-native-reanimated` 4.2.1 already installed
- `react-native-pager-view`: native ViewPager backing react-native-tab-view — included in Expo Go SDK 55 binary; install via `npx expo install` for correct version pin
- `withLayoutContext` (ships with `expo-router`): required bridge between React Navigation navigators and Expo Router's file-based route tree — not optional

### Expected Features

All features in this milestone are P1. There are no P2 or P3 items for v1.2 — everything on the list is required for the milestone to achieve its stated goal.

**Must have (table stakes):**
- Squad tab with Friends / Goals top tabs — makes Squad usable; current stub is effectively a blank screen
- Friends sub-tab renders existing `FriendsList` component with FAB — core relocation, zero new logic
- Pending request count row in Friends sub-tab — navigates to `/friends/requests`; pattern extracted from Profile
- Badge (pending count) moved from Profile tab to Squad tab — one property change in `_layout.tsx`
- Bottom nav reordered: Home | Squad | Explore | Chats | Profile — information architecture fix
- Plans → Explore rename — file rename + title update + route audit
- Chat → Chats rename — directory rename + title update + route audit
- Profile tab simplified — remove 3 friend rows and 2 hook imports; must be last step
- Goals sub-tab placeholder — "coming soon" content ported from current `squad.tsx`

**Should have (competitive differentiators):**
- Pending requests styled as actionable inline row (not just badge) — pattern from Snapchat/Instagram; low complexity; extract from existing Profile implementation
- Friend status (Free/Busy/Maybe) visible immediately in Squad Friends tab — reinforces the app's core daily-habit value; `FriendCard` already renders it; benefit is positional, not additive

**Defer (v2+):**
- Goals tab real content (group challenges, streaks)
- Friends list search/filter (relevant only if group size grows past 15)
- QR code accessible from Squad tab (defer pending user research on whether Profile is wrong home)
- Swipe gesture between top tabs (anti-feature: conflicts with pull-to-refresh on Friends list; avoid even though `@react-navigation/material-top-tabs` supports it)

### Architecture Approach

The migration converts `squad.tsx` from a single flat file into a directory with a proper Expo Router nested layout. The `src/app/friends/` root-level Stack is deliberately left in place — friends sub-screens (add, requests, [id]) must remain at root scope so the bottom tab bar correctly hides during full-screen navigation. Only the friends list view moves, embedded inline via `<FriendsList />` in `squad/friends.tsx`. The pending count badge moves by reassigning its `tabBarBadge` prop in `_layout.tsx` — the hook call stays at layout level.

**Major components:**
1. `(tabs)/_layout.tsx` — MODIFIED: reorder tabs, rename titles, move badge from Profile to Squad
2. `(tabs)/squad/_layout.tsx` — NEW: `withLayoutContext(createMaterialTopTabNavigator())` with design-token `screenOptions`; handles `paddingTop: insets.top` once (not repeated in child screens)
3. `(tabs)/squad/friends.tsx` — NEW: renders `<FriendsList />`; FAB navigates to `/friends/add`; pending request row navigates to `/friends/requests`
4. `(tabs)/squad/goals.tsx` — NEW: "coming soon" placeholder ported from old `squad.tsx`
5. `(tabs)/explore.tsx` — NEW: identical content to current `plans.tsx` (file rename)
6. `(tabs)/profile.tsx` — MODIFIED: FRIENDS section and its 2 hook imports removed (last step)
7. `src/screens/friends/FriendsList.tsx` — MODIFIED (recommended): swap `useEffect([], fetchFriends)` for `useFocusEffect(fetchFriends)` to prevent stale data in persistent top-tab mount

### Critical Pitfalls

1. **Stale `router.push` paths after route moves** — Six specific call sites (`profile.tsx` lines 147/168, `friends/index.tsx` line 19, `FriendsList.tsx` lines 64/85/101, `PlanDashboardScreen.tsx` line 277) silently point to dead routes if not updated atomically. Run `grep -rn "'/friends" src/` before touching any file; update all call sites in the same commit as the deletion.

2. **Missing `react-native-pager-view` peer dependency** — Installing `@react-navigation/material-top-tabs` without `react-native-pager-view` causes a runtime module error in the Squad layout. Install all three packages together as the absolute first task; use `npx expo install` (not `npm install`) for `react-native-pager-view`.

3. **Old `squad.tsx` left alongside new `squad/` directory** — Metro bundler ambiguity causes inconsistent behavior between hot reloads and cold starts. Delete `squad.tsx` in the same commit that creates `squad/_layout.tsx` — never allow both to exist simultaneously.

4. **Playwright tests coupled to old tab labels** — `page.getByText("Plans")`, `page.getByText("Chat")`, and `page.getByText("Squad")` all break after renames and Squad restructure. Update locators and regenerate snapshots in the same phase that makes the rename; run `npx playwright test --update-snapshots` and rename stale baseline `.png` files.

5. **Duplicate Supabase Realtime subscription from badge hook** — `usePendingRequestsCount` opens a Realtime channel. Calling it in two places doubles subscriptions against the 2M/month free-tier limit. Keep the single call in `_layout.tsx`; pass the count as a prop or via Zustand if needed in Squad screen body — never call the hook a second time.

## Implications for Roadmap

The dependency graph dictates a strict ordering. Profile cleanup is destructive (removes friend entry points) and must be last. Squad tab must be verified working before profile simplification begins. Navigation renames are independent but must trigger Playwright updates in the same phase.

### Phase 1: Install Dependencies and Convert Squad Tab

**Rationale:** Install the three required packages before writing any layout code (avoids mid-feature "module not found" errors). Convert `squad.tsx` to the `squad/` directory with top-tab layout, Friends tab, and Goals stub. This is the highest-value deliverable and the structural foundation everything else depends on.

**Delivers:** Working Squad tab with Friends / Goals top tabs; FriendsList accessible from Squad; Goals placeholder visible; `useFocusEffect` added to FriendsList for stale-data prevention.

**Addresses:** Squad top tabs, Friends tab content, Goals stub (all P1 table-stakes features)

**Avoids:** Pitfall 2 (missing pager dep), Pitfall 3 (squad.tsx ambiguity), Anti-Pattern 3 (custom tab switcher instead of `withLayoutContext`)

**Key tasks:**
- `npx expo install @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view`
- Create `squad/_layout.tsx` using `withLayoutContext(createMaterialTopTabNavigator())` with design-token `screenOptions`
- Create `squad/friends.tsx` rendering `<FriendsList />`
- Create `squad/goals.tsx` with coming-soon content from old `squad.tsx`
- Delete `squad.tsx` in the same commit
- Swap `useEffect([], fetchFriends)` for `useFocusEffect(fetchFriends)` in `FriendsList.tsx`
- Verify top tabs work in Expo Go on device before proceeding to Phase 2

### Phase 2: Bottom Nav Restructure and Tab Renames

**Rationale:** Navigation renames are independent of Squad content but require a route audit and Playwright update. Bundling them together avoids two separate rounds of snapshot regeneration. Renaming and reordering without updating tests creates a broken CI state. Do both in the same phase.

**Delivers:** Correct nav order (Home | Squad | Explore | Chats | Profile); Plans tab becomes Explore; Chat tab label becomes Chats; Squad tab badge shows pending count instead of Profile badge.

**Addresses:** Bottom nav reorder, Plans → Explore rename, Chat → Chats rename, badge migration (all P1)

**Avoids:** Pitfall 1 (stale router.push paths), Pitfall 3 (cached navigation state), Pitfall 4 (Playwright test breakage), Pitfall 5 (double badge hook subscription)

**Key tasks:**
- Grep audit: `grep -rn "'/plans\|'/chat" src/` — document all call sites before any file rename
- Create `explore.tsx` (identical content to `plans.tsx`), delete `plans.tsx`
- Update `chat/` tab title to "Chats" in `_layout.tsx` (folder stays as `chat/`; only the tab display title changes)
- Reorder `<Tabs.Screen>` declarations in `_layout.tsx`: index → squad → explore → chat → profile
- Move `tabBarBadge` from Profile `<Tabs.Screen>` to Squad `<Tabs.Screen>`; remove badge from Profile
- Update all Playwright locators (`getByText("Plans")` → `getByText("Explore")`, etc.)
- Run `npx playwright test --update-snapshots`; rename stale snapshot files to match new tab names
- Add new Squad snapshot tests: Squad → Friends sub-tab, Squad → Goals sub-tab

### Phase 3: Profile Simplification

**Rationale:** This phase removes the existing friend entry points from Profile. It must not run until Phase 1 has been verified working — removing friend access from Profile before Squad serves it leaves users with no path to friend management. Last step, not a cleanup.

**Delivers:** Clean Profile screen (status editing, QR code, notifications, logout only); no redundant friend rows; no orphaned imports.

**Addresses:** Profile tab simplification (P1 — final step)

**Avoids:** Removing the only friend access path before the replacement is confirmed working

**Key tasks:**
- Remove FRIENDS section header and three rows (My Friends, Friend Requests, My QR Code) from `profile.tsx`
- Remove `useFriends` and `usePendingRequestsCount` imports from `profile.tsx`
- Remove `useFocusEffect(fetchFriends)` dependency from `profile.tsx`
- Verify with `grep -rn "router.push.*'/friends" src/app/(tabs)/profile.tsx` returns zero results
- Full regression test: confirm all friend management flows work exclusively from Squad tab

### Phase Ordering Rationale

- Squad tab first: Profile cleanup depends on Squad working — never remove the existing entry point before the replacement is verified
- Navigation renames second: independent of Squad content but produce Playwright churn; batching minimizes test-update overhead; must happen before Profile cleanup so the nav order is correct when Profile is simplified
- Profile cleanup last: most destructive change (deletes working feature access); requires Phase 1 verification as a hard precondition
- This order ensures users always have a working path to friend management even if development is interrupted mid-milestone

### Research Flags

No phases require `/gsd:research-phase` during planning. All implementation details are resolved in the research files.

Phases with standard patterns (skip research):
- **Phase 1 (Squad tab):** `withLayoutContext` + `createMaterialTopTabNavigator` is fully documented in Expo official docs and confirmed working via GitHub issue #41111. Implementation pattern is concrete and complete in STACK.md and ARCHITECTURE.md including exact TypeScript generics.
- **Phase 2 (Nav renames):** Pure config change (reorder `<Tabs.Screen>` declarations) + file renames + Playwright updates. All mechanics well-understood; no novel patterns.
- **Phase 3 (Profile cleanup):** Deletion-only change. Zero novel patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Expo docs + GitHub issue #41111 confirming `withLayoutContext` requirement; SDK 55 compatibility verified via Expo Go binary contents; `package.json` directly inspected for existing versions |
| Features | HIGH | Direct codebase audit of all relevant files; all features touch existing working code; scope is relocation not invention; no user-facing logic to design |
| Architecture | HIGH | Direct codebase inspection of all files in `src/app/`, `src/screens/`, `src/hooks/`; file-by-file change list derived from actual code with exact line numbers |
| Pitfalls | HIGH | Grounded in direct codebase audit including exact line numbers for stale router.push call sites; Playwright test file directly inspected; Supabase subscription pattern confirmed |

**Overall confidence:** HIGH

### Gaps to Address

- **Navigation state cache on upgrade path:** Tab reorder and renames will invalidate persisted `AsyncStorage` navigation state for users upgrading from v1.1. Recovery is a one-frame cosmetic glitch (wrong tab shown briefly on cold start), not a crash. Accept as a known cosmetic issue for the v1.1→v1.2 upgrade path; document in release notes. No code mitigation planned unless testing on a v1.1 device reveals a worse failure mode than a brief flash.

- **FAB visibility on Goals tab:** The Add Friend FAB should not appear on the Goals placeholder screen. Research identifies `useSegments` as the correct conditional render mechanism. Confirm this detail is addressed during Phase 1 Squad tab implementation — it is easy to miss since both tabs share the same Squad layout context.

- **`usePendingRequestsCount` cleanup verification:** Research flags a potential missing `supabase.removeChannel` in the hook's unmount cleanup. Verify during Phase 2 when the badge hook assignment is being touched. If cleanup is missing, add it in the same commit.

## Sources

### Primary (HIGH confidence)
- Direct codebase audit: `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/profile.tsx`, `src/app/(tabs)/squad.tsx`, `src/app/friends/`, `src/screens/friends/FriendsList.tsx`, `tests/visual/design-system.spec.ts`, `package.json` — April 2026
- Expo Router — Custom Tab Layouts: https://docs.expo.dev/router/advanced/custom-tabs/
- Expo Router — Nesting Navigators: https://docs.expo.dev/router/advanced/nesting-navigators/
- GitHub expo/expo issue #41111 — `withLayoutContext` requirement (marked COMPLETED by Expo team)
- GitHub expo/expo issue #33096 — SDK 52 material-top-tabs bug (resolved upstream in React Navigation v7 patch)
- `expo-router/build/layouts/withLayoutContext.js` — confirms `createMaterialTopTabNavigator` integration
- Expo SDK 55 managed workflow modules list — confirms `react-native-pager-view` in Expo Go binary
- EvanBacon expo-router-layouts-example — canonical `withLayoutContext` pattern

### Secondary (MEDIUM confidence)
- React Navigation — Material Top Tabs Navigator docs (current v7): https://reactnavigation.org/docs/material-top-tab-navigator/
- Established mobile UX convention (Instagram, Snapchat, LinkedIn) — top tabs for social sub-sections; pending requests as inline actionable rows
- WebSearch — `@react-navigation/material-top-tabs` v7.4.23 as latest version (not verified against npm registry directly)

### Tertiary (LOW confidence)
- None — all relevant findings are grounded in primary or secondary sources

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
