# Phase 1: Status Pill & Bottom Sheet — Research

**Researched:** 2026-04-10
**Domain:** React Native custom bottom sheet (Modal + Animated), looping pulse animation, AsyncStorage session gate, HomeScreen refactor
**Confidence:** HIGH — all findings grounded in direct codebase inspection; no external library research needed (zero new deps)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Custom bottom sheet using `Modal` + `Animated.timing(translateY)` — NOT Reanimated, NOT @gorhom/bottom-sheet. Follow `FriendActionSheet` pattern.
- **D-02:** Sheet auto-dismisses on status commit by watching `useStatusStore.currentStatus` changes.
- **D-03:** Sheet has backdrop tap-to-dismiss, swipe-down-to-dismiss via PanResponder, and Android BackHandler support.
- **D-04:** `Animated.loop` for pulse animation must use `isInteraction: false` to avoid blocking FlatList row rendering.
- **D-05:** New `OwnStatusPill` component under `src/components/status/` — separate from existing read-only `StatusPill` in `src/components/friends/`.
- **D-06:** Pill is passed to `ScreenHeader` via its existing `rightAction` prop slot.
- **D-07:** Pill displays: heartbeat-colored dot (green=ALIVE, yellow=FADING, gray=DEAD/none) + mood label + context tag + window + edit icon (✎).
- **D-08:** When no status is set, pill shows: user's display name + "Tap to set your status".
- **D-09:** Pulse animation gated by `AsyncStorage` key `campfire:session_count` — integer incremented on app foreground, pulse disabled when count > 3.
- **D-10:** Pulse only fires when user has no active status (DEAD heartbeat or null currentStatus) AND session count ≤ 3.
- **D-11:** MoodPicker and ReEngagementBanner removed from HomeScreen in the same change.
- **D-12:** The "Update" action from ReEngagementBanner is replaced by the status pill tap.
- **D-13:** Cold-start heading ("What's your status today?") is also removed.

### Claude's Discretion
- Sheet height, animation spring/timing curves
- Exact pill layout (horizontal arrangement of dot + text + icon)
- Backdrop opacity and animation timing
- Whether edit icon uses Unicode ✎ or an icon component

### Deferred Ideas (OUT OF SCOPE)
- Lightweight nudge ping notification — v1.4 (NUDGE-01, NUDGE-02)
- Stat strip below friend views — v1.4 (STAT-01)
- ReEngagementBanner "Keep it" / "Heads down" quick actions — if users miss these shortcuts, consider adding to bottom sheet in future
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PILL-01 | User sees compact status pill in header: mood + context tag + window | `formatWindowLabel` + `StatusPill` label-building pattern; OwnStatusPill reads `useStatusStore.currentStatus` |
| PILL-02 | User taps pill → bottom sheet with full MoodPicker rises | `FriendActionSheet` Modal + Animated.timing pattern; `MoodPicker` moved in as-is |
| PILL-03 | Selecting a window auto-commits and auto-dismisses the sheet | `MoodPicker` already calls `setStatus` on window tap; `onCommit` prop added; sheet watches `useStatusStore.currentStatus` |
| PILL-04 | Edit icon (✎) permanent visual affordance | Layout: dot + text + icon row inside `TouchableOpacity` |
| PILL-05 | First 2–3 sessions with no active status → subtle pulse animation | `Animated.loop` scale+opacity; gated by `campfire:session_count` AsyncStorage key |
| PILL-06 | Dot color matches heartbeat state (green/yellow/gray) | `computeHeartbeatState` → dot color via `COLORS.status.free/maybe` or `COLORS.text.secondary` |
| PILL-07 | No status → pill shows name + "Tap to set your status" | display_name from Supabase profiles (see Open Questions); empty-state text |
| HOME-03 | Inline MoodPicker removed from HomeScreen | Remove MoodPicker render block + `toggleContainer` + `moodPickerYRef` + `onLayout` wiring |
| HOME-04 | ReEngagementBanner removed | Remove ReEngagementBanner render + `handleUpdatePressed` + `scrollRef` usage |
</phase_requirements>

---

## Summary

