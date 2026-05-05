# Phase 26: Home & Chat Polish - Research

**Researched:** 2026-05-05
**Domain:** React Native (Expo) — Animation, Haptics, Skeleton Loaders, Optimistic UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Home Skeleton (HOME-01)**
- D-01: Skeletons are view-aware — Radar view shows circular SkeletonPulse blobs; Card stack view shows rectangular card-shaped skeleton placeholders.
- D-02: Show 3 skeleton items while loading.
- D-03: Skeletons appear on initial load only — condition: `loading && friends.length === 0`. Pull-to-refresh keeps existing content visible.

**FADING Pulse (HOME-03)**
- D-04: Amber/orange pulse ring; Animated.loop + scale/opacity; cycle duration ~2000ms (slower than ALIVE at 1200ms).
- D-05: Radar view only — `RadarBubble` handles it. Card/Swipe views keep 0.6 opacity, no ring.
- D-06: Implement as second sub-component inside `RadarBubble.tsx` or parameterize `PulseRing` with `variant: 'alive' | 'fading'` — Claude's discretion.

**Zero-Friends Empty State (HOME-02)**
- D-07: Styled card within the scroll area, not a full-screen replacement. Status card and widgets remain above it.
- D-08: Contains: campfire/friends icon, heading ("No friends yet"), one-liner copy, "Add a friend" CTA button.
- D-09: CTA navigates to Squad tab (index 1 in bottom nav). Do not open add-friend flow directly.
- D-10: Trigger condition: `!loading && friends.length === 0`. Coexists with OnboardingHintSheet (AUTH-04).

**Home Card Press Feedback (HOME-04)**
- D-11: All tappable home cards use 1.0→0.96 scale spring on press. Replaces existing `opacity: 0.7` pressed style in `HomeFriendCard`. Use `Animated.spring` with `ANIMATION.easing.spring`.
- D-12: Cards affected: `HomeFriendCard`, `OwnStatusCard` (if tappable), `EventCard` in `UpcomingEventsSection`, IOU/birthday widget rows in `HomeWidgetRow`. Claude audits all Pressables.

**Chat List Skeleton (CHAT-01)**
- D-13: Replace `LoadingIndicator` spinner in `ChatListScreen` with skeleton rows — condition `loading && chatList.length === 0`. Each skeleton row: avatar circle + two text-line rectangles. Show 4 skeleton rows.

**Chat Haptics (CHAT-02)**
- D-14: Send message → `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`.
- D-15: Tap reaction emoji → `Haptics.selectionAsync()`.

**Optimistic Message Send (CHAT-03)**
- D-16: Sent messages appear immediately with "sending" indicator.
- D-17: Bubble at ~70% opacity + small clock icon next to timestamp. On confirm: opacity→1.0, clock gone. No layout shift.
- D-18: Failure state: red border/tint + "Tap to retry". Bubble stays visible.
- D-19: `pending: true` flag inserted into local state. On success: flag cleared (or replaced by realtime message). On failure: `failed: true`.

**Message Bubble Long-Press (CHAT-04)**
- D-20: Compress-and-hold: bubble scales to 0.96 on long-press fire and stays compressed while menu is open. Restores to 1.0 on menu close.
- D-21: `Animated.spring` to 0.96 on gesture start; spring back to 1.0 on release/close. `useNativeDriver: true`.

### Claude's Discretion
- Exact amber/orange hex for FADING pulse ring (warm yellow-orange, "caution" feel on both light/dark backgrounds).
- Whether FADING PulseRing is a separate component or parameterized variant of `PulseRing`.
- Exact copy for zero-friends empty state card (heading + one-liner).
- Which specific home screen widgets get press feedback (audit all Pressables and apply consistently).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOME-01 | Home screen shows SkeletonPulse placeholders while friend status data loads | SkeletonPulse already built (Phase 24); `loading && friends.length === 0` condition identified in HomeScreen; Radar/Card view shapes defined |
| HOME-02 | New user with zero friends sees an actionable empty state guiding them to add a friend | `!loading && friends.length === 0` condition; Squad tab is index 1 (confirmed in tab layout); inline card pattern established |
| HOME-03 | Friends with FADING heartbeat status show a subtle animated pulse on their radar bubble | `PulseRing` pattern exists in RadarBubble.tsx; `heartbeatState === 'fading'` already computed; parameterize or add variant sub-component |
| HOME-04 | All tappable cards on the home screen have spring press feedback (scale 1.0→0.96) | `ANIMATION.easing.spring` token available; `HomeFriendCard` has `opacity: 0.7` pressed style to replace; `OwnStatusCard` uses `TouchableOpacity` (needs conversion to `Animated+Pressable`); `EventCard` and `HomeWidgetRow` use `TouchableOpacity`/`Pressable` needing scale |
| CHAT-01 | Chat list screen shows skeleton rows while conversations load | `ChatListScreen` already has `loading && chatList.length === 0` guard (currently shows `LoadingIndicator`); `ChatListRow` shape identified for skeleton mirroring |
| CHAT-02 | Sending a message triggers `impactAsync(Light)`; tapping a reaction triggers `selectionAsync()` | `expo-haptics` already installed; `SendBar.handleSend` is the send trigger; reaction tap is in `MessageBubble` context menu emoji strip |
| CHAT-03 | Sent messages appear immediately with "sending" indicator before server confirmation | `sendMessage` already inserts optimistic entry with `pending: true`; `MessageBubble` partially handles `pending` (opacity); clock icon + failed state + retry tap need adding |
| CHAT-04 | Long-pressing a message bubble shows a subtle scale press animation before context menu appears | `MessageBubble` uses `TouchableOpacity` for long-press; needs `Animated.Value` + spring to wrap the bubble in a scale animation |
</phase_requirements>

