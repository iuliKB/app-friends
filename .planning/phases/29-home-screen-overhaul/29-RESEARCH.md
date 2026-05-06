# Phase 29: Home Screen Overhaul - Research

**Researched:** 2026-05-06
**Domain:** React Native — visual component surgery on existing Home screen (radar bubbles, event cards, empty state, view-mode persistence)
**Confidence:** HIGH

---

## Summary

Phase 29 is a targeted visual overhaul of an already-functional Home screen. Every component that needs changing already exists — no new components need to be created from scratch. The work is additive decoration and parameter updates on a stable codebase.

The highest-risk change is the DEAD bubble greyscale treatment in `RadarBubble.tsx`. React Native has no `filter: grayscale()` CSS equivalent, so the UI-SPEC specifies a surface overlay technique: a `View` covering the `AvatarCircle` with `backgroundColor: colors.surface.base` at `opacity: 0.55` and matching `borderRadius`. The planner must understand this constraint when writing the implementation action. The current code applies `opacity: 0.5` to DEAD bubbles — D-01 changes this to `0.38`, which also requires removing the `Pressable` wrapper for that branch.

The `UpcomingEventsSection` currently has no loading state — `useUpcomingEvents` returns `[]` synchronously from `usePlansStore` (the store is populated by `usePlans()` called in `HomeScreen`). D-09 adds skeleton cards during loading. To implement this, `useUpcomingEvents` needs to expose a loading signal, or `UpcomingEventsSection` needs to receive `isLoading` from `HomeScreen` via the `usePlans()` hook. This dependency chain requires careful planning.

**Primary recommendation:** Plan five independent waves — (1) DEAD bubble visual treatment, (2) EmptyState CTA + OnboardingHintSheet removal, (3) EventCard resize + date pill, (4) UpcomingEventsSection skeleton + FlatList dimensions, (5) HOME-06 verification + unit test. Each wave touches a different file with no cross-file dependencies, enabling parallel or sequential execution with minimal merge conflict risk.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Radar Freshness (HOME-05)**
- D-01: DEAD friends render greyscale + ~40% opacity in-place within the radar scatter — no position change, same bubble size. No pulse ring. Desaturate using a greyscale filter or by removing the status gradient entirely.
- D-02: DEAD bubbles are non-interactive — no tap/long-press response. No action sheet, no DM entry point.
- D-03: FADING treatment stays as-is — amber PulseRing variant, same size as ALIVE. No additional dimming needed.
- D-04: ALIVE treatment stays as-is — green PulseRing, status gradient overlay.

**View Mode Persistence (HOME-06)**
- D-05: `useViewPreference.ts` already persists to AsyncStorage (`campfire:home_view`) — this requirement is functionally complete. Plan should verify the behavior and add a unit test, not implement it from scratch.

**Zero-Friends CTA (HOME-07)**
- D-06: Update the existing `EmptyState` component render — change copy to "Invite your crew" (heading) / "Add friends to see who's free and make plans" (body). CTA label: "Invite friends".
- D-07: CTA routes directly to the Add Friend screen (not the Squad tab root).
- D-08: Retire the `OnboardingHintSheet` — remove its render and the `@campfire/onboarding_hint_shown` AsyncStorage flag check from `HomeScreen.tsx`.

**Events Section Polish (HOME-08)**
- D-09: Add a loading skeleton: show 2–3 shimmer placeholder cards (using existing `SkeletonPulse` component) while plans are loading. No more silent wait.
- D-10: Increase `EventCard` size from 200×140px to 240×160px. Update both the card dimensions and the `FlatList` explicit height in `UpcomingEventsSection`.
- D-11: Add a date pill anchored top-left on the card — small colored pill showing formatted date (e.g. "Thu May 8"). Date leads the card, visually more prominent than the title.
- D-12: Larger participant avatars — increase from 24px to 28–30px, show up to 4–5 avatars, add a count chip for overflow (e.g. "+2").

**Design Approach**
- D-13: Run `/gsd-ui-phase 29` using the `/ui-ux-pro-max` plugin to generate `UI-SPEC.md` before planning. (Already done — `29-UI-SPEC.md` exists and is the authoritative design contract.)

