# Pitfalls Research

**Domain:** Adding bottom sheets, radar/bubble views, card stacks, and animated UI to an existing React Native + Expo (managed workflow) homescreen
**Researched:** 2026-04-10
**Confidence:** MEDIUM-HIGH — grounded in documented React Native Gesture Handler issues (GitHub tracker), Expo Go managed workflow constraints (official docs), and well-established React Native animation limits. Android-specific keyboard behavior and `onLayout` race conditions are flagged where official docs are ambiguous.

---

## Critical Pitfalls

### Pitfall 1: Bottom Sheet Keyboard Avoidance Breaks on Android with Dynamic Sizing

**What goes wrong:**
When a `TextInput` inside the bottom sheet (e.g., the MoodPicker context tag input) is focused on Android, the bottom sheet collapses entirely or shifts to a broken position instead of pushing up above the keyboard. The `KeyboardAvoidingView` approach that works on iOS fails on Android because React Native Modal uses Android's `Dialog` control under the hood, which sets its own `android:windowSoftInputMode` that cannot be overridden from JavaScript. With `enableDynamicSizing` enabled, the keyboard event causes the sheet to close completely on Android (documented issue in gorhom/react-native-bottom-sheet #1602).

**Why it happens:**
Developers implement keyboard avoidance once, test on iOS simulator (where `padding` behavior works), and ship. Android keyboard behavior is fundamentally different — it operates at the window level, not the view level. The MoodPicker has interactive elements (emoji chips, context tag rows) that benefit from dynamic sizing, which amplifies the bug.

**How to avoid:**
- Build the bottom sheet without a third-party library. Use React Native's built-in `Modal` with `Animated` for the slide-up, a `PanResponder` for drag-to-dismiss, and `KeyboardAvoidingView` with `behavior="height"` (not "padding") wrapping the inner content. This eliminates the `enableDynamicSizing` bug entirely.
- If a library is used, pin to a version where the Android keyboard bug is confirmed fixed and test on a physical Android device before merging.
- Never use `KeyboardAvoidingView` around the outer sheet wrapper — only around the scrollable content area inside.
- Use `android_keyboardInputMode="adjustResize"` if using gorhom's sheet (Android-only prop).

**Warning signs:**
- Testing keyboard behavior only on iOS simulator.
- Bottom sheet content jumps or closes when tapping a text input on Android.
- `enableDynamicSizing` is enabled without Android-specific testing.

**Phase to address:** Bottom Sheet phase (Phase 1). Must test on physical Android before sign-off. Cannot defer to a "polish" phase.

---

### Pitfall 2: Gesture Handler Conflict Between Swipeable Cards and Parent FlatList Scroll

**What goes wrong:**
The card stack view is placed inside (or renders alongside) a vertically scrolling parent. When the user swipes a card horizontally (Nudge/Skip), the gesture bleeds into the parent's vertical scroll — the card swipes and the list scrolls simultaneously, or the scroll intercepts a diagonal swipe and the card never moves. On Android this is more severe: the `Swipeable` component from `react-native-gesture-handler` and the `FlatList`'s scroll compete for the same touch event with no resolution, causing random failures where neither action fires.

**Why it happens:**
React Native's gesture system cannot automatically determine intent when both horizontal and vertical handlers are active in the same touch region. The card stack is logically separate from the FlatList friends list, but they share a scroll container ancestor. Gesture priority must be declared explicitly using gesture relations (`simultaneousWithExternalGesture`, `requireExternalGestureToFail`) — it is not inferred.

**How to avoid:**
- Make the card stack view a full-screen replacement, not an element inside the same scroll hierarchy as the FlatList. When "Cards" view is active, the FlatList unmounts (or is `display: none`). This eliminates the shared ancestor problem.
- If cards must coexist with a scroll container, use `PanResponder` with explicit `onMoveShouldSetPanResponder` returning `true` only when `Math.abs(dx) > Math.abs(dy) * 2` (horizontal-dominant gesture). Do not use `Swipeable` from RNGH inside a vertical scroll without gesture relations wired.
- `GestureHandlerRootView` must wrap the entire app root (in `_layout.tsx`), not just the homescreen. If it already wraps the app for another feature, confirm there is no duplicate wrapper.