---

## Summary

Phase 26 is a pure polish phase — no new screens, routes, or data model changes. All eight requirements address the tactile feel and loading experience of two existing screens: Home and Chat. The implementation is highly surgical: wire `SkeletonPulse` into two loading states, add a FADING pulse ring variant to `RadarBubble`, introduce scale-spring press feedback across home cards, replace a spinner with skeleton rows in `ChatListScreen`, fire haptics at two call sites in chat, extend the existing optimistic message UI to show a "sending" indicator and retry state, and add a scale animation to message bubble long-press.

The codebase is highly prepared for this work. Phase 24 already delivered `SkeletonPulse`, `ANIMATION` tokens with spring config, and the animation patterns this phase extends. The `PulseRing` sub-component in `RadarBubble.tsx` is a clean template for the FADING variant. The `useChatRoom` hook already inserts optimistic messages with `pending: true` and deduplicates them on realtime confirmation — Phase 26 only needs to surface this state visually and add the `failed: true` retry path. `expo-haptics` is already installed and used elsewhere.

The most structurally significant change is CHAT-03: the `Message` type already has `pending?: boolean` and `tempId?: string`, but `failed?: boolean` and retry behavior are new. `sendMessage` currently removes the optimistic entry on failure; it needs to update `failed: true` instead. `MessageBubble` then renders the red-tinted retry state and re-calls `sendMessage` on tap.

**Primary recommendation:** Implement in this order — HOME-01 (skeleton infrastructure), HOME-02 (empty state), HOME-03 (FADING pulse), HOME-04 (press feedback audit), CHAT-01 (skeleton rows), CHAT-02 (haptics), CHAT-03 (sending indicator + failure), CHAT-04 (long-press scale). Each is independently completable with no shared state between them.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HOME-01 Skeleton loading | UI Component (RadarView, CardStackView) | HomeScreen (condition gate) | Skeleton shapes are view-specific; condition evaluated at screen level |
| HOME-02 Zero-friends empty state | HomeScreen (condition gate + rendering) | Component (inline card) | Empty state is a screen-level concern; card can be inline JSX or small component |
| HOME-03 FADING pulse ring | RadarBubble (sub-component) | — | Pulse is purely visual; RadarBubble already owns PulseRing and heartbeatState |
| HOME-04 Press scale feedback | Individual card components (HomeFriendCard, OwnStatusCard, EventCard, HomeWidgetRow) | — | Each component owns its own press handler and animation value |
| CHAT-01 Chat list skeleton | ChatListScreen | — | Condition already exists; replace spinner with skeleton JSX at same guard point |
| CHAT-02 Haptics | SendBar (send haptic), MessageBubble (reaction haptic) | — | Haptics fire at the event origin; no shared state needed |
| CHAT-03 Optimistic send UI | MessageBubble (visual states), useChatRoom (failed state), ChatRoomScreen (retry wiring) | — | State managed in hook; visuals in component; retry handler threaded through |
| CHAT-04 Long-press scale | MessageBubble | — | Animation is local to the bubble component; no external state |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` Animated | SDK 55 (built-in) | Scale spring, loop animations | Established codebase pattern; Reanimated v4 is NOT used (broken with @gorhom/bottom-sheet) [VERIFIED: codebase grep] |
| `expo-haptics` | already installed | `impactAsync(Light)`, `selectionAsync()` | Already used elsewhere in project [VERIFIED: codebase grep] |
| `SkeletonPulse` (internal) | Phase 24 output | Shimmer placeholders | Built for exactly this purpose; width + height props [VERIFIED: read src/components/common/SkeletonPulse.tsx] |
| `ANIMATION` tokens | Phase 24 output | Duration, easing, spring config | `ANIMATION.easing.spring: { damping: 15, stiffness: 120 }` [VERIFIED: read src/theme/animation.ts] |

### No new packages needed
All required capabilities are available in the existing stack. Do NOT add Reanimated-dependent libraries.

---

## Architecture Patterns

### System Architecture Diagram

```
HomeScreen
  ├── loading && friends.length === 0 → SkeletonSection
  │     ├── view === 'radar'  → 3× circular SkeletonPulse blobs (RadarView)
  │     └── view === 'cards'  → 1-2 rectangular SkeletonPulse cards (CardStackView)
  ├── !loading && friends.length === 0 → ZeroFriendsCard (inline)
  │     └── "Add a friend" CTA → navigation.navigate('squad')  [index 1]
  └── friends.length > 0 → normal RadarView / CardStackView
        └── RadarBubble (per friend)
              ├── heartbeatState === 'alive' → PulseRing (green/status color, 1200ms)
              └── heartbeatState === 'fading' → FadingPulseRing (amber, 2000ms)  ← NEW

