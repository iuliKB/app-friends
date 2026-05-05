# Phase 26: Home & Chat Polish - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 11 files to modify, 1 type to extend
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/home/RadarBubble.tsx` | component | event-driven (animation) | self — existing `PulseRing` sub-component | exact |
| `src/components/home/RadarView.tsx` | component | request-response (loading state) | `src/components/common/SkeletonPulse.tsx` + self | role-match |
| `src/components/home/CardStackView.tsx` | component | request-response (loading state) | `src/components/common/SkeletonPulse.tsx` + self | role-match |
| `src/components/home/HomeFriendCard.tsx` | component | request-response (press interaction) | `src/components/home/HomeWidgetRow.tsx` (Pressable + opacity pressed) | exact |
| `src/components/home/HomeWidgetRow.tsx` | component | request-response (press interaction) | self — `Pressable + tilePressed opacity` pattern | exact |
| `src/components/status/OwnStatusCard.tsx` | component | request-response (press interaction) | `src/components/home/HomeFriendCard.tsx` (Pressable scale) | role-match |
| `src/components/home/EventCard.tsx` | component | request-response (press interaction) | `src/components/home/HomeFriendCard.tsx` (Pressable scale) | role-match |
| `src/screens/home/HomeScreen.tsx` | screen | request-response (empty state) | `src/components/common/EmptyState.tsx` (pattern) | role-match |
| `src/screens/chat/ChatListScreen.tsx` | screen | request-response (loading state) | `src/components/chat/ChatListRow.tsx` (row shape) | role-match |
| `src/components/chat/MessageBubble.tsx` | component | event-driven (animation + optimistic UI) | self — existing `pending` handling + `Animated.Value` | exact |
| `src/components/chat/SendBar.tsx` | component | event-driven (haptic) | existing `expo-haptics` usage in project | role-match |
| `src/hooks/useChatRoom.ts` | hook | CRUD (optimistic state) | self — existing `sendMessage` failure path line 480–483 | exact |
| `src/types/chat.ts` | type | — | self — existing `Message` interface | exact |

---

## Pattern Assignments

### `src/components/home/RadarBubble.tsx` (component, animation) — HOME-03

**What changes:** Parameterize `PulseRing` with a `variant` prop to produce the FADING pulse ring.

**Analog:** Self — existing `PulseRing` sub-component in this file.

**Existing PulseRing interface** (lines 44–47):
```typescript
interface PulseRingProps {
  size: number;
  statusColor: string;
}
```

**New PulseRing interface — add variant prop:**
```typescript
interface PulseRingProps {
  size: number;
  statusColor: string;
  variant?: 'alive' | 'fading';  // default: 'alive'
}
```

**Existing PulseRing animation loop** (lines 57–76 — template to parameterize):
```typescript
const loop = Animated.loop(
  Animated.sequence([
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.7,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]),
    Animated.delay(600),
  ])
);
```

**FADING variant values** (duration 2000ms, delay 800ms, scale 1.5 — languid feel):
```typescript
// Inside PulseRing, use variant to derive config:
const duration = variant === 'fading' ? 2000 : 1200;
const delay = variant === 'fading' ? 800 : 600;
const scaleTarget = variant === 'fading' ? 1.5 : 1.7;
```

**FADING color constant** — add at module top (above PulseRing, after GRADIENT_COLORS block):
```typescript
// eslint-disable-next-line campfire/no-hardcoded-styles
const FADING_PULSE_COLOR = '#F59E0B'; // amber-400 — caution signal for FADING heartbeat state
```

**Existing render condition** (line 244 — where FADING pulse call goes):
```typescript
// Current:
{isAlive && <PulseRing size={targetSize} statusColor={statusColor} />}

