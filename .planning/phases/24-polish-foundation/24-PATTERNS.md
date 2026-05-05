# Phase 24: Polish Foundation - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 4 (2 new, 1 modified, 1 verified read-only)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/theme/animation.ts` | config (theme token) | transform (pure constants) | `src/theme/radii.ts` + `src/theme/shadows.ts` | exact — same `as const` object shape, same barrel-export convention |
| `src/theme/index.ts` | config (barrel) | — (single-line addition) | `src/theme/index.ts` itself | exact — mirrors every existing export line |
| `src/components/common/SkeletonPulse.tsx` | component | event-driven (animation loop) | `src/components/home/RadarBubble.tsx` PulseRing + `src/components/common/LoadingIndicator.tsx` | exact for animation loop; role-match for component shell |
| `tests/unit/animationTokens.test.ts` | test | transform (pure assertion) | `tests/unit/birthdayFormatters.test.ts` | exact — same `npx tsx` + `node:assert/strict` runner pattern |

**Verification-only files (no code changes):**

| File | Verification Type | Read Source |
|---|---|---|
| `src/components/common/EmptyState.tsx` | Read and confirm `ctaLabel?` + `onCta?` → `PrimaryButton` exists | Lines 12–13, 66–70 |
| `src/components/common/PrimaryButton.tsx` | Read and confirm `loading?` → `ActivityIndicator` + `disabled` exists | Lines 8, 38–50 |

---

## Pattern Assignments

### `src/theme/animation.ts` (config, pure constants)

**Analog:** `src/theme/radii.ts` (lines 1–9) and `src/theme/shadows.ts` (lines 1–30)

**Structure pattern — from `src/theme/radii.ts` lines 1–9:**
```typescript
export const RADII = {
  xs: 4,      // small indicators (unread dot, action sheet handle)
  sm: 6,      // segmented control thumb
  md: 8,      // buttons, inputs, small cards, tags
  // ...
} as const;
```

**Multi-key nested object pattern — from `src/theme/shadows.ts` lines 1–30:**
```typescript
export const SHADOWS = {
  fab: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    // ...
  },
  card: { ... },
} as const;
```

**Imports pattern:** No imports needed for `radii.ts` or `shadows.ts` — they are pure data. `animation.ts` differs by needing one import:
```typescript
import { Easing } from 'react-native';
```

**Core pattern to produce:**
```typescript
// src/theme/animation.ts
import { Easing } from 'react-native';

export const ANIMATION = {
  duration: {
    fast: 200,       // quick UI responses, haptic confirms
    normal: 300,     // state transitions, reveals
    slow: 700,       // emphasis animations, status pulses
    verySlow: 1200,  // looping ambient animations (radar pulse, skeleton shimmer)
  },
  easing: {
    standard:   () => Easing.inOut(Easing.ease),  // balanced — state transitions
    decelerate: () => Easing.out(Easing.ease),    // fast-in, slow-out — content arriving
    accelerate: () => Easing.in(Easing.ease),     // slow-in, fast-out — content leaving
    spring: { damping: 15, stiffness: 120 },      // Reanimated withSpring config (data only)
  },
} as const;
```

**Anti-pattern to avoid:** Do NOT pre-evaluate easing at module load:
```typescript
// WRONG — evaluates Easing.out at import time
easing: { decelerate: Easing.out(Easing.ease) }

// CORRECT — lazy function, evaluated at call site
easing: { decelerate: () => Easing.out(Easing.ease) }
```

**Note on `spring`:** The `spring` key is plain data (`{ damping, stiffness }`), not a function — no Easing call, no Reanimated import needed in `animation.ts`.

---

### `src/theme/index.ts` (barrel, single-line addition)

**Analog:** `src/theme/index.ts` itself (lines 1–8)

**Existing barrel pattern (lines 1–8):**
```typescript
export { COLORS as DARK } from './colors';
export { LIGHT } from './light-colors';
export { ThemeProvider, useTheme } from './ThemeContext';
export type { ThemePreference } from './ThemeContext';
export { SPACING } from './spacing';
export { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT } from './typography';
export { RADII } from './radii';
export { SHADOWS } from './shadows';
```

**Addition to make — append after `export { SHADOWS }`:**
```typescript
export { ANIMATION } from './animation';
```

One line. No other changes to this file.

---

### `src/components/common/SkeletonPulse.tsx` (component, animation loop)

