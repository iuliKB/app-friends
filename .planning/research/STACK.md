# Technology Stack — v1.3.5 Homescreen Redesign

**Project:** Campfire
**Milestone:** v1.3.5 — Homescreen redesign (status bottom sheet, radar bubble view, card swipe deck)
**Researched:** 2026-04-10
**Scope:** ONLY additions/changes for v1.3.5. Existing stack (React Native 0.83.2, Expo SDK 55, Supabase, Zustand, TypeScript strict) is locked and NOT re-researched.

---

## TL;DR

One new npm dependency (`rn-swiper-list`) for the card deck swipe view. Everything else — animations, gestures, radar layout, pulse effects, the bottom sheet itself — uses libraries already in the project: `react-native-reanimated 4.2.1`, `react-native-gesture-handler ~2.30.0`, `react-native-svg 15.15.3`, and `expo-haptics`. **Do NOT install `@gorhom/bottom-sheet`** — it is confirmed broken on Reanimated v4 with no fix timeline.

---

## Already Installed — Use These

Verified by reading `/Users/iulian/Develop/campfire/package.json`:

| Package | Installed Version | Used For v1.3.5 |
|---------|------------------|-----------------|
| `react-native-reanimated` | `4.2.1` | All animation: pulse rings, bubble scale, card slide-off, sheet slide-up/drag-dismiss |
| `react-native-gesture-handler` | `~2.30.0` | Pan gesture for card swipe and sheet drag-to-dismiss; tap for view toggle |
| `react-native-worklets` | `0.7.2` | Required by Reanimated v4 for UI-thread worklets — already present |
| `react-native-svg` | `15.15.3` | Radar bubble rendering: `<Circle>` + `<AnimatedCircle>` for pulsing status rings |
| `expo-haptics` | `~55.0.9` | Impact feedback on card swipe commit (Nudge/Skip) |
| `expo-linear-gradient` | `~55.0.8` | Optional: status pill glow effect on ALIVE statuses |

All Reanimated v4 primitives needed are available and unchanged from v3 patterns:
- `useSharedValue`, `useAnimatedStyle`, `useAnimatedProps` — shared value plumbing
- `withTiming`, `withSpring`, `withRepeat`, `withSequence`, `withDelay` — all APIs unchanged in v4
- `Gesture.Pan()` from gesture-handler — the canonical v4 gesture composition pattern

---

## New Dependencies

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `rn-swiper-list` | `^3.0.0` | Card deck swipe (Nudge/Skip card stack) | Pure JS — no native modules. Peer deps are `react-native-reanimated *`, `react-native-gesture-handler *`, `react-native-worklets *` (all already installed). Provides stacked-card rendering, gesture thresholds, rotation interpolation, and card removal callbacks without reimplementing ~150 lines of gesture math. MIT license. |

**Confidence on rn-swiper-list (MEDIUM):** Peer deps are open wildcards and it requires `react-native-worklets` (a Reanimated v4 construct), strongly suggesting v4 awareness. No custom native modules. If runtime issues surface, the fallback is a custom `Gesture.Pan()` implementation — the underlying pattern is well-documented and ~80 lines.

### Installation

```bash
npx expo install rn-swiper-list
```

---

## The Critical Non-Decision: @gorhom/bottom-sheet

**Do NOT install `@gorhom/bottom-sheet`.** It is confirmed broken on Reanimated v4.

**Evidence:**
- Reanimated v4 (required by Expo SDK 55) changed internal APIs: `runOnJS` → `scheduleOnRN`, worklets moved to `react-native-worklets`
- `@gorhom/bottom-sheet` v5 still targets Reanimated v3 APIs
- GitHub issues #2528, #2546, #2547, #2592, #2600 all document: bottom sheet becomes non-interactive or throws on Reanimated v4
- Feature request #2600 was closed/locked with no release timeline as of early 2026
- No viable community fork found

**Solution:** Custom bottom sheet using Reanimated v4 + Gesture Handler (both already installed). For the status picker, the sheet is simple — fixed snap points, no scrollable content inside, one open/close gesture. The implementation is ~60 lines.