### Claude's Discretion
- Date pill color token: use `colors.interactive.accent` or a muted surface — Claude picks what fits the light/dark theme.
- Exact greyscale/opacity values for DEAD bubbles: Claude picks within the spirit of ~40% opacity and full desaturation.
- Skeleton card shape: Claude reuses `SkeletonPulse` in a layout that mirrors the new 240×160px card proportions.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOME-05 | Radar bubbles clearly distinguish ALIVE, FADING (dimmed), and DEAD (visually distinct) friend statuses at a glance without requiring user interaction | DEAD greyscale overlay technique verified in codebase; current `opacity: 0.5` confirmed at `RadarBubble.tsx:164` |
| HOME-06 | User's last-used view mode (Radar vs Cards) is saved to AsyncStorage and restored on next app launch | `useViewPreference.ts` verified — reads on mount, writes on every `setView()` call via `campfire:home_view` key. Implementation complete; only test needed |
| HOME-07 | User with zero friends sees a prominent "Invite friends" CTA that routes to the Add Friend flow | `EmptyState` component verified with correct prop surface (`icon`, `iconType`, `heading`, `body`, `ctaLabel`, `onCta`). Current render at `HomeScreen.tsx:235` uses `people-outline` icon + wrong copy + Squad tab route. `OnboardingHintSheet` removal touches 4 code sites: import, `useState`, `useEffect`, and JSX render |
| HOME-08 | Upcoming events section has polished card layout with consistent visual hierarchy, date/time prominence, and participant avatars | `EventCard` current dimensions 200×140 confirmed at `EventCard.tsx:121-123`. `AvatarStack` current params `size={24} maxVisible={3}` confirmed at `EventCard.tsx:106`. `useUpcomingEvents` has no `isLoading` return value — requires loading signal solution |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DEAD bubble visual treatment | Client (RN component) | — | Pure render-time decision from `computeHeartbeatState()` — no server involvement |
| View mode persistence | Client (RN hook) | AsyncStorage | Already client-side; persistence is in the hook |
| Zero-friends CTA routing | Client (RN navigation) | — | `expo-router` push to `/friends/add` — no server call |
| Events skeleton loading | Client (RN component) | Zustand store | `usePlansStore` drives loading state; UI reads it |
| EventCard date pill | Client (RN component) | — | Purely visual decoration on existing `formatEventCardDate()` output |
| AvatarStack overflow chip | Client (RN component) | — | Already implemented in `AvatarStack.tsx` via `overflow > 0` branch with `+N` text |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` (Animated) | SDK 55 | DEAD bubble opacity + skeleton fade-out | Native driver for transform/opacity; non-native for width/height |
| `expo-linear-gradient` | existing | Status gradient on ALIVE bubbles | Already in `RadarBubble.tsx`; removed for DEAD branch |
| `@react-native-async-storage/async-storage` | existing | `useViewPreference` persistence | Already used; verified mock in `src/__mocks__/async-storage.js` |
| `expo-router` | existing | CTA navigation to `/friends/add` | Existing pattern — `router.push(...)` |

[VERIFIED: codebase grep]

**No new npm installs required for Phase 29.**

---

## Architecture Patterns

### System Architecture Diagram

```
usePlansStore (Zustand)
    ↓ plans[]
useUpcomingEvents() → filtered/sorted plans[]
    ↓
UpcomingEventsSection
    ├─ isLoading=true → [SkeletonPulse 240×160] [SkeletonPulse 240×160]
    └─ isLoading=false
           ├─ events=[] → placeholder card ("Plan something")
           └─ events>0 → FlatList<EventCard 240×160>
                              └─ date pill (top-left, absolute)
                              └─ AvatarStack size=28, maxVisible=5

HomeScreen
    ├─ friends=[] → EmptyState("Invite your crew", CTA→/friends/add)
    │               [OnboardingHintSheet REMOVED]
    └─ friends>0 → RadarView
                       └─ RadarBubble (per friend)
                              ├─ ALIVE → PulseRing(green) + LinearGradient + Pressable
                              ├─ FADING → PulseRing(amber) + Pressable, opacity=0.6
                              └─ DEAD → greyscale overlay View + no Pressable, opacity=0.38
