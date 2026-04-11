# Phase 3: Card Stack View - Research

**Researched:** 2026-04-11
**Domain:** React Native swipe gesture / card stack animation (Reanimated v4 + Gesture Handler v2)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Compact centered card (~80% screen width), not full-width — breathing room around edges
- **D-02:** Medium avatar (64px) on the left, name + mood + context tag + last-active time stacked to the right
- **D-03:** Last-active time shown as secondary text below mood/context tag (e.g., "2h ago", "just now") for all friends
- **D-04:** Status-colored gradient covering the full card (status color at 15-20% opacity to transparent)
- **D-05:** Extra rounded corners (RADII.xl or 20px) — more playful than the standard RADII.lg
- **D-06:** 1-2 cards visible behind the front card, slightly offset and scaled down (visible stack depth effect)
- **D-07:** Horizontal swipe only — both left and right swipe dismiss/skip the card. Nudge is button-only
- **D-08:** Uses React Native Gesture Handler + Reanimated for fluid gesture handling (new dependency)
- **D-09:** Card exit animation: fly off screen in swipe direction with slight rotation (Tinder-style)
- **D-10:** Swipe down to undo — brings back the last dismissed card as a safety net for accidental skips
- **D-11:** Deck auto-loops back to the first card when you reach the end — always something to swipe
- **D-12:** Counter displayed above the deck (separate from card content), showing remaining count like "2 more free"
- **D-13:** Only ALIVE and FADING friends in the deck — DEAD friends excluded entirely
- **D-14:** Nudge opens DM directly — same `supabase.rpc('get_or_create_dm_channel')` as radar bubbles. No pre-filled message
- **D-15:** Icon + text combo buttons below the card — icon buttons with small labels underneath (X/Skip and chat-bubble/Nudge)
- **D-16:** Swiping in either direction = Skip. Nudge is exclusively via the button — prevents accidental DM opens from swipes

### Claude's Discretion
- Stack card offset and scale values for visible depth effect
- Swipe threshold distance before card dismisses
- Rotation angle during fly-off animation
- Undo animation (how the card returns)
- Button icon choices and exact sizing
- Counter text formatting and position

### Deferred Ideas (OUT OF SCOPE)
- Send a nudge push notification instead of just opening DM — future enhancement
- Pre-filled nudge message ("Hey, want to hang?") — future enhancement
- End-of-deck summary showing who was nudged vs skipped — future enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CARD-01 | User sees a swipeable card deck showing friend details (avatar, name, mood, context tag, last active time) | Reanimated v4 `Animated.View` wrapping card content; `computeHeartbeatState` + `formatDistanceToNow` from existing heartbeat lib |
| CARD-02 | Each card has a "Nudge" button that opens the DM conversation with that friend | Existing `supabase.rpc('get_or_create_dm_channel')` pattern from `RadarBubble` — direct copy |
| CARD-03 | Each card has a "Skip" button that animates the card away and reveals the next friend | `Gesture.Pan` with `runOnJS` callback; `withSpring` / `withTiming` for fly-off |
| CARD-04 | Card deck only contains ALIVE and FADING friends (DEAD friends excluded) | Filter `friends` array with `computeHeartbeatState !== 'dead'` before passing to deck |
| CARD-05 | Card shows remaining count ("2 more free") updating as user skips through | Derived from `currentIndex` state and filtered deck length |
</phase_requirements>

---

## Summary

Phase 3 implements a Tinder-style swipeable card stack using the already-installed `react-native-gesture-handler` (v2.30.0) and `react-native-reanimated` (v4.2.1). Both libraries are present in `package.json` and installed under `node_modules` — **no new npm installs are needed**. The locked decision to use rn-swiper-list (STATE.md note: "verify first") is resolved by this research: `rn-swiper-list` is NOT installed and falls back to the custom `Gesture.Pan` approach, which is the superior choice given the project's existing stack.