HomeFriendCard / OwnStatusCard / EventCard / HomeWidgetRow tiles
  └── Pressable → Animated.spring scale (1.0 → 0.96 → 1.0)

ChatListScreen
  └── loading && chatList.length === 0 → 4× ChatSkeletonRow
        └── SkeletonPulse(circle 40) + SkeletonPulse(text line 1) + SkeletonPulse(text line 2)

SendBar.handleSend()
  └── Haptics.impactAsync(Light) → onSend(body)

MessageBubble (own message)
  ├── pending: true  → opacity 0.7 + clock icon beside timestamp
  ├── failed: true   → red border/tint + "Tap to retry" label + onPress → retry
  └── long-press     → Animated.spring(scaleAnim, 0.96) → open menu
                       menu close → Animated.spring(scaleAnim, 1.0)

MessageBubble context menu (emoji strip)
  └── onPress(emoji) → Haptics.selectionAsync() → onReact(...)
```

### Recommended Project Structure
No structural changes needed. All modifications are within existing files:
```
src/
├── components/
│   ├── home/
│   │   ├── RadarBubble.tsx       # Add FadingPulseRing (HOME-03)
│   │   ├── RadarView.tsx         # Add skeleton layout (HOME-01)
│   │   ├── CardStackView.tsx     # Add skeleton layout (HOME-01)
│   │   ├── HomeFriendCard.tsx    # Replace opacity press with scale spring (HOME-04)
│   │   ├── HomeWidgetRow.tsx     # Add scale spring to tile Pressables (HOME-04)
│   │   └── EventCard.tsx        # Add scale spring (HOME-04)
│   ├── chat/
│   │   ├── MessageBubble.tsx     # Add sending/failed state, long-press scale (CHAT-03, CHAT-04)
│   │   └── SendBar.tsx           # Add haptic on send (CHAT-02)
│   └── status/
│       └── OwnStatusCard.tsx     # Convert TouchableOpacity → Animated+Pressable (HOME-04)
├── screens/
│   ├── home/HomeScreen.tsx       # Add zero-friends condition + inline card (HOME-02)
│   └── chat/ChatListScreen.tsx   # Replace LoadingIndicator with skeleton rows (CHAT-01)
├── hooks/
│   └── useChatRoom.ts            # failed: true state on send failure (CHAT-03)
└── types/
    └── chat.ts                   # Add failed?: boolean to Message type (CHAT-03)
```

---

## Key Implementation Patterns

### Pattern 1: Scale Spring Press Feedback (HOME-04)

The current `HomeFriendCard` pattern uses `Pressable` + `({ pressed }) => [styles.card, pressed && styles.pressed]` where `pressed` applies `opacity: 0.7`. This must be replaced with an Animated scale approach.

**The challenge:** `Pressable`'s `style` callback fires synchronously on the JS thread. For native-driven scale animation, the `Animated.Value` must be driven separately from the `Pressable` callback.

**Pattern — wrap Pressable content in Animated.View:**
```typescript
// Source: React Native docs — useNativeDriver with Pressable
const scaleAnim = useRef(new Animated.Value(1)).current;

function handlePressIn() {
  Animated.spring(scaleAnim, {
    toValue: 0.96,
    useNativeDriver: true,
    ...ANIMATION.easing.spring,   // damping: 15, stiffness: 120
    isInteraction: false,
  }).start();
}

function handlePressOut() {
  Animated.spring(scaleAnim, {
    toValue: 1.0,
    useNativeDriver: true,
    ...ANIMATION.easing.spring,
    isInteraction: false,
  }).start();
}

<Pressable
  onPressIn={handlePressIn}
  onPressOut={handlePressOut}
  onPress={handlePress}
  style={styles.card}   // non-animated styles stay on Pressable
>
  <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
    {/* card content */}
  </Animated.View>