**Warning signs:**
- Diagonal swipes on cards cause the parent list to scroll.
- Cards only swipe correctly on iOS but fail on Android.
- `Swipeable` is nested inside a `ScrollView` or `FlatList` without explicit gesture relations.
- `GestureHandlerRootView` appears more than once in the tree.

**Phase to address:** Card Stack phase (Phase 3). The view-toggle architecture decision (full-screen swap vs. shared container) must be locked before any gesture implementation begins.

---

### Pitfall 3: Radar View Layout Collapses on Shorter Screens (iPhone SE, older Android)

**What goes wrong:**
The radar/bubble layout uses absolute positioning calculated from `Dimensions.get('window')` at module load time. On iPhone SE (375×667) or Android devices with <700px screen height after safe-area insets, the bubbles overlap each other, clip outside the container, or push below the fold. On devices with notches or dynamic island, the available height is different from what `Dimensions` reports.

**Why it happens:**
`Dimensions.get('window')` returns the full window size including areas behind notches on some Android versions. Safe-area insets are not automatically subtracted. Bubble position math that looks correct on an iPhone 14 (844px height) fails silently on SE-class devices because no test covered that form factor. Absolute-positioned elements in React Native also do not respond to flexbox parent constraints the way web CSS does — a child with `position: 'absolute'` escapes its parent's flex layout.

**How to avoid:**
- Use `onLayout` on the radar container to get the actual rendered width/height after safe-area insets have been applied. Calculate bubble positions as percentages of the container's measured dimensions, not from `Dimensions`.
- Define a minimum container height (e.g., 280px). If the measured height is below this threshold, fall back to a compact horizontal row layout.
- Test on iPhone SE screen size (375×667) in the simulator before merging.
- Do not calculate positions at module init time. Position state must be derived inside `onLayout` callback or a layout effect that reads `useWindowDimensions()`.

**Warning signs:**
- Bubble positions calculated with raw `Dimensions.get('window').width / 3` arithmetic at the top of the component.
- No `onLayout` handler on the radar container.
- Only tested on iPhone 14 Pro or larger screen simulators.
- Bubbles clip or overlap on any real device.

**Phase to address:** Radar/Bubble phase (Phase 2). Add an iPhone SE simulator run to the phase verification checklist.

---

### Pitfall 4: Animated Pulse Rings Cause FlatList to Stop Rendering New Rows

**What goes wrong:**
The status pill's pulse animation runs as a `Animated.loop` on the homescreen. React Native's scheduler treats a running `Animated.loop` as an ongoing "interaction" by default. This blocks `VirtualizedList` (the internals of FlatList) from rendering additional rows while the animation is active — users see blank space at the bottom of the friends list until they scroll. The bug is subtle: the list eventually renders, but the delay makes the app feel broken on first load.

**Why it happens:**
`Animated.timing` and `Animated.loop` register with the `InteractionManager` by default. FlatList defers row rendering until interactions complete. A never-ending loop means interactions never complete. This is a documented React Native gotcha but is not surfaced as a warning in the console.

**How to avoid:**
- Pass `isInteraction: false` in the config object of every `Animated.timing` call inside an `Animated.loop`. This exempts the animation from the InteractionManager queue.
- Use `useNativeDriver: true` for the pulse (scale + opacity only — do not attempt to animate layout properties like `width` or `height` with the native driver, as this throws an error).
- Verify that `useNativeDriver: true` is set consistently across all animations. Mixing native and JS driver in the same `Animated.loop` → `Animated.sequence` fails silently on some RN versions (the loop plays once and stops).

**Warning signs:**
- Friends list shows blank rows on initial load but fills in after scrolling.
- `isInteraction` is not passed to `Animated.timing` calls inside loops.
- Console warning: "Animated: `useNativeDriver` was not specified."

**Phase to address:** Status Pill / Pulse animation phase (Phase 4). Also audit any existing animations in the codebase for `isInteraction: false` at the same time.

---

### Pitfall 5: gorhom/bottom-sheet Is Not Pure JavaScript — It May Break in Expo Go

