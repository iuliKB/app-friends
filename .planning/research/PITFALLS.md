# Domain Pitfalls: v1.8 UI Overhaul

**Domain:** React Native + Expo SDK 55 screen-by-screen visual overhaul
**Researched:** 2026-05-06
**Applies to:** Home, Squad, Explore, Auth, Welcome/Onboarding screens

---

## 1. Theme Token Migration Mistakes

### Pitfall 1.1: Hardcoded Gradient Colors Silently Break Light Mode

**What goes wrong:** Both `HomeScreen` and `AuthScreen` pass hardcoded hex values directly to `LinearGradient`: `colors={['#091A07', '#0E0F11', '#0A0C0E']}`. These are dark-mode-only values. The overhaul will likely introduce new gradient elements — if the pattern is copied without branching on `isDark`, the gradient renders as a dark overlay over a light surface in light mode.

**Why it happens:** `LinearGradient` accepts a `colors` prop that is not a StyleSheet property, so the ESLint `no-hardcoded-styles` rule does not flag it. Hardcoded gradient arrays bypass the only enforcement mechanism in the project.

**Evidence:** `src/screens/home/HomeScreen.tsx:269`, `src/screens/auth/AuthScreen.tsx:410`. HomeScreen correctly guards with `if (isDark) { return <LinearGradient ...> }` and falls back to `backgroundColor: colors.surface.base` for light mode. AuthScreen does NOT guard — it always renders the dark gradient regardless of theme.

**Prevention:**
- For every new gradient: branch on `isDark` or read gradient stops from the theme (`colors.splash.gradientStart` already exists in both theme files).
- Add gradient color pairs to `light-colors.ts` and `colors.ts` rather than inlining hex strings.
- AuthScreen's existing always-dark gradient is a pre-existing bug that must be fixed during its overhaul phase.

**Phase at risk:** Auth Screen redesign (primary), Home Screen overhaul (any new decorative gradient elements).

---

### Pitfall 1.2: Raw RGBA Status-Color Values Not Theme-Aware

**What goes wrong:** `RadarBubble` and `FriendSwipeCard` use hardcoded `rgba()` strings keyed to status colors (e.g., `rgba(34,197,94,0.30)` for free). The dark-mode status green is `#4ADE80`; the light-mode equivalent is `#16A34A`. At 30% opacity on a dark background the visual result is correct; at 30% opacity on a white card it is a different perceived color. When the overhaul adds new status-tinted elements and copies these rgba strings, the result looks correct in dark mode only.

**Evidence:** `src/components/home/RadarBubble.tsx:29-31`, `src/components/home/FriendSwipeCard.tsx:41-43`. Both use the dark-mode numeric RGB values hardcoded inside `rgba()`, but both components already call `useTheme()`.

**Prevention:**
- For new status-wash elements, derive rgba from the resolved theme token: read `colors.status.free` and append a hex alpha (`+ '4D'` for 30% opacity) rather than hardcoding RGB numbers.
- Wrap the derived value in `useMemo([colors])` so it updates on theme change.

**Phase at risk:** Home Screen overhaul (new bubble or card elements), Squad Screen overhaul (friend row status indicators).

---

### Pitfall 1.3: `useMemo([colors])` Omitted on New Sub-Components Created During Screen Split

**What goes wrong:** Every existing screen uses `const styles = useMemo(() => StyleSheet.create({...}), [colors])`. When a large screen is split into sub-components during a redesign (common during overhaul), developers may write styles at module level (`const styles = StyleSheet.create({...})`). The styles become static and do not react to theme changes. The ESLint rule catches raw values but not a missing `useMemo` wrapper.

**Why it happens:** When extracting a new named component from a screen during a redesign, the simpler static form is written first. Without the `useTheme()` + `useMemo([colors])` pattern it is not flagged by linting.

**Prevention:**
- Every new component that references `colors.*` in a StyleSheet must use `useMemo([colors])`.
- When splitting a screen into sub-components during overhaul, the full `useTheme()` + `useMemo([colors])` pattern must be applied even for components that live in the same file.

**Phase at risk:** All five overhaul phases — most likely during Squad (most sub-sections) and Home (radar + card + widget splits).

---

### Pitfall 1.4: Map Views Hardcode `userInterfaceStyle: 'dark'` — Breaks Light Theme

**What goes wrong:** All three map instances pass `userInterfaceStyle: 'dark'` unconditionally on iOS. When a user has the app theme set to "light" or "system" on a device with light system appearance, the map tile renders in dark mode while the surrounding UI is light. This is a jarring visual mismatch that will be obvious after the Explore Screen overhaul brings the map into sharper visual focus.

