---
phase: 16-media-sharing
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/components/chat/ImageViewerModal.tsx
  - src/components/chat/MessageBubble.tsx
  - src/components/chat/SendBar.tsx
  - src/hooks/useChatRoom.ts
  - src/lib/uploadChatMedia.ts
  - src/screens/chat/ChatRoomScreen.tsx
  - tests/unit/useChatRoom.imageUpload.test.ts
  - package.json
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 16 adds image sending, an inline image bubble, and a full-screen `ImageViewerModal` to the chat system. The overall architecture is sound: the optimistic-insert / CDN-replace / failure-remove flow is well-structured, the realtime dedup guards are correct, and the UUID-based dedup for image messages (bypassing the body=null gap in text dedup) is a clean solution. The test file covers the core state transitions adequately.

Four warnings were found — none are data-loss bugs, but two can produce stuck UI states visible to users. No critical (security/crash) issues were found.

---

## Warnings

### WR-01: Save button stays permanently disabled after permission denial

**File:** `src/components/chat/ImageViewerModal.tsx:47`

**Issue:** When the user denies photo library permission, the function returns early without calling `setSaving(false)`. The save button remains visually disabled (opacity 0.5, `disabled={true}`) for the rest of the modal's lifetime. The user has to close and reopen the image viewer before they can attempt to save again.

```tsx
// Current (broken):
const { status } = await MediaLibrary.requestPermissionsAsync(true);
if (status !== 'granted') {
  Alert.alert(...);
  return;   // <-- setSaving still true
}
```

**Fix:**
```tsx
if (status !== 'granted') {
  Alert.alert(
    'Photo Library Access Needed',
    'Allow Campfire to access your photos in Settings.',
    [
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
  setSaving(false);   // <-- add this
  return;
}
```

---

### WR-02: Photo library launched without requesting permissions (iOS)

**File:** `src/screens/chat/ChatRoomScreen.tsx:135-143`

**Issue:** The `Photo Library` action path in `handlePhotoPress` calls `launchImageLibraryAsync` directly without first calling `ImagePicker.requestMediaLibraryPermissionsAsync()`. The camera path (lines 149-153) correctly checks permissions first. On iOS, `launchImageLibraryAsync` will silently return `{ canceled: true }` if the user has previously denied the permission, with no explanation to the user. This means users who deny photo library access once can never recover from the chat UI.

**Fix:** Mirror the camera path:
```tsx
text: 'Photo Library',
onPress: async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Photo Library Access Needed',
      'Allow Campfire to access your photos in Settings.',
      [
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ ... });
  ...
},
```

---

### WR-03: Stale closure read in `deleteMessage` rollback

**File:** `src/hooks/useChatRoom.ts:475-476`

**Issue:** `deleteMessage` reads `messages` (the state snapshot from the last render) via direct closure access to populate `originalBody` and `originalMessageType` for rollback:

```ts
const original = messages.find((m) => m.id === messageId);
```

This happens before the `setMessages` optimistic update. If React has batched prior state updates that have not flushed yet, `messages` here may not reflect the latest in-flight state — the rollback could restore stale field values. All other state reads in this hook (e.g., `addReaction`) correctly capture state inside a `setMessages(prev => ...)` updater to avoid this.

**Fix:** Capture the original inside a `setMessages` updater before applying the optimistic change:
```ts
let originalBody: string | null = null;
let originalMessageType: MessageType = 'text';

setMessages((prev) => {
  const original = prev.find((m) => m.id === messageId);
  originalBody = original?.body ?? null;
  originalMessageType = original?.message_type ?? 'text';
  return prev.map((m) =>
    m.id === messageId
      ? { ...m, body: null, message_type: 'deleted' as MessageType }
      : m
  );
});
```

This collapses the snapshot-capture and the optimistic update into a single `setMessages` call, guaranteeing the snapshot is taken from the same state being mutated.

---