The implementation slots `CardStackView` into `HomeScreen.tsx` line 127-130, replacing the `cardsPlaceholder` View with the new component. The crossfade wrapper from Phase 2 is already in place. The component renders a `z-indexed` stack of `Animated.View` cards; the topmost card is driven by a `Gesture.Pan` handler; background cards respond to a shared `activeCardIndex` state.

One critical prerequisite: `GestureHandlerRootView` is **not yet wired** into `src/app/_layout.tsx`. The current root layout wraps content in a plain `View`. Gesture Handler v2 requires `GestureHandlerRootView` at the root or gestures will silently fail. This must be Wave 0.

**Primary recommendation:** Build a custom `CardStackView` + `SwipeCard` component pair using `Gesture.Pan` (Gesture Handler v2 new API) + `useSharedValue` / `useAnimatedStyle` (Reanimated v4). No third-party swipe library needed.

---

## Standard Stack

### Core (all already installed)

| Library | Installed Version | Purpose | Why Standard |
|---------|----------|---------|--------------|
| `react-native-gesture-handler` | 2.30.0 | Pan gesture detection for swipe | Locked decision D-08; Expo SDK 55 bundled |
| `react-native-reanimated` | 4.2.1 | `useSharedValue`, `useAnimatedStyle`, `withSpring`, `withTiming`, `runOnJS` | Locked decision D-08; already in project |
| `expo-linear-gradient` | ~55.0.8 | Status-colored card gradient (D-04) | Already used in `RadarBubble` |
| `expo-haptics` | ~55.0.9 | `ImpactFeedbackStyle.Light` on skip/nudge | Already used in project; established haptic pattern |

### No New Dependencies Required

[VERIFIED: package.json + node_modules inspection] All required libraries are already installed. `rn-swiper-list` is NOT installed and the fallback (custom `Gesture.Pan`) is the correct approach — it gives full control over D-09 (rotation), D-10 (undo), and D-06 (depth stacking).

---

## Architecture Patterns

### Recommended Component Structure

```
src/components/home/
├── CardStackView.tsx    # Container: deck logic, state, counter (CARD-01, CARD-04, CARD-05)
└── SwipeCard.tsx        # Single animated card: gesture, visual, Nudge/Skip buttons (CARD-01..03)
```

**CardStackView** owns:
- Filtered deck (`friends.filter(f => computeHeartbeatState(...) !== 'dead')`)
- `currentIndex: number` state (0-based pointer into looping deck)
- `dismissedStack: Friend[]` for undo (D-10)
- Counter display ("X more free") above the deck
- Renders 3 cards at z-indices: current (top), current+1, current+2 — background cards are static `View`s with offset/scale

**SwipeCard** owns:
- `translateX`, `translateY`, `rotate` shared values
- `Gesture.Pan` handler (D-07: horizontal + down for undo)
- `useAnimatedStyle` for transform
- Card visual: avatar, name, mood, context tag, last-active time, gradient (D-01..D-05)
- Nudge and Skip buttons (D-15)

### Pattern 1: Gesture.Pan + useAnimatedStyle (Reanimated v4 + RNGH v2 New API)

**What:** The "new API" in Gesture Handler v2 uses `Gesture.Pan()` builder + `GestureDetector` component. This replaces the old `PanGestureHandler` + `useAnimatedGestureHandler` hook (which still works but is legacy).

**When to use:** Always in new code. The `useAnimatedGestureHandler` hook is deprecated in Reanimated v4 context.

