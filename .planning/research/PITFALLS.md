# Pitfalls Research

**Domain:** Adding Squad tab with top tabs + navigation restructure to an existing React Native + Expo Router app (v1.2 milestone)
**Researched:** 2026-04-04
**Confidence:** HIGH — grounded in direct codebase audit (current route tree, navigation layout, Playwright tests) + verified against Expo Router official docs and React Navigation patterns

---

## Critical Pitfalls

### Pitfall 1: Moving `friends/` Out of Root Scope Breaks Every Existing `router.push` Path

**What goes wrong:**
The `friends/` route group currently lives at the root level (`src/app/friends/`), not inside `(tabs)/`. Every push to `/friends`, `/friends/add`, `/friends/requests`, and `/friends/[id]` hard-codes that root path. When the milestone moves friend screens into the Squad tab (e.g., `(tabs)/squad/friends/index.tsx`), all existing `router.push` calls in `profile.tsx`, `FriendsList.tsx`, `friends/index.tsx`, and `PlanDashboardScreen.tsx` continue pointing at `/friends` — a route that no longer exists. The app does not crash at build time. It fails silently at runtime when a user taps "My Friends."

**Why it happens:**
Expo Router paths are strings. There is no TypeScript type error when a path becomes stale. The compiler does not know that `/friends` was deleted. The team migrates the file, sees the Squad tab working, and does not realize six separate `router.push` call sites still point at the old path.

**How to avoid:**
- Before moving any file, run a global grep: `grep -rn "'/friends" src/` and document every call site.
- Update all call sites atomically in the same commit that deletes the old route files.
- After the move, verify with `grep -rn "router.push.*friends" src/` that zero old paths remain.
- The current call sites to update are: `profile.tsx` (lines 147, 168), `friends/index.tsx` (line 19), `FriendsList.tsx` (lines 64, 85, 101), `PlanDashboardScreen.tsx` (line 277), and `friends/[id].tsx` (line 64).

**Warning signs:**
- `src/app/friends/` directory is deleted but no `router.push` calls were updated.
- TypeScript compiles cleanly but tapping "My Friends" from Profile navigates nowhere.
- `router.push('/friends/requests')` appears in Profile.tsx after the route is moved into Squad tab.

**Phase to address:** The phase that relocates friend screens. Grep audit before touching files; update all push paths atomically.

---

### Pitfall 2: Adding Top Tabs to Squad Requires `@react-navigation/material-top-tabs` and `react-native-tab-view` — Not Included in Current Stack

**What goes wrong:**
Expo Router does not ship a top-tab navigator out of the box. Adding `Friends | Goals` top tabs inside the Squad screen requires `@react-navigation/material-top-tabs` and `react-native-tab-view` plus a `withLayoutContext` wrapper. If the phase starts implementing the Squad tab without adding these packages first, the developer writes a layout file that imports `createMaterialTopTabNavigator`, gets a module not found error, and then installs mid-feature in an unclear state.

