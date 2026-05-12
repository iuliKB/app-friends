---
phase: 29
status: advisory
reviewed_at: 2026-05-06T21:00:00Z
depth: standard
files_reviewed: 4
findings_critical: 0
findings_major: 1
findings_minor: 3
findings_advisory: 3
---

# Code Review — Phase 29: home-screen-overhaul

## Summary

Phase 29 delivers four clean subsystems: the DEAD bubble visual treatment in `RadarBubble`, EmptyState cleanup and OnboardingHintSheet removal in `HomeScreen`, EventCard resize + date pill, and the UpcomingEventsSection loading skeleton. The implementation is generally solid with no security issues or data-loss risks. One major finding: the skeleton fade-out animation in `UpcomingEventsSection` is a no-op because the animated node is unmounted before the animation can play. Three minor issues cover a hardcoded text color that bypasses dark-mode theming, dead variable computation in RadarBubble's DEAD branch, and a spurious animation trigger on initial mount.

---

## Findings

### Critical (must fix before shipping)

None.

---

### Major (strongly recommended)

#### M-01: Skeleton fade-out animation never plays — animated node is unmounted immediately

**File:** `src/components/home/UpcomingEventsSection.tsx`, lines 33–43 and 128–133

**Issue:** The skeleton fade-out is implemented by animating `skeletonOpacity` from 1 to 0 in a `useEffect` that runs when `isLoading` transitions to `false`. However, the skeleton node itself is inside a ternary (`isLoading ? <Animated.View> : ...`). When `isLoading` flips to `false`, React immediately unmounts the `Animated.View` and renders the empty/FlatList branch. The 300ms `Animated.timing` call targets an `Animated.Value` whose owning view is already gone — the fade never appears on screen. The intended shimmer-to-content crossfade is silently skipped.

The same effect fires on initial mount when `isLoading` defaults to `false`, animating an `Animated.Value` that was never displayed.

**Fix:** Keep the skeleton mounted during the fade by tracking visibility state separately from the `isLoading` prop. One idiomatic approach:

```tsx
const [skeletonVisible, setSkeletonVisible] = useState(isLoading);

useEffect(() => {
  if (isLoading) {
    skeletonOpacity.setValue(1);
    setSkeletonVisible(true);
  } else if (skeletonVisible) {
    // Keep skeleton mounted, fade it out, then unmount
    Animated.timing(skeletonOpacity, {
      toValue: 0,
      duration: ANIMATION.duration.normal,
      useNativeDriver: true,
    }).start(() => setSkeletonVisible(false));
  }
}, [isLoading]); // skeletonOpacity and skeletonVisible deliberately omitted — stable refs

// In JSX:
{skeletonVisible ? (
  <Animated.View style={{ opacity: skeletonOpacity, ... }}>
    <SkeletonPulse ... />
    <SkeletonPulse ... />
  </Animated.View>
) : upcomingEvents.length === 0 ? (
  // empty state
) : (
  // FlatList
)}
```

This keeps the skeleton node in the tree for the 300ms duration of the fade, then removes it after `.start()` callback fires.

---

### Minor (nice to have)

#### MN-01: `textColor` hardcodes `#1a1a1a` regardless of dark mode

**File:** `src/components/home/EventCard.tsx`, line 30

**Issue:** The text color for non-image (pastel background) cards is unconditionally set to `'#1a1a1a'` regardless of `isDark`. The `isDark` value is already destructured from `useTheme()` (line 20). While current pastel colors are light enough that `#1a1a1a` reads acceptably in both modes, this bypasses the theme system. If the pastel palette is ever darkened for dark mode, card text will become illegible.

```tsx
// Current
const textColor = hasImage ? colors.text.primary : '#1a1a1a';

// Suggested
const textColor = hasImage ? colors.text.primary : (isDark ? colors.text.primary : '#1a1a1a');
```

Alternatively, introduce a design token for pastel-card text color to keep magic strings out of component code.

---

#### MN-02: `hitSlop` and `accessibilityLabel` computed unconditionally but only used in Pressable branch

**File:** `src/components/home/RadarBubble.tsx`, lines 232–238

**Issue:** Both `hitSlop` (line 232) and `accessibilityLabel` (lines 235–238) are computed in every render regardless of `isDead`. When `isDead === true` the render takes the plain `View` branch — neither value is passed to any element. The computation is cheap, but it creates misleading code: an `accessibilityLabel` that says "Tap to message, hold for more" is built for a non-interactive element.