// New (add FADING ring alongside):
{isAlive && <PulseRing size={targetSize} statusColor={statusColor} variant="alive" />}
{heartbeatState === 'fading' && (
  <PulseRing size={targetSize} statusColor={FADING_PULSE_COLOR} variant="fading" />
)}
```

**Critical pitfall (Pitfall 7 from RESEARCH.md):** The `fading` render condition uses `heartbeatState === 'fading'`, not `isAlive`. `isAlive` is `false` for fading — the two rings are mutually exclusive by definition.

---

### `src/components/home/RadarView.tsx` (component, loading state) — HOME-01 radar skeleton

**What changes:** Accept `loading` prop; render 3 circular `SkeletonPulse` blobs when `loading && friends.length === 0`.

**Analog:** `src/components/common/SkeletonPulse.tsx` — fixed `width={N} height={N}` for circles.

**Existing RadarView props** (line 16–18):
```typescript
interface RadarViewProps {
  friends: FriendWithStatus[];
}
```

**New props — add loading:**
```typescript
interface RadarViewProps {
  friends: FriendWithStatus[];
  loading?: boolean;
}
```

**SkeletonPulse import** (add alongside existing imports):
```typescript
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
```

**Skeleton blob positions** — static, within `radarContainer` using `position: 'absolute'`:
```typescript
// Place before the radarFriends.map() render. Use position absolute to match real bubble layout.
// Sizes mirror BubbleSizeMap: free=80, maybe=64, busy=48.
const SKELETON_BLOBS = [
  { size: 80, left: '12%', top: 30 },
  { size: 64, left: '50%', top: 75 },
  { size: 48, left: '68%', top: 18 },
] as const;

// Render condition — inside radarContainer, before the radarFriends.map:
{loading && friends.length === 0 && SKELETON_BLOBS.map((blob, i) => (
  <View key={i} style={{ position: 'absolute', left: blob.left as any, top: blob.top }}>
    <SkeletonPulse width={blob.size} height={blob.size} />
  </View>
))}
```

**HomeScreen call site** — pass `loading` prop (line 217 in HomeScreen.tsx):
```typescript
// Current:
<RadarView friends={friends} />

// New:
<RadarView friends={friends} loading={loading} />
```

---

### `src/components/home/CardStackView.tsx` (component, loading state) — HOME-01 card skeleton

**What changes:** Accept `loading` prop; render 2 stacked rectangular `SkeletonPulse` cards when `loading && friends.length === 0`.

**Analog:** Existing `depthCard` style in `CardStackView.tsx` (lines 60–64) — height 160, full width. `SkeletonPulse` replaces real card content.

**Existing depthCard style** (lines 60–64 — shape to mirror):
```typescript
depthCard: {
  position: 'absolute',
  top: 0,
  height: 160,
  backgroundColor: colors.surface.card,
  borderRadius: RADII.xl,
},
```

**Skeleton pattern** — render before `deck.length === 0` empty guard:
```typescript
// New props:
interface CardStackViewProps {
  friends: FriendWithStatus[];
  loading?: boolean;
}

// After the cardWidth > 0 guard, before deck rendering:
if (loading && friends.length === 0 && cardWidth > 0) {
  return (
    <View style={styles.container} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.stackContainer, { width: cardWidth }]}>
        <SkeletonPulse width={cardWidth} height={160} />
        {/* Second card peeking behind — static, reduced opacity + scale */}
        <View style={{
          position: 'absolute',
          top: 8,
          opacity: 0.5,
          transform: [{ scale: 0.95 }],
          zIndex: -1,
        }}>
          <SkeletonPulse width={cardWidth} height={160} />
        </View>
      </View>
    </View>
  );
}
```

**HomeScreen call site** — pass `loading` prop (line 222 in HomeScreen.tsx):
```typescript
// Current:
<CardStackView friends={friends} />