**Why it happens:**
The existing `chat/_layout.tsx` uses `Stack` which ships with Expo Router. The pattern looks similar, so developers assume `Tabs` or a top-tab variant is also already available. It is not. This is a documented gap in Expo Router (GitHub issue #41111 filed against expo/expo for missing top-tab guidance).

**How to avoid:**
- Install dependencies as the first task of the Squad tab phase, before writing any layout code: `npx expo install @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view`.
- Verify Expo Go compatibility: `react-native-tab-view` and `react-native-pager-view` both work in Expo Go managed workflow (no native modules required beyond what Expo manages).
- The layout wrapper pattern is: `const MaterialTopTabs = withLayoutContext(createMaterialTopTabNavigator().Navigator);` — use this in `(tabs)/squad/_layout.tsx`.
- Do not attempt to fake top tabs with a custom ScrollView/TouchableOpacity approach to avoid the dependency — the `withLayoutContext` approach integrates correctly with Expo Router's navigation state; custom implementations do not.

**Warning signs:**
- `createMaterialTopTabNavigator` import fails at runtime.
- Squad tab layout is implemented as a custom component instead of a proper Expo Router layout.
- `react-native-tab-view` is missing from `package.json`.

**Phase to address:** First task of the Squad tab implementation phase. Install and verify the packages before writing Squad layout code.

---

### Pitfall 3: Renaming Tab Files (`plans.tsx` → `explore.tsx`, `chat/` → `chats/`) Invalidates Expo Router's Cached Navigation State

**What goes wrong:**
Expo Router persists navigation state between app sessions using `AsyncStorage`. The state includes the name of the active tab (which is the file name). After renaming `plans.tsx` to `explore.tsx`, a user who had the "Plans" tab active the last time they used the app will reopen the app and hit a state hydration error or a blank screen, because the stored state references `"plans"` but the route now only knows `"explore"`. On Expo Web (used by Playwright), this manifests as a navigation to a non-existent route.

**Why it happens:**
File-based routing means the route name is the file name. Renaming the file is equivalent to deleting one route and adding another. Any persisted navigation state pointing to the old name is now invalid. React Navigation attempts to restore the stale state, finds no matching route, and renders nothing or throws.

**How to avoid:**
- After renaming tab files, clear the Expo Router navigation state cache in testing: force a fresh app launch (not a reload from cached state).
- For production users, add a schema version bump or clear the navigation state on the next app launch if the tab count or names change. Expo Router does not handle this automatically.
- On web (used by Playwright), navigate to `/` explicitly in tests rather than relying on cached route. The existing `page.goto("/")` calls in the test suite already do this, which is correct.
- Test renaming in a clean app state (no prior navigation state) AND in a state where the renamed tab was the last active tab.

**Warning signs:**
- App opens to a blank screen after a tab rename.
- Playwright test navigates to a renamed tab by clicking the old label and gets a timeout.
- `AsyncStorage` contains `{"index":1,"routes":[{"name":"plans",...}]}` after the rename.

**Phase to address:** The navigation rename phase. Treat renames as "delete old + add new" not "rename in place."

---

### Pitfall 4: Playwright Tests Navigate to Tabs by Label Text — Every Rename Breaks the Test Suite

**What goes wrong:**
The existing `design-system.spec.ts` navigates to tabs using `page.getByText("Plans")`, `page.getByText("Chat")`, and `page.getByText("Squad")`. After renaming Plans → Explore and Chat → Chats, and after adding a Squad top-tab that changes what "Squad" renders, every one of these locators either fails to find the element (no matching text) or clicks the wrong thing. All navigation tests in the suite fail. Baseline snapshots are also stale: `plans-screen.png` captures a tab now called Explore, and `chat-screen.png` captures content with the old tab name visible.

**Why it happens:**
Text-based locators are coupled to the visible label. Changing the label — which is the entire point of this milestone — directly breaks the locator. There is no more resilient selector strategy in the current test suite (no `data-testid` attributes, no aria roles for individual tab buttons).

**How to avoid:**
- Update Playwright tests in the same phase as the navigation renames, not as a cleanup later.
- After label changes, run `npx playwright test --update-snapshots` to regenerate baseline images for all affected screens.
- The "friends screen" test clicks `page.getByText("Squad")` and expects the current stub screen — after v1.2, Squad renders the Friends/Goals top-tab layout. The test must be updated to navigate into the Friends sub-tab and the snapshot must be regenerated.
- Rename snapshot files to match new tab names: `plans-screen.png` → `explore-screen.png`, `chat-screen.png` → `chats-screen.png`. The test file references these names; mismatches cause false failures.
- Add new snapshot tests for: Squad → Friends tab (friend list), Squad → Goals tab (coming soon placeholder).

**Warning signs:**
- `page.getByText("Plans")` timeout error after the Plans → Explore rename.
- Old snapshot filename `plans-screen.png` remains in the repo after the rename.
- Playwright passes but snapshots are stale (showing old tab names in the tab bar).

**Phase to address:** Any phase that renames a tab label must include a Playwright update task. Snapshot regeneration is mandatory before closing that phase.

---

### Pitfall 5: `pendingCount` Badge Moves From Profile to Squad Tab — Badge Hook Called in Wrong Layout

**What goes wrong:**
Currently, `usePendingRequestsCount()` is called in `(tabs)/_layout.tsx` and powers the `tabBarBadge` on the Profile tab. After v1.2, the badge should appear on the Squad tab (since friend requests move to Squad). If the hook call is simply moved from Profile to Squad in `_layout.tsx`, it works. But if a developer also removes the Profile badge without removing the hook call, or adds a second hook call inside the Squad screen for display purposes, the Supabase subscription behind the hook fires twice per update, doubling the Realtime event consumption against the 2M/month free-tier limit.

**Why it happens:**
`usePendingRequestsCount` opens a Supabase Realtime subscription. Multiple calls create multiple channel subscriptions. The hook is small and looks cheap to call multiple times. The Realtime cost only becomes visible in aggregate, not in local testing.

**How to avoid:**
- Move the `usePendingRequestsCount()` call in `_layout.tsx` from the Profile badge to the Squad badge in one change. Do not add a second call.
- If the Squad screen body also needs to display the pending count (e.g., inside the Friends tab header), pass it down as a prop or read from a Zustand slice — do not call the hook again.
- Audit `usePendingRequestsCount` to confirm it cleans up its channel on unmount (check for `supabase.removeChannel` in cleanup). If cleanup is missing, fix it in this phase.
- After the change, verify with Supabase dashboard that the Realtime connection count does not increase compared to before.

**Warning signs:**
- `usePendingRequestsCount` is imported in more than one file simultaneously.
- Supabase Realtime connection count in the dashboard increases after v1.2 compared to v1.1.
- Badge on Squad tab updates correctly but Profile tab badge still shows stale count from a second subscription.

**Phase to address:** The phase that moves the badge to the Squad tab. Treat the hook call as a singleton at the layout level.

---

### Pitfall 6: `squad.tsx` Being Replaced by `squad/_layout.tsx` — Expo Router Treats Them as Different Routes

**What goes wrong:**
The current squad tab is a single flat file: `(tabs)/squad.tsx`. Turning it into a nested top-tab navigator requires converting it to a directory: `(tabs)/squad/_layout.tsx` with `(tabs)/squad/friends.tsx` and `(tabs)/squad/goals.tsx`. Expo Router handles this correctly, but if the old `squad.tsx` file is not deleted when the `squad/` directory is created, both routes exist simultaneously. The `_layout.tsx` in `(tabs)/` declares `<Tabs.Screen name="squad" />` — Expo Router will pick up the directory over the file, but the stale file creates ambiguity and may cause unexpected behavior during hot reloading or first cold start.

**Why it happens:**
File-system migrations require explicit deletion of the old file. A developer creating the `squad/` directory and its children may not explicitly remove `squad.tsx`, assuming Expo Router will ignore the flat file in favor of the directory. The behavior is technically defined but relying on it is fragile.

**How to avoid:**
- Delete `src/app/(tabs)/squad.tsx` explicitly in the same commit that creates `src/app/(tabs)/squad/_layout.tsx`.
- Never have both `squad.tsx` and `squad/` exist at the same time, even briefly during a feature branch.
- After the conversion, confirm the file tree: `ls src/app/(tabs)/squad*` should show only the directory, not a file.

**Warning signs:**
- Both `squad.tsx` and `squad/` exist in `src/app/(tabs)/`.
- Hot reload shows the old Squad Goals stub instead of the new Friends/Goals top tabs.
- The Squad tab alternates between the old and new content on different app restarts.

**Phase to address:** Squad tab conversion phase. Include an explicit "delete old squad.tsx" step in the task list.

---

### Pitfall 7: Bottom Tab Reorder Produces a Visible Tab Re-Animation on First Load After Update

**What goes wrong:**
The current tab order is Home | Plans | Chat | Squad | Profile. The target is Home | Squad | Explore | Chats | Profile. Expo Router determines tab order from the order of `<Tabs.Screen>` declarations in `_layout.tsx`. Simply reordering these declarations changes the tab order correctly. However, if the user has a persisted navigation state from before the reorder (Squad was tab index 3, now it is index 1), the app may briefly render the wrong tab on startup before correcting itself. This is a UX glitch, not a crash, but it is visible on device.

**Why it happens:**
React Navigation restores navigation state by index. After a reorder, index 3 no longer means Squad — it means Profile. The restored state renders the wrong tab for one frame before the navigation tree corrects it.

**How to avoid:**
- Treat a tab reorder the same as a navigation schema change: expect that any persisted state from v1.1 will be invalid. On first launch after the update, navigate to the home tab unconditionally.
- In Expo Go development (no persistent native navigation state), this is not observable. Test on a device that was previously running v1.1 to catch it.
- The simplest mitigation: accept the one-frame flash in development (it only affects users upgrading from v1.1 to v1.2, not new installs), and document it as a known cosmetic issue limited to upgrade path.

**Warning signs:**
- Tab reorder implemented but not tested on a device with prior navigation state.
- App briefly shows Chat content when opening to what should be Squad tab.

**Phase to address:** Navigation reorder phase. Test on a device that previously ran v1.1.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keeping `router.push('/friends/...')` as string literals after the move | No refactor required | One missed call site silently breaks after route move | Never — update atomically or you will miss one |
| Faking top tabs with a custom `useState` toggle + conditional render | Avoids adding two packages | Not integrated with Expo Router navigation state; back button does not work correctly; deep links break | Never for a tab that will grow (Goals tab may add real content in v1.3) |
| Keeping `friends/` at root scope and rendering it inside Squad via `router.push` | No structural change to route tree | Friends screens appear without tab bar (they are modal/stack level); Back button exits Squad entirely | Only if keeping the `friends/` Stack-outside-tabs pattern intentionally and documenting it |
| Reusing old Playwright snapshot names after tab renames | No rename needed | Snapshots show wrong screen name in tab bar; visual regression is silently wrong | Never — rename snapshots to match new tab names |
| Calling `usePendingRequestsCount` in both layout and inner screen | Easy access to count anywhere | Two Realtime subscriptions fire; doubles Realtime event cost | Never for this project's 2M/month free-tier budget |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@react-navigation/material-top-tabs` in Expo Go | Installing without `react-native-pager-view` (peer dependency) | Run `npx expo install @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view` together — all three are required |
| `withLayoutContext` TypeScript generics | Using `any` for the generic parameters to silence compiler errors | Import `MaterialTopTabNavigationOptions`, `TabNavigationState`, `MaterialTopTabNavigationEventMap` from the package and pass them explicitly |
| Supabase Realtime + duplicate hook calls | Adding `usePendingRequestsCount` inside Squad screen body for convenience | Move count to Zustand or pass as prop from layout; keep the Supabase subscription singleton in `_layout.tsx` |
| Expo Router navigation state persistence | Stale persisted state after route renames breaks cold start | Test renames with a fresh app state; accept that upgrade path users may see a one-frame glitch |
| Playwright on Expo Web + top tabs | Top tabs may render differently on web (no swipe, indicator style differs) | Add `waitForTimeout` after navigating to Squad before taking snapshot; top-tab transition is async |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `FriendsList` mounted under top tab but fetches on every tab switch | Each visit to Friends sub-tab triggers a Supabase query even when data is fresh | Use `useFocusEffect` with a staleness check, or cache results in Zustand with a timestamp | Immediately visible with slow network; Supabase free tier rate limits at high frequency |
| Two screens mounted simultaneously under top tabs | Both Friends and Goals render at once, Goals is just hidden | Goals tab is a "coming soon" stub — this is fine now, but any expensive Goals screen later must use lazy mounting | Not an issue for v1.2 stub; re-evaluate when Goals gets real content |
| `useInvitationCount` and `usePendingRequestsCount` both called in `_layout.tsx` | Two open Supabase Realtime channels on the tab bar layout | These already coexist in v1.1 — do not add a third. Confirm no new count hook is added for the Squad badge | At 200 concurrent users on free tier — existing hooks are already consuming two of the 200 slots per user |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Friend Requests accessible only from Squad → Friends → header button | Users with pending requests have no immediate signal unless they open Squad | Move the pending-request badge to the Squad bottom tab icon (already planned — confirm `pendingCount` badge migrates to Squad tab, not Profile) |
| Add Friend FAB visible on Goals tab because Squad layout shares it | Users see a FAB that does nothing relevant on the Goals placeholder screen | Render the Add Friend FAB only when the Friends sub-tab is active; use `useSegments` to conditionally show it |
| Back button from `friends/[id]` profile screen returns to wrong place | If `friends/[id].tsx` stays at root scope, back exits to wherever the user navigated from (could be Plans screen) | Ensure friend profile screen is accessible from Squad tab context with correct back destination |
| Tab bar badge appears on Profile tab after v1.2 (regression) | Users see a notification badge on Profile even though friend requests moved | Remove `tabBarBadge` from the Profile `Tabs.Screen` in `_layout.tsx` when moving it to Squad |

---

## "Looks Done But Isn't" Checklist

- [ ] **Route migration complete:** `grep -rn "router.push.*'/friends" src/` returns zero results pointing to the old root `/friends` path
- [ ] **Old `squad.tsx` deleted:** `ls src/app/(tabs)/squad*` shows only a directory, not a flat file
- [ ] **Tab badge migrated:** Squad tab has `tabBarBadge` for pending requests; Profile tab badge is removed
- [ ] **Playwright tests updated:** All `getByText("Plans")` changed to `getByText("Explore")`; all `getByText("Chat")` changed to `getByText("Chats")`
- [ ] **Playwright snapshots regenerated:** All baseline `.png` files reflect new tab names in the tab bar; old baselines deleted
- [ ] **New Squad tab tested:** Playwright test navigates to Squad → Friends sub-tab and captures a new baseline snapshot
- [ ] **`react-native-pager-view` installed:** Package appears in `package.json` (required peer dep for top tabs)
- [ ] **Top tabs work in Expo Go:** Manual verify — swipe and tap both work on device; no "Unable to find module" error
- [ ] **Profile screen simplified:** Friend-related rows (My Friends, Friend Requests) removed from `profile.tsx`; no orphaned `router.push('/friends')` calls remain
- [ ] **Navigation state tested on upgrade path:** Tested on a device that previously ran v1.1 (or with manually seeded AsyncStorage state)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale `router.push('/friends')` call sites discovered after merge | LOW | Grep for all occurrences, update paths, ship a patch commit |
| Top tabs not working in Expo Go (missing pager dep) | LOW | `npx expo install react-native-pager-view`; restart Expo Go |
| Playwright suite fully broken after tab renames | LOW | Update locators + run `--update-snapshots`; 30 min task |
| Double Supabase subscription discovered (badge hook called twice) | LOW | Remove second call site, confirm with Supabase dashboard that channel count drops |
| Old `squad.tsx` and new `squad/` both exist causing ambiguity | LOW | Delete `squad.tsx`, force a clean Metro bundler restart |
| Persisted navigation state causes blank screen after reorder | LOW | Clear AsyncStorage in dev; document as cosmetic issue for v1.1→v1.2 upgrade path users |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale `router.push` paths to `/friends` | Phase that relocates friend screens | `grep -rn "push.*'/friends" src/` returns zero |
| Missing `react-native-pager-view` dependency | First task of Squad tab phase | Package present in `package.json`; top tabs render in Expo Go |
| `squad.tsx` file left alongside `squad/` directory | Squad tab conversion phase | `ls src/app/(tabs)/squad*` shows only directory |
| Cached navigation state breaks after rename/reorder | Navigation rename phase | Tested on device with stale v1.1 state |
| Playwright tests break on tab label renames | Any phase that renames a tab label | `npx playwright test` passes with zero failures after `--update-snapshots` |
| Badge hook called twice (double Realtime subscription) | Phase that moves badge from Profile to Squad | One `usePendingRequestsCount` import in codebase; Supabase dashboard shows same channel count as before |
| Add Friend FAB visible on Goals placeholder tab | Squad top-tab phase | FAB is conditionally rendered only on Friends sub-tab |
| Profile tab still shows friend rows after migration | Profile simplification phase | `profile.tsx` contains no `router.push` to `/friends` paths |

---

## Sources

- Direct codebase audit: `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/profile.tsx`, `src/app/(tabs)/squad.tsx`, `src/app/friends/`, `src/screens/friends/FriendsList.tsx`, `tests/visual/design-system.spec.ts` — April 2026
- [Expo Router: Custom tab layouts](https://docs.expo.dev/router/advanced/custom-tabs/) — official docs, verified April 2026
- [Expo Router: JavaScript tabs](https://docs.expo.dev/router/advanced/tabs/) — official docs, verified April 2026
- [GitHub: Add guidance for using Material Top Tabs with Expo Router (#41111)](https://github.com/expo/expo/issues/41111) — confirmed `withLayoutContext` is required, not optional
- [Material Top Tabs Navigator — React Navigation](https://reactnavigation.org/docs/material-top-tab-navigator/) — peer dependency requirements
- [expo-router-layouts-example by EvanBacon](https://github.com/EvanBacon/expo-router-layouts-example/blob/main/layouts/material-top-tabs.tsx) — canonical `withLayoutContext` pattern
- [Playwright: Snapshot testing](https://playwright.dev/docs/aria-snapshots) — `--update-snapshots` workflow

---
*Pitfalls research for: v1.2 Squad & Navigation milestone (Campfire — React Native + Expo Router)*
*Researched: 2026-04-04*
