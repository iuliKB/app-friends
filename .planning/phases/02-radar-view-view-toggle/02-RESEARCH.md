# Phase 2: Radar View & View Toggle - Research

**Researched:** 2026-04-11
**Domain:** React Native custom layout, Animated API, AsyncStorage persistence, HomeScreen refactor
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Organic scatter layout — bubbles placed in semi-random, non-overlapping positions (not a ring or grid pattern)
- **D-02:** 3-tier sizing: Free = large (64px), Maybe = medium (48px), Busy/DEAD = smallest (36px)
- **D-03:** Positions randomized on each HomeScreen mount (no deterministic seeding from friend_id)
- **D-04:** No self-avatar in the radar center — just friends. User's own status is shown in OwnStatusCard above
- **D-05:** Animated resize when a friend's status changes (smooth scale transition, not snap)
- **D-06:** Grid-cells + offset algorithm for non-overlapping placement: divide container into grid (e.g., 3x2 for 6 slots), offset each bubble randomly within its cell. Uses onLayout dimensions (RADAR-06)
- **D-07:** Subtle depth effect — bubbles higher in container appear slightly smaller/more muted (scale: 0.92, opacity multiplier: 0.85 for upper half)
- **D-08:** Plain dark background (COLORS.surface.base) — no concentric rings or gradient glow
- **D-09:** ALIVE friends show a single pulse ring expanding outward from the bubble and fading (like a heartbeat ping)
- **D-10:** Pulse ring color matches status: green (Free), yellow (Maybe), red (Busy)
- **D-11:** Free bubbles have a subtle status-colored gradient background behind the avatar (green-to-transparent). Eye-catching indicator of who's free
- **D-12:** Always show friend's display name below each bubble (small text)
- **D-13:** FADING friends at 60% opacity, no pulse ring (per RADAR-03)
- **D-14:** Radar/Cards segmented toggle placed below OwnStatusCard, above the friend view
- **D-15:** View switch uses crossfade animation (200-300ms). Resolved to 250ms (Claude's discretion)
- **D-16:** Toggle matches existing SegmentedControl style (dark card background, rounded segments, COLORS.surface.card, RADII.md)
- **D-17:** View preference persisted via AsyncStorage with `campfire:` prefix key (HOME-02)
- **D-18:** Tap any bubble → open DM with that friend (same supabase.rpc('get_or_create_dm_channel') pattern as HomeFriendCard)
- **D-19:** Long-press shows same action sheet as HomeFriendCard: "View profile" + "Plan with [name]..."
- **D-20:** Overflow row (7+ friends) shows small avatars with a tiny colored status dot. Horizontal scroll. Chip size: 34px (Claude's discretion)
- **D-21:** Tapping an overflow chip opens DM (same as bubble tap)
- **D-22:** Radar container has fixed height 320px (within 300–350px range). Overflow row always visible below.

### Claude's Discretion

- Exact grid cell dimensions and offset ranges for scatter algorithm
- Pulse ring animation timing (duration, opacity curve, ring expansion size): resolved to 1200ms expand + 600ms pause
- Gradient background opacity and falloff for Free bubbles: resolved to 30%/25%/20% per status
- Depth effect scaling factor: resolved to scale 0.92, opacity 0.85 for upper half
- Crossfade easing curve: resolved to Easing.inOut(Easing.ease), 250ms
- Overflow chip size: resolved to 34px
- Exact container height: resolved to 320px

### Deferred Ideas (OUT OF SCOPE)

- Cards view implementation — Phase 3 (this phase builds toggle + Radar only; Cards shows a placeholder)
- Nudge button on bubbles — v1.4 (NUDGE-01, NUDGE-02)
- Stat strip below radar — v1.4 (STAT-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RADAR-01 | Spatial bubble layout with up to 6 friends, sized by status (Free=large+gradient, Busy/Maybe=smaller, DEAD=smallest+muted) | D-02 sizing, D-06 grid-cell scatter algorithm, D-11 gradient |
| RADAR-02 | ALIVE friends display pulsing concentric ring animations around their avatar bubble | D-09 pulse ring, PulseRing sub-component with Animated.loop |
| RADAR-03 | FADING friends display at reduced opacity (60%) with no ring animation | D-13 confirmed, computeHeartbeatState returns 'fading' |
| RADAR-04 | When more than 6 friends exist, overflow friends appear in horizontal scroll row below radar with smaller avatar chips | D-20, D-22; FlatList horizontal below RadarContainer |
| RADAR-05 | Tapping any friend bubble or overflow chip opens a DM with that friend | D-18, D-21; supabase.rpc('get_or_create_dm_channel') pattern confirmed in HomeFriendCard |
| RADAR-06 | Bubble positions computed from container onLayout dimensions (not fixed Dimensions.get), adapting to all screen sizes | D-06; View onLayout callback provides containerWidth/Height |
| HOME-01 | User can switch between Radar and Cards views via a segmented toggle control | D-14, D-16; RadarViewToggle replicates SegmentedControl.tsx pattern |
| HOME-02 | View preference (Radar or Cards) persists across sessions via AsyncStorage | D-17; key `campfire:home_view` follows campfire: prefix convention |
| HOME-05 | Two-section friend split (Free grid + Everyone Else) is replaced by unified Radar/Cards views | HomeScreen.tsx currently uses freeFriends/otherFriends FlatList grids — both are removed in this phase |
</phase_requirements>

---

## Summary

Phase 2 is a purely front-end phase: no schema changes, no new npm dependencies, no Supabase changes. All required libraries (`expo-linear-gradient`, `@react-native-async-storage/async-storage`, `expo-haptics`) are already installed. The animation system must use only the React Native `Animated` API — zero Reanimated imports per established project constraint.

The core engineering challenge is the scatter layout algorithm. The grid-cells approach (D-06) is fully specified in the UI-SPEC: divide the 320px container into a 3×2 grid of 6 cells, place each bubble randomly within its cell with 8px safety margin. This is computed once per HomeScreen mount from `onLayout` dimensions — not from `Dimensions.get` — to satisfy RADAR-06.

The HomeScreen surgery is significant but well-bounded: replace the two-section FlatList grid (freeFriends + otherFriends) with a toggle + radar + overflow row. The existing `useHomeScreen` hook already provides the friend data in the shape needed. No data model changes.

**Primary recommendation:** Build three new components (RadarViewToggle, RadarBubble with PulseRing, OverflowChip) and one new hook (useViewPreference), then wire them into HomeScreen.tsx. All patterns are directly borrowed from existing codebase code.

---

## Standard Stack

### Core (already installed — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` Animated | 0.83.2 (built-in) | All animations: pulse ring, crossfade, resize | Project constraint — zero Reanimated; `isInteraction: false` required |
| `expo-linear-gradient` | 55.0.8 | Status-colored gradient behind Free/Maybe/Busy bubbles | Already in package.json; expo managed workflow |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persist `campfire:home_view` preference | Already in project; `campfire:` prefix pattern established |
| `expo-haptics` | 55.0.9 | Haptic feedback on toggle segment press | Already in project; used in SegmentedControl |

[VERIFIED: node_modules] — All four packages present and installed.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `AvatarCircle` (internal) | — | Avatar rendering inside each bubble and overflow chip | Always — don't re-implement initials/image fallback |
| `showActionSheet` (internal) | — | Long-press action sheet for bubble/chip | Always — cross-platform (iOS native ActionSheetIOS + Android Alert) |
| `computeHeartbeatState` (internal) | — | Determines ALIVE/FADING/DEAD per bubble | Always — mirrors server SQL logic |
| `supabase.rpc('get_or_create_dm_channel')` | — | Open or create DM on bubble tap | Always — same pattern as HomeFriendCard |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-linear-gradient` for gradient rings | Pure `View` with `borderColor` opacity | Linear gradient gives a more polished fade; expo-linear-gradient already installed |
| `Animated` API for pulse | Reanimated | Reanimated is forbidden by project constraint — no worklets for this phase |
| Grid-cell scatter | Force-directed / physics layout | Out of scope per REQUIREMENTS.md — "Non-deterministic, breaks visual regression, expensive on JS thread" |

**Installation:** No new installs needed. All dependencies are already present.

---

## Architecture Patterns

### Recommended Component Structure

```
src/
├── components/
│   └── home/
│       ├── RadarViewToggle.tsx      # Segmented control (Radar | Cards)
│       ├── RadarContainer.tsx       # Layout wrapper — onLayout, scatter algorithm, renders bubbles
│       ├── RadarBubble.tsx          # Single bubble: gradient bg + AvatarCircle + PulseRing + name label
│       ├── PulseRing.tsx            # Sub-component: single expanding ring animation (ALIVE only)
│       └── OverflowChip.tsx         # Compact avatar chip for overflow row
├── hooks/
│   └── useViewPreference.ts         # AsyncStorage read/write for campfire:home_view
└── screens/
    └── home/
        └── HomeScreen.tsx           # Modified: replace two-section FlatList with toggle + RadarContainer + overflow
```

### Pattern 1: Grid-Cell Scatter Layout (RADAR-06, D-06)

**What:** Compute bubble positions from `onLayout` container dimensions. Divide into 3×2 grid, randomize each bubble within its cell.

**When to use:** Inside `RadarContainer`, called once when `onLayout` fires or friends list changes.

```typescript
// Source: CONTEXT.md D-06 + UI-SPEC.md scatter algorithm section
function computeScatterPositions(
  containerWidth: number,
  containerHeight: number,
  bubbleSizes: number[] // diameters for up to 6 friends
): Array<{ x: number; y: number }> {
  const COLS = 3;
  const ROWS = 2;
  const cellWidth = containerWidth / COLS;
  const cellHeight = containerHeight / ROWS;
  const MARGIN = 8;

  return bubbleSizes.map((diameter, slot) => {
    const radius = diameter / 2;
    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    const originX = col * cellWidth;
    const originY = row * cellHeight;
    const minX = originX + radius + MARGIN;
    const maxX = originX + cellWidth - radius - MARGIN;
    const minY = originY + radius + MARGIN;
    const maxY = originY + cellHeight - radius - MARGIN;
    return {
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    };
  });
}
```

### Pattern 2: PulseRing Animation (RADAR-02, D-09)

**What:** Single `Animated.loop` that expands a circular border View from bubble size to 1.7× while fading out. `isInteraction: false` prevents blocking the JS thread.

**When to use:** Rendered only for ALIVE friends (not FADING, not DEAD).

```typescript
// Source: CONTEXT.md D-09, STATE.md D-04 pattern, OwnStatusCard.tsx isInteraction pattern
useEffect(() => {
  const anim = Animated.loop(
    Animated.sequence([
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.delay(600),
    ])
  );
  anim.start();
  return () => anim.stop();
}, []);
// ringAnim drives: scale (1.0 → 1.7) and opacity (0.7 → 0.0) via interpolate
```

### Pattern 3: Crossfade View Switch (HOME-01, D-15)

**What:** Two `Animated.Value` opacities (radarOpacity, cardsOpacity), cross-faded on toggle. Old view fades to 0, new view fades to 1, both over 250ms.

**When to use:** In HomeScreen when toggle segment changes.

```typescript
// Source: CONTEXT.md D-15
function switchView(newView: 'radar' | 'cards') {
  const fadeOut = view === 'radar' ? radarOpacity : cardsOpacity;
  const fadeIn = newView === 'radar' ? radarOpacity : cardsOpacity;
  Animated.parallel([
    Animated.timing(fadeOut, { toValue: 0, duration: 250, easing: Easing.inOut(Easing.ease), useNativeDriver: true, isInteraction: false }),
    Animated.timing(fadeIn, { toValue: 1, duration: 250, easing: Easing.inOut(Easing.ease), useNativeDriver: true, isInteraction: false }),
  ]).start();
  setView(newView);
}
```

### Pattern 4: AsyncStorage View Preference (HOME-02, D-17)

**What:** `useViewPreference` hook reads `campfire:home_view` on mount, writes on change.

**When to use:** Called in HomeScreen to initialize toggle state and persist on change.

```typescript
// Source: src/hooks/usePushNotifications.ts campfire: key prefix pattern
const HOME_VIEW_KEY = 'campfire:home_view';

export function useViewPreference() {
  const [view, setView] = useState<'radar' | 'cards'>('radar');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HOME_VIEW_KEY).then((stored) => {
      if (stored === 'radar' || stored === 'cards') setView(stored);
      setLoaded(true);
    });
  }, []);

  function persistView(v: 'radar' | 'cards') {
    setView(v);
    AsyncStorage.setItem(HOME_VIEW_KEY, v).catch(() => {});
  }

  return { view, loaded, persistView };
}
```

### Pattern 5: Animated Scale for Status Change (D-05)

**What:** Each `RadarBubble` holds an `Animated.Value` for scale, animated with `Animated.timing` on bubble size change. Wrapped with `Animated.View`.

**When to use:** When `friend.status` or heartbeat state changes between renders, causing a different bubble size.

```typescript
// Source: CONTEXT.md D-05, HomeScreen.tsx existing countScale pattern
useEffect(() => {
  Animated.timing(scaleAnim, {
    toValue: 1,
    duration: 300,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: true,
    isInteraction: false,
  }).start();
}, [bubbleSize]);
```

### Pattern 6: RadarViewToggle Replicating SegmentedControl

**What:** Two-segment toggle ("Radar" | "Cards") modeled exactly on `SegmentedControl.tsx`: `COLORS.surface.card` container, `RADII.md` border radius, `SPACING.xs` padding, 44px height, `COLORS.surface.overlay` active background, `Haptics.ImpactFeedbackStyle.Light` on press.

**When to use:** Replace the existing count heading and two-section FlatList in HomeScreen. Place below OwnStatusCard with `marginTop: SPACING.xl`.

### Anti-Patterns to Avoid

- **Dimensions.get in radar:** RADAR-06 requires `onLayout`. `Dimensions.get` fails on foldables and split-screen. Never use it for bubble positioning.
- **Reanimated imports:** Zero Reanimated in this phase. Project has `react-native-reanimated` installed but it must not be used here per codebase constraint.
- **Physics/force-directed layout:** Explicitly out of scope per REQUIREMENTS.md. Do not add any physics library.
- **Nested FlatList inside ScrollView:** The current HomeScreen uses a ScrollView with `scrollEnabled={false}` FlatLists. The overflow row is a horizontal FlatList inside the ScrollView — this is acceptable for the overflow chip row (horizontal scroll, does not conflict with vertical ScrollView). Do not make the overflow FlatList vertical.
- **hardcoded style values without eslint-disable:** ESLint enforces design token usage. Any non-token value needs `// eslint-disable-next-line campfire/no-hardcoded-styles` with a comment explaining why.
- **isInteraction: true on loops:** All `Animated.loop` calls must set `isInteraction: false`. See STATE.md accumulated decision from Phase 1.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar with image/initials fallback | Custom image + text component | `AvatarCircle` from `src/components/common/AvatarCircle.tsx` | Already handles null imageUri, initials extraction, borderRadius, onPress |
| Cross-platform action sheet | Custom modal action sheet | `showActionSheet` from `src/lib/action-sheet.ts` | Handles iOS native ActionSheetIOS + Android Alert.alert fallback |
| ALIVE/FADING/DEAD classification | Custom timestamp logic | `computeHeartbeatState` from `src/lib/heartbeat.ts` | Mirrors server SQL logic exactly; tested against the same thresholds (4h/8h) |
| DM channel creation | Custom RPC call | `supabase.rpc('get_or_create_dm_channel')` pattern from `HomeFriendCard.tsx` | Idempotent, handles race conditions server-side |
| Gradient background | `View` with border or shadow | `LinearGradient` from `expo-linear-gradient` | Already installed; provides proper radial-like falloff; no custom native code needed |
| Haptic on toggle press | Direct Haptics call in component | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` — same as SegmentedControl | Consistent feedback weight across all controls |

**Key insight:** Every interaction and data pattern in this phase has a working precedent in `HomeFriendCard.tsx` or `SegmentedControl.tsx`. Those two files are the primary reference implementations.

---

## Common Pitfalls

### Pitfall 1: onLayout fires before container is non-zero

**What goes wrong:** `onLayout` fires immediately with `{width: 0, height: 0}` on first render (before layout is complete), causing scatter positions to be computed at 0×0.

**Why it happens:** React Native calls `onLayout` synchronously on initial render with zero dimensions, then again after the real layout pass.

**How to avoid:** Guard position computation: `if (containerWidth === 0 || containerHeight === 0) return;`. Initialize positions state as `null` and render bubbles only when positions are set.

**Warning signs:** All bubbles clustered at top-left corner (0,0) on first render.

---

### Pitfall 2: Animated.loop leaks on unmount

**What goes wrong:** PulseRing animations continue running after the component unmounts (e.g., user navigates away), causing memory leaks and potential setState-after-unmount warnings.

**Why it happens:** `Animated.loop(...).start()` runs indefinitely. Without a cleanup, the animation object continues referencing component state.

**How to avoid:** Always call `anim.stop()` in the `useEffect` cleanup. Return `() => anim.stop()` from the effect.

**Warning signs:** "Warning: Can't perform a React state update on an unmounted component" in console after tab switching.

---

### Pitfall 3: Absolute-positioned bubbles inside ScrollView — touch not reaching bubbles

**What goes wrong:** Bubbles rendered with `position: 'absolute'` inside a `View` inside a `ScrollView` may not receive touch events if parent View has `pointerEvents: 'none'` or if the radar container View clips content.

**Why it happens:** React Native touch event routing can be blocked by parent Views without explicit `pointerEvents` configuration.

**How to avoid:** Set `pointerEvents="box-none"` on the RadarContainer's outer layout View so touches pass through to absolutely-positioned children. Each bubble should be a `Pressable` (not wrapped in another View) as the touch surface.

**Warning signs:** Tapping bubbles does nothing, but the press animation triggers on the container background instead.

---

### Pitfall 4: FlatList inside ScrollView — nested VirtualizedLists warning

**What goes wrong:** React Native logs "VirtualizedLists should never be nested inside plain ScrollViews" when the horizontal overflow FlatList is placed inside the main ScrollView.

**Why it happens:** Both the outer ScrollView and the inner FlatList are virtualized scroll containers.

**How to avoid:** The overflow row is a *horizontal* FlatList. Add `nestedScrollEnabled={true}` and keep it short (the FlatList is horizontal inside a vertical ScrollView, so there is no real axis conflict). Alternatively, replace the horizontal FlatList with a plain `ScrollView horizontal` + `map()` since overflow is at most O(N-6) items and N is small (friends list, not infinite).

**Warning signs:** Yellow warning in Metro/LogBox about nested VirtualizedLists.

---

### Pitfall 5: expo-linear-gradient on transparent background

**What goes wrong:** `LinearGradient` with `colors={['rgba(34,197,94,0.30)', 'transparent']}` renders as a hard white rectangle on older Android versions.

**Why it happens:** Some Android devices misinterpret `'transparent'` in gradient arrays as white.

**How to avoid:** Use `'rgba(34,197,94,0)'` instead of `'transparent'` as the second color stop. This is the correct pattern for expo-linear-gradient. [VERIFIED: expo-linear-gradient README — transparent vs rgba(r,g,b,0) guidance]

**Warning signs:** Gradient looks correct on iOS but shows a white box on Android.

---

### Pitfall 6: useEffect re-computing scatter on every re-render

**What goes wrong:** If scatter positions are computed inside `useEffect` with `friends` as a dependency, any status update (e.g., 60s heartbeat tick) re-randomizes bubble positions, causing visual jump.

**Why it happens:** `friends` array reference changes on every store update, triggering the effect.

**How to avoid:** Per D-03, positions are randomized on HomeScreen *mount* only. Use `useMemo` or store positions in a `useRef` seeded once. Do NOT depend on `friends` for position computation — only on `friends.length` (reshuffle only when the set of radar friends changes size).

**Warning signs:** Bubbles jump to new random positions every minute when the 60s heartbeat tick fires.

---

## Code Examples

### RadarViewToggle — exact SegmentedControl clone for 2 segments

```typescript
// Source: src/components/status/SegmentedControl.tsx (adapted for Radar|Cards)
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