</Pressable>
```
[VERIFIED: ANIMATION.easing.spring values from src/theme/animation.ts]

**Note for OwnStatusCard:** Currently uses `TouchableOpacity` at the root (the card IS the touchable). To apply scale, either:
- Wrap the `TouchableOpacity` in an `Animated.View` driven by `onPressIn`/`onPressOut` handlers added to the `TouchableOpacity`, OR
- Convert to `Pressable` + `Animated.View` wrapper (cleaner, consistent with HomeFriendCard pattern).
Recommended: use `Pressable` + wrap content in `Animated.View` with scale. The `TouchableOpacity.activeOpacity` can be set to 1.0 to disable opacity fallback.

**Note for EventCard:** Currently `TouchableOpacity` with `activeOpacity={0.8}` — same conversion needed.

**Note for HomeWidgetRow:** Uses `Pressable` with `({ pressed }) => [styles.tile, pressed && styles.tilePressed]` where `tilePressed` is `opacity: 0.75`. Same pattern as HomeFriendCard — replace with scale spring.

### Pattern 2: FADING PulseRing Variant (HOME-03)

The existing `PulseRing` in `RadarBubble.tsx` animates scale from 1.0 → 1.7 + opacity 0.7 → 0 over 1200ms with a 600ms delay. The FADING variant needs:
- Duration: 2000ms (languid feel)
- Delay: ~800ms (slower cadence)
- Color: amber/orange (recommendation: `#F59E0B` — Tailwind amber-400, visible on both dark `#091A07` background and light surfaces) [ASSUMED — verify visually on device]

**Parameterize vs. separate component:** The cleanest approach is a `variant` prop on `PulseRing`:
```typescript
interface PulseRingProps {
  size: number;
  statusColor: string;
  variant?: 'alive' | 'fading';  // default: 'alive'
}
// Inside: use variant to pick duration (1200 vs 2000) and delay (600 vs 800)
```
This avoids code duplication while keeping the component cohesive. The `variant` prop is only consumed by `RadarBubble` — no external API change.

**Render condition update in RadarBubble:**
```typescript
// Current (line 244):
{isAlive && <PulseRing size={targetSize} statusColor={statusColor} />}

// New:
{isAlive && <PulseRing size={targetSize} statusColor={statusColor} variant="alive" />}
{heartbeatState === 'fading' && (
  <PulseRing size={targetSize} statusColor={FADING_COLOR} variant="fading" />
)}
```
[VERIFIED: current PulseRing code from src/components/home/RadarBubble.tsx]

### Pattern 3: Skeleton Layout — Radar View (HOME-01)

The `RadarView` renders inside `HomeScreen` which passes `friends` and `loading`. The skeleton condition `loading && friends.length === 0` must be evaluated inside `RadarView` or passed as a prop.

**Decision:** Pass `loading` prop to `RadarView` and `CardStackView` from `HomeScreen`. When `loading && friends.length === 0`, render skeleton positions instead of real bubbles.

Radar skeleton — 3 circular blobs at approximate positions (no need for scatter algorithm; use static positions that suggest the radar grid):
```typescript
// 3 SkeletonPulse circles of different sizes to mimic bubble diversity
// Sizes: 80, 64, 48 (matching BubbleSizeMap for free/maybe/busy)
const SKELETON_BLOBS = [
  { size: 80, style: { left: '20%', top: 30 } },
  { size: 64, style: { left: '55%', top: 80 } },
  { size: 48, style: { left: '70%', top: 20 } },
];
// Render within radarContainer using position: 'absolute' (same as real bubbles)
```

Card stack skeleton — 2 rectangular cards (matches CardStackView depth stack):
```typescript
<View style={styles.container}>
  <SkeletonPulse width="100%" height={160} />
  {/* second card peaking behind at reduced scale/opacity — static, no animation needed */}
  <SkeletonPulse width="100%" height={160} style={{ marginTop: -144, opacity: 0.5, transform: [{ scale: 0.95 }] }} />
</View>
```

### Pattern 4: Chat Skeleton Rows (CHAT-01)

`ChatListScreen` currently: `if (loading && chatList.length === 0) return <LoadingIndicator />;`

Replace with:
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

`ChatSkeletonRow` mirrors `ChatListRow` (height 72, paddingHorizontal SPACING.lg):
```typescript
function ChatSkeletonRow() {
  return (
    <View style={{ height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.md }}>
      <SkeletonPulse width={40} height={40} />  {/* avatar circle — borderRadius handled by SkeletonPulse's RADII.sm but visual is close enough */}
      <View style={{ flex: 1, gap: SPACING.xs }}>
        <SkeletonPulse width="100%" height={14} />  {/* title line */}
        <SkeletonPulse width="100%" height={12} />  {/* preview line */}
      </View>
    </View>
  );
}
```
Note: `SkeletonPulse` uses `RADII.sm` corners by design (D-03 locked). For the avatar circle appearance, set `width={40} height={40}` — the slight corner radius is acceptable for a skeleton.

### Pattern 5: Optimistic Send — Failed State (CHAT-03)

