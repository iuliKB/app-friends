# Phase 27: Plans & Squad Polish — Research

**Researched:** 2026-05-05
**Domain:** React Native animation (Animated API), expo-haptics, UI polish patterns
**Confidence:** HIGH

---

## Summary

Phase 27 is a pure polish phase — no new routes, data models, or external libraries. Every change
targets one of eight named requirements (PLANS-01 through PLANS-04, SQUAD-01 through SQUAD-04) that
add skeleton loading, spring animations, haptic feedback, and an empty-state overlay to the Plans
and Squad screens.

All required primitives already exist in the codebase from Phase 24 (`SkeletonPulse`, `ANIMATION`
tokens) and Phase 26 (spring press pattern, fire-and-forget haptic idiom). The implementation work
is primarily wiring these primitives into new call sites, not building anything net-new.

The most structurally complex task is PLANS-02 (RSVP spring bounce), which requires wrapping three
`TouchableOpacity` elements with `Animated.createAnimatedComponent` and maintaining three separate
`Animated.Value` instances. All other tasks are one- to five-line changes to existing files.

One discrepancy was found between CONTEXT.md and the live `squad.tsx` source: the existing
`AnimatedCard` wrapper already animates *both* opacity AND translateY (16 → 0), but D-16 states
"opacity-only". The decision for SQUAD-03 is a token replacement only (`80` → `ANIMATION.duration.staggerDelay`),
so the translateY behaviour is pre-existing and should be left in place.

**Primary recommendation:** Implement in four logical waves: (1) token addition, (2) single-line
fixes, (3) standalone new components, (4) the RSVP animation refactor.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Plans List Skeleton (PLANS-01)**
- D-01: Skeleton card shape: image placeholder block (~140px tall) at top + title bar + two metadata lines. Mirrors full PlanCard shape to minimise layout shift on reveal.
- D-02: Show 3 skeleton cards while loading.
- D-03: Skeleton condition: `loading && plans.length === 0` — same pattern as Phase 26.
- D-04: Skeletons appear in the My Plans tab only; Invitations tab has no skeleton.

**RSVP Spring Animation & Haptic (PLANS-02)**
- D-05: Only the tapped button bounces — overshoot sequence 1.0 → 0.92 → 1.05 → 1.0. Untapped buttons stay at 1.0.
- D-06: Haptic on RSVP tap: `Haptics.selectionAsync()` — fire before animation.

**Plan Creation Haptic (PLANS-03)**
- D-07: Fire `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` after plan is successfully created, before navigation away. Fire-and-forget with `.catch(() => {})`.

**Explore Map Empty State (PLANS-04)**
- D-08: Centered card overlay on top of the map — map tiles remain visible.
- D-09: Card content: map/location icon, "No plans nearby", "None of your friends have plans within 25km." Standard theme surface card.
- D-10: Trigger: plans loaded AND `visiblePlans.length === 0`.

