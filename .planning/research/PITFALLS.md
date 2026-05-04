# Pitfalls Research

**Domain:** Large-scale UI/UX polish pass on an existing React Native + Expo managed workflow app (Campfire v1.7)
**Researched:** 2026-05-04
**Confidence:** HIGH (animation threading, FlatList memoization, useMemo/StyleSheet pattern, scope creep), MEDIUM (Expo splash/icon limits in EAS, visual regression without tooling)

---

## Critical Pitfalls

### Pitfall 1: Adding `useNativeDriver: false` to New Animations That Animate Layout Properties

**What goes wrong:**
During a polish pass, developers add new entrance, exit, or highlight animations. If the animated property is `backgroundColor`, `height`, `width`, or any other layout property, `useNativeDriver: true` will throw a runtime error: "Style property 'height' is not supported by native animated module." The reflex fix is to use `useNativeDriver: false` everywhere to avoid the error — but that moves all animations onto the JS thread, where they drop frames whenever JS is busy (network calls, state updates, scroll events).

This codebase already has a mixed pattern: `useNativeDriver: true` for transforms/opacity (RadarBubble pulse, swipe card), and `useNativeDriver: false` for height/backgroundColor (ReEngagementBanner, OfflineBanner, MessageBubble highlight, PollCard). Adding polish animations without distinguishing which thread they belong to degrades the existing smooth animations.

**Why it happens:**
The distinction "which CSS properties can run natively" is not obvious. The rule is: `transform` and `opacity` can run on the UI thread; everything else (`backgroundColor`, `height`, `width`, `borderRadius`, `padding`, `margin`, `top`, `left`) cannot.

**How to avoid:**
- Before writing any new animation, determine what property is being animated.
- `transform` + `opacity`: always `useNativeDriver: true`.
- `backgroundColor`, `height`, `width`, or any layout prop: `useNativeDriver: false`, with a comment explaining why (`// height animation — layout prop, cannot use native driver`).
- The existing codebase already follows this convention (see RadarBubble.tsx line 165, ReEngagementBanner.tsx line 72). Match it.
- If you need a smooth color-transition animation that must stay on the native thread, use `transform: [{ scale }]` + opacity as a proxy for "highlight" effects rather than animating backgroundColor directly.

**Warning signs:**
- Runtime error: "Style property 'X' is not supported by native animated module."
- New animation jank during rapid user interaction (scroll, swipe) because it landed on the JS thread without intention.
- `useNativeDriver` not specified at all (React Native will warn but animate anyway on the JS thread by default).

**Phase to address:**
Every phase that adds animations. Establish a code-review checklist item: "Does this animation use the correct driver for its property type?"

---

### Pitfall 2: Mixing a `useNativeDriver: true` Value with a `useNativeDriver: false` Animation

**What goes wrong:**
An `Animated.Value` is bound to both a native-driver animation (e.g., a spring on `opacity`) and a JS-thread animation (e.g., a timing on `height`) on the same value. React Native throws: "Animated node [X] has already been attached to a native node." The app crashes or the animation silently misbehaves.

This codebase has FriendSwipeCard.tsx which has a comment noting this exact constraint ("useNativeDriver conflict between static opacity and animated transforms"). Adding more animations to the swipe card or similar multi-animated components risks this error.

**Why it happens:**
Polish passes often extend existing animated components — adding a new effect to a component that already has animations. A developer adds a new `Animated.timing` on an existing `Animated.Value` without checking which driver owns it.

**How to avoid:**
- Each `Animated.Value` ref must use exactly one driver type throughout its lifetime. Add a comment at the `useRef(new Animated.Value(...))` call declaring the driver: `// native driver — only transform/opacity animations`.
- If you need both layout and transform animations on the same component, use two separate `Animated.Value` refs with separate drivers.
- When extending an animated component, grep for all `useNativeDriver` references in that file before adding a new animation.