The `Message` type currently has `pending?: boolean`. The `failed?: boolean` flag needs to be added.

**In `src/types/chat.ts`:**
```typescript
export interface Message {
  // ... existing fields ...
  pending?: boolean;
  failed?: boolean;   // ADD: optimistic send failure (Phase 26, CHAT-03)
  tempId?: string;
}
```

**In `useChatRoom.sendMessage` — failure path:**
```typescript
// Current (line 483):
setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
return { error: insertError };

// New (D-18, D-19):
setMessages((prev) =>
  prev.map((m) =>
    m.tempId === tempId ? { ...m, pending: false, failed: true } : m
  )
);
return { error: insertError };
```

**Retry in `useChatRoom`:** Expose a `retryMessage(tempId: string, body: string)` function that removes the failed entry, re-inserts a new optimistic entry, and re-calls the insert. Wire this through `ChatRoomScreen` → `MessageBubble`.

**In `ChatRoomScreen`:** `useChatRoom` returns `retryMessage`; pass it to `MessageBubble` as an `onRetry` prop.

**In `MessageBubble`:** For own messages with `message.failed === true`, render the bubble with red border/tint + "Tap to retry" label. Tap calls `onRetry`.

### Pattern 6: Message Bubble Long-Press Scale (CHAT-04)

`MessageBubble` currently uses `TouchableOpacity` wrapping the own/others container. Scale animation requires an `Animated.Value` driven by the long-press gesture lifecycle.

**Problem:** `TouchableOpacity.onLongPress` fires when the long-press threshold is crossed, but there is no callback for "menu closed". The menu close happens via `closeMenu()` inside the component.

**Solution:** Track `menuVisible` (already exists as component state) and fire `Animated.spring` in a `useEffect` keyed on `menuVisible`:
```typescript
const bubbleScaleAnim = useRef(new Animated.Value(1)).current;

// Fire when long-press opens the menu
function handleLongPress(event: ...) {
  // Existing logic unchanged
  Animated.spring(bubbleScaleAnim, {
    toValue: 0.96,
    useNativeDriver: true,
    ...ANIMATION.easing.spring,
    isInteraction: false,
  }).start();
  setPillY(...);
  setMenuVisible(true);
}

// Restore when menu closes
function closeMenu() {
  setMenuVisible(false);
  Animated.spring(bubbleScaleAnim, {
    toValue: 1.0,
    useNativeDriver: true,
    ...ANIMATION.easing.spring,
    isInteraction: false,
  }).start();
}
```

Wrap the `TouchableOpacity` (own/others container) in an `Animated.View` with `transform: [{ scale: bubbleScaleAnim }]`.

**Important:** `useNativeDriver: true` with `transform: [{ scale }]` is valid — no layout props involved. [VERIFIED: same pattern as existing PulseRing, sizeAnim in RadarBubble uses useNativeDriver: false only because it animates width/height]

### Pattern 7: Haptics (CHAT-02)

`expo-haptics` import and usage is already established in the codebase.

```typescript
import * as Haptics from 'expo-haptics';

// In SendBar.handleSend():
function handleSend() {
  if (!canSend) return;
  const body = text.trim();
  setText('');
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);  // D-14
  onSend(body);
  onClearReply?.();
}

// In MessageBubble emoji strip onPress:
onPress={() => {
  closeMenu();
  void Haptics.selectionAsync();   // D-15
  onReact(message.id, emoji);
}}
```
[VERIFIED: expo-haptics installed — grep confirmed it is used in existing screens]

### Pattern 8: Zero-Friends Empty State Card (HOME-02)

The `OnboardingHintSheet` (AUTH-04) is already wired to `friends.length === 0 && !loading`. The zero-friends card uses the same condition but renders inline in the scroll area (D-07, D-10):

```typescript
// In HomeScreen, inside <ScrollView>, after the view switcher section:
{!loading && friends.length === 0 && <ZeroFriendsCard onAddFriend={handleNavigateToSquad} />}

// handleNavigateToSquad:
function handleNavigateToSquad() {
  router.push('/(tabs)/squad');
}
```

**Tab navigation confirmed:** The tabs layout defines: `index` (0), `squad` (1), `plans` (2), `chat` (3), `profile` (4). Squad is at route name `"squad"` → navigate via `router.push('/(tabs)/squad')`. [VERIFIED: read src/app/(tabs)/_layout.tsx]