**Evidence:** `src/components/maps/ExploreMapView.tsx:127`, `src/screens/plans/PlanDashboardScreen.tsx:719`, `src/components/maps/LocationPicker.tsx:199`. All three hardcode the value.

**Prevention:**
- Replace the static spread with a dynamic value: `userInterfaceStyle: isDark ? 'dark' : 'light'` (where `isDark` comes from `useTheme()`).
- The `DARK_MAP_STYLE` array used for Android `customMapStyle` is also dark-only. On Android + light theme, either pass no `customMapStyle` (system auto-style) or create a `LIGHT_MAP_STYLE` constant.
- Fix all three map instances in the Explore overhaul phase to avoid split state.

**Phase at risk:** Explore Screen overhaul (primary). LocationPicker is used in plan creation — fix in the same phase to prevent regression.

---

## 2. Animation Performance Without Reanimated (Except FriendSwipeCard)

### Pitfall 2.1: Multiple Concurrent `Animated.loop` Instances on Home Screen

**What goes wrong:** At runtime, HomeScreen mounts up to N RadarBubble components (one per friend), each with a `PulseRing` running an `Animated.loop`. Plus `OwnStatusCard` and `OwnStatusPill` each have their own pulse loop. If the overhaul adds another looping animation (e.g., a glow on the status pill or a skeleton shimmer), the cumulative loop count approaches the point where Animated.event flush latency becomes perceptible, especially on lower-end Android.

**Evidence:** `src/components/home/RadarBubble.tsx:68`, `src/components/status/OwnStatusCard.tsx:124`, `src/components/status/OwnStatusPill.tsx:93` — each runs an independent `Animated.loop`.

**Prevention:**
- Do not add any new `Animated.loop` to HomeScreen without first counting the existing loop count with a full friend list (up to 15 concurrent loops).
- New looping effects must use `isInteraction: false` in every timing call (the existing code already does this — match the pattern).
- Prefer static visual differentiation (border, opacity offset) over looping animations for secondary indicators.
- The 60-second `setHeartbeatTick` interval (`HomeScreen.tsx:50-54`) forces re-renders on a timer — any new looping animation adds to the frame-budget pressure at that boundary.

**Phase at risk:** Home Screen overhaul (radar redesign, new card UI elements).

---

### Pitfall 2.2: Crossfade Overlay with `absoluteFill` and `minHeight: 260` Is Fragile Under Layout Change

**What goes wrong:** The Radar/Cards crossfade uses `position: absolute` for the Cards layer and `minHeight: 260` on the container. If the overhaul changes the radar's natural height (larger bubbles, new row, grid layout), the Cards layer will overflow or clip because its absolute positioning is anchored to a stale `minHeight`. This produces a visual glitch where the card stack appears truncated or overlaps the section below it.

**Evidence:** `src/screens/home/HomeScreen.tsx:145-152` — `viewSwitcher` has `minHeight: 260` and `absoluteFill` for the cards layer.

**Prevention:**
- If the radar layout height changes, update `minHeight` to match, or switch to measuring height dynamically with `onLayout` stored in state.
- Consider removing the `minHeight` and instead rendering both layers as `position: absolute` inside a container whose height is driven by the radar layer's `onLayout`.

**Phase at risk:** Home Screen overhaul.

---

### Pitfall 2.3: FriendSwipeCard Uses Reanimated — Its API Must Not Be Mixed with Core Animated

**What goes wrong:** `FriendSwipeCard` is the only component that uses Reanimated (`useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`) and `GestureDetector` from RNGH v2. All other animation code in the codebase uses React Native's `Animated`. If the overhaul modifies `FriendSwipeCard` and a developer reaches for `Animated.timing`, they will mix the two animation APIs. Mixing `Animated.Value` and `SharedValue` on the same element causes silent failures — the values do not compose and the animation may not run.

**Evidence:** `src/components/home/FriendSwipeCard.tsx:17-19` imports from `react-native-reanimated` and `react-native-gesture-handler`. Reanimated 4.2.1 is installed but only this one component uses it.

**Prevention:**
- Any modification to `FriendSwipeCard` must stay entirely within the Reanimated API.
- If a new gesture-based component is added, it must use the same Reanimated + GestureDetector pattern — not `PanResponder` + `Animated.Value`.
- `runOnJS()` is required for any callback that touches React state or navigation from a gesture worklet — never call `router.push` or `setState` directly inside an `onEnd` handler.

**Phase at risk:** Home Screen overhaul (CardStack redesign), any new gesture-driven component.

---

### Pitfall 2.4: `useNativeDriver: false` Acceptable for Layout Props But Never for Loops

