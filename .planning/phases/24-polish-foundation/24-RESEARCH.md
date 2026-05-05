# Phase 24: Polish Foundation - Research

**Researched:** 2026-05-05
**Domain:** React Native animation primitives, theme infrastructure, shared UI component verification
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** SkeletonPulse uses gradient shimmer sweep — bright band traveling left-to-right over muted surface. Implemented with `expo-linear-gradient` (already installed) + `Animated.loop` + `Animated.timing` on a `translateX` value with `useNativeDriver: true`.
- **D-02:** Simple rectangle component. Props: `width` (number | `'100%'`) and `height` (number). Callers compose multiple rectangles inside a `View`. No children/wrapper API.
- **D-03:** Corners always use `RADII.sm` — no `borderRadius` prop exposed.
- **D-04:** Component lives at `src/components/common/SkeletonPulse.tsx`.
- **D-05:** `src/theme/animation.ts` exports `ANIMATION` const with `duration: { fast: 200, normal: 300, slow: 700, verySlow: 1200 }`.
- **D-06:** Easing presets are lazy functions (avoid import-time side effects): `standard`, `decelerate`, `accelerate` as `() => Easing.*`, and `spring: { damping: 15, stiffness: 120 }` for Reanimated `withSpring`.
- **D-07:** `ANIMATION` barrel-exported from `src/theme/index.ts`.
- **D-08:** Existing hardcoded `duration:` values in components are NOT migrated in Phase 24 — scope creep. Later phases migrate as they touch those files.
- **D-09:** EmptyState already satisfies POLISH-03 — verification task only, no code changes.
- **D-10:** PrimaryButton already satisfies POLISH-04 — verification task only, no code changes.

### Claude's Discretion
- Shimmer band width, speed, and exact gradient highlight color values — pick values that look natural against `colors.surface.elevated` in both light and dark theme.
- Whether `useNativeDriver: true` on a `translateX` transform vs. interpolated position — select the approach that stays on the native thread.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLISH-01 | User sees SkeletonPulse shimmer placeholders on any screen while data is loading | D-01 through D-04 define the component fully. `expo-linear-gradient` verified installed. Animation pattern verified from RadarBubble.tsx. |
| POLISH-02 | Animation durations and easing values defined as `src/theme/` tokens | D-05 through D-08 define the token file. Theme barrel pattern verified from `src/theme/index.ts`. |
| POLISH-03 | EmptyState supports optional CTA button | Verified: `ctaLabel?` + `onCta?` props already implemented; renders `PrimaryButton`. Verification task only. |
| POLISH-04 | PrimaryButton shows inline spinner during async operation | Verified: `loading?` prop already implemented; renders `ActivityIndicator` and disables button. Verification task only. |

</phase_requirements>

---

## Summary

Phase 24 is an infrastructure phase delivering two net-new artifacts and verifying two pre-existing components. The two net-new artifacts are `src/theme/animation.ts` (animation tokens) and `src/components/common/SkeletonPulse.tsx` (shimmer component). Both artifacts are fully specified by locked decisions and the approved UI-SPEC — there is no design ambiguity for the planner to resolve.

POLISH-03 and POLISH-04 are already satisfied. Code reading confirms `EmptyState` has `ctaLabel?`/`onCta?` props that render `PrimaryButton`, and `PrimaryButton` has a `loading?` prop that renders `ActivityIndicator` and disables the button. These requirements need verification tasks only — no implementation.

The shimmer animation pattern is directly modeled on `RadarBubble.tsx`'s `PulseRing`: `Animated.loop` + `Animated.timing` + `useNativeDriver: true` on a transform. This is a well-established, native-thread-safe pattern already in the codebase. The planner can reference PulseRing as the implementation template and treat it as a HIGH-confidence pattern.