**Copy (Claude's discretion):**
- Heading: "No friends yet"
- Body: "Add friends to share your status and stay in sync."
- CTA: "Add a friend →"

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shimmer skeleton loading | Custom gradient animation | `SkeletonPulse` from Phase 24 | Already handles width='100%', shimmer loop, RADII.sm, native driver |
| Animation timing values | Raw numbers (e.g. `duration: 300`) | `ANIMATION.duration.*` and `ANIMATION.easing.spring` | ESLint `no-hardcoded-styles` will catch raw numbers; tokens ensure consistency |
| Spring physics | `Animated.timing` with easing hack | `Animated.spring` with `ANIMATION.easing.spring` config | Spring physics vs timing = completely different feel; damping 15, stiffness 120 chosen |
| Haptic feedback | Custom vibration API calls | `expo-haptics` | Platform-normalized, already installed, correct iOS feedback style taxonomy |
| Custom pulse animation loop | Manual setInterval + setState | `Animated.loop` + `useNativeDriver: true` | JS-thread-free; same pattern already working in PulseRing |

**Key insight:** Every animation primitive needed for this phase is already in the codebase or Phase 24 output. The work is wiring, not building.

---

## Common Pitfalls

### Pitfall 1: Reanimated Instead of Animated
**What goes wrong:** Using `useAnimatedStyle`, `withSpring`, `withTiming` from `react-native-reanimated`.
**Why it happens:** Reanimated is the "modern" choice but `@gorhom/bottom-sheet` is broken on Reanimated v4 — project-wide constraint.
**How to avoid:** Use `Animated` from `react-native` only. `useNativeDriver: true` on `transform` and `opacity` props.
**Warning signs:** Any import from `react-native-reanimated`.

### Pitfall 2: Hardcoded Colors for FADING Pulse Ring
**What goes wrong:** Using a raw hex value like `'#F59E0B'` directly in the component.
**Why it happens:** Amber/orange is not currently in the theme color tokens.
**How to avoid:** Either add `colors.status.fading` to the theme, or use a named constant at the top of `RadarBubble.tsx` with an ESLint disable comment. ESLint `no-hardcoded-styles` is at error severity for all color, size, and radii values.
**Warning signs:** ESLint error `campfire/no-hardcoded-styles`.

### Pitfall 3: Failed Message State — Remove Instead of Mark
**What goes wrong:** On `sendMessage` error, filtering the optimistic entry out of messages (current behavior) instead of marking it `failed: true`.
**Why it happens:** The current code removes optimistic entries on failure (see `useChatRoom.ts` line 483).
**How to avoid:** Change the failure path in `sendMessage` to set `failed: true` on the message. The `Message` type needs `failed?: boolean` added.
**Warning signs:** On send failure, the message disappears instead of showing retry UI.

### Pitfall 4: Scale Spring on Layout-Affecting Props
**What goes wrong:** Animating `width`, `height`, `padding`, or `margin` with `useNativeDriver: true`.
**Why it happens:** `transform: [{ scale }]` looks like it should resize, but it doesn't — it's a render transform on an already-laid-out element. `useNativeDriver: true` only works for transform and opacity, not layout props.
**How to avoid:** Use `transform: [{ scale: scaleAnim }]` only. Never animate layout dimensions with native driver.
**Warning signs:** RCTAnimation assertion error at runtime about unsupported property.

### Pitfall 5: Skeleton `width='100%'` Before Layout
**What goes wrong:** `SkeletonPulse` with `width='100%'` starts the shimmer before its container has measured. The shimmer starts from position 0 and jumps.
**Why it happens:** The skeleton component waits for `onLayout` to know the pixel width before starting animation — but if it's rendered before the parent has laid out, the first frame shows the skeleton at the wrong translateX.
**How to avoid:** `SkeletonPulse` already guards against this (gates on `containerWidth !== null`). For the ChatSkeletonRow's text-line skeletons, `width='100%'` is correct — `SkeletonPulse` handles it. For radar circle skeletons, use fixed `width={80}` etc.

### Pitfall 6: OwnStatusCard — TouchableOpacity activeOpacity Conflicts
**What goes wrong:** Adding a scale transform to `OwnStatusCard` while keeping `TouchableOpacity.activeOpacity` causes double visual feedback (opacity dimming + scale simultaneously).
**Why it happens:** `TouchableOpacity` automatically applies its own opacity animation on press.
**How to avoid:** When adding scale spring to `OwnStatusCard`, set `activeOpacity={1.0}` on the `TouchableOpacity` (disabling the opacity effect) so only the scale spring provides feedback.

### Pitfall 7: Long-Press Scale on Deleted/Pending Messages
**What goes wrong:** Long-press scale fires even on deleted messages or messages with `pending: true`, which skip the context menu.
**Why it happens:** The scale animation is triggered in `handleLongPress` before the guard checks (line 431: `if (message.pending) return`).
**How to avoid:** Only trigger `Animated.spring(bubbleScaleAnim, { toValue: 0.96 })` if the guard passes (i.e., the menu will actually open). Move the scale start inside the guard block after the early returns.

---

## Code Examples

### Verified: ANIMATION.easing.spring shape
```typescript
// Source: src/theme/animation.ts
ANIMATION.easing.spring = { damping: 15, stiffness: 120 }
// Usage with Animated.spring:
Animated.spring(scaleAnim, {
  toValue: 0.96,
  useNativeDriver: true,
  damping: ANIMATION.easing.spring.damping,       // 15
  stiffness: ANIMATION.easing.spring.stiffness,   // 120
  isInteraction: false,
}).start();
```

### Verified: SkeletonPulse API
```typescript
// Source: src/components/common/SkeletonPulse.tsx
// Accepts: width (number | '100%'), height (number)
// Always uses RADII.sm corners, gradient shimmer
<SkeletonPulse width={40} height={40} />         // fixed size (avatar circle)
<SkeletonPulse width="100%" height={14} />       // full-width text line
<SkeletonPulse width={80} height={80} />         // radar bubble skeleton
```

### Verified: Haptics usage pattern
```typescript
// Source: existing screens in codebase (confirmed installed)
import * as Haptics from 'expo-haptics';

void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);  // D-14: on send
void Haptics.selectionAsync();                                  // D-15: on reaction tap
```

### Verified: PulseRing existing pattern (template for FADING variant)
```typescript
// Source: src/components/home/RadarBubble.tsx
const loop = Animated.loop(
  Animated.sequence([
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1.7, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true, isInteraction: false }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 1200, useNativeDriver: true, isInteraction: false }),
    ]),
    Animated.delay(600),
  ])
);
// FADING variant: duration → 2000, delay → 800, toValue scale → 1.5 (more languid)
```

### Verified: Squad tab navigation
```typescript
// Source: src/app/(tabs)/_layout.tsx — tab order: index(0), squad(1), plans(2), chat(3), profile(4)
// Route name for Squad tab is 'squad'
router.push('/(tabs)/squad');
```

### Verified: sendMessage optimistic entry structure
```typescript
// Source: src/hooks/useChatRoom.ts
const optimistic: MessageWithProfile = {
  id: tempId,
  // ... channel fields ...
  pending: true,
  tempId,
  // failed: true  ← to be added on failure (CHAT-03)
};
setMessages((prev) => [optimistic, ...prev]);
```

---

## Press Feedback Audit — All Tappable Home Cards (D-12)

| Component | File | Current Press Pattern | Action |
|-----------|------|----------------------|--------|
| `HomeFriendCard` | `src/components/home/HomeFriendCard.tsx` | `Pressable` + `pressed && styles.pressed` (opacity 0.7) | Replace with scale spring (Pressable + Animated.View) |
| `OwnStatusCard` | `src/components/status/OwnStatusCard.tsx` | `TouchableOpacity` (activeOpacity 0.85, no pressed style) | Add scale spring + set activeOpacity={1.0} |
| `EventCard` | `src/components/home/EventCard.tsx` | `TouchableOpacity` (activeOpacity 0.8) | Add scale spring + set activeOpacity={1.0} |
| `HomeWidgetRow` IOU tile | `src/components/home/HomeWidgetRow.tsx` | `Pressable` + `pressed && styles.tilePressed` (opacity 0.75) | Replace with scale spring |
| `HomeWidgetRow` Birthday tile | `src/components/home/HomeWidgetRow.tsx` | Same as above | Replace with scale spring |

Cards explicitly NOT in scope: `RadarBubble` (uses scale for depth effect; adding another scale layer would conflict), `OverflowChip`, `FriendSwipeCard` (swiping gesture, not press).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `opacity: 0.7` pressed feedback | Scale spring 1.0→0.96 | Phase 26 | More tactile, native-feeling; no visual "dimming" |
| `LoadingIndicator` spinner | Skeleton rows matching content shape | Phase 26 | Content-aware loading reduces layout shift perception |
| Remove optimistic message on failure | Mark `failed: true` + show retry | Phase 26 | Preserves user's typed content context on failure |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js test runner via `npx tsx` (no jest.config) |
| Config file | none — test files are self-contained with `assert` from `node:assert/strict` |
| Quick run command | `npx tsx tests/unit/<filename>.test.ts` |
| Full suite command | `for f in tests/unit/*.test.ts; do npx tsx "$f"; done` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-01 | Skeleton condition `loading && friends.length === 0` | unit (pure logic) | Not testable in isolation (UI-only) | N/A — visual |
| HOME-02 | Empty state condition `!loading && friends.length === 0` | unit (pure logic) | Not testable in isolation (UI-only) | N/A — visual |
| HOME-03 | FADING pulse animation config values | unit | `npx tsx tests/unit/fadingPulse.test.ts` | ❌ Wave 0 |
| HOME-04 | Scale spring config (ANIMATION.easing.spring values) | unit | `npx tsx tests/unit/animationTokens.test.ts` | ✅ already exists |
| CHAT-01 | Skeleton condition `loading && chatList.length === 0` | visual | N/A — visual | N/A — visual |
| CHAT-02 | Haptics call sites | manual | device only | N/A — manual |
| CHAT-03 | `sendMessage` sets `failed: true` on insert error | unit | `npx tsx tests/unit/useChatRoom.send.test.ts` | ❌ Wave 0 |
| CHAT-04 | Long-press scale animation wiring | visual | N/A — visual | N/A — visual |

### Wave 0 Gaps
- [ ] `tests/unit/fadingPulse.test.ts` — verifies FADING_COLOR constant exists and animation duration is 2000ms (REQ HOME-03). Pure value test, no React.
- [ ] `tests/unit/useChatRoom.send.test.ts` — verifies `sendMessage` failure path sets `failed: true` on the optimistic message (REQ CHAT-03). Pure state mutation test following `useChatRoom.reactions.test.ts` pattern.

---

## Open Questions (RESOLVED)

1. **FADING pulse ring color — final hex**
   - What we know: must feel "caution/winding down" against dark green background (`#091A07`) and light backgrounds; amber-orange range
   - What's unclear: exact hex to match app's color language without introducing a discordant new tone
   - Recommendation: Use `#F59E0B` (Tailwind amber-400) as starting point; verify visually on device in both light/dark mode. Wrap in a named constant `FADING_PULSE_COLOR` at module scope in `RadarBubble.tsx` with `// eslint-disable-next-line campfire/no-hardcoded-styles` comment.

2. **Zero-friends empty state — does it need to coexist with OnboardingHintSheet correctly?**
   - What we know: `OnboardingHintSheet` fires once (`AsyncStorage` flag, `friends.length === 0 && !loading`). The zero-friends card fires every time `!loading && friends.length === 0`.
   - What's unclear: Can both render simultaneously without UI conflict?
   - Recommendation: Both can coexist — `OnboardingHintSheet` is a bottom sheet modal, the empty card is inline scroll content. No conflict. The OnboardingHintSheet will appear on top of the scroll view as a sheet.

3. **`retryMessage` in `useChatRoom` — simplest correct implementation**
   - What we know: Need to retry sending a failed message. The `sendMessage` function generates a new `tempId` on each call.
   - What's unclear: Should retry reuse the same `tempId` (to replace the failed bubble in-place) or create a new one?
   - Recommendation: Remove the `failed` entry by its `tempId`, then call `sendMessage(body)` normally. This reuses the existing `sendMessage` flow cleanly. Expose `retryMessage(tempId: string, body: string)` from `useChatRoom`.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies required — all libraries already installed in the project).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `#F59E0B` (amber-400) is a suitable amber color for FADING pulse ring on both dark/light backgrounds | Key Implementation Patterns §2 | Purely visual; easy to adjust during implementation — no functional impact |