### WR-04: Text message dedup can produce false negatives for identical concurrent messages

**File:** `src/hooks/useChatRoom.ts:291-305`

**Issue:** The realtime dedup guard for text messages matches on `body === incoming.body` within a 5-second window:

```ts
const optimisticIdx = prev.findIndex(
  (m) =>
    m.pending === true &&
    m.sender_id === incoming.sender_id &&
    m.body === incoming.body &&
    Math.abs(new Date(m.created_at).getTime() - now) < 5000
);
```

If the same user sends the same text twice within 5 seconds (e.g., double-tap on a slow connection), the second send's realtime event will incorrectly match the first message's optimistic entry and replace it instead of adding a new entry. The user sees one message instead of two. This is a pre-existing issue not introduced by Phase 16, but the Phase 16 image path explicitly documents it as a known gap and uses `id`-based dedup to avoid it. The fix is to extend the same `id`-based strategy to `sendMessage` (requires generating a client-side UUID for text messages as well), or tighten the guard with `tempId`.

**Fix (minimal):** Pass `tempId` in the realtime INSERT handler check when the sender is the current user:
```ts
// If sender is us, only deduplicate against the exact tempId that matches a known optimistic entry
if (incoming.sender_id === currentUserId) {
  const byId = prev.findIndex((m) => m.pending && m.id === incoming.id);
  if (byId !== -1) { ... }
  // fall through to exact-body dedup as secondary guard
}
```

The cleanest fix is to generate a client-side UUID for text messages (same as `sendImage`) so `id`-based matching works for both message types.

---

## Info

### IN-01: `maxHeight` style on image bubble is unreachable dead code

**File:** `src/components/chat/MessageBubble.tsx:706-710`

**Issue:** The `imageBubbleWrapper` style specifies `width: 240`, `aspectRatio: 4/3`, and `maxHeight: 320`. Given a fixed width of 240 and a 4:3 aspect ratio, the computed height is always 180px. The `maxHeight: 320` constraint can never be reached, making it dead style code that adds confusion without effect.

**Fix:** Remove `maxHeight: 320` from `imageBubbleWrapper`, or if portrait images were intended to be supported, reconsider the layout strategy (e.g., swap to `height: 240` + `maxWidth: ...` for portrait content).

---

### IN-02: Weak PRNG used for client-generated UUID in `sendImage`

**File:** `src/hooks/useChatRoom.ts:412-415`

**Issue:** The UUID for image messages is generated with `Math.random()`:

```ts
const messageId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});
```

`Math.random()` is not cryptographically secure. The generated ID is used as both the Supabase Storage path (`${userId}/${messageId}.jpg`) and the database primary key. While collision probability is low and Supabase would reject a duplicate PK, the predictability of `Math.random()` in some JS engines means an attacker who knows a user's ID and the approximate time of upload could enumerate storage paths. React Native's V8/Hermes engines use a reasonably seeded `Math.random()`, so the practical risk is low, but the pattern is worth flagging.

**Fix:** Use `expo-crypto` (already available via the expo SDK) for a secure random UUID:
```ts
import * as Crypto from 'expo-crypto';
const messageId = Crypto.randomUUID();
```

---

### IN-03: Inline style on photo button duplicates named-style values

**File:** `src/components/chat/SendBar.tsx:130`

**Issue:** The photo button applies an inline style `{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }` that partially duplicates the intent of the `attachBtn` named style, and partially defines new properties not extracted to `StyleSheet`. This is an inconsistency — every other button in this file uses only named styles.

**Fix:** Extract the touch-target dimensions to a named style, or extend `attachBtn` to include the common touch target sizing:
```ts
photoBtn: {
  paddingHorizontal: SPACING.xs,
  minWidth: 44,
  minHeight: 44,
  justifyContent: 'center',
  alignItems: 'center',
},
```

Then use `style={styles.photoBtn}` on the button.

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