**Friend Request Haptics (SQUAD-01)**
- D-11: Accept: `Haptics.notificationAsync(NotificationFeedbackType.Success)`.
- D-12: Reject: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`.
- D-13: Both fire in `FriendRequests.tsx` after the async call succeeds. Fire-and-forget.

**IOU Settle Haptic Fix (SQUAD-02)**
- D-14: Change `useExpenseDetail.ts:174` from `impactAsync(Medium)` to `notificationAsync(Success)`.

**Squad Dashboard Stagger (SQUAD-03)**
- D-15: Add `staggerDelay: 80` to `ANIMATION.duration` in `src/theme/animation.ts`.
- D-16: Animation style: opacity-only (existing `AnimatedCard` wrapper). No translateY needed.
- D-17: `hasAnimated.current` guard stays — cards never re-animate on refresh or tab re-focus.

**Wish List Press Feedback (SQUAD-04)**
- D-18: Wrap WishListItem Claim/Unclaim `Pressable` with `Animated.spring` 1.0 → 0.96.
- D-19: Use `ANIMATION.easing.spring` (damping: 15, stiffness: 120), `useNativeDriver: true`.

### Claude's Discretion
- Exact SkeletonPulse sizing proportions within the PlanCard skeleton (read PlanCard.tsx and mirror faithfully).
- Exact copy for the map empty state one-liner.
- Where exactly in `PlanCreateModal.tsx` the success haptic fires (after modal dismisses or before).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLANS-01 | Plans list shows skeleton cards while plan data loads | SkeletonPulse already exists; `usePlans` exposes `loading` boolean; pattern matches Phase 26 skeleton |
| PLANS-02 | RSVP buttons have spring bounce animation and haptic feedback on press | `Animated.createAnimatedComponent(TouchableOpacity)` + 3 `Animated.Value` instances; `Haptics.selectionAsync()` established pattern |
| PLANS-03 | Successfully creating a plan triggers `notificationAsync(Success)` haptic | `PlanCreateModal.handleCreate()` has clear success branch at L138–165; haptic fires before `router.back()` |
| PLANS-04 | Explore map shows friendly empty state when no friend plans are nearby | `ExploreMapView` already computes `visiblePlans`; `StyleSheet.absoluteFill` overlay with `pointerEvents:'none'` keeps map interactive |
| SQUAD-01 | Accept friend request triggers success haptic; reject triggers medium impact | `FriendRequests.handleAccept` and `handleReject` have clear success branches; fire-and-forget idiom already used in codebase |
| SQUAD-02 | Settling an IOU triggers `notificationAsync(Success)` haptic | Single-line change at `useExpenseDetail.ts:174` — already uses `Haptics`, just wrong call |
| SQUAD-03 | Squad Dashboard cards stagger-animate in on load with 80ms delay | `Animated.stagger(80, ...)` already implemented; only replace raw `80` with `ANIMATION.duration.staggerDelay` token |
| SQUAD-04 | Claiming/unclaiming a wish list item has spring scale press feedback | `WishListItem.tsx` Pressable uses opacity-only; wrap in `Animated.View` + spring, remove opacity press style |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Skeleton loading state | Frontend (React Native) | — | Pure render-layer concern; driven by `usePlans().loading` |
| RSVP spring animation | Frontend (React Native) | — | Transform animation on native thread; no server involvement |
| Plan creation haptic | Frontend (React Native) | — | Fires after Supabase write resolves; fires in component, not hook |
| Map empty-state overlay | Frontend (React Native) | — | Conditional render inside `ExploreMapView`; uses already-computed `visiblePlans` |
| Friend request haptics | Frontend (React Native) | — | Fires in component handler after hook call resolves |
| IOU settle haptic fix | Frontend hook layer | — | Change is in `useExpenseDetail.ts` — hook composes the haptic after DB write |
| Squad stagger token | Theme layer | Frontend | `ANIMATION.duration` addition consumed by `squad.tsx` |
| WishListItem press feedback | Frontend (React Native) | — | Local `Animated.Value` + spring within component |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native `Animated` | built-in | spring / timing / stagger animations | Native driver eligible; established across Phase 26 |
| expo-haptics | installed | iOS/Android haptic feedback | Only haptic library in codebase; patterns established |
| `SkeletonPulse` | project | shimmer placeholder | Phase 24 output; used in Phase 26 |
| `ANIMATION` tokens | project | duration + easing constants | Phase 24 output; no raw ms values allowed |

No new packages to install. [VERIFIED: codebase grep — expo-haptics imported in useExpenseDetail.ts, squad.tsx imports Animated from react-native]

### Supporting

None required beyond existing codebase primitives.

### Alternatives Considered

None — all decisions are locked. This phase reuses established patterns exclusively.

---

## Architecture Patterns

### System Architecture Diagram

```
User interaction
      │
      ▼
Component handler (onPress / handleAccept / handleReject / settle)
      │
      ├─── Async operation (Supabase / state update)
      │         │
      │         └── on success ─── Haptics.X().catch(() => {})  [fire-and-forget]
      │
      └─── Animation trigger (Animated.spring / Animated.stagger)
                │
                └── native thread (useNativeDriver: true)
                        │
                        └── transform / opacity → UI update