// New:
<CardStackView friends={friends} loading={loading} />
```

---

### `src/components/home/HomeFriendCard.tsx` (component, press interaction) — HOME-04

**What changes:** Replace `opacity: 0.7` pressed style with `Animated.spring` scale 1.0→0.96.

**Analog:** `src/components/home/HomeWidgetRow.tsx` lines 40–42 (same `Pressable + pressed && styles.tilePressed` pattern to replace).

**Existing imports** (lines 1–2 — add `Animated`, `useRef`):
```typescript
import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
```

**New imports:**
```typescript
import React, { useMemo, useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ANIMATION } from '@/theme';
```

**Existing pressed style to REMOVE** (lines 38–40):
```typescript
pressed: {
  opacity: 0.7,
},
```

**Scale animation — add inside component function body** (after `const router = useRouter();`):
```typescript
const scaleAnim = useRef(new Animated.Value(1)).current;

function handlePressIn() {
  Animated.spring(scaleAnim, {
    toValue: 0.96,
    useNativeDriver: true,
    damping: ANIMATION.easing.spring.damping,
    stiffness: ANIMATION.easing.spring.stiffness,
    isInteraction: false,
  }).start();
}

function handlePressOut() {
  Animated.spring(scaleAnim, {
    toValue: 1.0,
    useNativeDriver: true,
    damping: ANIMATION.easing.spring.damping,
    stiffness: ANIMATION.easing.spring.stiffness,
    isInteraction: false,
  }).start();
}
```

**Existing Pressable render** (lines 126–134 — replace style callback and wrap content):
```typescript
// Current:
<Pressable
  onPress={handlePress}
  onLongPress={handleLongPress}
  delayLongPress={400}
  style={({ pressed }) => [
    styles.card,
    heartbeatState === 'fading' && styles.fadingCard,
    pressed && styles.pressed,
  ]}
  ...
>
  <View style={styles.avatarWrapper}>...</View>
  ...
</Pressable>

// New — remove pressed callback, add onPressIn/Out, wrap content in Animated.View:
<Pressable
  onPress={handlePress}
  onPressIn={handlePressIn}
  onPressOut={handlePressOut}
  onLongPress={handleLongPress}
  delayLongPress={400}
  style={[styles.card, heartbeatState === 'fading' && styles.fadingCard]}
  ...
>
  <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
    <View style={styles.avatarWrapper}>...</View>
    ...
  </Animated.View>
</Pressable>
```

---

### `src/components/home/HomeWidgetRow.tsx` (component, press interaction) — HOME-04

**What changes:** Replace `pressed && styles.tilePressed` (opacity) with `Animated.spring` scale on both IOU and Birthday tiles.

**Analog:** Self — after `HomeFriendCard` receives the same treatment, pattern is identical.

**Existing pressed styles to REMOVE** (lines 40–42):
```typescript
tilePressed: {
  opacity: 0.75,
},
```

**Existing Pressable pattern** (lines 95–105 — same structure × 2 tiles):
```typescript
<Pressable
  style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
  onPress={() => router.push('/squad/expenses' as never)}
  ...
>
```

**New pattern** — add two `useRef` scale anims (one per tile), `handlePressIn/Out` factory, wrap tile content in `Animated.View`:
```typescript
// Add to imports:
import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ANIMATION } from '@/theme';

// Inside component:
const iouScaleAnim = useRef(new Animated.Value(1)).current;
const birthdayScaleAnim = useRef(new Animated.Value(1)).current;

function makeSpringHandlers(anim: Animated.Value) {
  return {
    onPressIn: () => Animated.spring(anim, { toValue: 0.96, useNativeDriver: true, damping: ANIMATION.easing.spring.damping, stiffness: ANIMATION.easing.spring.stiffness, isInteraction: false }).start(),
    onPressOut: () => Animated.spring(anim, { toValue: 1.0, useNativeDriver: true, damping: ANIMATION.easing.spring.damping, stiffness: ANIMATION.easing.spring.stiffness, isInteraction: false }).start(),
  };
}

// Usage:
<Pressable
  style={styles.tile}   // no pressed callback
  {...makeSpringHandlers(iouScaleAnim)}
  onPress={() => router.push('/squad/expenses' as never)}
  ...