| A2 | `expo-haptics` is already installed and working on the target device | Standard Stack | Would require `npx expo install expo-haptics`; low risk since it is referenced in existing code |

---

## Sources

### Primary (HIGH confidence)
- `src/components/home/RadarBubble.tsx` — PulseRing implementation, heartbeatState consumption, existing animation pattern
- `src/components/common/SkeletonPulse.tsx` — SkeletonPulse API (width, height, RADII.sm fixed)
- `src/theme/animation.ts` — ANIMATION token values (fast/normal/slow/verySlow, spring config)
- `src/screens/home/HomeScreen.tsx` — current friends/loading state, zero-friends conditions
- `src/screens/chat/ChatListScreen.tsx` — current skeleton condition (`loading && chatList.length === 0`)
- `src/hooks/useChatRoom.ts` — sendMessage optimistic implementation, pending/tempId pattern
- `src/components/chat/MessageBubble.tsx` — long-press handler, pending state rendering, context menu lifecycle
- `src/components/chat/SendBar.tsx` — handleSend call site for haptic injection
- `src/components/home/HomeFriendCard.tsx` — current `opacity: 0.7` pressed style to replace
- `src/components/status/OwnStatusCard.tsx` — TouchableOpacity structure for press feedback
- `src/components/home/HomeWidgetRow.tsx` — Pressable + opacity pressed style
- `src/components/home/EventCard.tsx` — TouchableOpacity structure
- `src/app/(tabs)/_layout.tsx` — tab order confirmation (Squad = index 1, route name 'squad')
- `src/types/chat.ts` — Message type (pending, tempId fields; failed needs adding)

### Secondary (MEDIUM confidence)
- React Native docs on `Animated.spring` + `useNativeDriver: true` with transform [ASSUMED from training, consistent with existing codebase usage]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries verified in codebase
- Architecture: HIGH — all target files read and patterns confirmed
- Pitfalls: HIGH — derived from actual code reading, not speculation
- Animation patterns: HIGH — PulseRing, SkeletonPulse, ANIMATION tokens all verified from source
- Color choice for FADING pulse: LOW — visual judgment, needs device verification

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable React Native animation APIs; project-specific patterns won't drift)
