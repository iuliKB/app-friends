# Phase 14: Reply Threading - Research

**Researched:** 2026-04-21
**Domain:** React Native chat UI — long-press context menus, quoted reply rendering, FlatList scroll-to-index, soft delete, animated feedback
**Confidence:** HIGH

---

## Summary

Phase 14 adds reply threading to an existing React Native chat screen. The schema foundation (Phase 12) already provides `messages.reply_to_message_id` (nullable FK with ON DELETE SET NULL) and nullable `body` — no migration is needed. The work is purely UI-layer: a long-press context menu on `MessageBubble`, a reply preview bar in `SendBar`, a quoted block rendered inside reply bubbles, scroll-to-original with highlight flash, and a soft-delete path (set `body = NULL`).

One infrastructure gap was identified during research: **the `messages` table has no RLS UPDATE policy**. The soft-delete operation (`UPDATE messages SET body = NULL WHERE id = ? AND sender_id = ?`) will fail at the database layer until an UPDATE policy is added. This must be addressed in Wave 0 or the first task that implements `deleteMessage`.

All four component files targeted by the context (`ChatRoomScreen`, `MessageBubble`, `SendBar`, `useChatRoom`) have been fully read. Patterns for `Modal`-based overlays, `PanResponder` swipe-down dismiss, `Animated.Value` interpolation, and the inverted-FlatList index math are all established in the existing codebase with concrete references.

**Primary recommendation:** Implement in four sequential waves: (1) RLS policy + `deleteMessage` + context menu, (2) quoted block rendering in bubbles, (3) reply bar + `sendMessage` extension, (4) scroll-to-original + highlight + toast.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Long-press on any `MessageBubble` opens an inline overlay — a floating pill/toolbar that appears directly above the tapped bubble, like iMessage. Implemented as an absolutely-positioned `View` overlaid on the bubble via a `Modal` or in-place conditional render with `zIndex`.

**D-02:** Short tap behavior is unchanged — tap still shows the timestamp (2.5s fade). Both gestures coexist on the `TouchableOpacity`. Long-press adds `onLongPress` prop alongside existing `onPress`.

**D-03:** Context menu actions: Reply + Copy text + Delete (own messages only). Delete is gated: only visible when `isOwn === true`. Copy and Delete are in scope for this phase.

**D-04:** Context menu dismisses on tap-outside (backdrop overlay or `onBlur`).

**D-05:** Deleting a message performs a soft delete: body is set to `NULL`. The bubble remains visible with body replaced by greyed "Message deleted" placeholder text.

**D-06:** Replies quoting a soft-deleted message show "Original message deleted" in the quoted block.

**D-07:** Quoted block visual style: left accent border (Telegram/WhatsApp pattern). A colored vertical bar on the left edge, sender name above truncated preview text. Sits above the reply body text inside the same bubble.