>
  <Animated.View style={{ transform: [{ scale: iouScaleAnim }] }}>
    {/* tile content */}
  </Animated.View>
</Pressable>
```

---

### `src/components/status/OwnStatusCard.tsx` (component, press interaction) — HOME-04

**What changes:** Add scale spring to `TouchableOpacity`; set `activeOpacity={1.0}` to disable opacity fallback conflict.

**Analog:** `src/components/home/HomeFriendCard.tsx` scale spring pattern (after Phase 26 update).

**Existing root element** (lines 149–155 — `TouchableOpacity` with `activeOpacity={0.85}`):
```typescript
<TouchableOpacity
  onPress={onPress}
  activeOpacity={0.85}
  accessibilityRole="button"
  ...
  style={styles.card}
>
```

**Add imports and scale anim:**
```typescript
// Add to existing import line 7 (already has Animated, useRef):
// No new imports needed — Animated, useRef, useEffect already imported.
import { ANIMATION } from '@/theme';  // add to existing @/theme import

// Add inside component body (after useMemo for styles):
const cardScaleAnim = useRef(new Animated.Value(1)).current;

function handlePressIn() {
  Animated.spring(cardScaleAnim, {
    toValue: 0.96,
    useNativeDriver: true,
    damping: ANIMATION.easing.spring.damping,
    stiffness: ANIMATION.easing.spring.stiffness,
    isInteraction: false,
  }).start();
}

function handlePressOut() {
  Animated.spring(cardScaleAnim, {
    toValue: 1.0,
    useNativeDriver: true,
    damping: ANIMATION.easing.spring.damping,
    stiffness: ANIMATION.easing.spring.stiffness,
    isInteraction: false,
  }).start();
}
```

**Updated render** (set `activeOpacity={1.0}`, add `onPressIn/Out`, wrap card content in `Animated.View`):
```typescript
<TouchableOpacity
  onPress={onPress}
  onPressIn={handlePressIn}
  onPressOut={handlePressOut}
  activeOpacity={1.0}   // disable opacity fallback — scale spring provides all feedback
  accessibilityRole="button"
  ...
  style={styles.card}
>
  <Animated.View style={{ transform: [{ scale: cardScaleAnim }] }}>
    {/* existing topRow + bottomRow content unchanged */}
  </Animated.View>
</TouchableOpacity>
```

---

### `src/components/home/EventCard.tsx` (component, press interaction) — HOME-04

**What changes:** Add scale spring to `TouchableOpacity`; set `activeOpacity={1.0}`.

**Analog:** Same as `OwnStatusCard.tsx` — `TouchableOpacity` → `activeOpacity={1.0}` + `Animated.View` wrapper.

**Existing root** (lines 39–46):
```typescript
<TouchableOpacity
  style={[styles.card, SHADOWS.card]}
  onPress={handlePress}
  activeOpacity={0.8}
  ...
>
```

**Pattern to apply** (identical to OwnStatusCard treatment above — add `cardScaleAnim`, `handlePressIn/Out`, wrap content in `Animated.View`, set `activeOpacity={1.0}`). No additional new imports needed beyond `ANIMATION` added to `@/theme` import.

---

### `src/screens/home/HomeScreen.tsx` (screen, empty state) — HOME-02

**What changes:** Add zero-friends empty state card inline in the ScrollView when `!loading && friends.length === 0`. Add `handleNavigateToSquad` using `router.push`.

**Analog:** `src/components/common/EmptyState.tsx` — inline card with icon, heading, body, CTA button. This phase uses a custom inline card (D-07: not full-screen), but the `EmptyState` component's prop pattern (icon + heading + body + ctaLabel + onCta) can be reused.

**Existing router import** (already present via `useHomeScreen` — but `useRouter` not directly used in HomeScreen.tsx). Add:
```typescript
import { useRouter } from 'expo-router';
```

**Zero-friends navigation function** — add inside `HomeScreen` function body:
```typescript
const router = useRouter();