```typescript
// Source: react-native-gesture-handler v2 docs (docs.swmansion.com/react-native-gesture-handler)
// Source: react-native-reanimated v4 docs
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Animated,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const translateX = useSharedValue(0);
const translateY = useSharedValue(0);
const rotate = useSharedValue(0);

const pan = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX;
    translateY.value = e.translationY * 0.2; // slight vertical drag
    rotate.value = (e.translationX / screenWidth) * 15; // max 15deg rotation
  })
  .onEnd((e) => {
    const SWIPE_THRESHOLD = screenWidth * 0.35;
    if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
      // fly off
      translateX.value = withTiming(
        e.translationX > 0 ? screenWidth * 1.5 : -screenWidth * 1.5,
        { duration: 280 },
        () => runOnJS(onSkip)()
      );
    } else if (e.translationY > 60) {
      // swipe down = undo
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      rotate.value = withSpring(0);
      runOnJS(onUndo)();
    } else {
      // snap back
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      rotate.value = withSpring(0);
    }
  });

const animatedStyle = useAnimatedStyle(() => ({
  transform: [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { rotate: `${rotate.value}deg` },
  ],
}));

// Wrap in GestureDetector, not PanGestureHandler
<GestureDetector gesture={pan}>
  <Animated.View style={[styles.card, animatedStyle]}>
    {/* card content */}
  </Animated.View>
</GestureDetector>
```

**Critical note on `runOnJS`:** The `onEnd` callback in Reanimated v4 runs on the UI thread (worklet). Any call to React state setters (`setCurrentIndex`) MUST be wrapped in `runOnJS`. Forgetting this causes a silent crash with no error boundary.

### Pattern 2: GestureHandlerRootView at Root (PREREQUISITE)

**What:** Gesture Handler v2 requires `GestureHandlerRootView` to wrap the entire app. Without it, `GestureDetector` renders but gestures never fire.

**Current state:** `src/app/_layout.tsx` wraps content in a plain `View`. This MUST be changed.

```typescript
// Source: react-native-gesture-handler v2 docs
// In src/app/_layout.tsx, replace the root View:
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Change:
<View style={{ flex: 1, backgroundColor: COLORS.surface.base }}>
// To:
<GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.surface.base }}>
```

[VERIFIED: GestureHandlerRootView found in gesture-handler package — `node_modules/react-native-gesture-handler/lib/commonjs/GestureHandlerRootViewContext.js` exists]

### Pattern 3: Visible Stack Depth Effect (D-06)

**What:** Render 2-3 cards in a `View` container with absolute positioning. Background cards are plain `View`s (not animated), offset and scaled.

```typescript
// Recommended values (Claude's Discretion):
const STACK_CONFIGS = [
  { translateY: 0,  scale: 1.0,  zIndex: 30 }, // front card (animated)
  { translateY: 8,  scale: 0.95, zIndex: 20 }, // second card
  { translateY: 14, scale: 0.90, zIndex: 10 }, // third card
];

// In CardStackView, render cards in reverse z order:
{STACK_CONFIGS.slice(0, Math.min(3, deck.length)).map((config, stackPos) => {
  const friendIndex = (currentIndex + stackPos) % deck.length;
  if (stackPos === 0) {
    return <SwipeCard key={deck[friendIndex].friend_id} friend={deck[friendIndex]} ... />;
  }
  return (
    <View key={deck[friendIndex].friend_id} style={[styles.bgCard, {
      transform: [{ translateY: config.translateY }, { scale: config.scale }],
      zIndex: config.zIndex,
    }]} />
  );
})}
```

### Pattern 4: DM Navigation (CARD-02)

Direct reuse of the established pattern from `RadarBubble` and `HomeFriendCard`:

```typescript
// Source: src/components/home/RadarBubble.tsx lines 167-177
async function handleNudge() {
  const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
    other_user_id: friend.friend_id,
  });
  if (error || !data) {
    Alert.alert('Error', "Couldn't open chat. Try again.");
    return;
  }
  router.push(
    `/chat/room?dm_channel_id=${data}&friend_name=${encodeURIComponent(friend.display_name)}` as never
  );
}
```

### Pattern 5: Status Gradient (D-04)

Reuse gradient color map from `RadarBubble`. For card gradient, apply top-to-bottom (left edge to transparent) using `expo-linear-gradient`:

```typescript
// Source: src/components/home/RadarBubble.tsx lines 36-40 (GRADIENT_COLORS)
// Adapted for card: left-edge wash at 15-20% opacity
const CARD_GRADIENT_COLORS: Record<string, readonly [string, string]> = {
  free:  ['rgba(34,197,94,0.18)', 'transparent'],
  maybe: ['rgba(234,179,8,0.18)', 'transparent'],
  busy:  ['rgba(239,68,68,0.18)', 'transparent'],
};

// In card: start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} for left-to-right wash
```

### Pattern 6: Counter Display (CARD-05, D-12)

Counter is derived state — no extra state needed:

```typescript
// remaining = total deck size - number of skips in current loop cycle
// On auto-loop, remaining resets to total.
// "X more free" uses ALIVE count only (FADING friends excluded from "free" label):

const aliveFriendCount = deck.filter(
  f => computeHeartbeatState(f.status_expires_at, f.last_active_at) === 'alive'
).length;
// Counter text: `${aliveFriendCount} more free` (or similar wording per D-12)
```

**Note:** D-12 says counter shows remaining count — interpret as cards left in the current loop before cycling. This resets to deck length after auto-loop (D-11).

### Anti-Patterns to Avoid

- **Using `PanGestureHandler` (old API):** The legacy `PanGestureHandler` component + `useAnimatedGestureHandler` hook works but is not recommended for new code in RNGH v2. Use `Gesture.Pan()` + `GestureDetector`.
- **`useNativeDriver: false` on transforms:** All transform/opacity animations must use native driver. The project pattern (from `RadarBubble`) already enforces this. Reanimated v4's `useSharedValue`/`useAnimatedStyle` runs on the UI thread by default — no `useNativeDriver` flag needed (it's not a prop of `withTiming`/`withSpring`).
- **Calling React state setters from worklets without `runOnJS`:** Fatal crash, no error message.
- **Rendering all deck cards in the DOM:** Only render 3 at most (front + 2 background). Rendering the full filtered list causes layout jank and defeats the purpose of the stack visual.
- **Hardcoded numeric styles without `eslint-disable` comment:** The `campfire/no-hardcoded-styles` ESLint rule is enforced. Any value without a theme token requires `// eslint-disable-next-line campfire/no-hardcoded-styles` + comment explaining why (established project pattern from `HomeFriendCard`, `RadarBubble`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe gesture math | Custom touch responder | `Gesture.Pan()` from RNGH v2 | Handles edge cases: multi-touch, scroll conflict, platform differences |
| Animated transforms | `Animated.timing` from RN core | `useSharedValue` + `useAnimatedStyle` from Reanimated v4 | Runs on UI thread, 60fps guaranteed; RN core `Animated` runs on JS thread |
| Gradient overlay | Custom `View` with opacity | `expo-linear-gradient` (already used in RadarBubble) | Gradient is GPU-rendered, no JS thread cost |
| DM channel lookup | Custom REST call | `supabase.rpc('get_or_create_dm_channel')` | Established pattern, handles upsert atomically |
| Heartbeat state | Re-implement logic | `computeHeartbeatState` from `@/lib/heartbeat` | Same pure function used everywhere; keeps FADING logic in one place |

**Key insight:** The "complex" part of this phase (swipe physics, gesture conflict resolution) is fully covered by the two already-installed libraries. The implementation work is wiring and visual design.

---

## Common Pitfalls

### Pitfall 1: GestureHandlerRootView Missing
**What goes wrong:** Cards render correctly but swipes never trigger. No error in console. Platform behavior varies (iOS may work partially, Android silently fails).
**Why it happens:** `GestureDetector` only works inside a `GestureHandlerRootView`. The current `_layout.tsx` uses a plain `View`.
**How to avoid:** Replace root `View` with `GestureHandlerRootView` in `src/app/_layout.tsx` as Wave 0 task.
**Warning signs:** Gestures fire 0% of the time; no errors logged.

### Pitfall 2: runOnJS Not Used for State Updates
**What goes wrong:** App crashes silently when a swipe completes. No error boundary message.
**Why it happens:** Reanimated v4 gesture callbacks run as worklets on the UI thread. React state setters (`useState`) live on the JS thread. Crossing the thread boundary without `runOnJS` causes a worklet error.
**How to avoid:** Always `runOnJS(setter)(value)` for any React state call inside `onEnd`/`onUpdate`.
**Warning signs:** Gestures start working but crash on completion.

### Pitfall 3: Scroll Conflict in ScrollView
**What goes wrong:** Horizontal swipes scroll the parent `ScrollView` instead of triggering the swipe gesture.
**Why it happens:** `HomeScreen`'s outer `ScrollView` captures horizontal touch events before `Gesture.Pan` can.
**How to avoid:** Set `activeOffsetX={[-10, 10]}` on `Gesture.Pan()` to claim ownership of horizontal gestures above 10px threshold. Or configure `ScrollView` with `horizontal={false}` (already the case) + set `failOffsetY={[-5, 5]}` on the pan gesture to yield vertical scrolls.
**Warning signs:** Swiping left/right scrolls the page up/down; no card animation fires.

```typescript
// Correct gesture config to prevent scroll conflict:
const pan = Gesture.Pan()
  .activeOffsetX([-10, 10])   // claim gesture after 10px horizontal movement
  .failOffsetY([-15, 15])     // yield to ScrollView if vertical movement detected first
  .onUpdate(...)
  .onEnd(...)
```

### Pitfall 4: Empty Deck (0 ALIVE/FADING Friends)
**What goes wrong:** `CardStackView` crashes or renders blank when all friends are DEAD.
**Why it happens:** Deck filter returns empty array; index arithmetic fails (`% 0` = NaN).
**How to avoid:** Guard deck length before rendering. Show a friendly empty state ("No friends available right now") when `deck.length === 0`.
**Warning signs:** Visible during testing — easily caught with a test account that has all-DEAD friends.

### Pitfall 5: Key Prop Instability on Loop
**What goes wrong:** After auto-loop (D-11), React re-mounts all card components, causing animation flicker.
**Why it happens:** If `key` is derived from `currentIndex` rather than `friend.friend_id`, every loop cycle remounts.
**How to avoid:** Use `friend.friend_id` as the key, not index-based keys.

### Pitfall 6: FONT_WEIGHT.bold Missing
**What goes wrong:** Build error — `FONT_WEIGHT.bold` doesn't exist in the theme.
**Why it happens:** STATE.md records this as a known gap: `FONT_WEIGHT.bold missing from theme tokens — used hardcoded 700 with eslint-disable per project convention`.
**How to avoid:** Use `'700' as const` with `// eslint-disable-next-line campfire/no-hardcoded-styles` comment when bold weight is needed.

---

## Code Examples

### Complete SwipeCard gesture setup

```typescript
// Source: Reanimated v4 docs + RNGH v2 docs (docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture)
import {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, runOnJS,
  Animated as ReAnimated,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const MAX_ROTATE_DEG = 15;

function SwipeCard({ friend, onSkip, onNudge, onUndo }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.15;
      rotate.value = (e.translationX / SCREEN_WIDTH) * MAX_ROTATE_DEG;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(dir * SCREEN_WIDTH * 1.5, { duration: 280 }, () => {
          runOnJS(onSkip)();
        });
      } else if (e.translationY > 60) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
        runOnJS(onUndo)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <ReAnimated.View style={[styles.card, cardStyle]}>
        {/* card content */}
      </ReAnimated.View>
    </GestureDetector>
  );
}
```

### Resetting shared values after skip (card recycling)

```typescript
// After onSkip fires and currentIndex advances, reset values for next card render.
// Since SwipeCard is keyed by friend_id, the component unmounts/remounts on friend change.
// Initial values are already 0 from useSharedValue(0) — no explicit reset needed.
// If using a single persistent SwipeCard instance (optimization), reset on index change:
useEffect(() => {
  translateX.value = 0;
  translateY.value = 0;
  rotate.value = 0;
}, [currentIndex]);
```

### GestureHandlerRootView in _layout.tsx

```typescript
// Source: RNGH v2 docs — required wrapper
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// In RootLayout return:
return (
  <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.surface.base }}>
    <OfflineBanner />
    <Stack ...>
      ...
    </Stack>
  </GestureHandlerRootView>
);
```

---

## Integration Map

### HomeScreen.tsx Integration Point

Lines 127-130 (current placeholder):

```typescript
// CURRENT (lines 127-130):
<View style={styles.cardsPlaceholder}>
  <Text style={styles.placeholderHeading}>Cards View</Text>
  <Text style={styles.placeholderBody}>Coming in the next update.</Text>
</View>

// REPLACE WITH:
<CardStackView friends={friends} />
```

The surrounding `Animated.View` (crossfade, `pointerEvents`) from Phase 2 stays unchanged. `CardStackView` just needs to be a normal React component that fills the space.

### Data Flow

```
HomeScreen
  └── friends: FriendWithStatus[]  (from useHomeScreen hook)
      └── CardStackView
            ├── deck = friends.filter(f => computeHeartbeatState(...) !== 'dead')
            ├── currentIndex (useState)
            ├── dismissedStack (useState — for undo D-10)
            └── SwipeCard (top card, animated)
                ├── uses friend.friend_id, display_name, avatar_url, status, context_tag,
                │   status_expires_at, last_active_at
                ├── onSkip → advances currentIndex (with loop wrap-around D-11)
                ├── onNudge → calls supabase.rpc + router.push
                └── onUndo → restores last dismissed card
```

---

## Environment Availability

Step 2.6: No new external dependencies. All required libraries already installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| react-native-gesture-handler | Swipe gesture (D-08) | Yes | 2.30.0 | — |
| react-native-reanimated | Animation (D-08, D-09) | Yes | 4.2.1 | — |
| expo-linear-gradient | Card gradient (D-04) | Yes | ~55.0.8 | — |
| expo-haptics | Button feedback | Yes | ~55.0.9 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (visual regression) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test --project mobile` |
| Full suite command | `npx playwright test` |
| Test directory | `tests/visual/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | Card renders avatar, name, mood, context tag, last-active time | Visual smoke (Playwright) | `npx playwright test tests/visual/card-stack.spec.ts` | No — Wave 0 |
| CARD-02 | Nudge button triggers DM navigation | Manual (requires live Supabase) | Manual | N/A — manual |
| CARD-03 | Skip button advances deck | Visual smoke | `npx playwright test tests/visual/card-stack.spec.ts` | No — Wave 0 |
| CARD-04 | DEAD friends excluded from deck | Unit / logic test | Manual inspection or unit test of filter function | No |
| CARD-05 | Counter updates on skip | Visual smoke | `npx playwright test tests/visual/card-stack.spec.ts` | No — Wave 0 |

**Note on CARD-02/gesture testing:** Playwright on web (Expo web via Expo Router) can simulate taps on buttons but not Gesture Handler pan gestures reliably (RNGH uses native modules that don't translate to web). Swipe gestures are manually tested on device / Expo Go. Button taps (Nudge, Skip button) are testable via Playwright.

### Sampling Rate
- **Per task commit:** Visual inspection in Expo Go
- **Per wave merge:** `npx playwright test --project mobile` (smoke)
- **Phase gate:** Full Playwright suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/visual/card-stack.spec.ts` — covers CARD-01, CARD-03, CARD-05 (visual presence + counter update)
- [ ] `GestureHandlerRootView` in `_layout.tsx` — prerequisite for any gesture to fire

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Gesture.Pan()` with `activeOffsetX` + `failOffsetY` resolves scroll conflict with parent `ScrollView` | Common Pitfalls #3 | If wrong: horizontal swipe triggers ScrollView scroll; need alternative conflict resolution (e.g., `simultaneousWithExternalGesture` or wrapping in a non-scrollable container for the card area) |
| A2 | Resetting `useSharedValue`s is not needed when `SwipeCard` is keyed by `friend.friend_id` (React remounts component = fresh values) | Code Examples | If wrong: cards render mid-animation after index advance; need explicit reset in `useEffect` |
| A3 | The 60s heartbeat tick in `HomeScreen` is sufficient to update ALIVE/FADING/DEAD classification while deck is open | Integration Map | If wrong: a friend transitions DEAD mid-session and stays in deck; acceptable for this phase — deck is computed at mount |

---

## Open Questions

1. **Counter wording: "X more free" vs "X of Y"**
   - What we know: D-12 says `"2 more free"` format; D-13 says deck contains ALIVE + FADING
   - What's unclear: Should FADING friends count toward "free"? The word "free" in "2 more free" likely refers to the ALIVE status (free/maybe/busy mapping). Or does it mean "available to nudge" = all deck members?
   - Recommendation: Interpret as "ALIVE friends remaining" in current loop. If deck has 0 ALIVE friends, show "X to nudge" or hide counter. Leave exact wording to planner per Claude's Discretion.

2. **Auto-loop counter reset (D-11)**
   - What we know: Deck loops back to start. D-12 says counter updates as user skips.
   - What's unclear: Does the counter reset to full deck count when loop triggers, or continue counting total skips?
   - Recommendation: Reset counter to deck length on loop. This matches the "always something to swipe" mental model.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PanGestureHandler` + `useAnimatedGestureHandler` | `Gesture.Pan()` + `GestureDetector` | RNGH v2.0 (2022) | Old API still works in 2.30.0 but new API is preferred; avoids `useAnimatedGestureHandler` deprecation warning |
| `useNativeDriver` flag on `Animated.timing` | Not needed — Reanimated v4 `withTiming`/`withSpring` always runs on UI thread | Reanimated v3+ | Simpler API; no risk of accidentally forgetting `useNativeDriver: true` |
| Third-party swipe libraries (react-native-deck-swiper, rn-swiper-list) | Custom `Gesture.Pan` implementation | N/A | Third-party libs add dependency surface; rn-swiper-list is not installed; custom gives full control for D-10 (undo) |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: package.json] — `react-native-gesture-handler: ~2.30.0`, `react-native-reanimated: 4.2.1` installed
- [VERIFIED: node_modules inspection] — `rn-swiper-list` NOT installed; confirmed fallback path
- [VERIFIED: src/app/_layout.tsx] — `GestureHandlerRootView` not present; must be added
- [VERIFIED: src/components/home/RadarBubble.tsx] — `STATUS_COLORS`, `GRADIENT_COLORS`, DM nav pattern, `isInteraction: false` convention
- [VERIFIED: src/lib/heartbeat.ts] — `computeHeartbeatState`, `formatDistanceToNow` signatures
- [VERIFIED: src/theme/] — `RADII.xl = 16`, `SPACING.*`, `COLORS.*`, `FONT_SIZE.*`, `FONT_WEIGHT` (bold missing)
- [VERIFIED: src/screens/home/HomeScreen.tsx lines 127-130] — placeholder location confirmed
- [VERIFIED: eslint.config.js] — `campfire/no-hardcoded-styles` rule enforced project-wide
- [VERIFIED: .planning/STATE.md] — `isInteraction: false` locked decision; rn-swiper-list pending verification resolved

### Secondary (MEDIUM confidence)
- [ASSUMED] Gesture Handler v2 `Gesture.Pan()` + `activeOffsetX`/`failOffsetY` resolves `ScrollView` conflict — standard RNGH pattern, widely documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified installed, versions confirmed
- Architecture: HIGH — patterns derived directly from existing codebase files
- Pitfalls: HIGH — GestureHandlerRootView gap verified by code inspection; runOnJS requirement is RNGH v2 documented behavior
- Integration: HIGH — exact HomeScreen line numbers confirmed

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable libraries; RNGH v2 + Reanimated v4 are mature)