Phase 1 is a surgical HomeScreen refactor plus two new components (`OwnStatusPill`, `StatusPickerSheet`). The codebase already has every primitive needed: `FriendActionSheet.tsx` is a complete, working Modal + `Animated.timing(translateY)` bottom sheet that the new sheet can replicate verbatim for its motion model. `MoodPicker.tsx` moves into the sheet with one new optional `onCommit` prop — nothing else changes. `ScreenHeader` already has an unused `rightAction` slot. `useStatusStore` is already a Zustand reactive store that the pill can subscribe to for live status display and auto-dismiss.

The only genuinely new logic in this phase is (1) the `PanResponder` swipe-down dismiss on the sheet (not in `FriendActionSheet` — it only does backdrop tap + BackHandler), (2) the `Animated.loop` pulse on the pill, and (3) the `campfire:session_count` AsyncStorage gate. All three are standard RN built-in patterns with no external dependencies.

One planning-level gap: `display_name` for the pill's empty state (D-08) is not available from any existing hook on the Home screen. The profile screen fetches it directly from Supabase on mount. The planner must decide whether to add a shared `useOwnProfile` hook or have `OwnStatusPill` do its own one-time fetch.

**Primary recommendation:** Replicate `FriendActionSheet` motion model exactly; add `PanResponder` swipe-down on top; move `MoodPicker` into sheet with `onCommit`; build `OwnStatusPill` as a simple `TouchableOpacity` row subscribed to `useStatusStore`.

---

## Standard Stack

### Core (all already installed — zero new deps)
| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| `react-native` Animated | built-in | `translateY` slide, `Animated.loop` pulse | Already used throughout |
| `react-native` Modal | built-in | Bottom sheet host | Used in `FriendActionSheet` |
| `react-native` PanResponder | built-in | Swipe-down dismiss gesture | Standard RN pattern |
| `react-native` BackHandler | built-in | Android back-button dismiss | Used in `FriendActionSheet` |
| `@react-native-async-storage/async-storage` | 2.2.0 | `campfire:session_count` persistence | Already installed |
| `expo-haptics` | installed | Pill tap + commit haptic | Used in `MoodPicker` |
| `@expo/vector-icons` (Ionicons) | installed | Edit icon (if using icon component) | Used throughout |

**Installation:** No new packages needed.

[VERIFIED: direct package.json inspection — `react-native-gesture-handler` and `react-native-reanimated` are installed but zero Reanimated imports exist in src/; all animation is RN built-in Animated]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RN Modal + Animated | @gorhom/bottom-sheet | Broken on Reanimated v4; explicitly out-of-scope in REQUIREMENTS.md |
| RN PanResponder | react-native-gesture-handler | GestureHandler is installed but follows Reanimated — not the project pattern |
| Animated.loop | Reanimated `withRepeat` | Reanimated not used in codebase; not allowed by D-01/D-04 |

---

## Architecture Patterns

### Recommended File Structure (new files only)
```
src/
├── components/
│   └── status/
│       ├── OwnStatusPill.tsx        # NEW — header pill (PILL-01..07)
│       └── StatusPickerSheet.tsx    # NEW — Modal bottom sheet wrapping MoodPicker
```

Modifications:
- `src/components/status/MoodPicker.tsx` — add optional `onCommit?: () => void` prop
- `src/screens/home/HomeScreen.tsx` — remove MoodPicker/ReEngagementBanner/heading; add OwnStatusPill + StatusPickerSheet
- `src/components/common/ScreenHeader.tsx` — no changes needed (rightAction slot already exists)

### Pattern 1: Bottom Sheet — FriendActionSheet Template

**What:** Modal with `Animated.timing(translateY)` slide-in. Backdrop is `TouchableWithoutFeedback` over an `absoluteFillObject` View. The animated sheet is `position: absolute, bottom: 0, left: 0, right: 0`.

**Exact motion model from FriendActionSheet (lines 37-51):**
```typescript
// Source: src/components/friends/FriendActionSheet.tsx lines 37-51
const translateY = useRef(new Animated.Value(300)).current;

useEffect(() => {
  if (visible) {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  } else {
    translateY.setValue(300);  // instant reset when dismissed
  }
}, [visible, translateY]);
```

**Key implementation detail:** `FriendActionSheet` resets `translateY` to 300 instantly on close (no slide-out animation). The StatusPickerSheet should mirror this to avoid the sheet being visible during the Modal's fade-out. If a slide-out is desired, use `Animated.timing` to `toValue: 300` and call `onClose` in the `.start()` callback.