**Warning signs:**
- Error: "Animated node [N] has already been attached to a native node."
- Adding an animation to an existing animated component without reading all existing driver declarations first.
- A single `Animated.Value` used in both a transform and a layout property interpolation.

**Phase to address:**
Any phase adding animations to existing animated components (swipe cards, bubbles, banners). Especially high risk in "home screen polish" and "chat polish" phases.

---

### Pitfall 3: `useMemo(() => StyleSheet.create({...}), [colors])` — Stale Styles from Incorrect Dependency Array

**What goes wrong:**
The codebase uses the pattern `const styles = useMemo(() => StyleSheet.create({...}), [colors])` in ~20+ files (squad.tsx, profile.tsx, wish-list.tsx, edit.tsx, expenses/index.tsx). During a polish pass, new style properties that reference tokens other than `colors` get added — for example, `SPACING.lg`, `FONT_SIZE.md`, `BORDER_RADIUS.sm`. If those variables are not in the `useMemo` dependency array, the styles are stale after the initial render.

In practice: `SPACING` and `FONT_SIZE` are imported as `as const` module-level values that never change at runtime, so they do not need to be in the dependency array. But `colors` does change (theme toggle). The trap is forgetting `colors` when adding to the dependency array — e.g., changing the array from `[colors]` to `[colors, someOtherProp]` and accidentally dropping `colors`, causing styles to freeze at the color state when the component first mounted.

**Why it happens:**
During a polish pass, developers add new style properties to existing `useMemo` blocks and adjust the dependency array without carefully checking what was already there. ESLint `react-hooks/exhaustive-deps` will flag missing deps — but only if the rule is enabled and the variable is used inside the closure. If a dev suppresses the warning or has the rule off, the stale styles are silent.

**How to avoid:**
- The dependency array for `useMemo(() => StyleSheet.create({...}))` should contain exactly one item: `[colors]`. All spacing/typography tokens are `as const` constants — they are invariant at runtime and do not need to be listed.
- Never widen the dependency array to include non-color values unless those values actually change at runtime (e.g., a prop that changes frequently). Adding `[colors, layout.width]` causes style recomputation on every orientation change — usually unnecessary.
- Ensure `react-hooks/exhaustive-deps` is enabled in ESLint (it is in this project). Do not suppress it on `useMemo` style blocks.

**Warning signs:**
- Style stays frozen after theme toggle (element has wrong theme color).
- `react-hooks/exhaustive-deps` warning on a style `useMemo` that is being suppressed with `eslint-disable`.
- Style `useMemo` dependency array contains `[]` (empty) — will never update after mount.

**Phase to address:**
Every phase. Any new screen or component with dynamic styles must use `[colors]` as its dependency array. Review all new `useMemo` style blocks before merging.

---

### Pitfall 4: New Styled Components That Import `COLORS` Directly Instead of `useTheme()`

**What goes wrong:**
The v1.6 theme migration successfully converted all 98+ files from static `COLORS` imports to `useTheme()`. During v1.7 polish, new components and screens are written. If a new component imports `COLORS` directly (or worse, uses hardcoded hex values), it will always display the dark theme regardless of the user's selection.

This is invisible in dark mode (the default and common test path). The breakage surfaces when a user switches to light mode and sees a component with dark background hardcoded in — for example, a new tooltip, modal, badge, or empty state added during polish.

**Why it happens:**
When writing new components quickly during a polish pass, developers reach for the familiar pattern from pre-v1.6 code they may be referencing. The ESLint rule `campfire/no-hardcoded-styles` catches raw hex values but does not catch `import { COLORS } from '@/theme'` (importing the static object is syntactically valid and passes lint).

**How to avoid:**
- Treat `COLORS` import (outside `src/theme/`) as a banned pattern — the ESLint rule should already warn, but add a team convention: every new component starts with `const { colors } = useTheme()`.
- Polish sprint setup: before starting each phase, run `grep -r "import.*COLORS" src/ --include="*.tsx" --include="*.ts"` and verify the count is zero (or matches only `src/theme/` files). Any new COLORS import is a regression.
- When reviewing PRs for polish phases, first-pass check is a `grep` for `COLORS` in diff output.