```

### Recommended Project Structure (no changes — existing structure is used as-is)

```
src/
├── components/home/
│   ├── RadarBubble.tsx       # add DEAD branch (HOME-05)
│   ├── EventCard.tsx         # resize + date pill + avatar props (HOME-08)
│   └── UpcomingEventsSection.tsx  # skeleton + FlatList height (HOME-08)
├── screens/home/
│   └── HomeScreen.tsx        # EmptyState props + remove OnboardingHintSheet (HOME-07)
└── hooks/
    └── useViewPreference.ts  # verify only; unit test added (HOME-06)
```

### Pattern 1: DEAD Bubble Greyscale Overlay

**What:** React Native has no `filter: grayscale()`. Desaturation is simulated by layering an opaque surface-colored `View` over the avatar image at partial opacity.

**When to use:** Any status === 'dead' (checked via `computeHeartbeatState()`)

**Implementation approach (from UI-SPEC):**

```tsx
// Source: 29-UI-SPEC.md — DEAD bubble color treatment
// Outer Animated.View opacity: 0.38 (changed from current 0.5)
// Inside bubbleContainer: add absolutely-positioned View overlay
{heartbeatState === 'dead' && (
  <View
    style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surface.base,
      opacity: 0.55,
      borderRadius: targetSize / 2,
    }}
    pointerEvents="none"
  />
)}
```

The `LinearGradient` and `PulseRing` are simply NOT rendered for the DEAD branch (already controlled by `showGradient` flag and the existing FADING conditional — just exclude the `heartbeatState === 'fading'` branch for DEAD).

**The `Pressable` removal pattern:** The current component wraps the entire bubble in a single `Pressable`. For DEAD, the plan must restructure the JSX to conditionally render either a `Pressable` (ALIVE/FADING) or a plain `View` (DEAD). The greyscale overlay must be INSIDE the `Animated.View` at `bubbleContainer` level.

### Pattern 2: Loading Skeleton for Events

**What:** `useUpcomingEvents()` currently returns `PlanWithMembers[]` with no loading signal. It reads synchronously from `usePlansStore`. The store is populated by `usePlans()` which is called in `HomeScreen`. The loading state lives in `usePlans()`.

**Resolution options:**
- Option A (RECOMMENDED): Pass `isLoading` prop from `HomeScreen` to `UpcomingEventsSection`. `HomeScreen` already calls `usePlans()` — expose the `loading` boolean from that hook and thread it as a prop.
- Option B: Call `usePlansStore` loading selector inside `UpcomingEventsSection`. Cleaner isolation but requires checking if `usePlansStore` exposes a `loading` state.

The planner should verify which approach `usePlansStore` supports.

[ASSUMED] — usePlansStore may or may not expose a `loading` flag directly. Planner should read `src/stores/usePlansStore.ts` before committing to Option A vs B.

### Pattern 3: Date Pill on EventCard

**What:** Absolutely-positioned pill overlaid top-left of card.

**Key detail:** `EventCard` uses `TouchableOpacity` with an inner `Animated.View` for press scale. The pill must go INSIDE the `Animated.View` (so it scales with the card) but ABOVE the background layers. Position it as a sibling to the content layer, not inside `styles.content` (which is `justifyContent: flex-end`).

```tsx
// Source: 29-UI-SPEC.md — EventCard date pill
<View
  style={{
    position: 'absolute',
    top: SPACING.sm,    // 8px
    left: SPACING.sm,   // 8px
    backgroundColor: /* rgba(185,255,59,0.15) dark / rgba(77,124,0,0.12) light */,
    borderRadius: RADII.sm,
    paddingVertical: SPACING.xs,    // 4px
    paddingHorizontal: SPACING.sm,  // 8px
  }}
>
  <Text style={{ fontSize: FONT_SIZE.xs, color: colors.interactive.accent, lineHeight: 12 }}>
    {dateLabel}
  </Text>