**BackHandler (lines 53-60):**
```typescript
// Source: src/components/friends/FriendActionSheet.tsx lines 53-60
useEffect(() => {
  if (!visible) return;
  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    onClose();
    return true;  // prevents default back behavior
  });
  return () => handler.remove();
}, [visible, onClose]);
```

**What:** PanResponder swipe-down dismiss — NOT in FriendActionSheet; must be added.

**Standard RN PanResponder pattern for swipe-down:**
```typescript
// Source: [ASSUMED] — standard RN PanResponder pattern, no external source
const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 80 || gestureState.vy > 0.5) {
        // Threshold crossed — dismiss
        Animated.timing(translateY, {
          toValue: 600,
          duration: 200,
          useNativeDriver: true,
        }).start(onClose);
      } else {
        // Snap back
        Animated.timing(translateY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    },
  })
).current;
```

Apply `{...panResponder.panHandlers}` to the `dragHandle` View (or the full sheet View).

**Auto-dismiss on commit (D-02):**
```typescript
// Source: src/components/status/MoodPicker.tsx lines 39-42 — existing pattern
// MoodPicker already collapses on currentStatus change via:
useEffect(() => {
  setExpandedMood(null);
  setSelectedTag(null);
}, [currentStatus?.status, currentStatus?.status_expires_at]);

// StatusPickerSheet adds the same reactive pattern:
const currentStatus = useStatusStore((s) => s.currentStatus);
const prevStatusRef = useRef(currentStatus);
useEffect(() => {
  if (prevStatusRef.current !== currentStatus && currentStatus !== null) {
    onClose();  // auto-dismiss after commit
  }
  prevStatusRef.current = currentStatus;
}, [currentStatus, onClose]);
```

### Pattern 2: Pulse Animation — Animated.loop with isInteraction: false (D-04)

**What:** Looping scale + opacity animation on the status dot when no active status exists AND session_count ≤ 3.

```typescript
// Source: [ASSUMED] — standard RN Animated.loop pattern
const pulseAnim = useRef(new Animated.Value(1)).current;

useEffect(() => {
  if (!shouldPulse) {
    pulseAnim.setValue(1);
    return;
  }
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.35,
        duration: 700,
        useNativeDriver: true,
        isInteraction: false,  // D-04: prevents blocking FlatList rendering
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        isInteraction: false,
      }),
    ])
  );
  loop.start();
  return () => loop.stop();
}, [shouldPulse, pulseAnim]);
```

`shouldPulse` = `(heartbeatState === 'dead' || currentStatus === null) && sessionCount <= 3`

**isInteraction: false — why it matters:** RN's `InteractionManager` defers FlatList rendering until all `isInteraction: true` animations complete. Without `isInteraction: false`, a looping animation blocks FlatList row renders indefinitely. [VERIFIED: React Native Animated API docs — `isInteraction` is a property on all Animated.timing/spring/decay configs]

**Dot animation approach:** Animate the dot View's `transform: [{ scale: pulseAnim }]`. Keep it simple — scale only. The `Animated.View` wrapper must surround only the dot, not the whole pill, to avoid scaling the text.

### Pattern 3: AsyncStorage Session Count Gate (D-09, D-10)

**Existing pattern from usePushNotifications.ts (campfire: prefix convention):**
```typescript
// Source: src/hooks/usePushNotifications.ts lines 8-10
const NOTIFICATIONS_ENABLED_KEY = 'campfire:notifications_enabled';
const PUSH_PROMPT_ELIGIBLE_KEY = 'campfire:push_prompt_eligible';
const PUSH_PRE_PROMPT_SEEN_KEY = 'campfire:push_pre_prompt_seen';
```

**New key:**
```typescript
const SESSION_COUNT_KEY = 'campfire:session_count';
```

**Where to increment:** In `HomeScreen`'s mount effect (or an `AppState` listener), increment the count once per foreground session. Cap it at 4 after threshold to avoid unbounded growth.

```typescript
// Source: [ASSUMED] — standard AsyncStorage read/write pattern
async function incrementSessionCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(SESSION_COUNT_KEY);
  const count = raw ? parseInt(raw, 10) : 0;
  const next = count + 1;
  await AsyncStorage.setItem(SESSION_COUNT_KEY, String(next));
  return next;
}
```