**Primary recommendation:** Create `animation.ts` first (Wave 1), then `SkeletonPulse.tsx` referencing `ANIMATION` tokens (Wave 2), then verification tasks for POLISH-03 and POLISH-04 (Wave 3). All deliverables are small, self-contained, and carry no integration risk.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Animation token definitions | Theme layer (`src/theme/`) | — | Pure constants; no runtime logic; belongs in theme alongside spacing, radii, colors |
| SkeletonPulse shimmer animation | Client (React Native, UI thread) | — | `useNativeDriver: true` means the animation runs entirely on the native UI thread |
| SkeletonPulse layout measurement | Client (React Native `onLayout`) | — | `width='100%'` case requires a runtime measurement to compute translateX range |
| EmptyState CTA rendering | Client (React Native component) | — | Already implemented; renders PrimaryButton conditionally based on props |
| PrimaryButton loading state | Client (React Native component) | — | Already implemented; `ActivityIndicator` replaces label text; button disabled |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-linear-gradient` | ~55.0.13 | Shimmer band gradient in SkeletonPulse | Already in project (RadarBubble uses it); Expo-native, no extra config |
| `react-native` `Animated` | 0.83.6 | Loop animation driver for shimmer translateX | Native thread-safe via `useNativeDriver: true`; same pattern as PulseRing |
| `react-native-reanimated` | 4.2.1 | `withSpring` config target in `ANIMATION.easing.spring` | Already in project; `spring` token is data only (no Reanimated import in animation.ts) |

[VERIFIED: package.json — all three confirmed installed at stated versions]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Easing` (from `react-native`) | bundled | Easing functions for ANIMATION token lazy functions | Required in `animation.ts` for `standard`, `decelerate`, `accelerate` presets |

### No New Dependencies

**Installation:** No new packages needed. All required libraries are already installed.
[VERIFIED: package.json — confirmed no missing dependencies]

---

## Architecture Patterns

### System Architecture Diagram

```
POLISH-02: animation.ts (theme layer)
  └─ ANIMATION const (durations + easing presets)
       │
       ▼
POLISH-01: SkeletonPulse.tsx (common component)
  ├─ imports ANIMATION.duration.verySlow → animation duration
  ├─ imports ANIMATION.easing.decelerate → easing function
  ├─ imports RADII.sm → borderRadius
  ├─ imports useTheme() → colors.surface.card (base) + colors.surface.overlay (shimmer)
  ├─ uses Animated.loop + Animated.timing → translateX on native thread
  └─ uses LinearGradient → ['transparent', colors.surface.overlay, 'transparent']

POLISH-03: EmptyState.tsx (existing, no change)
  └─ ctaLabel? + onCta? → PrimaryButton (conditional render) ✓ already satisfies req

POLISH-04: PrimaryButton.tsx (existing, no change)
  └─ loading? → ActivityIndicator + disabled=true ✓ already satisfies req

src/theme/index.ts (barrel)
  └─ export { ANIMATION } from './animation'   ← single line addition
```

### Recommended Project Structure

```
src/
├── theme/
│   ├── animation.ts        # NEW — ANIMATION const (POLISH-02)
│   └── index.ts            # ADD: export { ANIMATION } from './animation'
└── components/
    └── common/
        └── SkeletonPulse.tsx  # NEW (POLISH-01)
```

### Pattern 1: Animation Token File Structure

**What:** A single `const` object with semantic duration names and easing lazy functions, matching the style of other theme token files (`spacing.ts`, `radii.ts`).

**When to use:** Any time a component needs an animation duration or easing curve — import from here instead of using raw numbers.

**Example:**
```typescript
// src/theme/animation.ts
// Source: CONTEXT.md D-05, D-06 (locked decisions) + UI-SPEC.md §Animation Tokens
import { Easing } from 'react-native';

export const ANIMATION = {
  duration: {
    fast: 200,      // quick UI responses, haptic confirms
    normal: 300,    // state transitions, reveals
    slow: 700,      // emphasis animations, status pulses
    verySlow: 1200, // looping ambient animations (radar pulse, skeleton shimmer)
  },
  easing: {
    standard: () => Easing.inOut(Easing.ease),  // balanced — state transitions
    decelerate: () => Easing.out(Easing.ease),  // fast-in, slow-out — content arriving
    accelerate: () => Easing.in(Easing.ease),   // slow-in, fast-out — content leaving
    spring: { damping: 15, stiffness: 120 },    // Reanimated withSpring config
  },
} as const;
```

**Why lazy functions for easing:** Calling `Easing.*` at module load time can trigger side effects before the React Native Animated module is fully initialized. Wrapping in `() =>` defers the call to render time — consistent with how RadarBubble.tsx calls `Easing.out(Easing.ease)` inline inside `Animated.timing`.

