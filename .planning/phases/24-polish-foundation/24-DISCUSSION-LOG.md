# Phase 24: Polish Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 24-polish-foundation
**Areas discussed:** SkeletonPulse visual style, SkeletonPulse API shape, Animation token structure, POLISH-03 & 04 pre-done scope

---

## SkeletonPulse visual style

| Option | Description | Selected |
|--------|-------------|----------|
| Gradient shimmer sweep | Bright band sweeps left-to-right. Uses expo-linear-gradient (already in project). Industry standard (Facebook/Twitter). More visually polished. | ✓ |
| Opacity pulse | Entire placeholder fades in/out continuously. Simpler, native Animated.loop, no gradient needed. Less visually distinct. | |

**User's choice:** Gradient shimmer sweep
**Notes:** expo-linear-gradient is already in the project via RadarBubble, so no new dependency.

---

## SkeletonPulse API shape

| Option | Description | Selected |
|--------|-------------|----------|
| Simple rectangle | Callers pass width + height. Stack multiple SkeletonPulse in a View for complex layouts. Tiny, single-purpose component. | ✓ |
| Composable wrapper | SkeletonPulse accepts children on top of shimmer overlay. More expressive but higher API surface. | |

**User's choice:** Simple rectangle (width + height props)
**Notes:** Follow-up — corners always rounded using RADII.sm (no caller control of radius).

## Corner rounding follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Always rounded, fixed RADII.sm | Natural for both line and card skeletons. No per-call decision. | ✓ |
| Caller controls rounding | borderRadius prop accepted. More flexible. | |
| No rounding | Sharp rectangle. Looks harsh for text-line skeletons. | |

**User's choice:** Always rounded with RADII.sm

---

## Animation token structure

### Duration naming

| Option | Description | Selected |
|--------|-------------|----------|
| Semantic names (fast/normal/slow/verySlow) | Maps to codebase values: 200/300/700/1200ms. Easy to reason about. | ✓ |
| Numeric scale (200/250/300/...) | Explicit, no abstraction, but loses semantic meaning. | |

**User's choice:** Semantic names

### Easing exports

| Option | Description | Selected |
|--------|-------------|----------|
| Export easing presets too | ANIMATION.easing.standard, decelerate, accelerate, spring. Ensures system-consistent feel across phases 25–27. | ✓ |
| Durations only | Simpler, easing left as runtime Easing calls in each component. | |

**User's choice:** Export easing presets as lazy functions

---

## POLISH-03 & 04 pre-done scope

| Option | Description | Selected |
|--------|-------------|----------|
| Verify-only, no code changes | Confirm existing implementations satisfy requirements. Mark as met. | ✓ |
| Extend with enhancements | Add variant/size options beyond requirements. | |
| Skip entirely | Don't mention in plan — risks requirements remaining unchecked. | |

**User's choice:** Verify-only
**Notes:** EmptyState already has ctaLabel + onCta → PrimaryButton. PrimaryButton already has loading → ActivityIndicator + disabled. Both satisfy their requirements as written.

---

## Claude's Discretion

- Shimmer band width, animation speed, and exact gradient highlight colors
- Whether SkeletonPulse uses useNativeDriver: true on translateX transform (preferred) vs interpolated position

## Deferred Ideas

None.