**Reading in OwnStatusPill:** The pill reads sessionCount from state (passed as prop or via a hook). Avoid reading AsyncStorage directly inside the render path — read once in HomeScreen or a `useEffect` and pass down.

### Pattern 4: MoodPicker onCommit Prop

**MoodPicker currently (lines 63-70 of MoodPicker.tsx):**
```typescript
async function handleWindowPress(mood: StatusValue, windowId: WindowId) {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const { error } = await setStatus(mood, selectedTag, windowId);
  if (error) {
    Alert.alert('Error', "Couldn't update status. Try again.");
    return;
  }
  // Commit successful — Zustand sync will collapse the picker via the effect above
}
```

**Addition (3 lines):**
```typescript
// In MoodPicker props interface:
onCommit?: () => void;

// At the end of handleWindowPress success path:
if (!error) {
  onCommit?.();
}
```

This is belt-and-braces alongside the reactive auto-dismiss (D-02). Both mechanisms can coexist — `onCommit` fires immediately, auto-dismiss fires when the Zustand store updates (may be one tick later).

### Pattern 5: OwnStatusPill Layout

**ScreenHeader rightAction slot (line 18):**
```typescript
// Source: src/components/common/ScreenHeader.tsx line 18
{rightAction}
// Inside a flex row with justifyContent: 'space-between'
// Left: title (flex: 1). Right: rightAction (no flex — natural width)
```

**Pill structure:**
```typescript
<TouchableOpacity
  onPress={onPress}
  activeOpacity={0.8}
  accessibilityRole="button"
  accessibilityLabel={hasStatus ? "Edit your status" : "Set your status"}
  style={styles.pill}
>
  <Animated.View style={[styles.dot, { transform: [{ scale: pulseAnim }] }]} />
  <Text style={styles.label} numberOfLines={1}>{pillText}</Text>
  <Text style={styles.editIcon}>✎</Text>
</TouchableOpacity>
```

**Dot colors:**
```typescript
// Source: src/theme/colors.ts
const DOT_COLOR: Record<HeartbeatState, string> = {
  alive: COLORS.status.free,     // '#22c55e' — green
  fading: COLORS.status.maybe,   // '#eab308' — yellow
  dead: COLORS.text.secondary,   // '#9ca3af' — gray
};
// No-status state: also COLORS.text.secondary (gray)
```

**Pill label logic:**
```typescript
// Active status
const windowLabel = formatWindowLabel(currentStatus.status_expires_at);
const segments = [MOOD_LABEL[currentStatus.status]];
if (currentStatus.context_tag) segments.push(currentStatus.context_tag);
if (windowLabel) segments.push(windowLabel);
pillText = segments.join(' · ');  // "Free · grab a coffee · until 6pm"

// No status
pillText = `${displayName} · Tap to set your status`;
```

### Pattern 6: HomeScreen Removal (D-11, D-12, D-13)

**Dead code to remove:**

| Lines | What | Notes |
|-------|------|-------|
| 19 | `import { MoodPicker }` | Remove |
| 20 | `import { ReEngagementBanner }` | Remove |
| 47–53 | `deadOnOpenRef`, `hasCommittedThisSession`, `showDeadHeading` | D-13 removal |
| 57–61 | `scrollRef`, `moodPickerYRef`, `handleUpdatePressed` | D-12 removal |
| 86 | `ref={scrollRef}` on ScrollView | Remove ref; keep ScrollView |
| 104 | `<ReEngagementBanner onUpdatePressed={handleUpdatePressed} />` | Remove |
| 107 | `{showDeadHeading && <Text ...>}` | D-13 removal |
| 110–117 | `<View style={styles.toggleContainer} onLayout={...}><MoodPicker /></View>` | Remove |
| 199–203 | `headerContainer` and `toggleContainer` styles | Remove unused styles |

**Additions to HomeScreen:**
- Import `OwnStatusPill` and `StatusPickerSheet`
- State: `const [sheetVisible, setSheetVisible] = useState(false)`
- Session count effect (increment once per mount)
- Pass `rightAction={<OwnStatusPill onPress={() => setSheetVisible(true)} sessionCount={sessionCount} />}` to `ScreenHeader`
- Render `<StatusPickerSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />` at root level (sibling of ScrollView, before FAB)