```

For PLANS-01 (skeleton):
```
PlansListScreen render
      │
      ├── loading && plans.length === 0
      │         └── render 3 × PlanCardSkeleton
      │
      └── else
            └── render FlatList with PlanCard items
```

For PLANS-04 (map overlay):
```
ExploreMapView render
      │
      ├── isLoadingLocation === true → ActivityIndicator
      │
      └── else
            ├── MapView (always rendered)
            │
            └── (plans.length > 0 || plansLoaded) && visiblePlans.length === 0
                      └── StyleSheet.absoluteFill overlay (pointerEvents='none')
                                └── Card: icon + heading + body
```

### Recommended File Structure

No new files required. All changes are in-place edits to existing files, plus one new component:

```
src/
├── theme/
│   └── animation.ts          ← ADD staggerDelay: 80 to duration
├── components/
│   ├── plans/
│   │   ├── PlanCard.tsx       ← reference only (read to mirror skeleton shape)
│   │   ├── PlanCardSkeleton.tsx  ← NEW — skeleton placeholder (file-local or exported)
│   │   └── RSVPButtons.tsx    ← refactor TouchableOpacity → Animated wrapper
│   ├── maps/
│   │   └── ExploreMapView.tsx ← add absoluteFill overlay
│   └── squad/
│       └── WishListItem.tsx   ← replace Pressable with Animated wrapper
├── screens/
│   └── plans/
│       ├── PlansListScreen.tsx    ← wire PlanCardSkeleton (My Plans tab)
│       └── PlanCreateModal.tsx   ← add haptic in handleCreate success branch
├── screens/
│   └── friends/
│       └── FriendRequests.tsx    ← add haptics to handleAccept/handleDecline
├── hooks/
│   └── useExpenseDetail.ts       ← single-line haptic swap at line 174
└── app/(tabs)/
    └── squad.tsx                 ← replace raw 80 with ANIMATION.duration.staggerDelay
```

### Pattern 1: Skeleton Loading (Phase 26 established)

**What:** Render N skeleton placeholders when `loading && data.length === 0`. Pull-to-refresh keeps existing content and shows RefreshControl spinner instead.

**When to use:** Initial load only. Never on subsequent refreshes.

```typescript
// Source: Phase 26 established pattern (ChatListScreen.tsx, HomeScreen skeleton)
{loading && plans.length === 0
  ? Array.from({ length: 3 }).map((_, i) => <PlanCardSkeleton key={i} />)
  : <FlatList data={plans} ... />
}
```

The `PlanCardSkeleton` component mirrors `PlanCard.tsx` styles exactly:
- Outer: `backgroundColor: colors.surface.card`, `borderRadius: RADII.lg`, `borderWidth: 1`, `borderColor: colors.border`, `padding: SPACING.lg`
- Image block: `SkeletonPulse width="100%" height={140}` with `borderRadius: RADII.sm` (SkeletonPulse default)
- Title bar: `SkeletonPulse width="60%" height={20}` with `marginTop: SPACING.md`
- Meta line 1: `SkeletonPulse width="40%" height={14}` with `marginTop: SPACING.sm`
- Meta line 2: `SkeletonPulse width="30%" height={14}` with `marginTop: SPACING.xs`

**CONTEXT NOTE:** `PlanCard.tsx` does NOT have an image block in its current implementation (no image rendered — it shows title, timeLabel, location, rsvpSummary, AvatarStack). The UI-SPEC says to include a 140px image placeholder anyway — this mirrors the intended future shape of PlanCard, not its current state. Follow UI-SPEC D-01 as locked.

### Pattern 2: Spring Press Feedback (Phase 26 established)

**What:** Animate scale 1.0 → 0.96 on press-in, 1.0 on press-out using `Animated.spring`.

**When to use:** Tappable interactive elements (cards, claim buttons).

```typescript
// Source: Phase 26 HOME-04 pattern
const scaleAnim = useRef(new Animated.Value(1)).current;

const animatedPressable = Animated.createAnimatedComponent(Pressable);