[VERIFIED: RadarBubble.tsx — confirmed inline easing call pattern; CONTEXT.md D-06 specifies lazy function requirement]

### Pattern 2: SkeletonPulse — Native-Thread Shimmer

**What:** A looping `translateX` animation driving a `LinearGradient` across a muted rectangle. `useNativeDriver: true` keeps all frames on the native UI thread, zero JS-thread cost during scroll.

**When to use:** Any screen that fetches remote data and needs to show placeholder content while loading.

**Example:**
```typescript
// src/components/common/SkeletonPulse.tsx
// Source: UI-SPEC.md §SkeletonPulse + RadarBubble.tsx PulseRing (codebase reference)
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, RADII } from '@/theme';
import { ANIMATION } from '@/theme';

interface SkeletonPulseProps {
  width: number | '100%';
  height: number;
}

export function SkeletonPulse({ width, height }: SkeletonPulseProps) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(-1)).current;
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(
    typeof width === 'number' ? width : null
  );

  const containerWidth = typeof width === 'number' ? width : measuredWidth;

  useEffect(() => {
    if (containerWidth === null) return;
    translateX.setValue(-containerWidth);

    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: containerWidth,
        duration: ANIMATION.duration.verySlow,
        easing: ANIMATION.easing.decelerate(),
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [containerWidth, translateX]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      width,
      height,
      borderRadius: RADII.sm,
      backgroundColor: colors.surface.card,
      overflow: 'hidden',
    },
  }), [colors, width, height]);

  function handleLayout(e: LayoutChangeEvent) {
    if (typeof width === '100%') {
      setMeasuredWidth(e.nativeEvent.layout.width);
    }
  }

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      accessibilityLabel="Loading"
    >
      {containerWidth !== null && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX }] },
          ]}
        >
          <LinearGradient
            colors={['transparent', colors.surface.overlay, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}
```

**Key implementation notes:**
1. The `overflow: 'hidden'` on the container clips the gradient as it sweeps. Without this, the shimmer band would be visible outside the rectangle boundaries.
2. When `width='100%'`, the component waits for `onLayout` before starting the animation. The gradient is not rendered until `containerWidth` is known — avoids a frame with translateX at its initial `-1` value.
3. `isInteraction: false` — same as PulseRing in RadarBubble — ensures this never blocks gesture detection or FlatList rendering.
4. `useNativeDriver: true` on `transform.translateX` is valid; native driver supports transform but not layout props (width/height). The container dimensions are static props, so there is no conflict.

[VERIFIED: RadarBubble.tsx PulseRing (codebase) — `Animated.loop` + `useNativeDriver: true` + `isInteraction: false` confirmed as established pattern]

### Pattern 3: Barrel Export Addition

**What:** A single-line addition to `src/theme/index.ts` to expose the new animation token.

**Example:**
```typescript
// Add to src/theme/index.ts
export { ANIMATION } from './animation';
```

Matches the pattern of every other theme token export in the file. [VERIFIED: src/theme/index.ts — confirmed barrel export style]

### Anti-Patterns to Avoid

- **Raw duration numbers in new components:** Any component introduced in Phase 24 that uses `Animated.timing` must reference `ANIMATION.duration.*`, not a raw number. `ESLint no-hardcoded-styles` does not catch numeric durations (only colors/sizes/radii), so this requires manual discipline.
- **`useNativeDriver: false` for the shimmer:** `translateX` on a transform is a native-thread-eligible property. Using `useNativeDriver: false` would force the animation onto the JS thread and cause jank during scroll. Always `true` for transform-based animations.
- **Pre-evaluating easing at module load:** `const e = Easing.out(Easing.ease)` at the top of `animation.ts` is an anti-pattern. Use `() => Easing.out(Easing.ease)` per D-06.
- **Migrating existing hardcoded durations:** D-08 explicitly locks this out of scope. Do not touch `RadarBubble.tsx`, `MessageBubble.tsx`, etc. to replace their raw numbers with `ANIMATION.duration.*` tokens in this phase.
- **Rendering gradient before layout is measured:** If `width='100%'` and the container hasn't measured yet, rendering a `LinearGradient` with translateX at its start value creates a visual glitch. Gate the gradient render on `containerWidth !== null`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Horizontal gradient sweep | Custom painted canvas, SVG, or width animation | `expo-linear-gradient` with translateX | Already installed; hardware-accelerated; correct gradient interpolation |
| Animation loop with cleanup | Manual `setTimeout`/`setInterval` restart | `Animated.loop` with cleanup in `useEffect` return | Handles loop restart, interruption, and cleanup automatically |
| Theme-aware colors in component | Hardcoded hex values | `useTheme()` + `colors.*` tokens | ESLint error if hardcoded; `useTheme` resolves light/dark automatically |