**Warning signs:**
- `import { COLORS }` appearing in a new file's diff.
- A new component looks correct in dark mode but has wrong colors in light mode.
- New `StyleSheet.create({...})` blocks without a wrapping `useMemo` referencing `colors`.

**Phase to address:**
Every phase. Highest risk in "social features polish" and "chat polish" phases that add new sub-components (badges, pills, modals, empty states).

---

### Pitfall 5: FlatList Performance Regression from Complex Item Components Without `React.memo`

**What goes wrong:**
Polish passes typically make list item components more visually rich — adding avatars, animated badges, multi-line text, progress indicators, or reaction counts. Each visual addition increases per-item render cost. Without `React.memo` on list item components, every parent state change (incoming realtime message, status update, pull-to-refresh completion) causes every visible item to re-render, even if the item's data did not change.

In the ChatRoomScreen FlatList (which has the most frequent state updates — new messages arrive in real time), a MessageBubble with reactions, reply previews, media, and highlight animation is expensive. If `renderItem` is defined inline (not extracted and memoized with `useCallback`), every new message causes all visible bubbles to re-render.

**Why it happens:**
Adding visual complexity to a list item does not break the app — it just makes it slower. The slowdown is proportional to list size and state update frequency, so it is not noticed in small test datasets (5–10 items) but becomes a problem in real chats with 50–200 messages.

**How to avoid:**
- Wrap all FlatList item components in `React.memo`. This is already done for some components; audit the list during polish.
- Extract `renderItem` to a `useCallback` (or define it outside the component if it has no closure deps). Never define `renderItem` as an inline arrow function inside JSX.
- For ChatRoomScreen specifically: the message list is inverted and high-frequency. Ensure `MessageBubble` is wrapped in `React.memo` with a proper `areEqual` comparison if props include complex objects.
- Add `keyExtractor` as a stable `useCallback` — never inline.

**Warning signs:**
- `renderItem` defined as `renderItem={({ item }) => <ItemComponent {...item} />}` inline in JSX.
- FlatList item component not wrapped in `React.memo`.
- Scroll jank appears only after adding a new visual element to the item (not present before the polish change).
- React DevTools shows all visible items re-rendering on a single new message arrival.

**Phase to address:**
Chat polish phase (highest risk — real-time updates + complex bubbles). Also: friend list, birthday list, IOU list phases. Any phase that enriches FlatList items.

---

### Pitfall 6: Expo Splash Screen and App Icon Cannot Be Verified in Expo Go

**What goes wrong:**
From Expo SDK 52 onward, Expo Go shows the app icon during loading instead of the splash screen. The actual splash screen experience — including animated splash via `SplashScreen.setOptions()`, background color, and resize mode — is only visible in a production or preview EAS build. Configuring the splash and icon in `app.config.ts` and testing in Expo Go gives a false pass: the developer sees the Expo Go splash (or app icon), not the configured splash.

Additionally, EAS generates all icon sizes from the provided 1024x1024 source. If the provided asset has a border or white background added by the designer, iOS rounded-rect corners will expose it, producing a box-in-circle appearance.

**Why it happens:**
Expo Go is the fast feedback loop. Splash screen and icon changes require a rebuild (EAS build or `expo prebuild`), which is slow. Developers test in Expo Go to avoid waiting, see "it worked," and skip the EAS verification step.

**How to avoid:**
- App icon and splash screen work requires an EAS preview build to verify. Budget time for this — do not put it at the end of the milestone without planning the build cycle.
- Icon asset requirements: 1024x1024 PNG, transparent background (no white/solid fill), no rounded corners in the source (the OS applies its own masking). For Android adaptive icon, provide separate foreground (with padding) and background layers.
- Splash screen testing: use `expo build:preview` or `eas build --profile preview` and install on a device or simulator. Do not accept Expo Go as verification for splash/icon.
- Specify both `icon` (shared) and `android.adaptiveIcon.foregroundImage` + `android.adaptiveIcon.backgroundColor` in app.config.ts for correct Android adaptive behavior.