Custom sheet pattern:
```typescript
const translateY = useSharedValue(SHEET_HEIGHT);
const gesture = Gesture.Pan()
  .onUpdate((e) => { translateY.value = Math.max(0, e.translationY); })
  .onEnd((e) => {
    const shouldDismiss = e.translationY > SHEET_HEIGHT * 0.4 || e.velocityY > 500;
    translateY.value = withSpring(shouldDismiss ? SHEET_HEIGHT : 0, { damping: 20 });
    if (shouldDismiss) runOnJS(onClose)();
  });
const sheetStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: translateY.value }],
}));
```

---

## Radar / Bubble View: Zero Additional Libraries

The radar view is a **static positioned layout** with animated bubbles — not a physics simulation or map.

Implementation with existing stack:
1. Pre-compute `{top, left}` absolute coordinates for up to 6 friends in a fixed-height container `View`
2. Size each bubble (circle `View` with `borderRadius: size / 2`) based on status: ALIVE larger, FADING medium, DEAD smaller
3. Pulsing status ring: `<AnimatedCircle>` from `react-native-svg` with `useAnimatedProps` driving `r` (radius) and `opacity` on the UI thread
4. Bubble mount/status-change scale: `withSpring` on a `useSharedValue` for each bubble
5. Overflow for 7+ friends: horizontal `FlatList` with `showsHorizontalScrollIndicator={false}` below the radar area

`react-native-svg`'s `<AnimatedCircle>` + `useAnimatedProps` is the correct pattern — SVG prop animations (not transforms) stay on the UI thread and avoid bridge crossing for the pulsing ring effect.

---

## Pulse Animation on Status Pill: Zero Additional Libraries

Reanimated v4's `withRepeat` + `withSequence` + `withTiming` cover this exactly:

```typescript
const scale = useSharedValue(1);
useEffect(() => {
  scale.value = withRepeat(
    withSequence(
      withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0,  { duration: 700, easing: Easing.inOut(Easing.ease) })
    ),
    -1,    // infinite
    false  // do not reverse
  );
}, []);
```