**Primary analog:** `src/components/home/RadarBubble.tsx` — PulseRing sub-component (lines 49–98)
**Secondary analog:** `src/components/common/LoadingIndicator.tsx` (lines 1–32) — component shell pattern

**Imports pattern — combine both analogs:**
```typescript
// From LoadingIndicator.tsx lines 1–3 (shell pattern)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
// From RadarBubble.tsx line 7 (LinearGradient)
import { LinearGradient } from 'expo-linear-gradient';
// From RadarBubble.tsx line 9 / LoadingIndicator.tsx line 3 (theme)
import { useTheme, RADII } from '@/theme';
import { ANIMATION } from '@/theme';
```

**useTheme + useMemo pattern — from `src/components/common/EmptyState.tsx` lines 24–55:**
```typescript
const { colors } = useTheme();
const styles = useMemo(() => StyleSheet.create({
  container: {
    // use tokens: SPACING.*, RADII.*, colors.*
  },
}), [colors]);
```

**Animation loop pattern — from `src/components/home/RadarBubble.tsx` lines 53–80 (PulseRing):**
```typescript
const scaleAnim = useRef(new Animated.Value(1.0)).current;

useEffect(() => {
  scaleAnim.setValue(1.0);

  const loop = Animated.loop(
    Animated.timing(scaleAnim, {
      toValue: 1.7,
      duration: 1200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,       // keeps animation on native thread
      isInteraction: false,        // never block FlatList/gesture detection
    })
  );

  loop.start();
  return () => loop.stop();        // cleanup on unmount
}, [scaleAnim]);
```

**SkeletonPulse-specific adaptation:** Replace `scale` with `translateX`; gate loop start on `containerWidth !== null` for the `width='100%'` case:
```typescript
const translateX = useRef(new Animated.Value(0)).current;
const [measuredWidth, setMeasuredWidth] = useState<number | null>(
  typeof width === 'number' ? width : null
);
const containerWidth = typeof width === 'number' ? width : measuredWidth;

useEffect(() => {
  if (containerWidth === null) return;       // wait for onLayout
  translateX.setValue(-containerWidth);

  const loop = Animated.loop(
    Animated.timing(translateX, {
      toValue: containerWidth,
      duration: ANIMATION.duration.verySlow,  // 1200ms — from token
      easing: ANIMATION.easing.decelerate(),  // lazy function — call with ()
      useNativeDriver: true,
      isInteraction: false,
    })
  );
  loop.start();
  return () => loop.stop();
}, [containerWidth, translateX]);
```

**LinearGradient pattern — from `src/components/home/RadarBubble.tsx` lines 245–251:**
```typescript
<LinearGradient
  colors={gradientColors as [string, string]}
  start={{ x: 0.5, y: 0.5 }}
  end={{ x: 1, y: 1 }}
  style={[StyleSheet.absoluteFill, { borderRadius: targetSize / 2 }]}
/>
```

**SkeletonPulse adaptation — horizontal sweep (left→right):**
```typescript
<LinearGradient
  colors={['transparent', colors.surface.overlay, 'transparent']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={StyleSheet.absoluteFill}
/>
```

**Container style pattern — must include `overflow: 'hidden'` (no analog in existing code; this is a SkeletonPulse requirement):**
```typescript
container: {
  width,
  height,
  borderRadius: RADII.sm,            // D-03: always RADII.sm, no prop
  backgroundColor: colors.surface.card,
  overflow: 'hidden',                // clips gradient at rectangle boundary
},
```

**onLayout pattern for `width='100%'`:**
```typescript
function handleLayout(e: LayoutChangeEvent) {
  if (typeof width !== 'number') {
    setMeasuredWidth(e.nativeEvent.layout.width);
  }
}

<View style={styles.container} onLayout={handleLayout} accessibilityLabel="Loading">
  {containerWidth !== null && (
    <Animated.View
      style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
    >
      <LinearGradient ... />
    </Animated.View>
  )}
</View>
```

**Gate the gradient render on `containerWidth !== null`** — prevents a visible glitch frame when `width='100%'` and layout hasn't fired yet.

---

### `tests/unit/animationTokens.test.ts` (test, pure assertion)

**Analog:** `tests/unit/birthdayFormatters.test.ts` (lines 1–49)

**File header pattern (lines 1–3):**
```typescript
// Unit tests for animation.ts — run via: npx tsx tests/unit/animationTokens.test.ts
import assert from 'node:assert/strict';
import { ANIMATION } from '../../src/theme/animation';
```

**Runner pattern (lines 8–21):**
```typescript
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    if (err instanceof Error) console.error(`    ${err.message}`);
    failed++;
  }
}
```