**ScreenHeader usage change:**
```typescript
// Before:
<ScreenHeader title="Campfire" />

// After:
<ScreenHeader
  title="Campfire"
  rightAction={
    <OwnStatusPill
      onPress={() => setSheetVisible(true)}
      sessionCount={sessionCount}
    />
  }
/>
```

Note: `ScreenHeader` is inside a `View` with `paddingHorizontal: SPACING.lg`. The pill will naturally sit to the right of "Campfire" title within that padding. No ScreenHeader code changes needed.

### Anti-Patterns to Avoid

- **Don't call AsyncStorage inside render or useEffect dependency arrays.** Read once in a `useEffect` with `[]` deps; store result in local state.
- **Don't use `isInteraction: true` (default) on the pulse loop.** Will defer FlatList renders (D-04).
- **Don't use Reanimated `useSharedValue` / `withTiming`.** Zero Reanimated imports in src — don't add the first one.
- **Don't import `react-native-gesture-handler` Gesture API.** GestureHandler is installed but follows Reanimated patterns; use RN PanResponder instead.
- **Don't add `onCommit` to MoodPicker's style logic.** It's a side-effect prop — doesn't change layout or appearance.
- **Don't remove `scrollRef` from ScrollView before confirming it isn't used elsewhere.** In the current code, `scrollRef` is only used for `handleUpdatePressed` (being removed). Safe to remove both.
- **Don't animate `translateY` in `useNativeDriver: false` mode.** The sheet uses `transform`, which is native driver compatible. Always `useNativeDriver: true` for performance.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom sheet slide-in | Custom spring physics | `Animated.timing(translateY, { duration: 250 })` | Already proven in FriendActionSheet |
| Swipe-down threshold | Custom gesture math | `PanResponder` with `dy > 80 \|\| vy > 0.5` | Standard RN pattern |
| Status label formatting | Custom string building | `formatWindowLabel()` from `src/lib/windows.ts` | Already handles all 5 window types |
| Heartbeat dot color | Custom color logic | `computeHeartbeatState()` from `src/lib/heartbeat.ts` | Mirrors server logic exactly |
| Mood label mapping | New Record | Reuse `MOOD_LABEL` pattern from `StatusPill.tsx` or `ReEngagementBanner.tsx` | Already defined in 3 places — consider extracting |

**Key insight:** Every display primitive already exists. This phase assembles components, not logic.

---

## Common Pitfalls

### Pitfall 1: Auto-Dismiss Race Between onCommit and Zustand Watch
**What goes wrong:** `onCommit` closes the Modal immediately; the MoodPicker useEffect then tries to setState on an unmounted component (the `expandedMood`/`selectedTag` setters inside the now-closed sheet).

**Why it happens:** Modal `visible={false}` unmounts children (or makes them invisible), but the MoodPicker's useEffect for `currentStatus` may fire after the sheet closes.

**How to avoid:** Only close the Modal via the `onRequestClose`/`onClose` path, not by unmounting. The Modal remains mounted; `visible` prop controls visibility. React Native Modal keeps children mounted when `visible` changes, so setState on them is safe. [VERIFIED: React Native Modal docs — children are NOT unmounted on `visible=false` by default]

**Warning signs:** "Can't perform a React state update on an unmounted component" warnings.

### Pitfall 2: PanResponder Conflicts with MoodPicker's Internal ScrollView
**What goes wrong:** User tries to scroll the horizontal preset chips inside MoodPicker; PanResponder on the sheet intercepts the gesture and triggers a dismiss.

**Why it happens:** `onMoveShouldSetPanResponder` fires before the ScrollView claims the gesture.

**How to avoid:** Attach PanResponder ONLY to the `dragHandle` View (the pill at the top), not the full sheet. The drag handle has no scrollable children, so there's no conflict.

```typescript
// Apply panHandlers to drag handle only:
<View style={styles.dragHandle} {...panResponder.panHandlers} />
// NOT to the full Animated.View sheet
```

### Pitfall 3: session_count Increments Multiple Times Per Session
**What goes wrong:** The effect that reads/increments session_count runs on every HomeScreen mount. If the user navigates away and back (tab switch), the count increments again within the same app foreground.