type ViewMode = 'radar' | 'cards';

interface RadarViewToggleProps {
  value: ViewMode;
  onValueChange: (v: ViewMode) => void;
}

const SEGMENTS: { label: string; value: ViewMode }[] = [
  { label: 'Radar', value: 'radar' },
  { label: 'Cards', value: 'cards' },
];

export function RadarViewToggle({ value, onValueChange }: RadarViewToggleProps) {
  async function handlePress(v: ViewMode) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(v);
  }
  return (
    <View style={styles.container}>
      {SEGMENTS.map((seg) => {
        const isActive = value === seg.value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => handlePress(seg.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.md,
    padding: SPACING.xs,
    height: 44,
    marginHorizontal: SPACING.lg,
  },
  segment: { flex: 1, borderRadius: RADII.sm, alignItems: 'center', justifyContent: 'center' },
  activeSegment: { backgroundColor: COLORS.surface.overlay },
  label: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.regular, color: COLORS.text.secondary },
  activeLabel: { fontWeight: FONT_WEIGHT.semibold, color: COLORS.text.primary },
});
```

### LinearGradient usage for bubble gradient background

```typescript
// Source: expo-linear-gradient docs; colors array must use rgba(r,g,b,0) not 'transparent'
import { LinearGradient } from 'expo-linear-gradient';

// Free bubble gradient
<LinearGradient
  colors={['rgba(34,197,94,0.30)', 'rgba(34,197,94,0)']}
  style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
/>
// Maybe bubble gradient
<LinearGradient
  colors={['rgba(234,179,8,0.25)', 'rgba(234,179,8,0)']}
  style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
/>
// Busy bubble gradient
<LinearGradient
  colors={['rgba(239,68,68,0.20)', 'rgba(239,68,68,0)']}
  style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
/>
```

### Bubble sizing by heartbeat state and status

```typescript
// Source: CONTEXT.md D-02, D-13
function getBubbleSize(friend: FriendWithStatus): number {
  const hb = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);
  if (hb === 'dead') return 36;
  if (friend.status === 'free') return 64;
  if (friend.status === 'maybe') return 48;
  return 36; // busy
}
// FADING: same size as ALIVE counterpart, but opacity: 0.6 applied to the bubble wrapper View
```

### onLayout pattern for container dimensions

```typescript
// Source: RADAR-06; CONTEXT.md D-06
const [containerDims, setContainerDims] = useState<{ width: number; height: number } | null>(null);