**Key insight:** In React Native, the combination of `Animated.loop` + `useNativeDriver: true` on a transform is the gold standard for continuous UI-thread animations. Any custom approach that touches the JS thread will degrade scroll performance.

---

## Common Pitfalls

### Pitfall 1: `overflow: 'hidden'` Omitted from Container

**What goes wrong:** The shimmer gradient band is visible outside the skeleton rectangle as it sweeps — it bleeds into adjacent UI.
**Why it happens:** React Native views do not clip children by default.
**How to avoid:** Always include `overflow: 'hidden'` on the `SkeletonPulse` container view.
**Warning signs:** During development, you see the gradient briefly visible outside the rectangle boundaries.

### Pitfall 2: Animation Starts Before `onLayout` Fires (for `width='100%'`)

**What goes wrong:** The shimmer starts at translateX `-1` instead of `-containerWidth`, so the first loop iteration has the band positioned incorrectly.
**Why it happens:** `onLayout` fires asynchronously after the first render — the `useEffect` fires first.
**How to avoid:** Gate the loop start on `containerWidth !== null`. The `useEffect` already does this with `if (containerWidth === null) return`. Also gate the gradient render on `containerWidth !== null`.
**Warning signs:** A brief visible gradient band at the wrong position on first render.

### Pitfall 3: Missing `isInteraction: false`

**What goes wrong:** The continuous shimmer animation tells React Native's interaction manager that an "interaction" is always in progress. This can delay `InteractionManager.runAfterInteractions` callbacks used elsewhere in the app (e.g., navigation transitions).
**Why it happens:** `Animated.timing` defaults to `isInteraction: true`.
**How to avoid:** Always include `isInteraction: false` in the timing config — same as PulseRing in RadarBubble.tsx.
**Warning signs:** Navigation transitions feel sluggish when skeleton screens are visible.

### Pitfall 4: ESLint `no-hardcoded-styles` on Non-Color Values

**What goes wrong:** `borderRadius: 6` (the RADII.sm value) written directly instead of `RADII.sm` triggers a lint error and blocks CI.
**Why it happens:** The rule catches hardcoded style values including borderRadius.
**How to avoid:** Use `RADII.sm` (already imported) for the container's `borderRadius`. Never write the literal value.
**Warning signs:** ESLint error: `campfire/no-hardcoded-styles`.

### Pitfall 5: Easing Functions Called at Module Load

**What goes wrong:** `export const ANIMATION = { easing: { standard: Easing.inOut(Easing.ease) } }` evaluates `Easing.inOut` when the module is first imported — before Animated is fully initialized in some environments.
**Why it happens:** Module-level evaluation runs during `import` resolution.
**How to avoid:** Wrap easing values in `() =>` arrow functions per D-06. The caller invokes `ANIMATION.easing.standard()` at render time.
**Warning signs:** Crash or undefined behavior on startup in test environments.

---

## Code Examples

### Adding the Barrel Export

```typescript
// src/theme/index.ts — add this line alongside existing exports
// Source: src/theme/index.ts (verified pattern)
export { ANIMATION } from './animation';
```

### Verified Loop Cleanup Pattern (from RadarBubble.tsx)

```typescript
// Source: src/components/home/RadarBubble.tsx PulseRing (codebase)
useEffect(() => {
  const loop = Animated.loop(
    Animated.timing(animValue, {
      toValue: targetValue,
      duration: 1200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
      isInteraction: false,
    })
  );
  loop.start();
  return () => loop.stop();  // cleanup on unmount
}, [animValue]);
```

### Verifying EmptyState CTA (POLISH-03)