**Warning signs:**
- Checking splash screen "works" only in Expo Go.
- Icon looks correct in Expo Go but has a white box on iOS rounded corners in a real build.
- `SplashScreen.setOptions({ fade: true })` not observable in Expo Go.

**Phase to address:**
App icon and splash screen phase. Should be verified with an EAS preview build as the phase's completion criterion, not Expo Go observation.

---

### Pitfall 7: Scope Creep — Polish Touching Too Many Files Simultaneously

**What goes wrong:**
A "polish pass" invitation encourages developers to fix everything at once. In a 25,000 LOC codebase with 170 TypeScript files, if each file is touched for "minor improvements" (tightening spacing, adjusting colors, tweaking animations), the resulting PR becomes a 150-file diff. Code review is impossible, merge conflicts are guaranteed on any parallel work, and bugs introduced during polish are untraceable to specific changes.

The specific risk for this codebase: v1.7 targets every screen. Without strict phase boundaries, a developer working on "status & home screen refinements" might simultaneously fix something they notice in PlanDashboard, which touches the same components being refined in the "plans & explore" phase — resulting in conflicts and double-work.

**Why it happens:**
Polish work is opportunistic. While fixing one thing, the developer notices five others. The work feels small per item but accumulates. Without feature-flag or branch isolation per phase, everything lands in one commit/PR.

**How to avoid:**
- Each phase touches a bounded set of screens/components. Define the scope explicitly in REQUIREMENTS.md as a file list or tab-by-tab boundary.
- Use the rule: if you notice a polish issue outside your current phase's scope, add it to a tracked list (a POLISH-BACKLOG note or issue) rather than fixing it in-place.
- Commit structure: each phase should have multiple small, screen-scoped commits ("polish: home screen radar spacing and pulse animation") rather than one massive "UI polish" commit.
- Every phase PR should be reviewable in under 20 minutes. If a PR is larger than ~30 files, it is out of scope.

**Warning signs:**
- A single commit or PR touching files across all tabs (home, squad, explore, chats, profile, common components) simultaneously.
- Commit message "misc polish" or "cleanup across screens."
- Merge conflicts on `src/theme/` or shared components between parallel polish phases.

**Phase to address:**
All phases. The REQUIREMENTS.md should include an explicit "scope boundary" list per phase. The roadmap structure itself is the primary mitigation.

---

### Pitfall 8: Testing Polish Changes Without a Reproducible Verification Path

**What goes wrong:**
Polish changes are inherently visual and subjective. Without a reproducible test path, regressions are invisible until a real user encounters them. The specific risk: a spacing change in a shared component (e.g., `ScreenHeader`, `SectionHeader`, `SectionList`) breaks the layout on screens the developer did not explicitly check during the polish session.

This codebase has a Playwright + Expo Web visual regression suite (validated in v1.1). However, Playwright runs against the web renderer — React Native StyleSheet properties are approximated, not pixel-identical to iOS/Android. Animations, haptics, and platform-native elements (DateTimePicker, bottom sheets, Modal) are invisible in Playwright.

**Why it happens:**
There are no automated visual tests for native mobile. Manual testing is slow and coverage is bounded by developer patience. Polish bugs (a 2px padding regression, a color that is slightly off in dark mode) are low-severity individually but compound into a "feels rough" experience.

**How to avoid:**
- Use the Playwright suite for regression detection on non-animated, non-modal UI (screen layouts, colors, text). Run it before and after each phase.
- For animated and modal elements: define a manual verification checklist per phase (included in HUMAN-UAT.md for each phase). Specifically: test on both light and dark theme, and verify on both iOS simulator and Android simulator.
- For shared components (`ScreenHeader`, `SectionHeader`, `FAB`, `PrimaryButton`): when a shared component changes, manually check all ~15 screens that use it, not just the one being polished.
- "Looks done" criterion for polish: change reviewed on device (not only in code), both themes checked, at minimum one platform (iOS simulator or Android emulator).