**What goes wrong:**
`@gorhom/bottom-sheet` v5 requires `react-native-reanimated` v3 and `react-native-gesture-handler` v2 as peer dependencies. Both libraries ship native C++ code. In Expo Go (managed workflow), only the exact versions bundled into the Expo SDK are available — you cannot install a different version. If the project's `package.json` installs a version of Reanimated or Gesture Handler that does not match what Expo Go bundles, the app crashes on launch in Expo Go with a native module not found error.

**Why it happens:**
The constraint "must work in Expo Go" means all native dependencies must be from the Expo SDK bundle. `@gorhom/bottom-sheet` adds an implicit dependency chain that may not be version-aligned. Developers install the library, test in a dev build or simulator with Metro bundling, and only discover the mismatch when they try Expo Go on a real device.

**How to avoid:**
- Do not add `@gorhom/bottom-sheet` if Expo Go compatibility is a hard requirement. Build the bottom sheet with `Modal` + `Animated` + `PanResponder` — all built into React Native core, all Expo Go compatible.
- `react-native-reanimated` is already bundled in Expo SDK (check `expo-modules-core` version in the project). If it is already a project dependency at the SDK-pinned version, then Reanimated-based animations are safe. Do not upgrade it independently.
- `react-native-gesture-handler` is also bundled in Expo SDK. Same version pinning rule applies.
- Before adding any animation/gesture library, check it against `npx expo install --check` output and the Expo SDK compatibility table.

**Warning signs:**
- Installing a library that requires `react-native-reanimated` at a version not pinned in the Expo SDK.
- "Native module not found" crash on Expo Go launch after adding a new dependency.
- `package.json` shows a Reanimated or Gesture Handler version different from what `expo-modules-core` specifies.

**Phase to address:** Any phase that introduces a new library dependency. Verify Expo Go compatibility in the first integration test of every phase.

---

### Pitfall 6: Removing Inline MoodPicker Breaks ReEngagementBanner "Update" Action

