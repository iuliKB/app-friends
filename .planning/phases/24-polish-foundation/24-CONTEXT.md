# Phase 24: Polish Foundation - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the shared UI primitives that every other v1.7 polish phase (25–27) builds on:
- SkeletonPulse shimmer component (POLISH-01)
- Animation tokens in src/theme/ (POLISH-02)
- Verify EmptyState CTA already satisfies POLISH-03 (no new code)
- Verify PrimaryButton spinner already satisfies POLISH-04 (no new code)

This phase delivers infrastructure only. No screen-level polish happens here.

</domain>

<decisions>
## Implementation Decisions

### SkeletonPulse — Visual Style
- **D-01:** Use a **gradient shimmer sweep** — a bright band traveling left-to-right across a muted surface. Implemented with `expo-linear-gradient` (already in project) and a looping `Animated.timing` on a translateX value.

### SkeletonPulse — Component API
- **D-02:** Simple rectangle component. Callers pass `width` (number or `'100%'`) and `height` (number). To build skeleton layouts, callers compose multiple `<SkeletonPulse>` rectangles inside a `View`. No children/wrapper API.
- **D-03:** Corners are always rounded using `RADII.sm` from theme tokens. No `borderRadius` prop exposed to callers.
- **D-04:** Component lives at `src/components/common/SkeletonPulse.tsx` alongside other shared primitives.

### Animation Tokens
- **D-05:** Add `src/theme/animation.ts` exporting an `ANIMATION` const with semantic duration names:
  - `fast: 200` — quick UI responses, haptic confirms
  - `normal: 300` — state transitions, reveals
  - `slow: 700` — emphasis animations, status pulses
  - `verySlow: 1200` — looping ambient animations (radar pulse)
- **D-06:** Also export easing presets as lazy functions (avoids import-time side effects):
  ```ts
  easing: {
    standard: () => Easing.inOut(Easing.ease),
    decelerate: () => Easing.out(Easing.ease),
    accelerate: () => Easing.in(Easing.ease),
    spring: { damping: 15, stiffness: 120 }, // for Reanimated withSpring
  }
  ```
- **D-07:** Export `ANIMATION` from `src/theme/index.ts` barrel alongside existing token exports.
- **D-08:** Existing hardcoded animation `duration:` values in components are **not** migrated in Phase 24 — that would be scope creep. Later phases can migrate as they touch those files.

### POLISH-03 & POLISH-04 — Pre-Done Verification
- **D-09:** `EmptyState` already implements the CTA variant via `ctaLabel` + `onCta` props that render a `PrimaryButton`. Plan includes a verification task only — no code changes.
- **D-10:** `PrimaryButton` already implements the loading spinner via `loading` prop that shows `ActivityIndicator` and disables the button. Plan includes a verification task only — no code changes.

### Claude's Discretion
- Shimmer band width, speed (animation duration), and exact color values for the gradient highlights — Claude picks values that look natural against `colors.surface.elevated` in both light and dark theme.
- Whether SkeletonPulse uses `useNativeDriver: true` on a translateX transform (preferred for performance) vs. an interpolated position — Claude selects the approach that stays on the native thread.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §POLISH-01–POLISH-04 — The four requirements this phase covers

### Existing Shared Components (read before adding new ones)
- `src/components/common/EmptyState.tsx` — Already has CTA support; verify satisfies POLISH-03
- `src/components/common/PrimaryButton.tsx` — Already has loading spinner; verify satisfies POLISH-04
- `src/components/common/LoadingIndicator.tsx` — Existing loading primitive; SkeletonPulse is a peer, not a replacement

### Theme Infrastructure
- `src/theme/index.ts` — Barrel export; ANIMATION must be added here
- `src/theme/radii.ts` — Use RADII.sm for SkeletonPulse corner radius
- `src/theme/colors.ts` / `src/theme/light-colors.ts` — Use `colors.surface.elevated` (or similar) for skeleton base color

### Animation Patterns (read for consistency)
- `src/components/home/RadarBubble.tsx` — PulseRing uses `Animated.loop` + `useNativeDriver: true`; shimmer should follow same approach

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `expo-linear-gradient`: Already installed (RadarBubble imports it). SkeletonPulse shimmer can use it directly.
- `RADII` from `@/theme`: Use `RADII.sm` for skeleton corner radius.
- `useTheme()` + `useMemo([colors])` pattern: Mandatory for all new components. SkeletonPulse must follow this.
- `Animated` from `react-native`: Used in RadarBubble, MessageBubble, GroupParticipantsSheet. Shimmer should use `Animated.loop` + `useNativeDriver: true` (transform translateX).

### Established Patterns
- All common components live in `src/components/common/` and use `useTheme()` + `useMemo([colors])`.
- Theme tokens exported from `src/theme/index.ts` barrel. New `animation.ts` must be added to this barrel.
- Animation with native driver: RadarBubble PulseRing uses `Animated.timing` with `useNativeDriver: true` on scale/opacity transforms. Shimmer translateX should follow the same approach.
- ESLint `no-hardcoded-styles` rule at error severity — all color, size, and radius values must use tokens.

### Integration Points
- `src/theme/index.ts` — Add `export { ANIMATION } from './animation'`
- `src/components/common/` — Drop `SkeletonPulse.tsx` here
- All future polish phases (25–27) will import `SkeletonPulse` from `@/components/common` and `ANIMATION` from `@/theme`

</code_context>

<specifics>
## Specific Ideas

- The shimmer's gradient should use three color stops: `[transparent, colors.surface.elevated lightened, transparent]` — the exact highlight color is Claude's discretion as long as it reads as a "shine" in both light and dark mode.
- No existing shimmer or skeleton component in the codebase — this is a net-new addition.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-polish-foundation*
*Context gathered: 2026-05-05*