**Warning signs:**
- Shared component changed without listing all consumers in the review.
- Polish phase accepted with "it looks good in the simulator" without specifying which theme and platform.
- Playwright suite skipped ("it's just visual changes").

**Phase to address:**
All phases. The UAT format (HUMAN-UAT.md) should include explicit "both themes, both platforms" checkboxes for each phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add `useNativeDriver: false` to avoid runtime error without checking property type | No crash | All animations on JS thread; scroll jank when JS is busy | Never — always use the correct driver for the property type |
| Skip `React.memo` on new FlatList item components during polish | Less boilerplate | Re-renders all visible items on every parent state change; jank in high-frequency lists | Never for FlatList items in realtime screens (chat, home) |
| Define `renderItem` as inline arrow function inside JSX | Shorter code | New function reference on every parent render; defeats `React.memo` on item component | Never — extract to `useCallback` or module-level function |
| Import `COLORS` directly in a new polish component | Slightly faster to write | Component ignores theme toggle; dark values in light mode | Never — every component uses `useTheme()` |
| Verify splash screen and icon only in Expo Go | Immediate feedback | EAS build may have different appearance (icon border, splash timing) | Never — requires EAS preview build verification |
| Touch all screens at once in a single polish PR | Faster flow | 150-file diff; untraceable regressions; guaranteed merge conflicts | Never — scope per phase, commit per screen |
| Empty `useMemo` dependency array `[]` for style block | Style computed once | Styles frozen at first render; theme toggle has no effect | Never if `colors` is referenced; acceptable only for genuinely static, non-color styles |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `Animated.Value` + multiple animation calls | Mixing `useNativeDriver: true` and `useNativeDriver: false` on the same value | One value, one driver type. Use separate values for different property categories. |
| `useTheme()` + new component during polish | Import `COLORS` static object as a shortcut | Always `const { colors } = useTheme()` — no exceptions |
| `useMemo` + `StyleSheet.create` | Empty or wrong dependency array | Dependency array must include `colors` (and only runtime-varying values) |
| FlatList + complex item | Inline `renderItem` and no `React.memo` on item component | Extract `renderItem` to `useCallback`; wrap item component in `React.memo` |
| Expo splash/icon + Expo Go testing | Accept Expo Go observation as verification | Requires EAS preview build; Expo Go shows app icon, not configured splash |
| OfflineBanner / ReEngagementBanner + height animation | Adding `useNativeDriver: true` because it "seems faster" | Height is a layout property — must use `useNativeDriver: false` (matches existing pattern) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| All new animations set `useNativeDriver: false` | Scroll jank during animations on low-end Android | Audit property type first; use native driver for transform/opacity | Immediately visible on mid-range Android under load |
| FlatList item without `React.memo` on high-frequency list | Every new chat message re-renders all visible bubbles | Wrap item in `React.memo`; `useCallback` on `renderItem` | ~50+ items in list with real-time updates |
| Shared component style change without checking all consumers | Layout breaks on unvisited screens | List all consumers of changed component; spot-check each | Immediately — but only discovered during QA |
| New animation on an already-animated component with wrong driver | Runtime crash or silent misbehavior | Read all existing `useNativeDriver` declarations before adding new animation | First render of the affected component |
| `useMemo` style dep array doesn't include `colors` | Styles frozen at initial theme; theme toggle has no visible effect | Always include `colors` in dep array | Every theme toggle after app launch |

---

## Security Mistakes