<animatedPressable
  style={{ transform: [{ scale: scaleAnim }] }}
  onPressIn={() =>
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      ...ANIMATION.easing.spring,  // damping: 15, stiffness: 120
      useNativeDriver: true,
    }).start()
  }
  onPressOut={() =>
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      ...ANIMATION.easing.spring,
      useNativeDriver: true,
    }).start()
  }
>
```

### Pattern 3: RSVP Overshoot Bounce (PLANS-02 specific)

**What:** Overshoot sequence 1.0 → 0.92 → 1.05 → 1.0 on the tapped button. Three separate `Animated.Value` instances (one per button).

**When to use:** Confirmation animations that signal "selection registered" rather than simple press feedback.

Implementation approach — sequence of spring calls:
```typescript
// Source: CONTEXT.md D-05, UI-SPEC PLANS-02
const scaleAnims = useRef({
  going: new Animated.Value(1),
  maybe: new Animated.Value(1),
  out: new Animated.Value(1),
}).current;

function triggerBounce(value: RsvpValue) {
  const anim = scaleAnims[value];
  void Haptics.selectionAsync().catch(() => {});
  Animated.sequence([
    Animated.spring(anim, { toValue: 0.92, ...ANIMATION.easing.spring, useNativeDriver: true }),
    Animated.spring(anim, { toValue: 1.05, ...ANIMATION.easing.spring, useNativeDriver: true }),
    Animated.spring(anim, { toValue: 1.0,  ...ANIMATION.easing.spring, useNativeDriver: true }),
  ]).start();
}
```

The `TouchableOpacity` must be wrapped with `Animated.createAnimatedComponent`:
```typescript
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

<AnimatedTouchable
  style={[styles.button, ..., { transform: [{ scale: scaleAnims[value] }] }]}
  onPress={() => {
    if (savingRsvp !== null || disabled) return;
    triggerBounce(value);
    handlePress(value);
  }}