**What goes wrong:**
The existing `ReEngagementBanner` (shown when the user's heartbeat is FADING) has an "Update" action that scrolls the homescreen `FlatList` to the inline `MoodPicker` position. When the inline `MoodPicker` is removed in favor of the bottom sheet picker, the scroll target no longer exists. The "Update" button either does nothing (silent no-op if the ref is stale), throws a runtime error (if `scrollToOffset` is called on an unmounted component), or scrolls to an arbitrary position. This regression is easy to miss in code review because the `ReEngagementBanner` only appears when the user's status is FADING — a state that requires waiting 4 hours in testing.

**Why it happens:**
The scroll-to-ref is wired to a specific `FlatList` offset (or item index) that assumed the MoodPicker was a list item at a known position. Removing the item invalidates the target without any compile-time error. TypeScript's strict mode does not catch a stale ref being called.

**How to avoid:**
- Change the "Update" action to open the bottom sheet instead of scrolling. The `ReEngagementBanner` phase should explicitly include "wire Update → open bottom sheet" as a requirement.
- Search the codebase for every call site of the MoodPicker's scroll ref before removing the component. In this project: `ReEngagementBanner`, any `useFocusEffect` scroll restoration, and any deep link handlers.
- Remove the inline MoodPicker and the scroll-to logic in the same commit — never in separate phases.

**Warning signs:**
- "Update" button in `ReEngagementBanner` calls `flatListRef.current?.scrollToIndex` or `scrollToOffset` after the MoodPicker is removed.
- The removed MoodPicker's `FlatList` item index is hardcoded rather than derived.
- The refactor phase plan does not explicitly mention wiring the banner action to the new bottom sheet.

**Phase to address:** Phase that removes the inline MoodPicker (likely Phase 1, same as bottom sheet introduction). Must be a single atomic change, not split across phases.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Calculate bubble positions from `Dimensions` at module init | Less code | Breaks on screen rotation, notched devices, SE-size screens | Never — use `onLayout` |
| Nest `Swipeable` inside parent `FlatList` without gesture relations | Faster to implement | Unpredictable swipe/scroll behavior on Android | Never |
| Test keyboard avoidance on iOS simulator only | Saves time | Android keyboard regression ships to users | Never |
| Use `@gorhom/bottom-sheet` and pin Reanimated to match Expo SDK | Richer sheet behavior | One Expo SDK bump breaks Expo Go compatibility | Only if dropping Expo Go requirement |
| Inline animation styles recreated on every render | Less boilerplate | 30–50% performance drop on low-end devices | Never |
| Omit `isInteraction: false` from pulse animation | Simpler code | FlatList defers rendering; blank rows visible on load | Never |
| Keep old MoodPicker in tree as `display: 'none'` | Avoids breaking ReEngagementBanner immediately | Permanent dead code + bundle weight | Only as a 1-phase bridge, removed in next phase |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Animated.loop + FlatList | Omitting `isInteraction: false` blocks list rendering | Pass `isInteraction: false` in every `Animated.timing` config inside a loop |
| Gesture handler + existing scroll | Adding gestures without `GestureHandlerRootView` at app root | Confirm root wrapper exists in `_layout.tsx` before any gesture work |
| Bottom sheet + keyboard (Android) | Using `KeyboardAvoidingView` around the outer sheet | Wrap inner scroll content only; use `android_keyboardInputMode` |
| `onLayout` for bubble positions | Reading dimensions before first render | Always derive positions inside the `onLayout` callback; never at module scope |
| ReEngagementBanner scroll ref | Assuming scroll target still exists after MoodPicker removal | Replace scroll action with bottom sheet open in same commit |
| Reanimated version in Expo Go | Installing library version not pinned by Expo SDK | Run `npx expo install` not `npm install` for all Expo SDK packages |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Pulse `Animated.loop` without `isInteraction: false` | FlatList shows blank rows on load | Set `isInteraction: false` in timing config | Immediately on first open |
| Inline `StyleSheet` objects inside `renderItem` | Slow scroll, jank on budget Android phones | Move styles outside component or use `useMemo` | 6+ friends in list |
| Animated layout properties (width/height) via native driver | Runtime error "X is not supported with native driver" | Animate only `transform` and `opacity` | First run |
| `Dimensions.get` at module init for radar positions | Wrong positions on screen size change / notch variants | Use `useWindowDimensions()` or `onLayout` | iPhone SE, tablets |
| Card stack pre-renders all cards simultaneously | Memory spike with 6+ friend avatars/statuses | Render only top 2–3 cards; defer rest | 6+ friends |
| `useCallback`-less `renderItem` in FlatList | Every parent re-render triggers full list re-render | Wrap `renderItem` in `useCallback`, card in `React.memo` | Any state change in parent |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Pulse animation ignores `accessibilityReduceMotion` | Causes discomfort for motion-sensitive users; App Store rejection risk | Check `AccessibilityInfo.isReduceMotionEnabled()` and skip animation |
| View toggle state lost on tab switch | Users lose Radar/Cards preference when navigating away | Persist view toggle in Zustand store (not local `useState`) |
| Bottom sheet blocks back gesture (Android) | Hardware back button does not dismiss sheet | Handle `BackHandler` event to dismiss sheet before navigating |
| Card swipe threshold too low | Accidental Nudge/Skip sends on scroll | Require >40% card width horizontal displacement before triggering action |
| Status pill pulse runs at full opacity in notification banners | Visually loud; accessibility failure | Reduce pulse to opacity 0.6–1.0 range, not 0–1 |
| Radar bubbles identical size for all friends | Friends with active/inactive status look the same | Size variation or ring thickness communicates status liveness |

---

## "Looks Done But Isn't" Checklist

- [ ] **Bottom Sheet:** Keyboard avoidance tested on physical Android device (not just iOS simulator) — verify no sheet collapse on TextInput focus.
- [ ] **Bottom Sheet:** Hardware back button on Android dismisses sheet (not navigates away from homescreen).
- [ ] **Bottom Sheet:** `ReEngagementBanner` "Update" action opens sheet (not scrolls to deleted MoodPicker).
- [ ] **Radar View:** Bubble positions computed from `onLayout` dimensions, not `Dimensions.get()`. Tested on iPhone SE (375×667).
- [ ] **Radar View:** Layout correct with 1 friend, 3 friends, 6 friends, and 10+ friends (overflow scroll).
- [ ] **Card Stack:** Horizontal swipe does not trigger vertical scroll on parent. Tested on Android.
- [ ] **Card Stack:** Nudge/Skip action requires deliberate swipe — not triggered by accidental tap-drag.
- [ ] **View Toggle:** Radar/Cards preference survives tab navigation and app backgrounding (stored in Zustand, not `useState`).
- [ ] **Pulse Animation:** `isInteraction: false` set on all `Animated.timing` calls inside loops.
- [ ] **Pulse Animation:** `useNativeDriver: true` on all pulse animations. No layout property animation via native driver.
- [ ] **Pulse Animation:** Reduce Motion respected — `AccessibilityInfo.isReduceMotionEnabled()` checked at render.
- [ ] **Expo Go:** All new dependencies verified against Expo SDK bundled versions with `npx expo install`.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Android keyboard destroys bottom sheet | HIGH | Remove library, rebuild with Modal + Animated + PanResponder |
| Gesture conflicts in card stack | MEDIUM | Extract card stack to full-screen view, remove from shared scroll ancestor |
| Bubble positions broken on small screens | LOW | Replace Dimensions-based math with onLayout-derived percentages |
| ReEngagementBanner "Update" broken | LOW | Wire button to open bottom sheet ref instead of scroll |
| Expo Go crash from library version mismatch | MEDIUM | Remove library, use built-in RN APIs only |
| FlatList blank rows from animation loop | LOW | Add `isInteraction: false` to timing configs |
| View toggle preference lost on tab switch | LOW | Move state from local `useState` to Zustand store |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Android keyboard breaks bottom sheet | Phase 1 (Bottom Sheet) | Physical Android device test: tap TextInput in open sheet |
| ReEngagementBanner "Update" broken by MoodPicker removal | Phase 1 (Bottom Sheet) | Force FADING status in dev, tap "Update", confirm sheet opens |
| Expo Go native module mismatch | Every phase that adds a dependency | `npx expo start` in Expo Go after each new install |
| Radar layout breaks on small screens | Phase 2 (Radar View) | iPhone SE simulator run, 1/3/6/10+ friend count variants |
| onLayout race for bubble positions | Phase 2 (Radar View) | Log container dimensions; assert non-zero before position calculation |
| Card swipe conflicts with parent scroll | Phase 3 (Card Stack) | Android device: scroll vertically while card is in view, swipe card horizontally |
| Android hardware back does not dismiss bottom sheet | Phase 1 (Bottom Sheet) | Android device: open sheet, press hardware back |
| Pulse blocks FlatList row rendering | Phase 4 (Status Pill) | Open homescreen with 6+ friends; verify all rows visible without scroll |
| useNativeDriver inconsistency in loop | Phase 4 (Status Pill) | Confirm no console warning "Animated: useNativeDriver was not specified" |
| Reduce Motion not respected | Phase 4 (Status Pill) | Enable Reduce Motion in device accessibility settings; verify pulse stops |
| View toggle state lost on tab navigation | Phase 2 or 3 (Toggle) | Switch to Radar, navigate to Chats, return home, verify Radar still active |

---

## Sources

- React Native Gesture Handler issue tracker — swipeable/FlatList scroll conflicts: https://github.com/software-mansion/react-native-gesture-handler/issues/2380, https://github.com/software-mansion/react-native-gesture-handler/issues/1691
- gorhom/react-native-bottom-sheet Android keyboard bug with enableDynamicSizing: https://github.com/gorhom/react-native-bottom-sheet/issues/1602
- gorhom/react-native-bottom-sheet keyboard handling docs: https://gorhom.dev/react-native-bottom-sheet/keyboard-handling
- React Native Animated docs (isInteraction, useNativeDriver limits): https://reactnative.dev/docs/animated
- Expo library compatibility (managed workflow, Expo Go): https://docs.expo.dev/workflow/using-libraries/
- React Native Reanimated accessibility / ReduceMotion: https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/
- Expo SDK 52 gesture handler version: https://expo.dev/changelog/2025-01-21-react-native-0.77
- React Native FlatList optimization (windowSize, isInteraction): https://reactnative.dev/docs/optimizing-flatlist-configuration
- onLayout vs. measure for absolute positioning: https://reactnative.dev/docs/the-new-architecture/layout-measurements
- Animated.loop memory / isInteraction gotcha: https://github.com/facebook/react-native/issues/22898

---
*Pitfalls research for: React Native + Expo homescreen redesign (v1.3.5) — bottom sheets, radar view, card stack, animated status pill*
*Researched: 2026-04-10*