**What goes wrong:** `RadarBubble` correctly uses `useNativeDriver: false` for its size animation because width/height are layout properties. But this pattern, if applied to a new looping animation, blocks the JS thread continuously during the loop. The existing `useNativeDriver: false` usages are all one-shot (fire on status change, then stop) — never looping.

**Evidence:** `src/components/home/RadarBubble.tsx:176-189` has the `useNativeDriver: false` comment explaining the justification. The `ReEngagementBanner.tsx:72`, `ChatTabBar.tsx:36,42`, `OfflineBanner.tsx:30` are also one-shot.

**Prevention:**
- Never use `useNativeDriver: false` inside an `Animated.loop`. If a looping animation needs to touch a layout property, find an alternative: pre-compute the final size and use `LayoutAnimation.configureNext`, or substitute a transform-scale proxy.
- Mark every new `useNativeDriver: false` with a comment: `// layout prop [width/height/backgroundColor] — cannot use native driver, fires only on [trigger], not in a loop`.

**Phase at risk:** Home Screen overhaul, any new animated card or bubble component.

---

## 3. Onboarding Slide Flow in Expo Router

### Pitfall 3.1: Welcome Route Must Live Outside `(tabs)` or Routing Breaks

**What goes wrong:** The new 3-screen onboarding flow needs a route. If added as a tab screen (`(tabs)/welcome`), the tab navigator will show it in the tab bar. If added inside `(auth)`, it is only accessible before session creation — but the spec says it shows after login when `friends.length === 0`.

**Why it happens:** Expo Router's `Stack.Protected` guards in `_layout.tsx` tie route visibility to authentication state. Any new route must be placed in the correct group or it will be inaccessible.

**Evidence:** `src/app/_layout.tsx:224-239` — `Stack.Protected guard={!!session && !needsProfileSetup}` controls authenticated routes. A new `/onboarding` screen must be inside this protected group.

**Prevention:**
- Add a top-level route `/onboarding` (file: `src/app/onboarding/index.tsx` or `_layout.tsx` + slides) at the root Stack level, inside `Stack.Protected guard={!!session && !needsProfileSetup}`.
- Control entry via AsyncStorage and `router.replace('/onboarding')` from HomeScreen on first load.
- Use `router.replace` (not `push`) so the back gesture from slide 1 does not return to the onboarding intro.

**Phase at risk:** Welcome/Onboarding phase.

---

### Pitfall 3.2: Old AsyncStorage Flag Silences the New Flow for All Existing Users

**What goes wrong:** HomeScreen checks `@campfire/onboarding_hint_shown` in AsyncStorage before showing `OnboardingHintSheet`. All existing users who dismissed the old sheet have this flag set. If the new Welcome flow uses the same key, it will never show for any existing user — even if the new flow covers new content.

**Evidence:** `src/screens/home/HomeScreen.tsx:56-70` — the key is `@campfire/onboarding_hint_shown`.

**Prevention:**
- Use a new flag key for the new flow: `@campfire/welcome_v18_shown` or similar.
- Remove the `OnboardingHintSheet` import and flag check from HomeScreen in the same phase that introduces the Welcome route.
- Decide and document whether the new flow shows for all users (regardless of friend count) or only zero-friends users — before implementation.

**Phase at risk:** Welcome/Onboarding phase, Home Screen overhaul (OnboardingHintSheet removal).

---

### Pitfall 3.3: iOS Back Gesture Conflicts with Horizontal Slide Pager

**What goes wrong:** A 3-screen slide pager built with `ScrollView pagingEnabled horizontal` will conflict with the iOS system swipe-back gesture when the onboarding flow is inside a Stack navigator. The system gesture handler claims horizontal swipes that start within ~20px of the screen edge, causing unpredictable navigation (user trying to advance slides goes back instead).

**Evidence:** The Squad pager at `src/app/(tabs)/squad.tsx:345-351` avoids this because it is inside a tab navigator where the back gesture is disabled. The onboarding Stack navigator does NOT disable the back gesture by default.

**Prevention:**
- Disable the Stack screen's gesture: `<Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />`.
- Use a forward-only navigation model: "Next" button advances, no swipe-back within slides, only a "Skip" button that calls `router.replace('/(tabs)/')`.
- As a reference for the indicator animation, follow the Squad pager pattern: a single `Animated.View` with `translateX` interpolated from `scrollX` (native thread) rather than per-dot scale/color animations (layout properties, JS thread).

**Phase at risk:** Welcome/Onboarding phase.

---

### Pitfall 3.4: Slide Dot Indicators Using Color or Size Animations Block JS Thread