function handleNavigateToSquad() {
  router.push('/(tabs)/squad');
}
```

**Existing ScrollView content** (lines 215–225 — add zero-friends card after the view switcher section):
```typescript
{/* Radar / Cards crossfade */}
<View style={styles.viewSwitcher}>
  ...
</View>

{/* HOME-02: Zero-friends empty state — inline card */}
{!loading && friends.length === 0 && (
  <EmptyState
    icon="person-add-outline"
    iconType="ionicons"
    heading="No friends yet"
    body="Add friends to share your status and stay in sync."
    ctaLabel="Add a friend"
    onCta={handleNavigateToSquad}
  />
)}
```

**EmptyState import** (add to existing imports):
```typescript
import { EmptyState } from '@/components/common/EmptyState';
```

**EmptyState component API** (lines 7–13 of EmptyState.tsx):
```typescript
interface EmptyStateProps {
  icon: string;
  iconType?: 'emoji' | 'ionicons';
  heading: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}
```

**D-10 trigger condition verified:** `!loading && friends.length === 0` (distinct from skeleton condition `loading && friends.length === 0`). Both conditions are mutually exclusive — no overlap.

**Tab route verified** (from RESEARCH.md §Verified: Squad tab navigation): `router.push('/(tabs)/squad')`.

---

### `src/screens/chat/ChatListScreen.tsx` (screen, loading state) — CHAT-01

**What changes:** Replace `<LoadingIndicator />` (line 60) with 4 skeleton rows that mirror `ChatListRow` shape.

**Analog:** `src/components/chat/ChatListRow.tsx` — `height: 72`, `paddingHorizontal: SPACING.lg`, left icon 40×40, content flex-1 with two text lines.

**Existing loading guard** (lines 59–61 — the target):
```typescript
if (loading && chatList.length === 0) {
  return <LoadingIndicator />;
}
```

**ChatListRow shape** (lines 24–31 — dimensions to mirror):
```typescript
row: {
  height: 72,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: SPACING.lg,
  backgroundColor: colors.surface.base,
},
```

**New skeleton row component** — define as a file-local function below `ChatListScreen`, before export:
```typescript
import { SkeletonPulse } from '@/components/common/SkeletonPulse';

function ChatSkeletonRow() {
  return (
    <View style={{
      height: 72,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    }}>
      <SkeletonPulse width={40} height={40} />
      <View style={{ flex: 1, gap: SPACING.xs }}>
        <SkeletonPulse width="100%" height={14} />
        <SkeletonPulse width="100%" height={12} />
      </View>
    </View>
  );
}
```

**New loading guard** (replace lines 59–61):
```typescript
if (loading && chatList.length === 0) {
  return (
    <View style={[styles.list, { paddingTop: insets.top }]}>
      <View style={{ paddingTop: SPACING.sm, paddingHorizontal: SPACING.lg }}>
        <ScreenHeader title="Chats" />
      </View>
      {Array.from({ length: 4 }).map((_, i) => (
        <ChatSkeletonRow key={i} />
      ))}
    </View>
  );
}
```

**Remove** `LoadingIndicator` from imports (no longer needed at this guard point).

---

### `src/components/chat/SendBar.tsx` (component, haptic) — CHAT-02

**What changes:** Add `Haptics.impactAsync(Light)` call in `handleSend` before `onSend(body)`.

**Analog:** `expo-haptics` usage pattern confirmed in project.

**Add import** (after existing imports, line 13):
```typescript
import * as Haptics from 'expo-haptics';
```

**Existing `handleSend` function** (lines 174–180):
```typescript
function handleSend() {
  if (!canSend) return;
  const body = text.trim();
  setText('');
  onSend(body);
  onClearReply?.();
}
```

**New `handleSend` with haptic** (D-14):
```typescript
function handleSend() {
  if (!canSend) return;
  const body = text.trim();
  setText('');
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  onSend(body);
  onClearReply?.();
}
```

**Note:** `void` prefix on the haptic call — fire-and-forget, never `await` it in an event handler.

---

### `src/components/chat/MessageBubble.tsx` (component, animation + optimistic UI) — CHAT-02, CHAT-03, CHAT-04

**What changes:**
1. CHAT-02: Add `Haptics.selectionAsync()` in emoji strip `onPress` (line 486).
2. CHAT-03: Render "sending" indicator (opacity 0.7 + clock icon) and "failed" state (red border + "Tap to retry") for own text messages.
3. CHAT-04: Add `Animated.spring` scale on long-press (0.96 while menu open, 1.0 on close).

**Analog (self):** Existing `pending` handling (lines 196–198 `pendingOpacity` style, lines 596–605 image pending spinner) — text bubbles don't yet have visual pending state.

**Add imports** (line 14 — add `Haptics`):
```typescript
import * as Haptics from 'expo-haptics';
import { ANIMATION } from '@/theme';
```

**CHAT-02 — Haptic in emoji strip** (line 486, inside `onPress` of each emoji button):
```typescript
// Current:
onPress={() => {
  closeMenu();
  onReact(message.id, emoji);
}}