**Exit pattern (lines 47–49):**
```typescript
console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

**Test cases to write for POLISH-02:**
```typescript
// Duration shape
test('ANIMATION.duration.fast is 200', () => assert.equal(ANIMATION.duration.fast, 200));
test('ANIMATION.duration.normal is 300', () => assert.equal(ANIMATION.duration.normal, 300));
test('ANIMATION.duration.slow is 700', () => assert.equal(ANIMATION.duration.slow, 700));
test('ANIMATION.duration.verySlow is 1200', () => assert.equal(ANIMATION.duration.verySlow, 1200));

// Easing: lazy functions return a value (not undefined)
test('standard easing is a function', () => assert.equal(typeof ANIMATION.easing.standard, 'function'));
test('decelerate easing is a function', () => assert.equal(typeof ANIMATION.easing.decelerate, 'function'));
test('accelerate easing is a function', () => assert.equal(typeof ANIMATION.easing.accelerate, 'function'));
test('standard() returns a value (not undefined)', () => assert.notEqual(ANIMATION.easing.standard(), undefined));

// Spring config shape
test('spring has damping', () => assert.equal(ANIMATION.easing.spring.damping, 15));
test('spring has stiffness', () => assert.equal(ANIMATION.easing.spring.stiffness, 120));
```

---

## Shared Patterns

### Theme Token Access
**Source:** `src/components/common/EmptyState.tsx` lines 24, 55; `src/components/common/PrimaryButton.tsx` lines 18–35
**Apply to:** `SkeletonPulse.tsx`
```typescript
const { colors } = useTheme();
const styles = useMemo(() => StyleSheet.create({ ... }), [colors]);
```
Rebuild styles only when `colors` changes (theme switch). Never construct StyleSheet outside of `useMemo` in a themed component.

### Token-Only Styles (ESLint enforcement)
**Source:** Project ESLint rule `campfire/no-hardcoded-styles` — error severity
**Apply to:** `SkeletonPulse.tsx`

| Value type | Use token | Never write |
|---|---|---|
| Border radius | `RADII.sm` | `6`, `borderRadius: 6` |
| Colors | `colors.surface.card`, `colors.surface.overlay` | any hex or rgba literal |
| Spacing (if used) | `SPACING.*` | raw pixel numbers |

Exception pattern seen in `EmptyState.tsx` line 33:
```typescript
// eslint-disable-next-line campfire/no-hardcoded-styles
fontSize: 48, // no exact token — emoji display size
```
Only use this escape hatch for values with no semantic token. SkeletonPulse has no such values — all values have tokens.

### Native-Thread Animation
**Source:** `src/components/home/RadarBubble.tsx` lines 60–65 (PulseRing)
**Apply to:** `SkeletonPulse.tsx`
```typescript
useNativeDriver: true,   // transform.translateX is native-eligible
isInteraction: false,    // prevents InteractionManager starvation during loops
```
`useNativeDriver: true` is valid for `transform` (translateX, scale, opacity) but NOT for layout props (`width`, `height`). SkeletonPulse animates `translateX` on `Animated.View` — valid. Container dimensions are static style props — no conflict.

### Barrel Export Convention
**Source:** `src/theme/index.ts` lines 1–8
**Apply to:** `src/theme/index.ts` (the one-line addition)

Every theme token is exported as a single named export line. Order: DARK, LIGHT, ThemeProvider, SPACING, fonts, RADII, SHADOWS, then ANIMATION (new, last).

---

## No Analog Found

All files in this phase have close analogs. No entries.

---

## Colors Referenced

For implementer reference — actual token values verified from source files:

| Token | Dark mode | Light mode | Use in SkeletonPulse |
|---|---|---|---|
| `colors.surface.card` | `#1D2027` | `#FFFFFF` | skeleton rectangle background |
| `colors.surface.overlay` | `rgba(255,255,255,0.08)` (`#ffffff14`) | `rgba(0,0,0,0.06)` | shimmer highlight band |

**Open question from RESEARCH.md (A1):** Light mode `overlay` is `rgba(0,0,0,0.06)` — only 6% opacity against white. If the shimmer appears invisible in light mode during testing, the implementer may increase opacity slightly. Document with an inline comment if overriding.

---

## Metadata

**Analog search scope:** `src/theme/`, `src/components/common/`, `src/components/home/`, `tests/unit/`
**Files read:** 10 source files
**Pattern extraction date:** 2026-05-05