</View>
```

The date pill background requires theme-aware rgba — use `isDark` from `useTheme()`.

### Pattern 4: SkeletonPulse Usage for Cards

**What:** `SkeletonPulse` accepts `width: number | '100%'` and `height: number`. It always uses `RADII.sm` (6px). For event card skeletons at 240×160px, the border radius mismatch with `RADII.xl` (16px) in EventCard is acceptable — skeletons are approximate placeholders, not pixel-perfect.

```tsx
// Source: src/components/common/SkeletonPulse.tsx verified
<View style={{ flexDirection: 'row', paddingLeft: SPACING.lg, gap: CARD_GAP }}>
  <SkeletonPulse width={240} height={160} />
  <SkeletonPulse width={240} height={160} />
</View>
```

The fade-out when data arrives uses `Animated.timing` on an opacity value (0.38–300ms per UI-SPEC), wrapping the skeleton row in an `Animated.View`.

### Anti-Patterns to Avoid

- **Restructuring RadarBubble layout for DEAD:** Keep the `outerWrapper → Animated.View → {Pressable|View} → bubbleContainer` structure. Do not move the name label or reorder the outer `Animated.View`.
- **Using `SkeletonPulse` with `width='100%'` for card skeletons:** Use explicit `width={240}` — the cards have fixed widths and '100%' in a horizontal FlatList context would measure wrong.
- **Removing `opacity: 0.9` from the existing date text in EventCard:** The existing date is at 0.9 opacity. The new date PILL is a separate element and does not use opacity — its prominence comes from the pill background. Do not modify the existing date text; it may be removed or kept (UI-SPEC makes the pill the primary date display — planner should verify whether the old inline date text is retired).
- **Calling `router.push('/(tabs)/squad')` for the CTA:** D-07 requires `/friends/add`, not the Squad tab root. These are different routes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Greyscale filter | Custom shader / tintColor workaround | Surface overlay `View` at opacity 0.55 | React Native `Image.tintColor` only works on single-color images; avatar photos need a different approach |
| Shimmer animation | Custom `Animated.loop` in UpcomingEventsSection | `SkeletonPulse` component | Already implemented with native driver, loop cleanup, and `colors.surface.overlay` shimmer |
| Overflow avatar count | Custom "+N" badge component | `AvatarStack` already has `overflow > 0` chip | `AvatarStack.tsx:54-64` already renders `+{overflow}` when `members.length > maxVisible` |
| AsyncStorage test mock | Custom mock | `src/__mocks__/async-storage.js` | Already set up with `jest.fn()` for getItem/setItem — used in `jest.config.js` `moduleNameMapper` |

---

## Common Pitfalls

### Pitfall 1: Pressable/View structural change in RadarBubble
**What goes wrong:** The entire render tree is currently `Animated.View > Pressable > Animated.View(bubbleContainer)`. Removing `Pressable` for DEAD branch by conditionally rendering a `View` instead requires the greyscale overlay to be inside `bubbleContainer`, not wrapping it. If the overlay is placed outside `bubbleContainer`, it clips incorrectly around the name label.
**Why it happens:** Misreading the nesting — the name label is a SIBLING of the `Pressable`/`View`, not a child.
**How to avoid:** Keep the name `Text` as the second child of `outerWrapper`, outside the interactive element. Only the avatar portion changes structure.
**Warning signs:** Name label disappears or gets incorrectly grayed out.

### Pitfall 2: FlatList height not updated to match new CARD_HEIGHT
**What goes wrong:** `UpcomingEventsSection` has `height: 140` hardcoded in `styles.flatList`. If `EventCard` is updated to 160px but the FlatList height stays at 140, the cards are clipped at the bottom.
**Why it happens:** The constant is not named `CARD_HEIGHT` — it's an inline style value. Easy to miss.
**How to avoid:** Update both `CARD_WIDTH = 240` constant AND the `styles.flatList.height = 160` in the same wave/plan. Also update the placeholder card dimensions from `200×140` to `240×160`.
**Warning signs:** EventCard bottom content (avatars, date pill) clipped in horizontal scroll.

### Pitfall 3: snapToInterval out of sync after CARD_WIDTH change
**What goes wrong:** `snapToInterval={CARD_WIDTH + CARD_GAP}` uses the `CARD_WIDTH` constant. If `CARD_WIDTH` is updated, `snapToInterval` updates automatically. But the placeholder card in the empty state also has `width: 200, height: 140` hardcoded in `styles.placeholderCard` — these are NOT using the `CARD_WIDTH` constant and must be updated separately.
**Why it happens:** The constant is only used in the FlatList branch; the empty state branch has raw numbers.
**How to avoid:** Update `styles.placeholderCard` dimensions as part of the same D-10 task.

### Pitfall 4: OnboardingHintSheet removal leaves orphaned state
**What goes wrong:** `HomeScreen.tsx` has 4 code sites for `OnboardingHintSheet`: (1) import line 22, (2) `ONBOARDING_FLAG_KEY` constant line 56, (3) `onboardingVisible` useState line 57, (4) `handleOnboardingDismiss` function lines 72-75, (5) useEffect lines 61-70, (6) JSX render lines 259-262. Missing any of these leaves TypeScript errors or dead code.
**Why it happens:** The removal spans import + state + effect + JSX — all in one file but easy to miss the useEffect.
**How to avoid:** Grep for `onboarding` in `HomeScreen.tsx` before marking task complete — expect 0 matches after removal.
**Warning signs:** TypeScript error on unused import; ESLint warning on unused state variable.

### Pitfall 5: useUpcomingEvents loading signal gap
**What goes wrong:** `useUpcomingEvents` returns only `PlanWithMembers[]` — no loading flag. Rendering a skeleton requires knowing when `usePlans()` is still fetching. If the skeleton is shown based on `plans.length === 0`, it will incorrectly show the skeleton when the user genuinely has no upcoming plans.
**Why it happens:** Empty array is ambiguous — it could mean "loading" or "no data".
**How to avoid:** Thread the `loading` boolean from `usePlans()` in `HomeScreen` down to `UpcomingEventsSection` as a prop, OR check `usePlansStore` for a loading selector. Do not infer loading from empty array.
**Warning signs:** Skeleton appears permanently for users with no upcoming events.

### Pitfall 6: Date pill on pastel cards vs. image cards
**What goes wrong:** The date pill uses `colors.interactive.accent` text (neon green in dark mode, dark green in light mode). On pastel-colored cards WITHOUT a cover image, the text color is `'#1a1a1a'` (dark). The pill background uses the accent color at 15% opacity. In light mode on a pastel card, the pill may have insufficient contrast between neon/dark-green pill text and the light pastel background behind the pill.
**Why it happens:** The accent color system was designed against dark surfaces.
**How to avoid:** Apply pill as specified in UI-SPEC (accent at 15% opacity background + full accent text) — the pill's own background provides the contrast surface, not the card background.
**Warning signs:** Pill text is illegible on yellow (`#FDE68A`) or light blue (`#93C5FD`) pastel cards.