// New (D-15):
onPress={() => {
  closeMenu();
  void Haptics.selectionAsync();
  onReact(message.id, emoji);
}}
```

**CHAT-04 — Long-press scale anim** (add `Animated.Value` alongside existing `fadeAnim` and `highlightAnim` refs, lines 395–397):
```typescript
// Existing:
const fadeAnim = useRef(new Animated.Value(0)).current;
const highlightAnim = useRef(new Animated.Value(0)).current;

// Add:
const bubbleScaleAnim = useRef(new Animated.Value(1)).current;
```

**Update `handleLongPress`** (lines 430–437 — add scale spring AFTER the guard checks):
```typescript
function handleLongPress(event: { nativeEvent: { pageY: number } }) {
  if (message.pending) return;           // guard: no scale if menu won't open
  if (message.message_type === 'deleted') return;
  if (isPoll && !isOwn) return;
  // Scale fires only when the menu will actually open (after all guards):
  Animated.spring(bubbleScaleAnim, {
    toValue: 0.96,
    useNativeDriver: true,
    damping: ANIMATION.easing.spring.damping,
    stiffness: ANIMATION.easing.spring.stiffness,
    isInteraction: false,
  }).start();
  setPillY(Math.max(60, event.nativeEvent.pageY - 80));
  setMenuVisible(true);
}
```

**Update `closeMenu`** (lines 439–441 — add scale restore):
```typescript
function closeMenu() {
  setMenuVisible(false);
  Animated.spring(bubbleScaleAnim, {
    toValue: 1.0,
    useNativeDriver: true,
    damping: ANIMATION.easing.spring.damping,
    stiffness: ANIMATION.easing.spring.stiffness,
    isInteraction: false,
  }).start();
}
```

**Wrap own-message `TouchableOpacity` in scale `Animated.View`** (lines 563–567):
```typescript
// Current:
<Animated.View style={{ backgroundColor: highlightBg }}>
  <TouchableOpacity
    style={styles.ownContainer}
    ...
  >

// New:
<Animated.View style={{ backgroundColor: highlightBg }}>
  <Animated.View style={{ transform: [{ scale: bubbleScaleAnim }] }}>
    <TouchableOpacity
      style={styles.ownContainer}
      ...
    >
    </TouchableOpacity>
  </Animated.View>