<View
  style={styles.radarContainer}
  onLayout={(e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setContainerDims({ width, height });
  }}
  pointerEvents="box-none"
>
  {containerDims !== null && radarFriends.map((friend, i) => (
    <RadarBubble key={friend.friend_id} friend={friend} position={positions[i]} />
  ))}
</View>
```

### HomeFriendCard DM tap pattern (replicate exactly in RadarBubble)

```typescript
// Source: src/components/home/HomeFriendCard.tsx lines 45-56
async function handlePress() {
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

---

## HomeScreen Modification Scope

The current `HomeScreen.tsx` sections being removed (HOME-05):

```
REMOVE:
- countHeading Animated.Text (freeFriends count)
- countScale Animated.Value and its useEffect
- freeFriends FlatList (3-column grid)
- "Everyone Else" Text sectionLabel
- otherFriends FlatList (3-column grid)

ADD:
- useViewPreference() hook call
- RadarViewToggle component (below OwnStatusCard)
- Animated crossfade wrapper for view switching
- RadarContainer component (when view === 'radar')
- Cards placeholder View (when view === 'cards')
- OverflowScrollRow (when radarFriends.length < friends.length)
```

The `useHomeScreen` hook is **not modified** — it already provides `friends`, `freeFriends`, `otherFriends`. The radar will sort/partition friends differently than the existing split, but that logic lives in the new components, not in `useHomeScreen`.

**Friends partitioning for radar:**
- Radar slots (up to 6): all friends sorted by: ALIVE free first, then ALIVE maybe/busy, then FADING, then DEAD — up to 6 total
- Overflow (7+): remaining friends in a horizontal chip row
- Sort is by heartbeat priority then alphabetical within tier

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HomeScreen two-section FlatList grid | Radar + toggle + overflow row | Phase 2 | Removes freeFriends/otherFriends grid sections entirely |
| No view toggle | Segmented Radar/Cards toggle | Phase 2 | New state: `campfire:home_view` in AsyncStorage |
| No radar component | RadarContainer + RadarBubble + PulseRing | Phase 2 | New files in src/components/home/ |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `expo-linear-gradient` | Bubble status gradients | ✓ | 55.0.8 | Plain colored View at 30% opacity (less polished) |
| `@react-native-async-storage/async-storage` | View preference persistence | ✓ | 2.2.0 | — |
| `expo-haptics` | Toggle haptic feedback | ✓ | 55.0.9 | — |
| React Native `Animated` API | All animations | ✓ | built-in 0.83.2 | — |

**Missing dependencies with no fallback:** None — all required packages are installed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (visual regression) |
| Config file | `playwright.config.ts` (exists) |
| Quick run command | `npx playwright test tests/visual/design-system.spec.ts` |
| Full suite command | `npx playwright test` |

No unit test framework is configured (no jest.config, no vitest.config). Project test infrastructure is visual regression via Playwright on Expo web.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RADAR-01 | 6 bubbles sized correctly, gradient visible | visual regression | `npx playwright test tests/visual/radar-view.spec.ts` | ❌ Wave 0 |
| RADAR-02 | Pulse ring renders around ALIVE bubbles | visual regression (static frame) | `npx playwright test tests/visual/radar-view.spec.ts` | ❌ Wave 0 |
| RADAR-03 | FADING bubbles at 60% opacity | visual regression | `npx playwright test tests/visual/radar-view.spec.ts` | ❌ Wave 0 |
| RADAR-04 | Overflow row visible when friends > 6 | visual regression | `npx playwright test tests/visual/radar-view.spec.ts` | ❌ Wave 0 |
| RADAR-05 | Tap bubble → DM navigation | manual smoke test | — | manual-only |
| RADAR-06 | Bubble positions adapt to container size | manual smoke test (resize) | — | manual-only |
| HOME-01 | Toggle switches view | visual regression | `npx playwright test tests/visual/radar-view.spec.ts` | ❌ Wave 0 |
| HOME-02 | Preference persists across reload | manual smoke test | — | manual-only |
| HOME-05 | Old two-section grid is gone | visual regression | `npx playwright test tests/visual/radar-view.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** TypeScript compile check (`npx tsc --noEmit`)
- **Per wave merge:** `npx playwright test tests/visual/radar-view.spec.ts`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/visual/radar-view.spec.ts` — covers RADAR-01, RADAR-02, RADAR-03, RADAR-04, HOME-01, HOME-05
- [ ] Snapshot baselines for radar view states (ALIVE, FADING, overflow)

---

## Security Domain

Security enforcement applies. This phase introduces no new authentication, no new network calls (all Supabase calls replicate existing HomeFriendCard patterns), and no new data inputs from users.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No new auth flows |
| V3 Session Management | no | No session changes |
| V4 Access Control | no | Existing `get_or_create_dm_channel` RPC handles access control server-side |
| V5 Input Validation | no | No user text input in this phase |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rendering friends not authorized to view | Information Disclosure | `get_friends` RPC returns only accepted friendships for current user — server enforced |
| AsyncStorage view preference tampered | Tampering | Value validated on read: only `'radar'` or `'cards'` accepted; defaults to `'radar'` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `LinearGradient` from `expo-linear-gradient` works correctly in Expo Go on both iOS and Android at SDK 55 | Standard Stack | Gradient renders incorrectly on device; fallback: use semi-transparent `View` overlay instead |
| A2 | `onLayout` fires reliably before first user interaction on all target devices | Architecture Patterns | Bubbles may not render on first frame; guard with null check mitigates this |
| A3 | `friends` list from `useHomeStore` is small enough (< 50) that non-virtualized radar rendering is performant | Architecture Patterns | Performance degradation on users with many friends; radar only renders 6, overflow is a FlatList, so acceptable |

---

## Open Questions

1. **Friends sort order for radar slots**
   - What we know: The 6 radar slots should show the "most relevant" friends
   - What's unclear: Exact priority order — is it ALIVE-free first, then ALIVE-maybe/busy, then FADING? Or pure heartbeat priority regardless of mood?
   - Recommendation: Sort by: (1) ALIVE free, (2) ALIVE maybe, (3) ALIVE busy, (4) FADING (all moods), (5) DEAD. Within each tier, sort alphabetically. This mirrors the spirit of the old freeFriends-first layout.

2. **Bubble re-scatter on friends list change vs. mount-only**
   - What we know: D-03 says "positions randomized on each HomeScreen mount"
   - What's unclear: If a new friend is added via real-time subscription while HomeScreen is mounted, do positions re-scatter for the full radar?
   - Recommendation: Re-scatter only when radar friend count changes (i.e., `radarFriends.length` changes). Stable when friends just update their status.

---

## Sources

### Primary (HIGH confidence)

- `src/components/home/HomeFriendCard.tsx` — DM tap, long-press action sheet, heartbeat computation pattern [VERIFIED: codebase]
- `src/components/status/SegmentedControl.tsx` — Toggle design pattern, haptics, segment style [VERIFIED: codebase]
- `src/components/common/AvatarCircle.tsx` — Avatar component interface and capabilities [VERIFIED: codebase]
- `src/lib/heartbeat.ts` — ALIVE/FADING/DEAD thresholds (4h/8h) [VERIFIED: codebase]
- `src/lib/action-sheet.ts` — Cross-platform action sheet [VERIFIED: codebase]
- `src/theme/*.ts` — All design tokens (colors, spacing, radii, typography) [VERIFIED: codebase]
- `src/hooks/useHomeScreen.ts` — Friend data shape, freeFriends/otherFriends partition [VERIFIED: codebase]
- `src/screens/home/HomeScreen.tsx` — Current structure being modified [VERIFIED: codebase]
- `node_modules/expo-linear-gradient` v55.0.8 — Gradient library availability [VERIFIED: node_modules]
- `.planning/phases/02-radar-view-view-toggle/02-UI-SPEC.md` — Full component/spacing/animation contract [VERIFIED: planning artifact]
- `.planning/phases/02-radar-view-view-toggle/02-CONTEXT.md` — All locked decisions D-01 through D-22 [VERIFIED: planning artifact]

### Secondary (MEDIUM confidence)

- expo-linear-gradient `transparent` vs `rgba(r,g,b,0)` pitfall — known issue in React Native gradient libraries [ASSUMED — standard community knowledge, not verified against specific SDK55 release notes]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules
- Architecture: HIGH — all patterns verified from codebase + UI-SPEC
- Pitfalls: MEDIUM-HIGH — major pitfalls verified from codebase patterns; expo-linear-gradient transparent pitfall is ASSUMED

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable tech stack; Expo SDK and RN version unlikely to change before Phase 2 execution)