/>
```

**Alternative:** Use `Animated.spring` with `overshootClamping: false` (default) and a single spring call to 1.0 from 0.92 — the spring's natural overshoot would create the bounce. The explicit sequence is more predictable and matches the decided values exactly.

### Pattern 4: Fire-and-Forget Haptics (Phase 26 established)

**What:** Always `void Haptics.X().catch(() => {})`. Never `await` haptics in event handlers.

**When to use:** All haptic calls throughout codebase.

```typescript
// Source: Phase 26 established pattern (SendBar.tsx, Phase 26 decisions)
void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
void Haptics.selectionAsync().catch(() => {});
```

### Pattern 5: Absolute-Fill Map Overlay (PLANS-04)

**What:** A card centered over the map using `StyleSheet.absoluteFill` + `pointerEvents='none'` so the map remains fully interactive underneath.

```typescript
// Source: UI-SPEC PLANS-04
{(plans.length > 0 || plansLoaded) && visiblePlans.length === 0 && (
  <View
    style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
    pointerEvents="none"
  >
    <View style={styles.emptyCard}>
      <Ionicons name="map-outline" size={32} color={colors.text.secondary} />
      <Text style={styles.emptyHeading}>No plans nearby</Text>
      <Text style={styles.emptyBody}>
        None of your friends have plans within 25km.
      </Text>
    </View>
  </View>
)}
```

**Trigger condition detail:** `ExploreMapView.tsx` currently does not expose a `plansLoaded` flag — it receives `plans` prop from `PlansListScreen`. The trigger must be inferred from `plans.length > 0 || !isLoadingLocation` to avoid showing the overlay during the initial location-loading spinner. The existing `isLoadingLocation` state is the correct gate — while `isLoadingLocation === true`, the component renders the spinner, not the map. So the overlay only needs to guard against `visiblePlans.length === 0` after `isLoadingLocation === false`.

Revised trigger (simpler, correct):
```typescript
// Inside ExploreMapView, after the isLoadingLocation early return:
{visiblePlans.length === 0 && <EmptyOverlay />}
```

This is safe because: if `isLoadingLocation` is true, we return early with the spinner. By the time we reach the MapView render, location has loaded and `visiblePlans` is computed.

### Anti-Patterns to Avoid

- **Await haptics in async handlers:** `await Haptics.X()` blocks the handler; always fire-and-forget.
- **Reset `hasAnimated.current` on refresh:** Cards must stagger only on first mount. `handleRefreshActivity` explicitly does NOT reset the guard (verified in source).
- **Shared `Animated.Value` for RSVP buttons:** Each button needs its own `scaleAnim`; a shared value would animate all buttons simultaneously.
- **Using `Animated.timing` for the overshoot bounce:** Timing doesn't model physical spring dynamics; use `Animated.spring` for natural feel.
- **Removing the existing translateY from `AnimatedCard`:** The live `squad.tsx` `AnimatedCard` animates both opacity AND translateY (16→0). D-16 says "opacity-only" but this was already implemented with translateY. SQUAD-03 is only a token replacement — do not remove the translateY. Leave existing animation behaviour intact.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shimmer placeholder | Custom gradient animation | `SkeletonPulse` (Phase 24) | Already handles width="100%", timing, shimmer loop, cleanup |
| Spring animation config | Raw damping/stiffness values | `ANIMATION.easing.spring` spread | Ensures consistency; lint rule enforces no raw ms values |
| Haptic calls | Any custom haptic abstraction | `expo-haptics` directly | Library is already installed, fire-and-forget pattern established |
| Stagger delay value | Raw `80` number literal | `ANIMATION.duration.staggerDelay` | Token approach — the purpose of SQUAD-03 is exactly this |

**Key insight:** Every primitive needed for Phase 27 already exists. The work is wiring, not building.

---

## Common Pitfalls

### Pitfall 1: PlanCard skeleton shape mismatch

**What goes wrong:** Skeleton renders at different dimensions than the real card, causing layout shift when data loads.
**Why it happens:** `PlanCard.tsx` currently has no image block — it only renders text + `AvatarStack`. The UI-SPEC skeleton includes a 140px image block for future-proofing.
**How to avoid:** Mirror the outer card styles exactly from `PlanCard.tsx` (`padding: SPACING.lg`, `borderRadius: RADII.lg`, `borderColor: colors.border`). The image block is intentional — it will match the card once a cover image is added in a future phase.
**Warning signs:** Layout shift visible when skeleton transitions to real card on data load.

### Pitfall 2: Incorrect RSVP bounce guard

**What goes wrong:** Animation fires while a save is in progress, creating visual confusion.
**Why it happens:** The existing `savingRsvp` state controls the button `disabled` prop, but a custom `onPress` handler that bypasses the `handlePress` guard would trigger animation on a disabled button.
**How to avoid:** Move the `savingRsvp !== null || disabled` guard into the new `onPress` handler before calling `triggerBounce`. Mirror the existing guard in `handlePress`.
**Warning signs:** Animation fires on already-saving buttons; double-tap triggers two animations.

### Pitfall 3: Map overlay blocks touch events

**What goes wrong:** The empty state overlay intercepts touch events, making map pins untappable.
**Why it happens:** Absolutely positioned `View` components capture all touch events by default in React Native.
**How to avoid:** Apply `pointerEvents="none"` to the overlay container. All children become non-interactive — acceptable since the overlay contains no interactive elements.
**Warning signs:** Map pins become untappable when overlay is showing; map scroll/pan blocked.

### Pitfall 4: SQUAD-02 haptic still awaited

**What goes wrong:** After swapping `impactAsync` for `notificationAsync`, leaving the `await` prefix causes the settle function to yield unnecessarily.
**Why it happens:** The original line is `Haptics.impactAsync(...).catch(() => {})` — no `await`. The fix should be `void Haptics.notificationAsync(...).catch(() => {})` — identical pattern, no await.
**How to avoid:** Confirm the replacement is fire-and-forget. The existing line at L174 already uses `.catch(() => {})` without `await`, so it's already correct pattern — just swap the call.
**Warning signs:** `settle()` resolves slower than expected; TypeScript warns about unused Promise.

### Pitfall 5: `AnimatedCard` translateY discrepancy

**What goes wrong:** Removing translateY from `AnimatedCard` while implementing SQUAD-03 changes observable animation behaviour beyond the token replacement.
**Why it happens:** CONTEXT.md D-16 says "opacity-only" but live source at line 190-195 has:
```typescript
transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }]
```
**How to avoid:** SQUAD-03 scope is ONLY replacing raw `80` with `ANIMATION.duration.staggerDelay`. Do not modify `AnimatedCard`'s animation properties. The translateY is existing behaviour that predates this phase.
**Warning signs:** Cards no longer slide in from below on first load (translateY removed accidentally).

### Pitfall 6: PLANS-04 trigger fires during location load

**What goes wrong:** Empty state overlay appears briefly while location permission is being requested and `visiblePlans` is empty.
**Why it happens:** `visiblePlans` starts as an empty array before `isLoadingLocation` resolves.
**How to avoid:** The `isLoadingLocation` early return (line 88-94 of `ExploreMapView.tsx`) already gates the map render — the overlay should be placed inside the map render block, not outside it. Since the early return shows the spinner, the overlay can only render after the spinner phase ends.
**Warning signs:** Empty state flickers briefly on Explore tab open before map renders.

---

## Code Examples

### SQUAD-02: Single-line fix (verified from source)

```typescript
// Source: src/hooks/useExpenseDetail.ts line 174 (verified by Read tool)
// BEFORE:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