```

**CHAT-03 — "sending" indicator and "failed" state** — in own-message branch (inside `ownBubble` View, for text messages):

Add new styles to `useMemo` StyleSheet:
```typescript
pendingBubble: {
  opacity: 0.7,
},
failedBubble: {
  borderWidth: 1,
  borderColor: colors.interactive.destructive,
},
clockRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: SPACING.xs,
  marginTop: SPACING.xs,
},
retryLabel: {
  fontSize: FONT_SIZE.sm,
  fontFamily: FONT_FAMILY.body.regular,
  color: colors.interactive.destructive,
  marginTop: SPACING.xs,
},
```

**Own text bubble render** (around lines 575–613 — non-image own bubble section):
```typescript
// Apply pending/failed styles to ownBubble:
<View
  style={[
    styles.ownBubble,
    isImage && { paddingHorizontal: 0, paddingVertical: 0 },
    !!message.reply_to_message_id && styles.replyMinWidth,
    message.pending && styles.pendingBubble,      // D-17: ~70% opacity
    message.failed && styles.failedBubble,        // D-18: red border
  ]}
>
  ...text content...
</View>

// Add clock icon row for pending (below bubble, above reactions):
{message.pending && !isImage && (
  <View style={styles.clockRow}>
    <Ionicons name="time-outline" size={12} color="rgba(245,245,245,0.5)" />
    <Text style={styles.ownTimestamp}>Sending...</Text>
  </View>
)}

// Add retry label for failed (below bubble):
{message.failed && (
  <TouchableOpacity onPress={() => onRetry?.(message.tempId!, message.body ?? '')}>
    <Text style={styles.retryLabel}>Tap to retry</Text>
  </TouchableOpacity>
)}
```

**Add `onRetry` prop to `MessageBubbleProps` interface** (lines 21–38):
```typescript
interface MessageBubbleProps {
  // ... existing props ...
  onRetry?: (tempId: string, body: string) => void;  // CHAT-03
}
```

---

### `src/hooks/useChatRoom.ts` (hook, CRUD optimistic state) — CHAT-03

**What changes:** Change failure path in `sendMessage` to mark `failed: true` instead of removing the entry. Add `retryMessage` function.

**Analog:** Self — existing failure path (lines 480–483).

**Existing failure path** (lines 480–483 — the target):
```typescript
if (insertError) {
  // Remove the optimistic entry on failure
  setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
  return { error: insertError };
}
```

**New failure path** (D-19 — mark failed instead of remove):
```typescript
if (insertError) {
  setMessages((prev) =>
    prev.map((m) =>
      m.tempId === tempId ? { ...m, pending: false, failed: true } : m
    )
  );
  return { error: insertError };
}
```

**New `retryMessage` function** — add after `sendMessage`, expose in hook return:
```typescript
async function retryMessage(tempId: string, body: string): Promise<{ error: unknown }> {
  // Remove the failed entry, then re-send via normal sendMessage flow
  setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
  return sendMessage(body);
}
```

**Hook return object** — add `retryMessage`:
```typescript
return {
  messages,
  loading,
  error,
  sendMessage,
  retryMessage,     // ADD
  sendImage,
  deleteMessage,
  addReaction,
  // ... rest unchanged
};
```

---

### `src/types/chat.ts` (type) — CHAT-03

**What changes:** Add `failed?: boolean` to `Message` interface.

**Existing `Message` interface** (lines 9–25):
```typescript
export interface Message {
  // ... existing fields ...
  reactions?: MessageReaction[];
  pending?: boolean;
  tempId?: string;
}
```

**New field to add after `pending`**:
```typescript
  pending?: boolean;
  failed?: boolean;    // Phase 26, CHAT-03: optimistic send failure state
  tempId?: string;
```

---

## Shared Patterns

### Scale Spring Animation (HOME-04, CHAT-04)
**Source:** `src/theme/animation.ts` lines 107 + React Native `Animated.spring`
**Apply to:** `HomeFriendCard`, `HomeWidgetRow`, `OwnStatusCard`, `EventCard`, `MessageBubble`
```typescript
import { ANIMATION } from '@/theme';

const scaleAnim = useRef(new Animated.Value(1)).current;