*Not a primary concern for a UI polish pass. The existing security posture (RLS, SECURITY DEFINER RPCs, private storage bucket, signed URLs) remains unchanged by polish work. The main risk is accidentally introducing a new `COLORS` static import that bypasses theme logic — not a security issue, but a correctness one covered above.*

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Animation added without haptic feedback on key actions (FAB tap, swipe-to-action, confirm) | Action feels unresponsive on physical device even if animation is present | Add `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` alongside new animations for destructive/confirmatory actions |
| Loading skeleton not updated when item layout changes during polish | Skeleton dimensions mismatch content; layout shift on load completion | Update skeleton dimensions to match polished item component dimensions |
| Empty states missed during polish (only happy path tested) | Screens look unstyled when user has no data | Every polish phase must include empty state verification in UAT |
| Error state text not updated when screen copy is polished | Error text uses old/inconsistent voice | Polish includes error and empty state copy review, not just success states |
| New modal/bottom sheet not following theme | Modal appears in wrong theme (dark when app is light) | Verify `Modal`, `BottomSheet` content uses `useTheme()` — modals render in a separate tree and can miss context |
| Polish changes only tested on developer's device size | Layout breaks on smaller screens (iPhone SE) or larger screens (tablets) | Test on at least two simulator screen sizes per phase |
| Haptics added to every interaction (over-haptic) | Feels buzzy and annoying; users turn off system haptics | Use haptics selectively: destructive actions, confirmations, swipe thresholds — not every tap |

---

## "Looks Done But Isn't" Checklist

- [ ] **Animation threading:** Every new animation declares `useNativeDriver` with a comment explaining why (true for transform/opacity, false for layout props).
- [ ] **Driver consistency:** No `Animated.Value` is used with both `useNativeDriver: true` and `useNativeDriver: false` in the same component.
- [ ] **Theme correctness:** No new component imports `COLORS` directly — `grep -r "import.*COLORS" src/ --include="*.tsx"` returns zero results outside `src/theme/`.
- [ ] **useMemo styles:** Every new `useMemo(() => StyleSheet.create({...}))` has `[colors]` in its dependency array.
- [ ] **FlatList items:** Every FlatList item component added or modified during polish is wrapped in `React.memo`; `renderItem` is defined outside JSX or wrapped in `useCallback`.
- [ ] **Both themes tested:** Each polished screen verified in light mode AND dark mode before phase sign-off.
- [ ] **Both platforms tested:** Each polished screen verified on iOS simulator AND Android emulator.
- [ ] **Shared component ripple:** When a shared component (`ScreenHeader`, `SectionHeader`, `FAB`, `PrimaryButton`, etc.) is modified, all screens using it are spot-checked.
- [ ] **App icon/splash:** Splash screen and app icon verified in an EAS preview build — not Expo Go.
- [ ] **Empty states:** Every polished screen includes verified empty state appearance (both themes).
- [ ] **Modal/bottom sheet theme:** Any new Modal or bottom sheet uses `useTheme()` internally (modals render outside the normal view hierarchy).
- [ ] **Phase scope:** PR diff touches only files within the declared phase scope; out-of-scope findings logged in backlog, not fixed inline.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Animation crashes from mixed-driver Animated.Value | LOW | Identify the conflicting animation pair; create a second `Animated.Value` with the correct driver; remove the conflicting animation from the shared value |
| Theme breakage from new COLORS import | LOW-MEDIUM | `grep` for all new COLORS imports in the diff; replace with `useTheme()` + `colors` destructure; verify both themes |
| `useMemo` dep array missing `colors` causing frozen styles | LOW | Add `colors` to dependency array; verify styles update on theme toggle |
| FlatList jank from un-memoized item components | MEDIUM | Wrap item in `React.memo`; extract `renderItem` to `useCallback`; profile before/after with React DevTools |
| Scope creep producing 150-file PR | HIGH — review burden | Split PR by tab/feature area; revert cross-scope changes to a separate backlog issue; re-review phase by phase |
| Splash/icon looks wrong in EAS build | LOW-MEDIUM | Fix asset (transparent background, correct dimensions); re-submit EAS preview build; does not require app store submission |
| Shared component change breaks unvisited screens | MEDIUM | List all consumers with `grep`; spot-check each; fix layout regressions; add to UAT checklist |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wrong `useNativeDriver` for property type | Every animation phase | Code review: every new `Animated.timing/spring` has driver comment matching property type |
| Mixed-driver conflict on existing Animated.Value | Home screen polish, chat polish (highest animated complexity) | No runtime "already attached to native node" error; all animations play smoothly |
| `useMemo` dep array missing `colors` | Every new screen/component phase | `react-hooks/exhaustive-deps` passes with no suppressions on style `useMemo` blocks |
| New component importing `COLORS` directly | Every phase | `grep -r "import.*COLORS" src/ --include="*.tsx"` returns zero outside `src/theme/` |
| FlatList item re-render regression | Chat polish, friend list polish, plans list polish | React DevTools Profiler: item does not re-render when unrelated parent state changes |
| Splash/icon not verified in EAS build | App icon + splash phase | EAS preview build installed on device/simulator; splash and icon match design spec |
| Scope creep / uncontrolled diff size | All phases | Each phase PR is ≤30 files; commit messages are screen-scoped |
| Visual regression on shared component change | Any phase touching shared components | Playwright suite passes; all consumer screens spot-checked in both themes |
| Modal/bottom sheet missing theme | Any phase adding new modals | New modal verified in light + dark mode; uses `useTheme()` internally |