// AFTER:
void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
```

### SQUAD-03: Token replacement (verified from source)

```typescript
// Source: src/app/(tabs)/squad.tsx line 88-89 (verified by Read tool)
// BEFORE:
Animated.stagger(80, cardAnims.map(...))

// AFTER:
Animated.stagger(ANIMATION.duration.staggerDelay, cardAnims.map(...))
// Also add import: import { ANIMATION } from '@/theme'; (may already be imported)
```

Current squad.tsx imports: `useTheme, FONT_SIZE, FONT_FAMILY, SPACING, RADII` from `@/theme`. `ANIMATION` is not yet imported — must be added.

### SQUAD-01: Haptics in FriendRequests (verified from source)

```typescript
// Source: src/screens/friends/FriendRequests.tsx handleAccept / handleDecline
async function handleAccept(id: string) {
  // ... existing loading state ...
  const { error } = await acceptRequest(id);
  // ... existing loading state cleanup ...
  if (error) {
    Alert.alert('Error', "Couldn't accept request. Try again.");
  } else {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});  // ADD
    fetchPendingRequests();
    fetchFriends();
  }
}

async function handleDecline(id: string) {
  // ...
  const { error } = await rejectRequest(id);
  // ...
  if (error) {
    Alert.alert('Error', "Couldn't decline request. Try again.");
  } else {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});  // ADD
    fetchPendingRequests();
  }
}
```

`expo-haptics` must be imported — not currently in `FriendRequests.tsx` (verified: no Haptics import in that file).

### PLANS-03: Haptic placement in PlanCreateModal (verified from source)

```typescript
// Source: src/screens/plans/PlanCreateModal.tsx handleCreate (verified by Read tool)
// The success branch is at lines 138-165:
if (error || !planId) {
  Alert.alert('Error', `Couldn't create plan. ${error?.message ?? 'Unknown error'}`);
  return;
}

// ADD haptic here — before cover upload / before router.back()
void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

// Upload cover image if selected (D-14)
if (coverImageUri && planId) { ... }

router.back();
router.push(`/plans/${planId}` as never);
```

D-07 says "before navigation away" — firing immediately after `createPlan` succeeds (before cover upload) satisfies this. The haptic confirms the plan was created; the cover upload is secondary.

`expo-haptics` must be imported — not currently in `PlanCreateModal.tsx` (verified: no Haptics import).

### SQUAD-04: WishListItem Animated wrapper (verified from source)

```typescript
// Source: src/components/squad/WishListItem.tsx (verified by Read tool)
// Current Pressable at line 101:
<Pressable
  style={({ pressed }) => [
    styles.claimButton,
    isClaimedByMe && styles.claimButtonActive,
    pressed && { opacity: 0.7 },   // ← REMOVE this line
  ]}
  onPress={onToggleClaim}
  accessibilityLabel={claimLabel}