These APIs are unchanged between Reanimated v3 and v4. HIGH confidence.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@gorhom/bottom-sheet` | Confirmed broken on Reanimated v4 (SDK 55). Non-interactive at runtime. No fix timeline. | Custom sheet: `useSharedValue` + `Gesture.Pan()` + `useAnimatedStyle` |
| `react-native-deck-swiper` | Uses legacy `PanResponder` + `Animated` (JS-thread); conflicts with Gesture Handler v2 gesture-driven animations | `rn-swiper-list` or custom `Gesture.Pan()` |
| `react-native-snap-carousel` | Maintenance issues, targets older RN | Native `FlatList` with `pagingEnabled` or `react-native-reanimated-carousel` |
| `Animated` (legacy RN API) | Runs on JS thread; conflicts with Gesture Handler v2 + Reanimated v4 shared values | Reanimated v4 `useSharedValue` + `useAnimatedStyle` |
| Animation state in Zustand | Animation values (translateX, scale, opacity) should live in shared values, not component state or Zustand | `useSharedValue` directly in the component |
| `react-native-reanimated-carousel` | Overkill for horizontal overflow row; an additional dependency | `FlatList` horizontal with `showsHorizontalScrollIndicator={false}` |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `react-native-reanimated` | `4.2.1` | Expo SDK 55, RN 0.83.2, New Architecture | Babel plugin auto-configured via `babel-preset-expo`; no manual config |
| `react-native-gesture-handler` | `~2.30.0` | Reanimated 4.2.1, Expo SDK 55 | New Architecture only; `GestureHandlerRootView` must wrap app root (already done) |
| `react-native-worklets` | `0.7.2` | Reanimated 4.2.1 | Do not add duplicate babel plugin declarations |
| `react-native-svg` | `15.15.3` | Reanimated 4.2.1 via `useAnimatedProps` | Use `Animated.createAnimatedComponent(Circle)` or import `AnimatedCircle` from `react-native-svg` |
| `rn-swiper-list` | `^3.0.0` | Peer deps: `*` for reanimated, gesture-handler, worklets | No native code; verify with `expo install` for version resolution |

---

## Stack Patterns by Feature

**Bottom sheet for status picker:**
- `useSharedValue(SHEET_HEIGHT)` for `translateY`
- `Gesture.Pan()` with `onUpdate` + `onEnd` snap logic
- `useAnimatedStyle` applies transform to the sheet container
- Backdrop: separate `Animated.View` with opacity interpolated from `translateY`
- Dismiss when velocity > 500 or drag > 40% of sheet height

**Radar bubble spatial view:**
- Fixed-height container `View` with `overflow: 'hidden'`
- Pre-compute `{top, left}` for up to 6 positions (deterministic, not physics)
- Each bubble: `Animated.View` with `useAnimatedStyle` for `transform: [{scale}]`
- Pulsing ring: `<AnimatedCircle>` with `useAnimatedProps` for `r` and `opacity`
- Overflow (7+ friends): horizontal `FlatList` below radar area

**Card swipe deck:**
- `rn-swiper-list` handles stack rendering and gesture thresholds
- Nudge = right swipe action; Skip = left swipe action
- `expo-haptics.impactAsync(ImpactFeedbackStyle.Medium)` on swipe commit

**View toggle (Radar vs Cards):**
- Local `useState` in `HomeScreen` or Zustand if toggle needs persistence across sessions
- Two-segment control using existing design system tokens
- Conditional render — no animation on the toggle itself

**Status pill pulse (new users / fresh status):**
- `withRepeat(withSequence(...), -1)` on a `useSharedValue` for scale
- Start pulse in `useEffect` on component mount; cancel on unmount via returned cleanup

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Custom bottom sheet | `@gorhom/bottom-sheet` | Broken on Reanimated v4. No fix timeline as of April 2026. |
| Custom bottom sheet | RN `Modal` + legacy `Animated` | JS-thread animation; no Gesture Handler v2 integration; no drag-to-dismiss without reimplementing gesture handling |
| `rn-swiper-list` | Custom pan gesture card stack | `rn-swiper-list` eliminates 150+ lines of threshold/rotation/z-index code. Falls back cleanly. |
| `react-native-svg AnimatedCircle` | `Animated.View` borderRadius rings | SVG `r` + `opacity` animate on UI thread via `useAnimatedProps`; `Animated.View` scale distorts borders and requires additional border-radius compensation math |
| `FlatList` horizontal for overflow | `ScrollView` + map | Project constraint: FlatList for all lists |

---

## Sources

| Claim | Source | Confidence |
|-------|--------|------------|
| `react-native-reanimated 4.2.1`, `react-native-gesture-handler ~2.30.0`, `react-native-svg 15.15.3`, `expo-haptics ~55.0.9` installed | Direct read of `/Users/iulian/Develop/campfire/package.json` | HIGH |
| `@gorhom/bottom-sheet` broken on Reanimated v4 | GitHub issues #2528, #2546, #2547, #2592, #2600 | HIGH |
| No fix timeline for gorhom bottom-sheet v4 support | Issue #2600 closed/locked with no release date, verified April 2026 | HIGH |
| Custom bottom sheet pattern with useSharedValue + Gesture.Pan() | [Reanimated docs: Bottom Sheet example](https://docs.swmansion.com/react-native-reanimated/examples/bottomsheet/) | HIGH |
| withRepeat/withSequence/withTiming unchanged in Reanimated v4 | [Reanimated withRepeat docs](https://docs.swmansion.com/react-native-reanimated/docs/animations/withRepeat/) | HIGH |
| `rn-swiper-list` v3.0.0, MIT, peer deps open wildcard, no native modules | `npm info rn-swiper-list` | HIGH |
| `rn-swiper-list` requires `react-native-worklets` (v4 construct) | `npm info rn-swiper-list peerDependencies` | HIGH |
| Reanimated v4 is New Architecture only; Expo SDK 55 ships with New Architecture | [Expo SDK 55 migration guide](https://reactnativerelay.com/article/expo-sdk-55-migration-guide-breaking-changes-sdk-53-to-55) | MEDIUM |
| `useAnimatedProps` + AnimatedCircle from react-native-svg works with Reanimated v4 | Training data + react-native-svg 15.x changelog | MEDIUM — test early in radar phase |

---

*Stack research for: v1.3.5 Homescreen Redesign additions*
*Researched: 2026-04-10*
