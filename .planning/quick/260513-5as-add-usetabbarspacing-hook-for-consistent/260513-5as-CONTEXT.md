# Quick Task 260513-5as: Add useTabBarSpacing hook for consistent bottom-nav clearance across tab screens - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Task Boundary

Multiple tab screens (profile, squad, plans) have content overflowing under the floating bottom navigation bar because they don't reserve enough bottom space. The home screen uses `paddingBottom: insets.bottom + 100` and feels correct on every device — this is the target. Centralize the formula in a reusable hook, then apply it to all tab screens (including home, for consistency and single-source-of-truth).

</domain>

<decisions>
## Implementation Decisions

### Hook design
- Create `useTabBarSpacing()` hook in `src/hooks/useTabBarSpacing.ts` (project convention — see existing `usePendingRequestsCount.ts`, `useInvitationCount.ts`).
- The hook composes three inputs:
  1. `useSafeAreaInsets()` → device chrome (notch/home indicator)
  2. `useNavigationStore((s) => s.currentSurface)` → whether the floating tab bar is rendered (only on `'tabs'` surface)
  3. `TAB_BAR_HEIGHT` + `TAB_BAR_BOTTOM_GAP` constants imported from `@/components/common/CustomTabBar` (single source of truth — already exported)
- Formula:
  - When `currentSurface === 'tabs'` (bar visible): `insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + BREATHING_ROOM` = `insets.bottom + 64 + 12 + 24` = `insets.bottom + 100`
  - When `currentSurface !== 'tabs'` (bar hidden): `insets.bottom`
- This produces the **identical** numeric output as the current HomeScreen magic number (`insets.bottom + 100`) when the bar is visible — guaranteeing zero visual regression on home.

### Breathing room
- Use `+24` px above the bar's bottom edge — matches HomeScreen's current "feel" exactly (user confirmed "homescreen is the ideal amount").
- Define `BREATHING_ROOM = 24` as a constant inside the hook file (not exported — internal to the hook). Rationale: it's a visual-tuning knob, not a shared spec.

### Application surface (which screens get the hook)
- **Apply to ALL four tab screens** (user confirmed: "refactor it as well"):
  1. Home screen (`src/screens/home/HomeScreen.tsx:203`) — replace `insets.bottom + 100` with the hook. Identical pixel output.
  2. Squad screen (`src/app/(tabs)/squad.tsx`) — replace `insets.bottom + SPACING.xxl` (too small) with the hook. Also handle the inner Activity tab's nested ScrollView (line ~475).
  3. Plans screen (`src/app/(tabs)/plans.tsx:82`) — replace hardcoded `100` (no safe-area awareness) with the hook.
  4. Profile screen (`src/app/(tabs)/profile.tsx:455`) — currently has NO bottom padding; add the hook.

### Application mechanism (where the value is applied)
- ScrollView screens: pass `paddingBottom: useTabBarSpacing()` into the existing `contentContainerStyle`.
- FlatList screens (plans.tsx): pass via the FlatList's `contentContainerStyle`.
- Do NOT add empty spacer Views. Always use `contentContainerStyle.paddingBottom`. This avoids regressions with `RefreshControl`, `keyboardShouldPersistTaps`, and accessibility scroll math.

### Claude's Discretion
- **Hook return type:** return a single `number` (the paddingBottom value). Simpler than returning an object with multiple fields; no current callers need anything else.
- **Memoization:** rely on RN's safe-area inset memoization + Zustand selector equality. No `useMemo` needed inside the hook for a primitive value.
- **Constants import:** the existing `TAB_BAR_HEIGHT` / `TAB_BAR_BOTTOM_GAP` exports in `CustomTabBar.tsx` stay where they are — single source of truth. Don't duplicate them.
- **Test coverage:** at minimum a unit test that asserts the formula for both surface states. Optional integration test if the project already has RN testing infrastructure (planner to verify).

</decisions>

<specifics>
## Specific Ideas

### Reference: HomeScreen current implementation (src/screens/home/HomeScreen.tsx:203)
```tsx
contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
```
This is the visual target. The hook must produce the same numeric value when surface === 'tabs'.

### Reference: CustomTabBar constants (src/components/common/CustomTabBar.tsx:9-10)
```ts
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM_GAP = 12;
```
Already exported. Hook must import these — must NOT duplicate the numbers.

### Reference: useNavigationStore (src/stores/useNavigationStore.ts)
Exposes `currentSurface: NavigationSurface` where `NavigationSurface = 'tabs' | 'chat' | 'plan' | 'modal' | 'auth'`. Hook should use a selector: `useNavigationStore((s) => s.currentSurface)` to avoid re-renders on unrelated state changes.

### Reference: Existing similar hook (src/components/common/CustomTabBar.tsx — partial PlansListScreen usage)
`PlansListScreen` already imports the constants:
```tsx
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP } from '@/components/common/CustomTabBar';
const bottomSafe = insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP;
```
This is the closest existing pattern. The new hook formalizes and centralizes it (plus adds the surface check and breathing room).

</specifics>

<canonical_refs>
## Canonical References

- HomeScreen ScrollView: `src/screens/home/HomeScreen.tsx:201-211`
- CustomTabBar constants: `src/components/common/CustomTabBar.tsx:9-10`
- Navigation store: `src/stores/useNavigationStore.ts`
- Project hook directory: `src/hooks/` (location for new `useTabBarSpacing.ts`)
- Squad inner ScrollView: `src/app/(tabs)/squad.tsx` (around line 475 — Activity tab nested scroll)
- Plans FlatList: `src/app/(tabs)/plans.tsx:82`
- Profile ScrollView: `src/app/(tabs)/profile.tsx:455`

</canonical_refs>
