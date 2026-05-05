---
phase: 24-polish-foundation
reviewed: 2026-05-05T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/components/common/EmptyState.tsx
  - src/components/common/PrimaryButton.tsx
  - src/components/common/SkeletonPulse.tsx
  - src/theme/animation.ts
  - src/theme/index.ts
  - tests/unit/animationTokens.test.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-05-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files were reviewed covering the Phase 24 polish foundation: two new shared UI components (`EmptyState`, `PrimaryButton`), the `SkeletonPulse` shimmer component, the new `ANIMATION` theme token module, its re-export from `src/theme/index.ts`, and the unit test suite for animation tokens.

The animation token design and the `SkeletonPulse` shimmer mechanics are sound. The bezier implementation is a faithful port of the standard cubic-bezier spline algorithm. The `ANIMATION` export is correctly wired through `src/theme/index.ts`. The unit test file is well-structured.

Two bugs of the same kind were found: inline `//` JavaScript comments inside JSX in `EmptyState.tsx` and `PrimaryButton.tsx`. These render as visible text in the UI because plain line-comment syntax is not valid JSX — it is treated as a text node. One warning concerns missing `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled` handling in `SkeletonPulse`, which will loop indefinitely against the system accessibility setting. Two info-level items cover dead code and an accessibility label gap.

---

## Warnings

### WR-01: JSX comment rendered as visible UI text — EmptyState.tsx

**File:** `src/components/common/EmptyState.tsx:66`
**Issue:** The line
```
// POLISH-03 verified (Phase 24): ctaLabel + onCta props render PrimaryButton CTA — requirement satisfied.
```
is a JavaScript line comment written directly inside JSX, between two sibling elements. In JSX, a bare `//` comment between tags is not stripped by the JSX transform — it is treated as a text node and rendered as visible text in the component. Any user who sees the `EmptyState` with a CTA will see this comment string on screen.
**Fix:** Replace with a JSX block comment, or remove it entirely since it is a verification note that belongs in planning docs, not source code:
```tsx
{/* POLISH-03 verified (Phase 24): ctaLabel + onCta props render PrimaryButton CTA — requirement satisfied. */}
```
Or simply delete the line.

---

### WR-02: JSX comment rendered as visible UI text — PrimaryButton.tsx

**File:** `src/components/common/PrimaryButton.tsx:44`
**Issue:** Same pattern as WR-01. The line
```
// POLISH-04 verified (Phase 24): loading prop renders ActivityIndicator and disables button — requirement satisfied.
```
is a bare `//` comment inside JSX, positioned between the `<TouchableOpacity>` open tag and the ternary expression. It will appear as visible text above the button label or spinner.
**Fix:** Use a JSX block comment or delete the line:
```tsx
{/* POLISH-04 verified (Phase 24): loading prop renders ActivityIndicator and disables button — requirement satisfied. */}
```

---

### WR-03: Looping animation ignores Reduce Motion accessibility setting — SkeletonPulse.tsx

**File:** `src/components/common/SkeletonPulse.tsx:28-45`
**Issue:** `SkeletonPulse` starts an `Animated.loop` unconditionally. Users who have enabled Reduce Motion (iOS: Settings → Accessibility → Motion → Reduce Motion) expect looping animations to stop or be replaced with a static treatment. The current implementation runs the shimmer loop regardless of that preference, which can cause discomfort for users with vestibular disorders.
**Fix:** Check `AccessibilityInfo.isReduceMotionEnabled()` before starting the loop, and skip the animation (or show a static state) when it returns `true`:
```tsx
import { AccessibilityInfo, Animated, ... } from 'react-native';

useEffect(() => {
  if (containerWidth === null) return;

  let loop: Animated.CompositeAnimation | null = null;

  AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
    if (reduceMotion) return; // static skeleton — no shimmer

    translateX.setValue(-containerWidth);
    loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: containerWidth,
        duration: ANIMATION.duration.verySlow,
        easing: ANIMATION.easing.decelerate(),
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    loop.start();
  });

  return () => loop?.stop();
}, [containerWidth, translateX]);
```

---

## Info

### IN-01: Nullish coalescing fallbacks are dead code — animation.ts

**File:** `src/theme/animation.ts:43-47`
**Issue:** The `?? 0` fallbacks on `sampleValues[currentSample]` and `sampleValues[currentSample + 1]` can never be reached. `sampleValues` is a `Float32Array(11)` — all slots are initialised to `0` by the runtime, and the loop at lines 34–36 overwrites each index. `Float32Array` element access never returns `undefined`; TypeScript may infer `number | undefined` due to `noUncheckedIndexedAccess`, but at runtime these are always numbers. The fallbacks obscure intent.
**Fix:** Either cast the accesses or use a helper to signal intent more clearly:
```ts
const dist =
  (aX - sampleValues[currentSample]!) /
  (sampleValues[currentSample + 1]! - sampleValues[currentSample]!);
```
Or, if the project has `noUncheckedIndexedAccess` disabled in tsconfig, the `??` is just noise — remove it.

---

### IN-02: `accessibilityLabel="Loading"` is static and non-descriptive — SkeletonPulse.tsx

**File:** `src/components/common/SkeletonPulse.tsx:71`
**Issue:** The container `View` has `accessibilityLabel="Loading"` hardcoded. When multiple `SkeletonPulse` instances appear on the same screen (e.g., a list of skeleton rows), a screen reader will announce "Loading" for each one, with no differentiation. This is low-friction for a placeholder, but a prop for callers to supply a more specific label would be better practice.
**Fix:** Accept an optional `accessibilityLabel` prop (defaulting to `"Loading"`):
```tsx
interface SkeletonPulseProps {
  width: number | '100%';
  height: number;
  accessibilityLabel?: string;  // default: "Loading"
}

// Usage at callsite:
<SkeletonPulse width={200} height={20} accessibilityLabel="Loading user name" />
```
This is a minor improvement, not a blocking issue.

---

_Reviewed: 2026-05-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