```typescript
// src/components/common/EmptyState.tsx — existing, verified
// Source: codebase read (line 66-70)
{ctaLabel && onCta && (
  <View style={styles.ctaWrapper}>
    <PrimaryButton title={ctaLabel} onPress={onCta} />
  </View>
)}
```

POLISH-03 is satisfied: both `ctaLabel` and `onCta` are required for the button to render — prevents a button with no action.

### Verifying PrimaryButton Spinner (POLISH-04)

```typescript
// src/components/common/PrimaryButton.tsx — existing, verified
// Source: codebase read (lines 38-50)
<TouchableOpacity
  style={[styles.button, (loading || disabled) && styles.disabled]}
  onPress={onPress}
  disabled={loading || disabled}  // prevents double-tap
  activeOpacity={0.8}
>
  {loading ? (
    <ActivityIndicator color={colors.surface.base} />
  ) : (
    <Text style={styles.text}>{title}</Text>
  )}
</TouchableOpacity>
```

POLISH-04 is satisfied: `loading=true` shows `ActivityIndicator`, hides label, applies opacity 0.5 via `styles.disabled`, and sets `disabled={true}`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded duration literals (`duration: 300`) | `ANIMATION.duration.normal` token | Phase 24 (this phase) | New components must use tokens; existing components migrated by later phases per D-08 |
| No skeleton feedback (blank white/dark screen) | `SkeletonPulse` shimmer rectangles | Phase 24 (this phase) | Perceived performance improvement; data-fetching screens no longer flash blank |

**Deprecated/outdated:**
- `LoadingIndicator` (full-screen spinner): Not deprecated, but is a peer to `SkeletonPulse`, not a replacement. `LoadingIndicator` handles full-screen blocking loads; `SkeletonPulse` handles in-place content placeholders.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `colors.surface.overlay` reads as a visible "shine" against `colors.surface.card` in light mode (`rgba(0,0,0,0.06)` on `#FFFFFF`) | Code Examples / SkeletonPulse | Shimmer invisible in light mode; fix by using a higher-opacity overlay or a different token |

[ASSUMED] The shimmer highlight value (`colors.surface.overlay`) producing a readable shine against `colors.surface.card` in light mode. Values are `rgba(0,0,0,0.06)` on `#FFFFFF` — very subtle. The UI-SPEC approves this combination, but actual visual result depends on device display characteristics. Low risk: the token is specified in the approved UI-SPEC; if too subtle, a subsequent phase can tune the gradient stops.

All other claims are VERIFIED from codebase reading or CITED from locked CONTEXT.md decisions.

---

## Open Questions

1. **Shimmer visibility in light mode**
   - What we know: `colors.surface.overlay` in light mode is `rgba(0,0,0,0.06)` on a `#FFFFFF` base. This is specified in the approved UI-SPEC as the shimmer highlight.
   - What's unclear: Whether 6% black opacity reads as a noticeable "shine" on a real device screen (vs. simulator). The UI-SPEC author approved it, but a visual check during implementation is warranted.
   - Recommendation: Implement as specified. If the shimmer appears invisible in light mode during testing, increase the overlay opacity slightly (stay within `colors.surface.overlay` semantics or add a one-off local constant with an ESLint inline disable comment).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `expo-linear-gradient` | SkeletonPulse shimmer | ✓ | ~55.0.13 | — |
| `react-native` `Animated` | SkeletonPulse loop animation | ✓ | bundled with 0.83.6 | — |
| `react-native-reanimated` | `ANIMATION.easing.spring` config (data only) | ✓ | 4.2.1 | — |
| `Easing` (react-native) | `animation.ts` easing functions | ✓ | bundled | — |

[VERIFIED: package.json — all confirmed installed]

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js `assert` + `npx tsx` (no jest/vitest — project uses custom runner) |
| Config file | none — tests run directly via `npx tsx tests/unit/<file>.test.ts` |
| Quick run command | `npx tsx tests/unit/<file>.test.ts` |
| Full suite command | `for f in tests/unit/*.test.ts; do npx tsx "$f"; done` |