>

// Replace with:
const scaleAnim = useRef(new Animated.Value(1)).current;

<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
  <Pressable
    style={[
      styles.claimButton,
      isClaimedByMe && styles.claimButtonActive,
      // opacity: 0.7 press style removed — replaced by scale spring
    ]}
    onPressIn={() =>
      Animated.spring(scaleAnim, { toValue: 0.96, ...ANIMATION.easing.spring, useNativeDriver: true }).start()
    }
    onPressOut={() =>
      Animated.spring(scaleAnim, { toValue: 1.0, ...ANIMATION.easing.spring, useNativeDriver: true }).start()
    }
    onPress={onToggleClaim}
    accessibilityLabel={claimLabel}
  >
```

Add imports: `Animated, useRef` from `react-native`; `ANIMATION` from `@/theme`.

---

## Runtime State Inventory

> Phase 27 is a pure client-side polish phase (no data models, no server changes). Omitting — not applicable.

---

## Environment Availability

> Phase 27 has no external dependencies beyond the existing React Native / Expo project. All libraries (expo-haptics, react-native Animated, SkeletonPulse) are already installed and verified in the codebase.

Step 2.6: SKIPPED (all dependencies confirmed present in existing codebase; no new packages required).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest + tsx (React Native testing, Phase 26 pattern) |
| Config file | jest.config.js (check project root) |
| Quick run command | `npx jest --testPathPattern="PLANS\|SQUAD\|RSVPButtons\|WishList" --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| PLANS-01 | 3 skeleton cards when `loading && plans.length === 0` | unit | Render test: mock `usePlans` with loading=true, plans=[] |
| PLANS-02 | RSVP bounce fires; haptic called | unit | Mock `Haptics.selectionAsync`; verify it's called on press |
| PLANS-03 | Success haptic fires after plan creation | unit | Mock `Haptics.notificationAsync`; verify called after `createPlan` resolves |
| PLANS-04 | Overlay shown when `visiblePlans.length === 0` | unit | Render test with empty plans prop |
| SQUAD-01 | Accept triggers Success haptic, reject triggers Medium | unit | Mock haptics; verify correct call per action |
| SQUAD-02 | IOU settle triggers `notificationAsync(Success)` | unit | Mock haptics; verify call type changed |
| SQUAD-03 | `ANIMATION.duration.staggerDelay` token exists with value 80 | unit | Import `ANIMATION`; assert value |
| SQUAD-04 | Scale animation refs exist; press fires spring | unit | Render test; verify `Animated.spring` called on pressIn |

All tests are unit-level (no E2E needed for haptic/animation Polish phase). Haptic calls are manual-verified on device.

### Sampling Rate
- **Per task commit:** `npx jest --passWithNoTests` (fast; catches regressions)
- **Per wave merge:** `npx jest` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

If test files for RSVPButtons and WishListItem don't exist, create them:
- [ ] `src/components/plans/__tests__/RSVPButtons.test.tsx` — PLANS-02 animation/haptic
- [ ] `src/components/squad/__tests__/WishListItem.test.tsx` — SQUAD-04 press feedback
- [ ] `src/theme/__tests__/animation.test.ts` — SQUAD-03 token value assertion

---

## Security Domain