**Fix:** Move these declarations inside the `else`/Pressable branch, or gate them:

```tsx
const hitSlop = (!isDead && targetSize < 44)
  ? { top: 4, bottom: 4, left: 4, right: 4 }
  : undefined;

const accessibilityLabel = isDead
  ? undefined
  : (heartbeatState === 'fading'
      ? `${friend.display_name}, ${moodLabel}, fading. Tap to message, hold for more.`
      : `${friend.display_name}, ${moodLabel}. Tap to message, hold for more.`);
```

---

#### MN-03: Spurious animation fires on initial mount when `isLoading` defaults to `false`

**File:** `src/components/home/UpcomingEventsSection.tsx`, lines 33–43

**Issue:** The `useEffect` dependency is `[isLoading, skeletonOpacity]`. On component mount, if `isLoading` is `false` (the default), the effect fires immediately and starts a 300ms `Animated.timing` toward 0 — but the skeleton branch is not rendered. This fires an animation against a node that was never mounted. It is benign (React Native silently ignores animations on unmounted nodes), but it is a spurious call that could mask real issues in profiling or testing.

**Fix:** Add an initial-mount guard using a `hasMountedRef`:

```tsx
const hasMountedRef = useRef(false);

useEffect(() => {
  if (!hasMountedRef.current) {
    hasMountedRef.current = true;
    return; // Skip animation on initial render
  }
  if (!isLoading) {
    Animated.timing(skeletonOpacity, { ... }).start();
  } else {
    skeletonOpacity.setValue(1);
  }
}, [isLoading, skeletonOpacity]);
```

Note: this minor finding is superseded by M-01 — fixing M-01 with the visibility-state approach resolves MN-03 as well.

---

### Advisory (observations)

#### A-01: `usePlans()` in HomeScreen is called for its store side-effect, with only `loading` extracted

**File:** `src/screens/home/HomeScreen.tsx`, line 38

**Observation:** `usePlans()` is called and only `loading` is destructured. The comment documents that the call populates `usePlansStore` for `UpcomingEventsSection` to filter client-side. This implicit side-effect coupling — where one screen must call a hook to hydrate a store that a child component reads from — is invisible to future readers. If `HomeScreen` is refactored and the `usePlans()` call is removed (e.g., because `loading` is no longer needed), `UpcomingEventsSection` silently gets stale or empty data.

**Suggestion:** Add a more prominent comment making the dependency explicit, or consider having `UpcomingEventsSection` call `usePlans()` itself (if the hook uses a shared store, the cost of calling it twice is just the subscription, not a double fetch).

---

#### A-02: Non-null assertion on `plan.cover_image_url` inside a truthiness guard

**File:** `src/components/home/EventCard.tsx`, line 76

**Observation:** `plan.cover_image_url!` is used inside an `{hasImage ? <> ... </>}` block where `hasImage = Boolean(plan.cover_image_url)` on line 22. The assertion is logically safe here. However, if the `hasImage` guard is ever refactored or the condition widened, the assertion becomes an unchecked assumption that TypeScript cannot catch. This pattern tends to accumulate over time.

**Suggestion:** Use optional chaining instead: `source={{ uri: plan.cover_image_url ?? undefined }}`. `expo-image` accepts `undefined` for `uri` without error, removing the assertion entirely.

---

#### A-03: DEAD bubble wraps `Animated.View` in a structurally unnecessary plain `View`

**File:** `src/components/home/RadarBubble.tsx`, line 248

**Observation:** In the DEAD branch, the component renders `<View><Animated.View>...</Animated.View></View>`. In the non-DEAD branch it renders `<Pressable><Animated.View>...</Animated.View></Pressable>`. The outer `View` in the DEAD branch has no style or purpose — the `Animated.View` carries all sizing. This creates an extra nesting level that could affect layout measurement and makes the two render paths structurally asymmetric.

**Suggestion:** Remove the redundant wrapper:

```tsx
{isDead ? (
  <Animated.View style={[styles.bubbleContainer, { width: sizeAnim, height: sizeAnim }]}>
    <AvatarCircle ... />
    <View style={[StyleSheet.absoluteFillObject, { ... }]} pointerEvents="none" />
  </Animated.View>
) : (
  <Pressable ...>
    <Animated.View style={[styles.bubbleContainer, { width: sizeAnim, height: sizeAnim }]}>
      ...
    </Animated.View>
  </Pressable>
)}
```

---

_Reviewed: 2026-05-06T21:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