---

## Code Examples

### Verified current state: DEAD opacity (to be changed)

```tsx
// Source: src/components/home/RadarBubble.tsx:163-164 [VERIFIED: codebase read]
if (heartbeatState === 'dead') {
  baseOpacity = 0.5;  // D-01 changes this to 0.38
```

### Verified current state: EmptyState usage (to be updated)

```tsx
// Source: src/screens/home/HomeScreen.tsx:235-245 [VERIFIED: codebase read]
<EmptyState
  icon="people-outline"
  iconType="ionicons"
  heading="No friends yet"
  body="Add a friend to see where they're at and make plans."
  ctaLabel="Add a friend"
  onCta={handleNavigateToSquad}  // wrong: navigates to /(tabs)/squad
/>
// D-06/D-07: change to icon="👥", iconType="emoji", heading="Invite your crew",
// body="Add friends to see who's free and make plans", ctaLabel="Invite friends",
// onCta={() => router.push('/friends/add')
```

### Verified: AvatarStack already has overflow chip

```tsx
// Source: src/components/plans/AvatarStack.tsx:54-64 [VERIFIED: codebase read]
{overflow > 0 && (
  <View style={[styles.overflowBadge, { width: size, height: size, ... }]}>
    <Text style={styles.overflowText}>+{overflow}</Text>
  </View>
)}
// D-12 only requires increasing size prop from 24→28 and maxVisible from 3→5
```