[VERIFIED: tests/unit/birthdayFormatters.test.ts, tests/unit/useChatRoom.imageUpload.test.ts — confirmed `npx tsx` runner pattern with `node:assert/strict`]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POLISH-01 | SkeletonPulse renders without crash; animation cleanup fires on unmount | unit (pure logic — animation values) | `npx tsx tests/unit/skeletonPulse.test.ts` | ❌ Wave 0 |
| POLISH-02 | ANIMATION token object has correct shape and values; easing lazy functions return Easing instances | unit | `npx tsx tests/unit/animationTokens.test.ts` | ❌ Wave 0 |
| POLISH-03 | EmptyState renders PrimaryButton when ctaLabel + onCta both provided; no button when either absent | unit (prop behavior) | `npx tsx tests/unit/emptyStateCta.test.ts` | ❌ Wave 0 |
| POLISH-04 | PrimaryButton renders ActivityIndicator and is disabled when loading=true | unit (prop behavior) | `npx tsx tests/unit/primaryButtonLoading.test.ts` | ❌ Wave 0 |

**Note on component testing:** The project's `npx tsx` unit runner tests pure functions and state logic, not React rendering. POLISH-01 (animation cleanup) and POLISH-03/POLISH-04 (prop behavior) require either React Testing Library or snapshot verification. Given the project pattern, the simplest approach is:
- For POLISH-02: pure object/function shape assertion — fully testable with `npx tsx`.
- For POLISH-01, POLISH-03, POLISH-04: smoke tests that import the modules and verify exported types are correct, plus a manual visual verification note (consistent with the project's hardware-gate deferral pattern).

### Sampling Rate

- **Per task commit:** `npx tsx tests/unit/animationTokens.test.ts` (POLISH-02, the only purely testable unit)
- **Per wave merge:** `for f in tests/unit/*.test.ts; do npx tsx "$f"; done`
- **Phase gate:** Full suite green before `/gsd-verify-work`; visual verification of SkeletonPulse on simulator

### Wave 0 Gaps

- [ ] `tests/unit/animationTokens.test.ts` — covers POLISH-02 shape/value assertions
- [ ] Visual verification of `SkeletonPulse` shimmer in simulator (manual, both light and dark mode)
- [ ] Manual check of `EmptyState` ctaLabel prop rendering in simulator (POLISH-03)
- [ ] Manual check of `PrimaryButton` loading prop behavior in simulator (POLISH-04)

---

## Security Domain

This phase introduces no authentication, session management, user input, data persistence, cryptography, or external API calls. All deliverables are pure UI/animation primitives and theme constants.

**ASVS categories applicable:** None — this is a client-side UI infrastructure phase with no security-relevant data flows.

**Known threat patterns:** Not applicable.

---

## Sources

### Primary (HIGH confidence)
- `src/components/home/RadarBubble.tsx` (codebase) — PulseRing animation pattern: `Animated.loop` + `useNativeDriver: true` + `isInteraction: false`
- `src/components/common/EmptyState.tsx` (codebase) — POLISH-03 verification: `ctaLabel?` + `onCta?` props confirmed
- `src/components/common/PrimaryButton.tsx` (codebase) — POLISH-04 verification: `loading?` prop confirmed
- `src/theme/index.ts` (codebase) — Barrel export pattern confirmed
- `src/theme/colors.ts` + `src/theme/light-colors.ts` (codebase) — `colors.surface.card` and `colors.surface.overlay` values confirmed
- `src/theme/radii.ts` (codebase) — `RADII.sm = 6` confirmed
- `.planning/phases/24-polish-foundation/24-CONTEXT.md` — All locked decisions (D-01 through D-10)
- `.planning/phases/24-polish-foundation/24-UI-SPEC.md` — Component contracts, color contract, interaction contract (status: approved)
- `package.json` (codebase) — All dependency versions verified

### Secondary (MEDIUM confidence)
- `tests/unit/*.test.ts` (codebase) — Confirmed `npx tsx` runner pattern for unit tests

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json; no new dependencies needed
- Architecture: HIGH — animation pattern directly verified from existing codebase (RadarBubble); UI-SPEC approved
- Pitfalls: HIGH — derived from direct code reading of the implementation pattern and React Native Animated behavior

**Research date:** 2026-05-05
**Valid until:** 2026-06-04 (stable — React Native Animated API and expo-linear-gradient are stable APIs)