**Why it happens:** HomeScreen mounts on every tab navigation; the increment effect has no session-level guard.

**How to avoid:** Use a module-level or ref-level flag to ensure the increment happens only once per app foreground, not once per mount.

```typescript
// Module-level flag (resets only on app restart):
let sessionCountedThisSession = false;

useEffect(() => {
  if (sessionCountedThisSession) return;
  sessionCountedThisSession = true;
  incrementSessionCount().then(setSessionCount);
}, []);
```

### Pitfall 4: display_name Not Available on HomeScreen
**What goes wrong:** The pill's empty state (D-08) needs `display_name`. `useStatus` and `useStatusStore` don't expose it. `useAuthStore` only holds the Supabase `Session` (no profile fields). ProfileScreen fetches it locally.

**Why it happens:** No shared `useProfile` hook exists. Each screen fetches profile data independently.

**How to avoid:** Two valid options:
1. Add a minimal `useOwnDisplayName` hook that fetches `display_name` once and memoizes it.
2. Derive from `session.user.user_metadata.full_name` (set during Google OAuth) as a fallback — but this is not reliable for email auth users.

**Recommendation (Claude's Discretion):** Option 1 — small dedicated hook with one-time Supabase fetch, no polling. The fetch is fast (single row by PK); cache it in module scope or Zustand if needed across renders.

**Warning signs:** Empty string or undefined in the pill empty state.

### Pitfall 5: Backdrop Touch Passes Through to Content Below
**What goes wrong:** Tapping the backdrop calls `onClose` but also fires a tap on HomeScreen content behind the modal (FlatList items).

**Why it happens:** `TouchableWithoutFeedback` stops the event from propagating, but `Modal` with `transparent={true}` may not fully block touches in all RN versions.

**How to avoid:** Follow FriendActionSheet exactly — `TouchableWithoutFeedback` wrapping the backdrop View. This is the established pattern. [VERIFIED: FriendActionSheet.tsx lines 79-81]

### Pitfall 6: Pulse loop.stop() Not Cleaning Up on Rerender
**What goes wrong:** `shouldPulse` changes from true → false, the old loop is stopped, but `pulseAnim` is left at a non-1 scale value, causing the dot to appear permanently enlarged.

**How to avoid:** Reset `pulseAnim` to 1 before starting and when stopping.

```typescript
useEffect(() => {
  if (!shouldPulse) {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);  // reset scale
    return;
  }
  // ... start loop
}, [shouldPulse, pulseAnim]);
```

---

## Code Examples

### StatusPickerSheet — Minimal Skeleton
```typescript
// Source: modeled on src/components/friends/FriendActionSheet.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated, BackHandler, Modal, PanResponder,
  StyleSheet, TouchableWithoutFeedback, View,
} from 'react-native';
import { COLORS, RADII, SPACING } from '@/theme';
import { useStatusStore } from '@/stores/useStatusStore';
import { MoodPicker } from '@/components/status/MoodPicker';

interface StatusPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function StatusPickerSheet({ visible, onClose }: StatusPickerSheetProps) {
  const translateY = useRef(new Animated.Value(600)).current;
  const currentStatus = useStatusStore((s) => s.currentStatus);
  const prevStatusRef = useRef(currentStatus);

  // Slide in/out
  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0, duration: 250, useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(600);
    }
  }, [visible, translateY]);

  // Auto-dismiss on commit (D-02)
  useEffect(() => {
    if (!visible) return;
    if (prevStatusRef.current !== currentStatus && currentStatus !== null) {
      onClose();
    }
    prevStatusRef.current = currentStatus;
  }, [currentStatus, visible, onClose]);

  // Android back button (D-03)
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose(); return true;
    });
    return () => handler.remove();
  }, [visible, onClose]);

  // Swipe-down dismiss (D-03) — on drag handle only
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: 600, duration: 200, useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.timing(translateY, {
            toValue: 0, duration: 150, useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragHandle} {...panResponder.panHandlers} />
        <MoodPicker onCommit={onClose} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface.card,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  dragHandle: {
    width: 40, height: 4,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
});
```

### OwnStatusPill — Core Logic
```typescript
// Source: derived from src/components/friends/StatusPill.tsx label-building pattern
import { COLORS } from '@/theme';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { formatWindowLabel } from '@/lib/windows';
import { useStatusStore } from '@/stores/useStatusStore';

// Dot color map (D-07)
const DOT_COLOR = {
  alive: COLORS.status.free,      // green
  fading: COLORS.status.maybe,    // yellow
  dead: COLORS.text.secondary,    // gray
} as const;

// Inside OwnStatusPill component:
const currentStatus = useStatusStore((s) => s.currentStatus);
const heartbeatState = computeHeartbeatState(
  currentStatus?.status_expires_at ?? null,
  currentStatus?.last_active_at ?? null,
);
const dotColor = currentStatus ? DOT_COLOR[heartbeatState] : COLORS.text.secondary;

// Pill text
let pillText: string;
if (!currentStatus || heartbeatState === 'dead') {
  pillText = `${displayName} · Tap to set your status`;
} else {
  const MOOD_LABEL = { free: 'Free', maybe: 'Maybe', busy: 'Busy' };
  const segments = [MOOD_LABEL[currentStatus.status]];
  if (currentStatus.context_tag) segments.push(currentStatus.context_tag);
  const windowLabel = formatWindowLabel(currentStatus.status_expires_at);
  if (windowLabel) segments.push(windowLabel);
  pillText = segments.join(' · ');
}
```

### Pulse Animation — isInteraction: false
```typescript
// Source: [ASSUMED] — standard RN pattern; isInteraction property documented in RN Animated API
const pulseAnim = useRef(new Animated.Value(1)).current;
const shouldPulse = (!currentStatus || heartbeatState === 'dead') && sessionCount <= 3;

useEffect(() => {
  if (!shouldPulse) {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    return;
  }
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.4, duration: 700, useNativeDriver: true, isInteraction: false,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1, duration: 700, useNativeDriver: true, isInteraction: false,
      }),
    ])
  );
  loop.start();
  return () => loop.stop();
}, [shouldPulse, pulseAnim]);
```

---

## State of the Art

| Old Approach | Current Approach | Applies Here |
|--------------|-----------------|-------------|
| Inline status picker on HomeScreen | Header pill + bottom sheet | This phase |
| ReEngagementBanner scroll-to-picker | Pill tap opens sheet | This phase |
| Cold-start "What's your status?" heading | Pill empty state "Tap to set your status" | This phase |
| FriendActionSheet: backdrop + BackHandler only | StatusPickerSheet: + PanResponder swipe-down | New addition |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PanResponder swipe-down pattern with `dy > 80 \|\| vy > 0.5` threshold | Pattern 1, Pitfall 2 | Dismiss too sensitive or not sensitive enough — adjust threshold values |
| A2 | Module-level `sessionCountedThisSession` flag prevents double-increment on tab navigation | Pattern 3, Pitfall 3 | Session count inflates faster than intended; pulse disappears after 1 session |
| A3 | `Animated.loop` with `isInteraction: false` is available in RN 0.74+ (Expo SDK 55) | Pattern 2 | If not, use workaround: add `.start()` callback that restarts animation |
| A4 | PanResponder on drag handle only (not full sheet) resolves ScrollView conflict | Pitfall 2 | If not, add `onStartShouldSetPanResponderCapture: () => false` to inner ScrollViews |
| A5 | `display_name` for empty state pill requires a new fetch or hook | Pitfall 4, Open Questions | If session metadata has it, avoids extra fetch |

---

## Open Questions (RESOLVED)

1. **display_name source for empty-state pill (PILL-07)** — RESOLVED
   - Decision: Derive from `session.user.user_metadata.display_name` via `useAuthStore`. Falls back to "You" if empty. No extra DB fetch needed.

2. **Sheet height — full-height or partial?** — RESOLVED
   - Decision: `maxHeight: screenHeight * 0.75` with inner ScrollView. Claude's discretion.

3. **Initial `translateY` value for StatusPickerSheet** — RESOLVED
   - Decision: Use 600 (not 300 like FriendActionSheet) since MoodPicker content is taller. Initial value and swipe-dismiss target both use 600.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is pure React Native code changes. No external CLIs, services, databases, or runtimes beyond what's already running for the Expo dev server.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (visual regression) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test --project=mobile` |
| Full suite command | `npx playwright test` |
| Update baselines | `npx playwright test --update-snapshots` |

No unit test framework detected in `src/` (no jest.config in project root, no `*.test.ts` files in src). All project tests are Playwright visual regression tests in `tests/visual/`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PILL-01 | Status pill visible in header with mood/tag/window | visual | `npx playwright test --project=mobile -g "home screen"` | Baseline update needed |
| PILL-02 | Tap pill → sheet rises | visual | `npx playwright test --project=mobile -g "home screen"` | New interaction needed |
| PILL-03 | Window tap → sheet dismisses | visual | manual (interaction chain too complex for current spec) | — |
| PILL-04 | Edit icon visible | visual | `npx playwright test --project=mobile -g "home screen"` | Baseline update needed |
| PILL-05 | Pulse animation on no-status state | visual / manual | manual (animation timing hard to capture) | — |
| PILL-06 | Dot color matches heartbeat state | visual | `npx playwright test --project=mobile -g "home screen"` | Baseline update needed |
| PILL-07 | No-status → name + "Tap to set your status" | visual | `npx playwright test --project=mobile -g "home screen"` | Baseline update needed |
| HOME-03 | MoodPicker not visible | visual | `npx playwright test --project=mobile -g "home screen"` | Baseline update needed |
| HOME-04 | ReEngagementBanner not visible | visual | `npx playwright test --project=mobile -g "home screen"` | Baseline update needed |

### Sampling Rate

- **Per task commit:** `npx playwright test --project=mobile -g "home screen" --update-snapshots` (update baseline after HomeScreen changes)
- **Per wave merge:** `npx playwright test` (full suite: all 7 screens)
- **Phase gate:** Full suite green with updated baselines before verification

### Wave 0 Gaps

The existing `tests/visual/design-system.spec.ts` already has a `"home screen"` test case. No new test file needed — baselines must be updated after Phase 1 changes land. The "home screen" test will visually verify PILL-01, PILL-04, PILL-06, PILL-07, HOME-03, HOME-04 in a single screenshot.

Manual verification needed for: PILL-02 (sheet open), PILL-03 (auto-dismiss), PILL-05 (pulse animation).

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/components/friends/FriendActionSheet.tsx` — complete bottom sheet pattern (Modal, Animated.timing, BackHandler, PanResponder-free backdrop)
- `src/components/status/MoodPicker.tsx` — commit flow, auto-collapse on currentStatus change, onPress handlers
- `src/screens/home/HomeScreen.tsx` — all removals identified by line number
- `src/components/common/ScreenHeader.tsx` — rightAction slot confirmed
- `src/hooks/useStatus.ts` — currentStatus, heartbeatState, setStatus interface
- `src/stores/useStatusStore.ts` — Zustand reactive store shape
- `src/lib/heartbeat.ts` — computeHeartbeatState, HEARTBEAT_FADING_MS, HEARTBEAT_DEAD_MS
- `src/lib/windows.ts` — formatWindowLabel, getWindowOptions
- `src/components/friends/StatusPill.tsx` — pill label-building pattern, dot color approach
- `src/hooks/usePushNotifications.ts` — campfire: AsyncStorage prefix convention
- `src/theme/colors.ts` — COLORS.status.free/maybe/busy, COLORS.text.secondary
- `src/theme/spacing.ts` — SPACING token values
- `package.json` — confirmed zero new deps needed; react-native-reanimated installed but unused in src/

### Secondary (MEDIUM confidence)
- React Native Modal docs — children remain mounted when `visible` changes to false
- React Native Animated API — `isInteraction` property behavior with InteractionManager

### Tertiary (LOW confidence — flagged in Assumptions Log)
- PanResponder swipe threshold values (dy > 80, vy > 0.5) — standard community values, may need tuning
- Module-level session count guard pattern — assumed, not verified against Expo lifecycle

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, all primitives verified in codebase
- Architecture: HIGH — all patterns grounded in existing working code (FriendActionSheet, MoodPicker)
- Pitfalls: HIGH for identified pitfalls; MEDIUM for PanResponder threshold values (A1)
- Validation: HIGH — Playwright infrastructure confirmed; baseline update path clear

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable RN built-in APIs; no external dependency drift risk)