This phase adds no authentication, data access, input validation, or cryptography. All changes are purely visual/haptic polish to existing authenticated screens. Security domain: not applicable for this phase.

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 27 |
|--------------|------------------|---------------------|
| `TouchableOpacity` with `activeOpacity` for press feedback | `Animated.spring` scale via `Animated.createAnimatedComponent` | PLANS-02 and SQUAD-04 use the current approach |
| `Haptics.impactAsync(Medium)` for settle | `Haptics.notificationAsync(Success)` for debt-cleared confirmation | SQUAD-02 is correcting this semantic mistake |
| Raw magic number `80` for stagger delay | `ANIMATION.duration.staggerDelay` token | SQUAD-03 aligns squad.tsx with the token system |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `usePlans` hook exposes `loading: boolean` | Code Examples / PLANS-01 | VERIFIED: confirmed at src/hooks/usePlans.ts line 20, 29, 210 |
| A2 | `FriendRequests.tsx` does not import expo-haptics | Code Examples / SQUAD-01 | VERIFIED: Read tool confirmed — no Haptics import present |
| A3 | `PlanCreateModal.tsx` does not import expo-haptics | Code Examples / PLANS-03 | VERIFIED: Read tool confirmed — no Haptics import present |
| A4 | `squad.tsx` does not import `ANIMATION` from theme | Code Examples / SQUAD-03 | VERIFIED: imports are `useTheme, FONT_SIZE, FONT_FAMILY, SPACING, RADII` — no ANIMATION |
| A5 | `ExploreMapView` trigger condition is safe after `isLoadingLocation` early return | Pitfall 6 / PLANS-04 | VERIFIED: Early return at line 88-94 gates all map content |

**Assumed (unverified):** None. All claims verified via Read tool against live source.

---

## Open Questions

1. **PlanCard skeleton image block**
   - What we know: `PlanCard.tsx` currently renders no image (text + AvatarStack only). UI-SPEC says include 140px image placeholder.
   - What's unclear: Does the skeleton's image block need to match current PlanCard or planned future PlanCard with cover image?
   - Recommendation: Follow UI-SPEC (D-01 is locked) — include 140px image placeholder. The skeleton anticipates the cover image feature.

2. **PLANS-04 trigger when no plans have coordinates**
   - What we know: `visiblePlans` filters to plans with `latitude != null && longitude != null`. A plan without coordinates is excluded.
   - What's unclear: If all plans exist but none have coordinates, `visiblePlans.length === 0` — should empty state show?
   - Recommendation: Yes — the empty state correctly describes "no plans visible on map near you," which includes plans with no location data. Follow D-10 as-is.

---

## Sources

### Primary (HIGH confidence — verified via Read tool against live codebase)

- `src/components/common/SkeletonPulse.tsx` — API: `width: number | '100%'`, `height: number`; shimmer loop pattern
- `src/theme/animation.ts` — Current token set; `ANIMATION.easing.spring = { damping: 15, stiffness: 120 }`; `staggerDelay` does NOT yet exist (must be added)
- `src/components/plans/RSVPButtons.tsx` — Current implementation: 3 `TouchableOpacity`, `savingRsvp` guard, `disabled` prop
- `src/components/plans/PlanCard.tsx` — Current card structure: no image block; text + AvatarStack
- `src/screens/plans/PlansListScreen.tsx` — `loading` and `plans` destructured from `usePlans()`; My Plans tab is the FlatList branch
- `src/components/maps/ExploreMapView.tsx` — `visiblePlans` computed; `isLoadingLocation` early return gates map render
- `src/screens/friends/FriendRequests.tsx` — `handleAccept`/`handleDecline` success branches; no Haptics import
- `src/hooks/useExpenseDetail.ts:174` — `Haptics.impactAsync(Medium).catch(() => {})` confirmed at line 174
- `src/app/(tabs)/squad.tsx` — `Animated.stagger(80, ...)` at line 88; `AnimatedCard` has opacity + translateY; no ANIMATION import
- `src/components/squad/WishListItem.tsx` — `Pressable` with `pressed && { opacity: 0.7 }` press style; no Animated
- `src/screens/plans/PlanCreateModal.tsx` — `handleCreate` success branch at lines 138-165; no Haptics import

### Secondary (MEDIUM confidence)

- CONTEXT.md — All 19 locked decisions (D-01 through D-19)
- UI-SPEC.md — Visual contracts for all 8 requirements; exact style values
- REQUIREMENTS.md — Phase 27 requirement descriptions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in codebase
- Architecture: HIGH — all patterns verified from Phase 24/26 established usage
- Pitfalls: HIGH — identified from live source code discrepancies (translateY, trigger conditions)
- Code examples: HIGH — all examples derived from Read tool on live source files

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable React Native polish patterns, no external dependencies)