**What goes wrong:** Onboarding slide indicators (dot row) are commonly animated by interpolating `scrollX` to `width` or `backgroundColor`. Width and backgroundColor are layout/color properties that cannot use `useNativeDriver: true`. Running multiple indicator dot animations simultaneously during a swipe causes competing JS-thread work alongside the scroll event handler.

**Prevention:**
- Use a single sliding indicator element with `translateX` (transform, native thread) rather than per-dot scale/color animations.
- Reference the Squad pager's indicator at `src/app/(tabs)/squad.tsx:101-107` — it slides one element via `translateX` interpolated from `scrollX`, entirely on the native thread.

**Phase at risk:** Welcome/Onboarding phase.

---

## 4. Risks of Breaking Existing Functionality During Visual Redesign

### Pitfall 4.1: Auth Screen Redesign Must Preserve the 3-State Machine

**What goes wrong:** AuthScreen manages three distinct `authMode` states (`login` / `reset` / `reset-sent`) with fade transitions between them. A visual redesign that restructures the layout (e.g., extracting password reset as a separate route) will break `onAuthStateChange` routing in `_layout.tsx` if the auth route structure changes.

**Evidence:** `src/app/(auth)/index.tsx` exports a single `AuthScreen`. The root layout routes all `!session` users here via `Stack.Protected guard={!session}`. `WebBrowser.maybeCompleteAuthSession()` must be called at module level of the entry auth screen (currently `AuthScreen.tsx:20`) — if the entry screen changes, this call must move.

**Prevention:**
- Keep the auth state machine in a single AuthScreen component. Redesign the visual presentation, not the state structure.
- If sub-routes are added under `(auth)/`, verify `WebBrowser.maybeCompleteAuthSession()` is still called on cold start at the entry point.

**Phase at risk:** Auth Screen redesign.

---

### Pitfall 4.2: Squad Tab Deep-Link (`?tab=memories`) Breaks If Tab Order or Names Change

**What goes wrong:** The Squad screen accepts a `tab` query param. `HomeScreen` and `MemoriesRedirect` navigate to `/(tabs)/squad?tab=memories`. The handler scrolls to `x: SCREEN_WIDTH` (index 1). If the overhaul renames tabs, changes their order, or removes the Memories tab, the deep link silently fails — scrolling to an incorrect index or targeting a tab name that no longer exists.

**Evidence:** `src/app/(tabs)/squad.tsx:50-57` — hardcoded `x: SCREEN_WIDTH` (index 1). Tab order in `TABS = ['Squad', 'Memories', 'Activity']`.

**Prevention:**
- Before changing Squad tab names or order, search all `router.push('/(tabs)/squad?tab=...')` callsites and update them atomically.
- Define tab name constants and reference them in both the navigator and the navigation caller — eliminates silent string mismatch.

**Phase at risk:** Squad Screen overhaul.

---

### Pitfall 4.3: Supabase Realtime Subscriptions Lost or Doubled During Screen Remount

**What goes wrong:** Visual redesigns frequently change how components are mounted — e.g., switching from a single ScrollView to a tab pager means sub-components are now conditionally mounted. If a `useEffect` cleanup does not unsubscribe properly, duplicate channels accumulate on each navigation. The app silently exceeds the 200-connection free-tier Realtime limit.

**Why it happens:** A component that was always-mounted (inside a ScrollView) may now mount only on active tab in a pager. Each mount adds a new channel; each unmount that misses cleanup leaves a dangling channel.

**Prevention:**
- Every `supabase.channel(...).subscribe()` must have `channel.unsubscribe()` in the `useEffect` return.
- Audit the hooks used by each overhauled screen: `useHomeScreen`, `useFriends`, `usePlans`, `useStatus` — verify each cleans up on unmount.
- When moving a component from "always mounted" to "mounted only on active tab," test by navigating away and back multiple times and verifying the Supabase client's active channel count does not grow.

**Phase at risk:** Home Screen overhaul (status realtime), Squad Screen overhaul (friends realtime), Explore Screen overhaul (plans realtime for map pins).

---

### Pitfall 4.4: FlatList Inside Horizontal Pager Collapses to Zero Height on Android If Flex Chain Breaks

**What goes wrong:** The Squad pager wraps a `FlatList` inside a horizontal `Animated.ScrollView`. On Android, a `FlatList` without an explicit height or `flex: 1` inside a horizontal scroll container collapses to zero height. The current setup works because `page: { width: SCREEN_WIDTH, flex: 1 }` propagates flex to the list. If the overhaul adds a sticky subheader above the FlatList (changing the flex chain), the list silently disappears on Android while appearing correctly on iOS.