---

## Sources

- [Using Native Driver for Animated — React Native docs](https://reactnative.dev/blog/2017/02/14/using-native-driver-for-animated) — Property support limitations, driver compatibility rules
- [Animations — React Native docs](https://reactnative.dev/docs/animations) — `useNativeDriver` limitations, layout property restrictions
- [Optimizing FlatList Configuration — React Native docs](https://reactnative.dev/docs/optimizing-flatlist-configuration) — `React.memo`, `renderItem` extraction, `maxToRenderPerBatch`
- [FlatList Optimization: Avoid Re-Rendering When Adding or Removing Items — Brains & Beards 2025](https://brainsandbeards.com/blog/2025-dont-rerender-new-flatlist-items/) — `React.memo` prevents re-renders on list mutations
- [Splash screen and app icon — Expo Documentation](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/) — Asset requirements, EAS vs Expo Go differences
- [Expo SDK 52 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52) — "Expo Go shows app icon instead of splash screen" change
- [Icon Shows in Place of Splash Screen with Expo Go — expo/expo#33215](https://github.com/expo/expo/issues/33215) — Confirmed behavior from SDK 52+
- [Reactive styles in React Native — Supercharge's Digital Product Guide](https://medium.com/supercharges-mobile-product-guide/reactive-styles-in-react-native-79a41fbdc404) — `useMemo` + `StyleSheet.create` pattern, dependency array correctness
- [React Native Dark Mode Implementation Guide 2025 — RN Example](https://reactnativeexample.com/react-native-dark-mode-implementation-guide-2025/) — Context with `useMemo`, theme-aware StyleSheet patterns
- [How to Avoid Scope Creep During Refactoring — Andrei Gridnev](https://andreigridnev.com/blog/2019-01-20-four-tips-to-avoid-scope-creep-during-refactoring/) — Bounded scope, backlog-first approach for noticed issues
- Campfire codebase — existing `useNativeDriver` pattern in RadarBubble.tsx (line 165), ReEngagementBanner.tsx (line 72), FriendSwipeCard.tsx (line 234), MessageBubble.tsx (lines 407-408), OfflineBanner.tsx (line 30)
- Campfire codebase — existing `useMemo(() => StyleSheet.create({...}), [colors])` pattern in squad.tsx (line 200), profile.tsx (line 290), wish-list.tsx (line 36), edit.tsx (line 109)

---
*Pitfalls research for: Campfire v1.7 — large-scale UI/UX polish pass on React Native + Expo managed workflow*
*Researched: 2026-05-04*