### Verified: useViewPreference persistence

```tsx
// Source: src/hooks/useViewPreference.ts [VERIFIED: codebase read]
// getItem on mount → setViewState if 'radar'|'cards'
// setView → setViewState + AsyncStorage.setItem
// Storage key: 'campfire:home_view'
// Default: 'radar'
// HOME-06 is already implemented. Plan task: write unit test only.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DEAD bubbles at opacity 0.5 | DEAD at 0.38 + greyscale overlay | Phase 29 (D-01) | Clearer DEAD vs. FADING distinction |
| EventCard 200×140px | 240×160px | Phase 29 (D-10) | More content visible; date pill fits |
| AvatarStack size=24, maxVisible=3 | size=28, maxVisible=5 | Phase 29 (D-12) | Already implemented in AvatarStack; just update props |
| OnboardingHintSheet (one-time sheet) | Retired — EmptyState CTA replaces it | Phase 29 (D-08) | Reduces first-run friction; consistent with Phase 33 Welcome flow |

**Deprecated/outdated in this phase:**
- `OnboardingHintSheet` render in `HomeScreen`: replaced by updated `EmptyState` props
- `@campfire/onboarding_hint_shown` AsyncStorage flag: no longer read or written in HomeScreen (Note: the key `@campfire/welcome_complete` from Phase 33 is a separate concern — not the same key)
- `baseOpacity = 0.5` for DEAD in `RadarBubble`: replaced by `0.38`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `usePlansStore` may or may not expose a `loading` flag directly | Architecture Patterns (Pattern 2) | If no `loading` flag, Option A (prop threading) is required — planner must choose approach after reading `src/stores/usePlansStore.ts` |
| A2 | The route `/friends/add` exists as a valid expo-router route | Common Pitfalls (Pitfall 4), Code Examples | If the route is different, the navigation target must be corrected |

---

## Open Questions

1. **Loading signal for UpcomingEventsSection skeleton (D-09)**
   - What we know: `useUpcomingEvents` returns only `PlanWithMembers[]`. `usePlans()` in `HomeScreen` has a `loading` flag.
   - What's unclear: Does `usePlansStore` expose a `loading` selector? If yes, `UpcomingEventsSection` can self-contain the skeleton. If no, the loading prop must be threaded from `HomeScreen`.
   - Recommendation: Planner reads `src/stores/usePlansStore.ts` before writing the Plan 04 action.

2. **Route for "Invite friends" CTA (D-07)**
   - What we know: D-07 says "Add Friend screen (`/friends/add`)". Current code navigates to `/(tabs)/squad`.
   - What's unclear: Whether `/friends/add` is a valid registered expo-router route.
   - Recommendation: Planner verifies by grepping `app/` for `friends/add` route file.

3. **Existing date text in EventCard after adding date pill (D-11)**
   - What we know: `EventCard` currently renders a `dateLabel` text element inside `styles.content`. The UI-SPEC adds a date pill at the top of the card.
   - What's unclear: Whether the existing inline date text should be removed (to avoid duplicate date display) or kept (as secondary context below the title).
   - Recommendation: UI-SPEC describes the pill as providing date prominence — the inline date below the title appears redundant. Planner should remove it as part of D-11, keeping only the top-left pill.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all changes are code/config within existing React Native project, no new CLI tools, databases, or services required)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.x + jest-expo |
| Config file | `/Users/iulian/Develop/campfire/jest.config.js` |
| Quick run command | `npx jest --testPathPattern="src/components/home\|src/hooks" --no-coverage` |
| Full suite command | `npx jest --testMatch="**/src/**/__tests__/**/*.test.[jt]s?(x)" --no-coverage` |

**Note on test location:** Jest config uses `testMatch: ['<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)']`. All new Phase 29 tests must be placed under `src/components/home/__tests__/` or `src/hooks/__tests__/` to be picked up. The `tests/unit/` directory uses `npx tsx` directly (not Jest) — new tests for this phase go in `src/`, not `tests/unit/`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-05 | DEAD bubble: opacity=0.38, no Pressable, no PulseRing, no gradient | unit | `npx jest --testPathPattern="RadarBubble" --no-coverage` | ❌ Wave 0 |
| HOME-06 | useViewPreference: reads on mount, writes on setView, survives mock-kill | unit | `npx jest --testPathPattern="useViewPreference" --no-coverage` | ❌ Wave 0 |
| HOME-07 | EmptyState renders "Invite your crew" + routes to /friends/add | unit | `npx jest --testPathPattern="HomeScreen" --no-coverage` | ❌ Wave 0 (smoke test via manual verify) |
| HOME-08 | EventCard: width=240, height=160, date pill present, AvatarStack size=28 | unit | `npx jest --testPathPattern="EventCard" --no-coverage` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="<modified-component>" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage` (full src suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/home/__tests__/RadarBubble.dead.test.tsx` — covers HOME-05 (DEAD visual properties)
- [ ] `src/hooks/__tests__/useViewPreference.test.ts` — covers HOME-06 (AsyncStorage read/write)
- [ ] `src/components/home/__tests__/EventCard.phase29.test.tsx` — covers HOME-08 (dimensions + date pill presence)
- [ ] `src/__mocks__/async-storage.js` exists — no install needed

*(No new framework install needed — jest-expo already configured)*

---

## Security Domain

This phase makes no changes to authentication, session management, data persistence of sensitive data, or network requests. All changes are purely visual:
- `RadarBubble`: render-only — no new data access
- `EmptyState`: routing change only — no auth impact
- `EventCard` / `UpcomingEventsSection`: display-only changes on already-fetched data
- `useViewPreference`: stores a non-sensitive UI preference string

**ASVS categories that apply:**
- V5 Input Validation: not applicable (no user input in this phase)
- All other ASVS categories: not applicable

No security-relevant changes in Phase 29.

---

## Sources

### Primary (HIGH confidence)
- `src/components/home/RadarBubble.tsx` — current DEAD opacity, PulseRing logic, Pressable structure [VERIFIED: codebase read]
- `src/screens/home/HomeScreen.tsx` — OnboardingHintSheet sites (4 locations), EmptyState props, crossfade logic [VERIFIED: codebase read]
- `src/components/home/UpcomingEventsSection.tsx` — current CARD_WIDTH=200, flatList height=140, placeholder card dimensions [VERIFIED: codebase read]
- `src/components/home/EventCard.tsx` — current dimensions 200×140, AvatarStack props size=24 maxVisible=3 [VERIFIED: codebase read]
- `src/hooks/useViewPreference.ts` — persistence implementation, STORAGE_KEY, default value [VERIFIED: codebase read]
- `src/components/common/SkeletonPulse.tsx` — prop surface (width, height only), RADII.sm fixed, animation pattern [VERIFIED: codebase read]
- `src/components/common/EmptyState.tsx` — prop surface (icon, iconType, heading, body, ctaLabel, onCta) [VERIFIED: codebase read]
- `src/components/plans/AvatarStack.tsx` — overflow chip already implemented, current default size=28, maxVisible=5 [VERIFIED: codebase read]
- `src/hooks/useUpcomingEvents.ts` — no loading return value, synchronous filter from usePlansStore [VERIFIED: codebase read]
- `.planning/phases/29-home-screen-overhaul/29-UI-SPEC.md` — authoritative design contract for all visual decisions [VERIFIED: file read]
- `jest.config.js` — testMatch pattern `src/**/__tests__/**/*.test.[jt]s?(x)`, moduleNameMapper for mocks [VERIFIED: codebase read]

### Secondary (MEDIUM confidence)
- `src/lib/heartbeat.ts` — `computeHeartbeatState()` signature and return values confirmed [VERIFIED: codebase read]
- `src/__mocks__/async-storage.js` — mock available for useViewPreference unit test [VERIFIED: codebase read]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed; verified via codebase
- Architecture: HIGH — all component files read directly; data flow confirmed
- Pitfalls: HIGH — identified from actual current code (specific line numbers cited)
- Test infrastructure: HIGH — jest.config.js read directly; mock files confirmed present

**Research date:** 2026-05-06
**Valid until:** 2026-06-05 (stable codebase — 30 days)