**Evidence:** `src/app/(tabs)/squad.tsx:249-252` — `page` style has `flex: 1`. PROJECT.md Key Decisions: "FlatList inside ScrollView breaks Android scroll silently."

**Prevention:**
- Maintain `flex: 1` on every page container in the pager.
- If a subheader is added above the FlatList, the subheader must have a fixed height or `flexShrink: 0`, and the FlatList must retain explicit `flex: 1`.
- Test on Android after any layout change to the Squad pager container.

**Phase at risk:** Squad Screen overhaul.

---

### Pitfall 4.5: Status Picker Sheet `sheetVisible` State Must Survive Potential Trigger Relocation

**What goes wrong:** `StatusPickerSheet` is triggered from local `useState` in `HomeScreen`. If the overhaul moves the status pill trigger to a sticky header, tab bar, or any component outside the HomeScreen component boundary, the `sheetVisible` state must be lifted — local state cannot communicate across component boundaries.

**Evidence:** `src/screens/home/HomeScreen.tsx:58-59` — `sheetVisible` is local `useState`.

**Prevention:**
- If the status pill trigger stays inside HomeScreen, keep state local — no change needed.
- If the trigger moves outside HomeScreen (e.g., to a tab bar or persistent header), lift `sheetVisible` to `useStatusStore` or a dedicated context before moving the trigger.

**Phase at risk:** Home Screen overhaul.

---

### Pitfall 4.6: Location Permission Denied Has No Recovery Path in ExploreMapView

**What goes wrong:** `ExploreMapView` calls `Location.requestForegroundPermissionsAsync()` on mount. If the user denies permission, the map shows with a fallback region (Toronto) and no "Enable location" affordance. After the Explore overhaul adds prominence to the "near me" discovery feature, the permission-denied state becomes a dead end that hides the primary value proposition.

**Evidence:** `src/components/maps/ExploreMapView.tsx:37-48` — `permissionGranted` is set but there is no conditional UI for the denied path.

**Prevention:**
- Add a permission-denied empty state with an "Enable location" button that calls `Linking.openSettings()`.
- Do not add a second `Location.requestForegroundPermissionsAsync()` call — once denied on iOS, the OS requires the user to go to Settings; calling again returns `denied` silently.

**Phase at risk:** Explore Screen overhaul.

---

### Pitfall 4.7: ESLint `no-hardcoded-styles` Rule Blocks Merges — Overuse of Suppress Comments Creates Debt

**What goes wrong:** The project has 229 existing ESLint-disable lines for the hardcoded-styles rule. During a large overhaul, it is tempting to suppress broadly to "fix later," leading to values that will not be caught when the design system changes.

**Evidence:** Existing suppression count by file: `PollCard.tsx` (16), `MessageBubble.tsx` (14), `BirthdayWishListPanel.tsx` (14), `FriendSwipeCard.tsx` (9). The overhaul touches 5 major screens — each will have new styling needs.

**Prevention:**
- Before writing new screen sections, check `src/theme/spacing.ts`, `typography.ts`, and `radii.ts` to see if the value already exists. Suppress only when a token genuinely does not exist.
- If a value will be used in more than one place in the redesign, add it to the token files rather than suppress twice.
- During code review, count new `eslint-disable` additions: more than 5 new suppressions per screen is a signal to revisit the token files.

**Phase at risk:** All five overhaul phases.

---

## Phase-Specific Warning Summary

| Phase | Highest-Risk Pitfall | Primary Mitigation |
|-------|---------------------|-------------------|
| Home Screen overhaul | Concurrent Animated.loop count (2.1), crossfade container minHeight (2.2), FriendSwipeCard API mixing (2.3) | Count loops before adding any; measure height with onLayout if radar size changes |
| Squad Screen overhaul | tab param deep-link breakage (4.2), FlatList height collapse in pager (4.4), Realtime remount (4.3) | Search all `?tab=` usages before renaming; test on Android after page container changes |
| Explore Screen overhaul | userInterfaceStyle hardcoded dark (1.4), permission-denied UX gap (4.6), Realtime channel doubling (4.3) | Fix userInterfaceStyle in same PR; add denied state with `Linking.openSettings()` |
| Auth Screen redesign | Dark-only gradient (1.1), 3-state machine preservation (4.1), WebBrowser.maybeCompleteAuthSession placement (4.1) | Branch gradient on `isDark`; keep authMode state machine in single component |
| Welcome / Onboarding | Flag key collision (3.2), back gesture conflict (3.3), route placement (3.1), dot indicator thread (3.4) | New AsyncStorage key; disable Stack gesture; use translateX-based indicator |