// Press in:
Animated.spring(scaleAnim, {
  toValue: 0.96,
  useNativeDriver: true,
  damping: ANIMATION.easing.spring.damping,     // 15
  stiffness: ANIMATION.easing.spring.stiffness, // 120
  isInteraction: false,
}).start();

// Press out / restore:
Animated.spring(scaleAnim, {
  toValue: 1.0,
  useNativeDriver: true,
  damping: ANIMATION.easing.spring.damping,
  stiffness: ANIMATION.easing.spring.stiffness,
  isInteraction: false,
}).start();
```

### Animated.loop Pulse (HOME-03)
**Source:** `src/components/home/RadarBubble.tsx` lines 53–79 (existing `PulseRing`)
**Apply to:** FADING variant of `PulseRing` (parameterized, same file)
```typescript
// Critical fields only — copy full Animated.loop structure, change duration/delay/scale:
Animated.loop(
  Animated.sequence([
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: scaleTarget, duration, easing: Easing.out(Easing.ease), useNativeDriver: true, isInteraction: false }),
      Animated.timing(opacityAnim, { toValue: 0, duration, useNativeDriver: true, isInteraction: false }),
    ]),
    Animated.delay(delay),
  ])
)
```

### SkeletonPulse Usage (HOME-01, CHAT-01)
**Source:** `src/components/common/SkeletonPulse.tsx`
**Apply to:** `RadarView`, `CardStackView`, `ChatListScreen`
**API:** `<SkeletonPulse width={number | '100%'} height={number} />` — no other props.
- For fixed-size circles: `width={N} height={N}` (N = 48, 64, 80)
- For text-line skeletons: `width="100%"` height 12–14
- For full card-width: `width={cardWidth}` height 160
- `SkeletonPulse` always uses `RADII.sm` — no borderRadius control needed/available.

### Haptics (CHAT-02)
**Source:** `expo-haptics` (already installed, used in project)
**Apply to:** `SendBar.handleSend`, `MessageBubble` emoji strip `onPress`
```typescript
import * as Haptics from 'expo-haptics';

void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // on send
void Haptics.selectionAsync();                               // on reaction tap
```

### useTheme + useMemo Pattern (all components)
**Source:** Every existing component in the codebase
**Apply to:** All modified/new components
```typescript
const { colors } = useTheme();
const styles = useMemo(() => StyleSheet.create({
  // ... styles using colors tokens
}), [colors]);
```
**Constraint:** All colors, sizes, radii MUST use tokens. No hardcoded values except with `// eslint-disable-next-line campfire/no-hardcoded-styles` comment.

---

## No Analog Found

All files have analogs. No new patterns need to be sourced from RESEARCH.md alone.

---

## Metadata

**Analog search scope:** `src/components/home/`, `src/components/chat/`, `src/components/common/`, `src/screens/home/`, `src/screens/chat/`, `src/hooks/`, `src/types/`, `src/theme/`
**Files read:** 15 source files
**Pattern extraction date:** 2026-05-05

**Key pitfalls to propagate to PLAN.md:**
1. `useNativeDriver: true` is valid for `transform: [{ scale }]` and `opacity` ONLY — never for `width`/`height`/`padding`/`margin`.
2. Long-press scale (`bubbleScaleAnim`) must fire AFTER all guard-return checks in `handleLongPress` — not before (Pitfall 7 from RESEARCH.md).
3. FADING pulse render condition is `heartbeatState === 'fading'`, NOT `isAlive` — they are mutually exclusive states.
4. `OwnStatusCard` and `EventCard` use `TouchableOpacity` — must set `activeOpacity={1.0}` when adding scale spring to prevent double feedback (Pitfall 6 from RESEARCH.md).
5. FADING_PULSE_COLOR hex must be wrapped in a named constant with `// eslint-disable-next-line campfire/no-hardcoded-styles` — ESLint `no-hardcoded-styles` is at error severity.
6. `sendMessage` failure path: change to `failed: true` mutation — do NOT keep the filter/remove behavior (Pitfall 3 from RESEARCH.md).