**D-08:** Accent bar color is sender-tinted: own messages → `COLORS.interactive.accent` (#f97316), others' messages → `COLORS.text.secondary` (#9ca3af).

**D-09:** Quoted block content: sender name + truncated first line of body. Image messages show "📷 Photo". Deleted messages show "Message deleted."

**D-10:** Tapping a quoted block scrolls to the original using `FlatList.scrollToIndex()`. The list is inverted — must compute correct index (position in `data` array, not visual position).

**D-11:** If the original message is not in the currently loaded window: show a brief toast — "Scroll up to see original message". No network fetch.

**D-12:** After scrolling, flash-highlight the target bubble for ~1 second via `Animated.Value` background color interpolation.

**D-13:** Reply preview bar appears between message list and `SendBar`. Shows "↩ Replying to [sender name]" + truncated first line + × dismiss button.

**D-14:** Dismiss options: × button and swipe-down gesture. Sending also clears the bar.

**D-15:** `SendBar` receives `replyContext` as optional prop (or state lives in `ChatRoomScreen`). `onSend` passes `replyToId` to `sendMessage`.

**D-16:** `sendMessage` signature extends to `sendMessage(body: string, replyToId?: string): Promise<{ error: Error | null }>`. No migration needed — column already exists.

### Claude's Discretion

- Exact implementation of the inline overlay: `Modal` with transparent background vs. in-place absolute positioning with `zIndex`.
- Sender-tinted accent bar color mapping (own vs. others; or a 2-color palette for others).
- Truncation length for quoted preview (1 line, ~50-60 chars).
- Toast implementation (short-lived `Animated.View` — prefer non-blocking over `Alert`).
- Highlight flash animation specifics (color interpolation, 1-second duration).
- Whether `replyContext` state lives in `ChatRoomScreen` or inside a refactored `SendBar`.
- Soft-delete implementation detail: `body = NULL` is the marker (no `deleted_at` column — no migration needed).

### Deferred Ideas (OUT OF SCOPE)

- Reactions on messages (Phase 15)
- Message editing
- Nested thread views (Discord-style)
- Pagination / loading older messages to find out-of-window originals
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-07 | User can reply to a specific message; the reply shows a quoted preview of the original | `reply_to_message_id` column exists in schema (0018). `MessageBubble` needs quoted block render. `SendBar` needs reply bar. `sendMessage` needs `replyToId` param. |
| CHAT-08 | Tapping the quoted preview scrolls to the original message (within loaded window only) | FlatList `ref` + `scrollToIndex()`. Inverted-list index math. Highlight flash via `Animated.Value`. Toast for out-of-window case. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Long-press context menu | UI Component (MessageBubble) | ChatRoomScreen (owns callbacks) | Touch gesture and overlay rendering belongs at the bubble level; action handlers lift state to screen |
| Reply state (which message is being replied to) | ChatRoomScreen | — | Owns `messages` array and must pass `replyToId` to `sendMessage`; reply bar is a sibling of `SendBar` |
| Reply bar UI | SendBar (via `replyContext` prop) | ChatRoomScreen (renders as sibling) | SendBar owns its container height; reply bar integrates naturally as conditional render above the input row |
| Quoted block rendering | MessageBubble | — | Bubble owns its visual structure; quoted block is a subview inside the bubble container |
| Scroll-to-original | ChatRoomScreen | FlatList ref | Only `ChatRoomScreen` has both the FlatList ref and the `messages` array for index lookup |
| Highlight flash | MessageBubble | ChatRoomScreen (triggers via prop/callback) | Flash animation is per-bubble; screen passes a `highlighted` prop after scroll |
| Soft-delete (body=NULL) | useChatRoom (new `deleteMessage` fn) | Supabase RLS UPDATE policy | State mutation and persistence belong in the hook; RLS policy is database-level gate |
| Toast (not-in-window) | ChatRoomScreen | — | Positioned above `SendBar`, rendered at screen level; non-blocking |
| Copy to clipboard | MessageBubble callback | — | `Clipboard.setStringAsync()` from `expo-clipboard` |

---

## Standard Stack

### Core (all already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native `Animated` | bundled | Highlight flash, toast fade, reply bar | Already used in `MessageBubble` (fadeAnim), `SendBar` (translateY) |
| React Native `Modal` | bundled | Context menu overlay | Already used in `SendBar` for attachment sheet; transparent background for backdrop pattern |
| React Native `PanResponder` | bundled | Swipe-down dismiss on reply bar | Already used in `StatusPickerSheet.tsx` with identical pattern |
| React Native `FlatList` ref + `scrollToIndex` | bundled | Scroll to quoted original | FlatList already rendered in `ChatRoomScreen`; ref needs to be created |
| Supabase JS client | project | `deleteMessage` UPDATE call | Already in `useChatRoom` |
| Ionicons (`@expo/vector-icons`) | project | Context menu icons | Locked constraint — Ionicons only |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-clipboard` | project (Expo SDK) | Copy message text to system clipboard | Copy action in context menu |

**Note on `expo-clipboard`:** Expo managed workflow includes `Clipboard` from `expo-clipboard`. [ASSUMED — verify it is already in package.json before adding an install step.]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Modal` for context menu | In-place `zIndex` absolute render | Modal guarantees z-ordering across the entire screen; absolute + zIndex can clip at parent boundary (especially inside `FlatList` items). D-01 allows either; `Modal` is safer. |
| `PanResponder` for swipe dismiss | `react-native-gesture-handler` | RNGF is not installed; PanResponder is built-in and already used in project for identical gesture. |
| `Animated.Value` color interpolation | `Animated.Color` | No difference in RN — same API; color interpolation via `interpolate` with string colors. `useNativeDriver: false` required. |

**Installation:**
```bash
# expo-clipboard is included in Expo SDK — no install needed if Expo SDK >= 46
# Verify:
npx expo install expo-clipboard
```

---

## Architecture Patterns

### System Architecture Diagram

```
User Action (long-press)
        |
        v
MessageBubble.onLongPress
        |
        v
BubbleContextMenu Modal
  [Reply] [Copy] [Delete*]
        |
   +-----------+----------+
   |           |          |
Reply        Copy      Delete
   |           |          |
   v           v          v
ChatRoomScreen  Clipboard  useChatRoom
setReplyCtx()   .setString  .deleteMessage()
   |             (no state)  sets body=NULL
   v                         optimistic update
SendBar
(replyContext prop)
  Reply bar renders
        |
  User sends message
        v
useChatRoom.sendMessage(body, replyToId)
  -> INSERT with reply_to_message_id
        |
        v
Realtime INSERT event received
  -> enrichMessage() with reply_to_message_id
        |
        v
MessageBubble renders with quoted block
  quoted block onPress
        |
  +-----+------+
  |             |
found in     not found
messages[]   in messages[]
  |             |
FlatList     ChatRoomScreen
scrollToIndex  showToast()
  |
MessageBubble (target)
highlight flash (Animated)
```

### Recommended Project Structure

No new files required outside of what CONTEXT.md specifies. All changes are in-place modifications:

```
src/
├── components/chat/
│   ├── MessageBubble.tsx     # add onLongPress, quoted block, highlight flash, deleted placeholder
│   └── SendBar.tsx           # add replyContext prop, reply preview bar, swipe-down dismiss
├── hooks/
│   └── useChatRoom.ts        # extend sendMessage, add deleteMessage
└── screens/chat/
    └── ChatRoomScreen.tsx    # add FlatList ref, reply state, scroll-to-original, toast
```

---

### Pattern 1: Modal-based Context Menu Overlay

**What:** A `Modal` with transparent background and `COLORS.overlay` backdrop. A floating pill positioned absolutely above the tapped bubble.

**When to use:** When an overlay must appear above the FlatList and all other screen content. Avoids z-index clipping inside FlatList item views.

```typescript
// [VERIFIED: existing project pattern in SendBar.tsx]
// Extend this pattern for context menu — same Modal structure
<Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
  <TouchableWithoutFeedback onPress={closeMenu}>
    <View style={StyleSheet.absoluteFillObject} />
  </TouchableWithoutFeedback>
  {/* Floating pill positioned above tapped bubble */}
  <View style={[styles.contextPill, { top: bubbleY - PILL_HEIGHT }]}>
    {/* action buttons */}
  </View>
</Modal>
```

**Challenge for this phase:** The pill must appear "above the tapped bubble." In a `Modal`, position is relative to the screen. The approach: measure the bubble's page position using `onLayout` + `ref.measure()`, then pass `{ y, height }` up to `ChatRoomScreen` when long-press triggers, and render the pill at the computed screen coordinate. [ASSUMED — standard RN approach; confirm measurement API works with inverted FlatList.]

---

### Pattern 2: PanResponder Swipe-Down Dismiss

**What:** Attach a `PanResponder` to the reply bar (or its drag handle area) to detect downward swipe and dismiss.

**When to use:** Reply bar swipe-down dismiss (D-14). Identical to the swipe-dismiss in `StatusPickerSheet.tsx`.

```typescript
// [VERIFIED: StatusPickerSheet.tsx lines 68-90 — exact pattern to copy]
const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 60 || gs.vy > 0.5) {
        onClearReply?.();  // dismiss
      }
    },
  })
).current;
```

---

### Pattern 3: Animated Color Interpolation for Highlight Flash

**What:** An `Animated.Value(0)` interpolated to a background color string. Animate 0→1→0 over 1 second.

**When to use:** Bubble highlight flash after scroll-to-original (D-12). `useNativeDriver: false` is required because color is not a natively animatable property.

```typescript
// [ASSUMED — standard React Native Animated pattern]
const highlightAnim = useRef(new Animated.Value(0)).current;

const highlightBg = highlightAnim.interpolate({
  inputRange: [0, 1],
  outputRange: ['transparent', 'rgba(249, 115, 22, 0.2)'],  // COLORS.interactive.accent at 20% opacity
});

function triggerHighlight() {
  Animated.sequence([
    Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
    Animated.timing(highlightAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
  ]).start();
}
// Apply: <Animated.View style={{ backgroundColor: highlightBg }}>...</Animated.View>
```

---

### Pattern 4: FlatList scrollToIndex with Inverted List

**What:** `flatListRef.current?.scrollToIndex({ index, animated: true })`.

**Critical detail:** The FlatList `data` array is `messages` in **newest-first** order (index 0 = newest message, rendered at the bottom of the inverted list). To scroll to a message by ID:

```typescript
// [VERIFIED: ChatRoomScreen.tsx line 137 — FlatList has no ref yet. Add one.]
// [VERIFIED: useChatRoom.ts line 139 — .order('created_at', { ascending: false }) confirms newest-first]
const flatListRef = useRef<FlatList<MessageWithProfile>>(null);

function scrollToMessage(messageId: string) {
  const index = messages.findIndex((m) => m.id === messageId);
  if (index === -1) {
    showToast();
    return;
  }
  flatListRef.current?.scrollToIndex({ index, animated: true });
  // trigger highlight on the target bubble at that index
}
```

**`scrollToIndex` pitfall:** If the item is near the top of the list (older messages, high index), RN may throw a warning "scrollToIndex should be used in conjunction with getItemLayout or onScrollToIndexFailed." Implement `onScrollToIndexFailed` to scroll to offset 0 (the oldest-visible area) and then retry, or use `onScrollToIndexFailed` to scroll to end of list.

```typescript
// [ASSUMED — documented React Native pitfall]
onScrollToIndexFailed={(info) => {
  flatListRef.current?.scrollToOffset({
    offset: info.averageItemLength * info.index,
    animated: true,
  });
}}
```

---

### Pattern 5: Soft Delete via Supabase UPDATE

**What:** `UPDATE messages SET body = NULL WHERE id = ? AND sender_id = ?` called from `useChatRoom.deleteMessage()`.

**Critical gap:** No `messages_update_own` RLS policy exists in any migration (confirmed: `grep "messages.*FOR UPDATE"` returned no results across all 18 migrations). The UPDATE will fail with a Postgres RLS violation unless a policy is added.

```sql
-- New migration (0019 or inline RLS fix) required:
CREATE POLICY "messages_soft_delete_own"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()))
  WITH CHECK (sender_id = (SELECT auth.uid()));
```

**Client-side (optimistic):**
```typescript
// [ASSUMED — standard Supabase optimistic update pattern]
async function deleteMessage(messageId: string): Promise<{ error: Error | null }> {
  // Optimistic: set body to null immediately
  setMessages(prev =>
    prev.map(m => m.id === messageId ? { ...m, body: null } : m)
  );

  const { error } = await supabase
    .from('messages')
    .update({ body: null })
    .eq('id', messageId)
    .eq('sender_id', currentUserId);

  if (error) {
    // Rollback: restore original body — requires stashing it before optimistic update
    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, body: originalBody } : m)
    );
    return { error };
  }
  return { error: null };
}
```

**Realtime consideration:** The existing `subscribeRealtime()` only handles INSERT events. A soft-delete UPDATE will NOT propagate to other participants in real time unless an UPDATE listener is added. D-05 says the soft-delete is visible to all participants — this requires either: (a) adding an UPDATE Realtime listener alongside the INSERT listener, or (b) accepting that the placeholder is only visible to the deleter until they re-open the chat. The context does not specify realtime propagation for delete. **The planner should decide whether to add an UPDATE listener in Phase 14 or defer it.**

---

### Anti-Patterns to Avoid

- **Rendering quoted block data inside `MessageBubble` by fetching from server:** The quoted message data (sender name, preview text) is resolved entirely from the in-memory `messages` array. No separate query. If not found → fallback text. Never fetch on render.
- **Using `ScrollView + map` for the message list:** FlatList is the locked constraint. Never replace.
- **Hard-coding colors:** ESLint `no-hardcoded-styles` is enforced at error severity. All colors, font sizes, spacing values must use `@/theme` tokens. The 20%-opacity accent for highlight flash (`rgba(249, 115, 22, 0.2)`) has no token — document as an `eslint-disable` comment.
- **Forgetting `message_type` CHECK constraint on soft delete:** Setting `body = NULL` on a `message_type = 'text'` row violates the `messages_body_required` CHECK constraint added in migration 0018: `CHECK (message_type <> 'text' OR body IS NOT NULL)`. **The soft-delete UPDATE must also set `message_type` to a non-'text' value, OR the constraint must be re-evaluated.** This is a critical schema-level conflict that the planner must resolve.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Copy text to clipboard | Custom native module | `expo-clipboard` `Clipboard.setStringAsync()` | Expo managed workflow includes this; platform-native clipboard behavior |
| Swipe-down gesture detection | Raw touch event math | `PanResponder` (already in project — StatusPickerSheet.tsx) | PanResponder handles velocity, multi-touch conflicts, and platform differences |
| Backdrop dismiss on Modal | Manual event tracking | `TouchableWithoutFeedback` wrapping `StyleSheet.absoluteFillObject` view | Already used in `SendBar.tsx` for attachment sheet |

**Key insight:** Every animation and gesture pattern needed in this phase already exists in the codebase. Reference `StatusPickerSheet.tsx` for PanResponder, `MessageBubble.tsx` for `Animated.timing`, `SendBar.tsx` for Modal backdrop.

---

## Common Pitfalls

### Pitfall 1: CHECK Constraint Blocks Soft Delete

**What goes wrong:** `UPDATE messages SET body = NULL` on a `message_type = 'text'` row throws a Postgres CHECK violation: `messages_body_required` (migration 0018, Step 1c: `CHECK (message_type <> 'text' OR body IS NOT NULL)`).

**Why it happens:** The constraint was added to ensure text messages always have a body. Soft-deleting a text message conflicts with this invariant.

**How to avoid:** Two options:
1. UPDATE both `body = NULL` AND `message_type = 'deleted'` (requires adding 'deleted' to the CHECK constraint list in a new migration).
2. Change the soft-delete marker to a dedicated boolean `deleted` column or `deleted_at` timestamp that doesn't conflict with the body constraint (requires migration).
3. Keep `message_type = 'text'` but update the CHECK constraint to also permit `body IS NULL` when the message was sent by the current user. Most surgical fix.

The CONTEXT.md Claude's Discretion says "prefer `body = NULL` (no migration)" but this conflicts with the existing CHECK constraint. **A migration will be required.** This is the most important finding in this research.

**Warning signs:** "new row for relation 'messages' violates check constraint 'messages_body_required'" error on delete.

---

### Pitfall 2: Missing RLS UPDATE Policy

**What goes wrong:** `deleteMessage()` call returns a Postgres error (406 or RLS policy violation) even though the row exists and `sender_id` matches.

**Why it happens:** The `messages` table has SELECT and INSERT policies (from migration 0001) but no UPDATE policy. RLS blocks all UPDATE by default when no policy exists.

**How to avoid:** Add `messages_soft_delete_own` UPDATE policy in a new migration (or amend 0018 if migration has not been applied yet — but since Phase 12 is already complete per STATE.md, a new migration 0019 is needed).

**Warning signs:** Soft-delete silently fails or returns an error; bubble never shows "Message deleted." placeholder.

---

### Pitfall 3: scrollToIndex Fails on Large List

**What goes wrong:** `scrollToIndex` throws a warning or scrolls to the wrong position when targeting an item near the top (oldest) of the inverted list because RN doesn't know item heights.

**Why it happens:** `FlatList` without `getItemLayout` performs layout estimation for `scrollToIndex`. Message bubbles have variable heights (multi-line messages, quoted blocks).

**How to avoid:** Implement `onScrollToIndexFailed` fallback. For the 50-message window constraint, the failure case is acceptable — use `onScrollToIndexFailed` to fall back to the toast "Scroll up to see original message" behavior, treating it the same as out-of-window.

**Warning signs:** Yellow warning box "scrollToIndex should be used in conjunction with getItemLayout."

---

### Pitfall 4: Optimistic Delete Body Stash

**What goes wrong:** Soft-delete is optimistic (bubble shows "Message deleted." immediately). If the RPC fails, the rollback needs the original body. If the original body wasn't stashed before the optimistic update, rollback is impossible.

**Why it happens:** `setMessages()` is called before the Supabase call; the original body is overwritten in state.

**How to avoid:** Capture `originalBody` from the `messages` array before calling `setMessages()`.

```typescript
const originalBody = messages.find(m => m.id === messageId)?.body ?? null;
// then optimistic update, then rollback uses originalBody on error
```

---

### Pitfall 5: Quoted Block Source Data for Own Optimistic Messages

**What goes wrong:** User replies to a just-sent message that is still in `pending: true` state. The message has a `tempId`, not a real UUID. When the reply is sent and its `reply_to_message_id` is resolved on the server, the quoted block lookup by `tempId` fails.

**Why it happens:** Optimistic messages use `Date.now().toString()` as `id` (useChatRoom.ts line 285). If a reply is initiated against a pending message, `reply_to_message_id` would be set to the temp ID, which the server doesn't know.

**How to avoid:** Disable the long-press / Reply action on `pending: true` messages. Check `message.pending` before showing context menu or Reply option.

---

## Code Examples

### Quoted Block in MessageBubble

```typescript
// [ASSUMED — based on D-07, D-08, D-09 from CONTEXT.md and UI-SPEC.md]
// Render inside bubble container, above body text, only when reply_to_message_id is non-null

interface QuotedBlockProps {
  replyToId: string;
  messages: MessageWithProfile[];
  isOwn: boolean;
  onPress: () => void;
}

function QuotedBlock({ replyToId, messages, isOwn, onPress }: QuotedBlockProps) {
  const original = messages.find(m => m.id === replyToId);
  const accentColor = isOwn ? COLORS.interactive.accent : COLORS.text.secondary;

  const senderName = original?.sender_display_name ?? 'Unknown';
  const previewText = original
    ? (original.body ?? (original.image_url ? '📷 Photo' : 'Message deleted'))
    : 'Original message deleted';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quotedBlock]}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <View style={styles.quotedContent}>
          <Text style={[styles.quotedSender, { color: accentColor }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={styles.quotedPreview} numberOfLines={1}>
            {previewText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// styles (all tokens — no raw values)
const styles = StyleSheet.create({
  quotedBlock: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.overlay,
    borderRadius: RADII.xs,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,         // decorative — eslint-disable campfire/no-hardcoded-styles
    borderRadius: RADII.xs,
  },
  quotedContent: {
    flex: 1,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  quotedSender: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  quotedPreview: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
});
```

### sendMessage Extension

```typescript
// [VERIFIED: existing signature in useChatRoom.ts line 277]
// Extend to accept optional replyToId

async function sendMessage(body: string, replyToId?: string): Promise<{ error: Error | null }> {
  // ... existing optimistic message setup ...
  const optimistic: MessageWithProfile = {
    // ...
    reply_to_message_id: replyToId ?? null,  // already typed in Message interface
  };

  const { error: insertError } = await supabase.from('messages').insert({
    // ...existing fields...
    reply_to_message_id: replyToId ?? null,
  });
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard-coded reply type as a separate `message_type` | `reply_to_message_id` FK on any message | Phase 12 D-03 | No message_type enum change needed; any message can be a reply |
| Separate fetch for quoted message data | Resolve from in-memory `messages` array | Phase 14 design | Zero extra network calls; works within 50-message window constraint |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-clipboard` is already in package.json (Expo SDK includes it) | Standard Stack | If not present, need `npx expo install expo-clipboard` — minor |
| A2 | Modal-based context menu can determine bubble screen position via `ref.measure()` on the `TouchableOpacity` | Architecture Patterns (Pattern 1) | May need alternative positioning strategy (e.g., store `pageY` from `onLongPress` native event) |
| A3 | Realtime UPDATE listener for soft-delete propagation is NOT required in Phase 14 (only visible to deleter until re-open) | Pattern 5 (soft delete) | If real-time propagation is expected, need to add `.on('postgres_changes', { event: 'UPDATE' ... })` to subscribeRealtime() |
| A4 | The `messages_body_required` CHECK constraint conflict with soft-delete will be resolved by adding `'deleted'` to the `message_type` enum and updating `body = NULL, message_type = 'deleted'` together | Pitfall 1 | If the approach chosen is different (e.g., dedicated `deleted_at` column), migration scope changes |

---

## Open Questions

1. **Soft-delete + CHECK constraint resolution strategy**
   - What we know: `messages_body_required` CHECK (`message_type <> 'text' OR body IS NOT NULL`) blocks setting `body = NULL` on text messages.
   - What's unclear: Which approach to use — add `'deleted'` to message_type enum, or relax the CHECK constraint.
   - Recommendation: Add `'deleted'` to the `message_type` CHECK list and `message_type = 'deleted'` in the UPDATE. This is the cleanest signal: the planner should include a migration task (0019) as the first wave.

2. **Realtime propagation of soft-delete to other participants**
   - What we know: Current `subscribeRealtime()` handles INSERT only. A deleted message becomes `body = NULL` via UPDATE.
   - What's unclear: Is real-time propagation of deletes required in Phase 14?
   - Recommendation: Add an UPDATE listener in `subscribeRealtime()` alongside the INSERT listener. The existing Realtime channel already filters by channel ID — just add `event: 'UPDATE'` handler. Without it, other participants only see "Message deleted." after they re-open the chat.

3. **Context menu bubble positioning**
   - What we know: The `Modal` positions the pill at screen coordinates. The bubble's screen position must be measured.
   - What's unclear: Best API — `onLongPress` native event `nativeEvent.pageY` vs `ref.measure()`.
   - Recommendation: Use `nativeEvent.pageY` from the `onLongPress` event handler — it provides the touch point location without needing a ref.measure() async call.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 14 is purely UI/client code changes + one SQL migration. No new external tools, CLIs, or services beyond the existing Supabase project.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (visual regression, per .planning/PROJECT.md §Key Decisions) |
| Config file | Detected via project — `.playwright/` or root config |
| Quick run command | `npx playwright test --grep "reply"` (once test created) |
| Full suite command | `npx playwright test` |

> Note: Campfire uses Playwright + Expo Web for visual regression. Unit tests for hook logic (sendMessage extension, deleteMessage) have no test infrastructure detected. Validation for this phase is primarily integration/visual.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-07 | Reply sends message with `reply_to_message_id` set; quoted block renders in bubble | Visual regression (Expo Web) | `npx playwright test --grep "reply"` | ❌ Wave 0 |
| CHAT-07 | Reply bar appears on Reply action; clears on × and on send | Visual regression | same | ❌ Wave 0 |
| CHAT-07 | Deleted message shows "Message deleted." placeholder | Visual regression | same | ❌ Wave 0 |
| CHAT-08 | Tapping quoted block scrolls to original (manual — requires device/simulator) | Manual smoke test | N/A | Manual only |
| CHAT-08 | Toast appears when original is out of window | Visual regression | `npx playwright test --grep "toast"` | ❌ Wave 0 |

### Sampling Rate

- Per task commit: `npx playwright test --grep "reply"` (targeted)
- Per wave merge: `npx playwright test` (full suite)
- Phase gate: Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Playwright test file covering CHAT-07 reply send and quoted block render
- [ ] Playwright test file covering CHAT-07 reply bar show/clear
- [ ] Playwright test file covering CHAT-07 deleted message placeholder
- [ ] Playwright test file covering CHAT-08 toast for out-of-window

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A |
| V3 Session Management | no | N/A |
| V4 Access Control | yes | RLS: new `messages_soft_delete_own` UPDATE policy; gate delete to own messages in both UI and database |
| V5 Input Validation | yes | `body` column — soft delete sets to NULL (valid); `reply_to_message_id` — existing FK constraint validates the UUID |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Delete another user's message | Tampering | RLS UPDATE policy `USING (sender_id = auth.uid())` + UI gate `isOwn === true` |
| Reply to a message in a different channel | Spoofing | Existing RLS SELECT policy on messages gates channel membership; `reply_to_message_id` FK cannot reference a message the user cannot read |
| Quoted block XSS via crafted message body | Tampering | React Native renders Text components — no HTML/DOM. Not a web surface; XSS not applicable |

---

## Sources

### Primary (HIGH confidence)

- `src/components/chat/MessageBubble.tsx` — full file read; established animation, tap, and styling patterns
- `src/components/chat/SendBar.tsx` — full file read; Modal, backdrop, translateY animation patterns
- `src/hooks/useChatRoom.ts` — full file read; sendMessage signature, optimistic update, Realtime subscription
- `src/screens/chat/ChatRoomScreen.tsx` — full file read; FlatList setup (no ref yet), messages array ownership
- `src/types/chat.ts` — full file read; `Message.reply_to_message_id`, `Message.body` nullable
- `supabase/migrations/0018_chat_v1_5.sql` — full file read; confirmed `reply_to_message_id` FK exists, `messages_body_required` CHECK constraint
- `supabase/migrations/0001_init.sql` (grep) — confirmed no UPDATE/DELETE RLS policies on messages table
- `src/components/status/StatusPickerSheet.tsx` — PanResponder swipe-down pattern (lines 68-90)
- `src/theme/colors.ts`, `spacing.ts`, `radii.ts`, `typography.ts` — full reads; all token values confirmed

### Secondary (MEDIUM confidence)

- `.planning/phases/14-reply-threading/14-CONTEXT.md` — all locked decisions, canonical refs, code insights
- `.planning/phases/14-reply-threading/14-UI-SPEC.md` — visual contract, component inventory, copywriting
- `.planning/PROJECT.md` — project constraints, tech stack confirmation

### Tertiary (LOW confidence — ASSUMED)

- `expo-clipboard` availability in project (A1) — not verified against package.json
- `nativeEvent.pageY` as bubble position strategy for context menu (A2, A3)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in the project; confirmed via source files
- Architecture: HIGH — all four target files fully read; integration points verified
- Pitfalls: HIGH — CHECK constraint conflict and missing RLS policy verified against actual migration files
- Schema: HIGH — migration 0018 fully read; `reply_to_message_id` confirmed, `messages_body_required` CHECK confirmed
- Test coverage: MEDIUM — Playwright test infrastructure exists per PROJECT.md but no Phase 14 tests exist yet

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable stack; only risk is schema decisions on soft-delete approach)
