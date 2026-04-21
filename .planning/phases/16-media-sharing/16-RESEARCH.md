# Phase 16: Media Sharing - Research

**Researched:** 2026-04-21
**Domain:** React Native / Expo media pick, compress, upload, inline display, full-screen viewer
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single photo icon inline in `SendBar` row (between `+` attachment button and `TextInput`). Always visible.
- **D-02:** Tapping photo icon shows native `Alert.alert` ActionSheet with "Photo Library" / "Camera" / "Cancel". Camera permission denial handled gracefully with explanation alert.
- **D-03:** `+` attachment menu (Poll / Split Expenses / To-Do) is unchanged — no photo rows added.
- **D-04:** `expo-image-manipulator` is mandatory for compression. Install: `npx expo install expo-image-manipulator`.
- **D-05:** Compression: max 1280px longest edge (resize proportionally), quality 0.75, JPEG format.
- **D-06:** Upload uses `fetch(localUri).arrayBuffer()` pattern (mirrors `uploadPlanCover.ts`). Path: `{user_uuid}/{message_uuid}.jpg` in `chat-media` bucket. New file: `src/lib/uploadChatMedia.ts`.
- **D-07:** `sendImage(localUri: string, replyToId?: string)` added to `useChatRoom`. `body = null`, `message_type = 'image'`. Optimistic placeholder with `pending: true`; on success replace with real `image_url`; on failure remove + toast.
- **D-08:** Image bubbles: max ~240pt width, aspect-ratio-preserving height capped ~320pt. Same left/right alignment as text bubbles. Rounded corners match existing bubble `RADII`.
- **D-09:** Reactions and long-press context menu work on image messages. "Copy" omitted from context menu for image messages. "Reply" shows "📷 Photo" quoted preview. "Delete" soft-deletes as usual.
- **D-10:** No caption support. `body = null` for all image messages.
- **D-11:** Optimistic placeholder: local URI as `<Image>` source + centered `ActivityIndicator` overlay. `pending: true`.
- **D-12:** On upload success: placeholder updated with real `image_url`, `pending` cleared.
- **D-13:** On upload failure: placeholder removed, brief error toast shown. No retry UI in V1.
- **D-14:** Full-screen `Modal` (black background, `transparent: false`). Dismiss via X button (top-right) or tap backdrop.
- **D-15:** Pinch-to-zoom via `ScrollView` with `minimumZoomScale={1}` `maximumZoomScale={4}`. No external library.
- **D-16:** Save-to-camera-roll icon (top-left). Uses `expo-media-library` (`MediaLibrary.saveToLibraryAsync(imageUrl)`). Install: `npx expo install expo-media-library`. Permission requested on first use; if denied show alert.

### Claude's Discretion

- Exact Ionicons icon name for photo button (e.g., `image-outline`, `camera-outline`, `images-outline`).
- Whether `ImageViewerModal` is a separate file or inline in `MessageBubble.tsx`. (Prefer separate given zoom + save complexity — research confirms this.)
- Exact toast implementation for upload failure (reuse existing `Animated` toast pattern from `ChatRoomScreen` or `Alert.alert`).
- Whether pending optimistic placeholder uses local file URI directly or base64 preview. (Research: local URI works in RN.)
- Spinner overlay positioning (centered `ActivityIndicator` with semi-transparent `View` same dimensions as bubble).

### Deferred Ideas (OUT OF SCOPE)

- Photo captions
- Video sharing
- Share-to-external-app from viewer
- Retry UI on upload failure
- Multiple photo selection
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-04 | User can attach a photo from their library to a chat message | `expo-image-picker` (already installed v55) `launchImageLibraryAsync` → compress → `sendImage()` |
| CHAT-05 | User can take a photo with the in-app camera and send it in chat | `expo-image-picker` `launchCameraAsync` + `requestCameraPermissionsAsync` → compress → `sendImage()` |
| CHAT-06 | Sent images display inline in the chat bubble (compressed, not as a link) | `MessageBubble` image variant branch; `expo-image` `<Image>` from CDN URL; `ImageViewerModal` for tap-to-fullscreen |
</phase_requirements>

---

## Summary

Phase 16 adds photo sharing to Campfire chat. The required libraries are either already installed (`expo-image-picker`, `expo-image`, `expo-camera`) or available as standard Expo SDK packages (`expo-image-manipulator`, `expo-media-library`). The schema is fully in place from Phase 12 (migration 0018): `messages.image_url`, `messages.message_type = 'image'`, `chat-media` bucket with public read. No database migration is needed.

The implementation follows three established patterns already in the codebase: the `fetch(localUri).arrayBuffer()` upload pattern from `uploadPlanCover.ts`, the `Alert.alert` ActionSheet from `profile.tsx`, and the optimistic message insert from `useChatRoom.sendMessage`. All three can be replicated directly — this phase is primarily composition of existing patterns rather than new invention.

The only genuinely new surface is `ImageViewerModal` (full-screen viewer with pinch-to-zoom ScrollView and save action). The ScrollView zoom approach is confirmed as the idiomatic React Native pattern for pinch-to-zoom without external libraries, which satisfies the project's no-UI-libraries constraint.

**Primary recommendation:** Build in four sequential waves — (1) install packages + upload helper, (2) `sendImage()` in hook + SendBar wiring, (3) inline image bubble variant, (4) full-screen viewer + save action. Each wave is independently verifiable.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Photo picker (library + camera) | Client (Expo) | — | Native device API via `expo-image-picker`; no server involvement |
| Image compression | Client (Expo) | — | Client-side before upload per D-04/D-05; `expo-image-manipulator` runs on-device |
| Upload to storage | API (Supabase Storage) | Client helper | `uploadChatMedia.ts` calls `supabase.storage.from('chat-media').upload()`; bucket is server-side |
| Optimistic message insert | Client (React state) | API (Supabase DB) | Optimistic via `useChatRoom.sendImage()`; final confirmation comes from DB insert + Realtime |
| Inline image bubble render | Client (RN component) | — | `MessageBubble` renders from CDN URL via `expo-image` |
| Full-screen viewer + zoom | Client (RN Modal) | — | `ImageViewerModal` with `ScrollView` zoom; entirely client-side |
| Save to camera roll | Client (expo-media-library) | — | OS-level write; permission model is client-only |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-image-picker | ~55.0.12 (installed) | Photo library + camera access | Only Expo-managed picker; covers both library and camera; `requestCameraPermissionsAsync` built in |
| expo-image-manipulator | 55.0.15 (install required) | Client-side compress + resize | Only SDK-compatible compression library; mandatory per D-04 |
| expo-image | ~55.0.6 (installed) | Inline bubble rendering + fullscreen | Performance-optimized; already used in `EventCard`, `AvatarCircle`; handles remote URI caching |
| expo-media-library | 55.0.15 (install required) | Save to camera roll | Standard Expo API for writing to device photo library; `saveToLibraryAsync` + permission flow |

[VERIFIED: npm registry — `npm view expo-image-manipulator version` returns 55.0.15; `npm view expo-media-library version` returns 55.0.15]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Native `ScrollView` | (built-in) | Pinch-to-zoom in full-screen viewer | `minimumZoomScale` + `maximumZoomScale` props enable zoom without external lib; satisfies D-15 |
| React Native `ActivityIndicator` | (built-in) | Upload progress spinner on optimistic bubble | Built-in loading indicator; sufficient for centered overlay on pending image |
| React Native `Modal` | (built-in) | Full-screen image viewer container | `animationType="fade"` + `statusBarTranslucent` for immersive fullscreen |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ScrollView` zoom | `react-native-reanimated` pinch gesture | Reanimated pinch is smoother but adds dependency and may break Expo Go; `ScrollView` zoom is sufficient for V1 |
| `expo-image-manipulator` | Sharp via Edge Function | Server-side compression adds round-trip latency and complexity; client-side is simpler and instant |
| `expo-media-library` | Sharing API | Share API would send to external apps, not save locally; wrong semantics |

**Installation (packages not yet installed):**
```bash
npx expo install expo-image-manipulator expo-media-library
```

---

## Architecture Patterns

### System Architecture Diagram

```
[SendBar: photo icon tap]
        │
        ▼
[Alert.alert ActionSheet]
   "Photo Library" ──────────────► [launchImageLibraryAsync]
   "Camera"        ──────────────► [launchCameraAsync + requestCameraPermissionsAsync]
        │                                         │
        │◄────────────────────────────────────────┘
        │ localUri (file://)
        ▼
[expo-image-manipulator]
  manipulateAsync(localUri, [{ resize: { width: 1280 } }], { compress: 0.75, format: SaveFormat.JPEG })
        │ compressedUri (file://)
        ▼
[useChatRoom.sendImage(compressedUri)]
   ┌── Optimistic: insert {pending:true, image_url:compressedUri} into local state
   │          │
   │          ▼
   │   [MessageBubble renders local URI + ActivityIndicator overlay]
   │
   └── Async: uploadChatMedia(userId, messageId, compressedUri)
          │  fetch(compressedUri).arrayBuffer() → supabase.storage.upload()
          │
          ├── SUCCESS → update local state: {image_url: cdnUrl, pending: false}
          │            → MessageBubble renders from CDN URL
          │
          └── FAILURE → remove optimistic message from state
                       → show toast "Photo could not be sent"

[MessageBubble: message_type === 'image']
   ├── Renders <Image source={{uri: message.image_url}} /> with aspect-ratio style
   ├── Pending: + <ActivityIndicator> centered overlay
   └── Tap → [ImageViewerModal opens]

[ImageViewerModal]
   <Modal animationType="fade" statusBarTranslucent>
     [Black backdrop + tap-to-dismiss TouchableWithoutFeedback]
     <ScrollView minimumZoomScale={1} maximumZoomScale={4}>
       <Image source={{uri}} resizeMode="contain" />
     </ScrollView>
     [X button — top-right — dismiss]
     [↓ save button — top-left]
       └── MediaLibrary.requestPermissionsAsync({ writeOnly: true })
           ├── granted → MediaLibrary.saveToLibraryAsync(imageUrl)
           └── denied  → Alert.alert("Permission needed…")
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── uploadPlanCover.ts        # existing — reference pattern
│   └── uploadChatMedia.ts        # NEW — mirrors uploadPlanCover.ts exactly
├── hooks/
│   └── useChatRoom.ts            # MODIFIED — add sendImage()
├── components/
│   └── chat/
│       ├── SendBar.tsx           # MODIFIED — add onPhotoPress prop + photo icon
│       ├── MessageBubble.tsx     # MODIFIED — add image variant branch + modal trigger
│       └── ImageViewerModal.tsx  # NEW — separate file (zoom + save complexity)
└── screens/
    └── chat/
        └── ChatRoomScreen.tsx    # MODIFIED — wire onPhotoPress, pass onImagePress
```

### Pattern 1: Image Compression with expo-image-manipulator

**What:** Resize to max 1280px on longest side, then compress to 75% JPEG quality.
**When to use:** Always before any upload in this phase. Never upload raw camera photos.

```typescript
// Source: ctx7 /expo/expo — ImageManipulator.manipulateAsync docs (SDK v54)
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

async function compressChatImage(localUri: string): Promise<string> {
  const result = await manipulateAsync(
    localUri,
    [{ resize: { width: 1280 } }],
    { compress: 0.75, format: SaveFormat.JPEG }
  );
  return result.uri;
}
```

Note: `manipulateAsync` is documented as "deprecated" in SDK 54 in favour of the new `useImageManipulator` hook + `renderAsync` chain pattern. However, `manipulateAsync` still works in SDK 55 and is simpler for a one-shot compress+resize. The new hook API is React-component-only (requires hook context). Since compression runs inside an async function (not a component), `manipulateAsync` is correct here. [VERIFIED: ctx7 /expo/expo — SDK v54 docs confirm deprecated label but functional status]

### Pattern 2: Upload Helper (mirrors uploadPlanCover.ts)

**What:** `fetch(uri).arrayBuffer()` → Supabase Storage upload.
**When to use:** This is the only working upload pattern for local file:// URIs in React Native + Supabase. FormData + file:// fails.

```typescript
// Source: existing src/lib/uploadPlanCover.ts (verified in codebase)
import { supabase } from '@/lib/supabase';

export async function uploadChatMedia(
  userId: string,
  messageId: string,
  localUri: string
): Promise<string | null> {
  try {
    const path = `${userId}/${messageId}.jpg`;
    const response = await fetch(localUri);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,  // each message_uuid is unique — no upsert needed
      });

    if (uploadError) return null;

    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}
```

### Pattern 3: sendImage() in useChatRoom

**What:** Optimistic insert → async upload → state update or rollback.
**When to use:** Called from ChatRoomScreen after compression.

```typescript
// Source: existing sendMessage() in useChatRoom.ts (verified in codebase)
async function sendImage(
  localUri: string,
  replyToId?: string
): Promise<{ error: Error | null }> {
  if (!currentUserId) return { error: new Error('Not authenticated') };

  // Client-side UUID for the message (path must be known before optimistic insert)
  const messageId = crypto.randomUUID();
  const tempId = messageId; // use same UUID so path is deterministic

  const optimistic: MessageWithProfile = {
    id: tempId,
    plan_id: planId ?? null,
    dm_channel_id: dmChannelId ?? null,
    group_channel_id: groupChannelId ?? null,
    sender_id: currentUserId,
    body: null,
    created_at: new Date().toISOString(),
    image_url: localUri, // local URI for instant display
    reply_to_message_id: replyToId ?? null,
    message_type: 'image',
    poll_id: null,
    pending: true,
    tempId,
    sender_display_name: currentUserDisplayName,
    sender_avatar_url: currentUserAvatarUrl,
    reactions: [],
  };

  setMessages((prev) => [optimistic, ...prev]);

  // Upload first, then insert with the CDN URL
  const cdnUrl = await uploadChatMedia(currentUserId, messageId, localUri);

  if (!cdnUrl) {
    setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    // Toast shown by caller
    return { error: new Error('Upload failed') };
  }

  // Insert row with real CDN URL
  const { error: insertError } = await supabase.from('messages').insert({
    id: messageId, // supply the client-generated UUID so storage path matches
    plan_id: planId ?? null,
    dm_channel_id: dmChannelId ?? null,
    group_channel_id: groupChannelId ?? null,
    sender_id: currentUserId,
    body: null,
    image_url: cdnUrl,
    reply_to_message_id: replyToId ?? null,
    message_type: 'image',
  });

  if (insertError) {
    setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    return { error: insertError };
  }

  // Realtime INSERT will arrive and replace the optimistic entry via the dedup guard
  return { error: null };
}
```

**Critical note on insert ID:** Supplying `id: messageId` in the insert ensures the Realtime dedup guard can match it. Without this, the Realtime event will carry a server-generated UUID that won't match the temp ID, resulting in a duplicate bubble. The existing `sendMessage()` uses `Date.now().toString()` as tempId because it doesn't supply the ID at insert — it relies on body + sender + timestamp for dedup. For image sends, body is null, so the dedup guard needs a different match strategy. Supplying the UUID at insert is cleaner.

### Pattern 4: Image Bubble Variant in MessageBubble

**What:** Conditional render branch on `message.message_type === 'image'`.
**When to use:** Image messages skip the text `<Text>` render and use `<Image>` instead.

```typescript
// Source: existing MessageBubble.tsx structure (verified in codebase)
// Inside the bubble view, replace the <Text> with:
import { Image } from 'expo-image';

const isImage = message.message_type === 'image';

// Bubble content:
{isImage ? (
  <View style={styles.imageBubbleWrapper}>
    <Image
      source={{ uri: message.image_url ?? undefined }}
      style={styles.inlineImage}
      contentFit="cover"
    />
    {message.pending && (
      <View style={styles.spinnerOverlay}>
        <ActivityIndicator color={COLORS.surface.base} />
      </View>
    )}
  </View>
) : (
  <Text style={isDeleted ? styles.deletedBody : (isOwn ? styles.ownBody : styles.othersBody)}>
    {bodyText}
  </Text>
)}
```

Aspect-ratio-preserving approach: use fixed `width: 240` and `aspectRatio` derived from image dimensions. `expo-image` does not auto-expose natural dimensions before load. Safest approach: use a fixed `width: 240, height: 180` style with `contentFit="cover"` and no additional dimension query needed for V1. Alternative: `Image onLoad={e => setAspect(e.source.width/e.source.height)}` with dynamic style. For V1 fixed ratio is simpler. [ASSUMED — exact dimension behaviour of expo-image without pre-known dimensions; recommend testing during implementation]

### Pattern 5: Full-Screen Viewer with ScrollView Zoom

**What:** `ScrollView` with `minimumZoomScale`/`maximumZoomScale` wrapping `<Image>`.
**When to use:** D-15 specifies this over external libraries.

```typescript
// Source: CONTEXT.md D-15 specification, verified against React Native ScrollView docs [ASSUMED]
<Modal
  visible={visible}
  animationType="fade"
  statusBarTranslucent
  onRequestClose={onClose}
>
  <TouchableWithoutFeedback onPress={onClose}>
    <View style={StyleSheet.absoluteFillObject} />
  </TouchableWithoutFeedback>
  <ScrollView
    contentContainerStyle={styles.scrollContent}
    maximumZoomScale={4}
    minimumZoomScale={1}
    showsHorizontalScrollIndicator={false}
    showsVerticalScrollIndicator={false}
    centerContent
  >
    <Image
      source={{ uri: imageUrl }}
      style={{ width: screenWidth, height: screenHeight }}
      contentFit="contain"
    />
  </ScrollView>
  {/* X dismiss */}
  <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
    <Ionicons name="close" size={28} color="#fff" />
  </TouchableOpacity>
  {/* Save to camera roll */}
  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} accessibilityLabel="Save photo">
    <Ionicons name="arrow-down-circle-outline" size={28} color="#fff" />
  </TouchableOpacity>
</Modal>
```

### Pattern 6: Save to Camera Roll

```typescript
// Source: ctx7 /expo/expo — MediaLibrary docs (SDK v53)
import * as MediaLibrary from 'expo-media-library';

async function handleSave(imageUrl: string) {
  const { status } = await MediaLibrary.requestPermissionsAsync({ writeOnly: true });
  if (status !== 'granted') {
    Alert.alert(
      'Permission required',
      'Allow Campfire to access your Photos to save images.',
    );
    return;
  }
  await MediaLibrary.saveToLibraryAsync(imageUrl);
}
```

`saveToLibraryAsync` accepts both remote URLs and local file URIs. When called with a CDN URL (HTTPS), the system downloads and saves. On Android the URI must be a local `file://` path — for Android safety, download the image first using `FileSystem.downloadAsync` from `expo-file-system`. [ASSUMED — Android behaviour difference not verified via current docs; recommend testing on Android in hardware gate]

### Anti-Patterns to Avoid

- **FormData + file:// URI for Supabase upload:** Fails in React Native. Always use `fetch(uri).arrayBuffer()`. (Verified in PROJECT.md and existing code.)
- **Uploading raw camera photos:** iPhone 12 MP photo ≈ 3–8MB. At 3–15 person group + active use, 1GB storage exhausted in days. Always compress before upload. (D-04 mandatory per STATE.md.)
- **Blocking UI during compression:** Run `manipulateAsync` before setting optimistic state — it's fast (< 500ms), but don't block the FlatList render. Show optimistic immediately after compression returns.
- **`useImageManipulator` hook for non-component context:** The new chainable hook requires React hook context. For an async function, use the legacy `manipulateAsync` which still works in SDK 55.
- **Dedup mismatch on image Realtime events:** Image sends have `body = null`, so the existing body+sender+timestamp dedup guard won't match. Supply the client-generated UUID at insert so Realtime event carries the same ID.
- **Context menu "Copy" on image messages:** Per D-09, "Copy" must be hidden for `message_type === 'image'`. Current `handleCopy` checks `message.body`; image messages have `body = null` — the Copy action would silently no-op. Explicitly hide the button.
- **`saveToLibraryAsync` with HTTPS URL on Android:** Android requires a local `file://` path. Download via `expo-file-system` first, then save. (Not an issue on iOS which accepts HTTPS.)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image compression/resize | Custom canvas or native module | `expo-image-manipulator` | Handles EXIF rotation, proportional resize, JPEG encoding correctly |
| Photo library access | react-native-permissions + RN ImagePicker | `expo-image-picker` (already installed) | SDK-matched, Expo Go compatible, unified library + camera API |
| Camera roll write | Copying files manually | `expo-media-library` | Handles iOS Photos permission model; manages album creation; works cross-platform |
| Upload buffering | FormData multipart | `fetch().arrayBuffer()` | Only pattern that works with Supabase SDK in React Native for local URIs |
| Pinch-to-zoom | External gesture library | `ScrollView` with zoom props | Satisfies project no-external-UI-library constraint; adequate for V1 use case |

**Key insight:** Every hard problem in this phase has an existing Expo SDK solution. The implementation risk is integration correctness (dedup IDs, Android save behaviour), not algorithm design.

---

## Common Pitfalls

### Pitfall 1: Realtime Dedup Fails for Image Messages

**What goes wrong:** Sending an image produces a duplicate bubble in the chat — one from the optimistic insert and one from the Realtime INSERT event.

**Why it happens:** The existing dedup guard in `useChatRoom` matches on `m.pending && m.sender_id === incoming.sender_id && m.body === incoming.body`. For image messages, `body` is `null` on both sides. If the Realtime event carries a server-generated UUID (different from the `tempId`), the `id` check in the "already in state" guard will also miss it. Result: two bubbles.

**How to avoid:** Supply `id: messageId` in the Supabase insert call using a client-generated `crypto.randomUUID()`. The Realtime event will then carry the same UUID. The existing `prev.some((m) => m.id === incoming.id)` guard will catch it and prevent duplication.

**Warning signs:** During testing, each image send produces two bubbles — one fading out (pending) and one final. Or after send, the list shows a stuck spinner plus a rendered image.

### Pitfall 2: Android Save Requires Local File URI

**What goes wrong:** `MediaLibrary.saveToLibraryAsync(cdnUrl)` works on iOS but silently fails or throws on Android.

**Why it happens:** Android's media library API requires a `file://` URI. iOS accepts HTTPS URLs and downloads internally.

**How to avoid:** For Android, use `expo-file-system` (`FileSystem.downloadAsync`) to download the image to a temporary local path first, then call `saveToLibraryAsync` with that path.

**Warning signs:** Save button works in Expo Go on iOS simulator but fails on Android device. `expo-media-library` throws "The file path must be a local path" on Android.

### Pitfall 3: expo-image-manipulator Deprecated API Warning

**What goes wrong:** TypeScript or console shows deprecation warning for `manipulateAsync` in SDK 55, causing uncertainty about whether to use the new hook API.

**Why it happens:** SDK 52+ introduced a new chainable `useImageManipulator` hook. `manipulateAsync` is marked deprecated but still works.

**How to avoid:** Use `manipulateAsync` — it is the correct choice for non-component async functions. The new hook API cannot be called outside a React component. Suppress any lint warnings about the deprecation if they appear.

**Warning signs:** TypeScript shows deprecation strikethrough on `manipulateAsync` import.

### Pitfall 4: Image Bubble Breaks Context Menu Positioning

**What goes wrong:** Long-pressing an image bubble shows the context menu at the wrong Y position, or the emoji strip overlaps the bubble.

**Why it happens:** `handleLongPress` uses `event.nativeEvent.pageY`. Image bubbles may be larger than text bubbles, so the same offset calculation (`pageY - 80`) may position the menu inside or behind the image.

**How to avoid:** Keep the same `handleLongPress` logic but test with image bubbles at different scroll positions. The `pillY = Math.max(60, event.nativeEvent.pageY - 80)` clamp should handle most cases. Verify during implementation.

**Warning signs:** Context menu appears cut off at screen top or overlaps the image.

### Pitfall 5: Optimistic Local URI Shown in Quoted Reply Block

**What goes wrong:** If a user quotes an image message before the upload completes, the quoted block shows `undefined` or the local file URI as the preview text.

**Why it happens:** `QuotedBlock` reads `original.image_url` — during pending state, `image_url` is the local URI. The preview text fallback is `original.image_url ? '📷 Photo' : 'Message deleted.'` — this correctly shows "📷 Photo" since `localUri` is truthy.

**How to avoid:** No code change needed — the existing fallback chain in `QuotedBlock` (`original.body ?? (original.image_url ? '📷 Photo' : 'Message deleted.')`) already handles image messages correctly. Verified in `MessageBubble.tsx` line 107.

**Warning signs:** N/A — this pitfall is pre-resolved by existing code.

### Pitfall 6: Messages Table Insert Rejects Client-Supplied UUID

**What goes wrong:** The Supabase insert with `id: messageId` fails if the `messages` table has RLS or a DEFAULT constraint that prevents client-supplied IDs.

**Why it happens:** Supabase tables with `id uuid DEFAULT gen_random_uuid()` still accept client-supplied IDs — the DEFAULT only applies when `id` is omitted. However, if RLS blocks writes or the `id` is in a deny list, the insert fails.

**How to avoid:** Test the insert with a client-supplied UUID early in Wave 1. If it fails, fall back to: insert without ID → wait for Realtime event → match by `image_url` (CDN URL) to remove placeholder. This is more complex but avoids the ID-supply approach entirely.

**Warning signs:** Insert returns `null` or an RLS violation error when `id` is provided.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Compression Call
```typescript
// Source: ctx7 /expo/expo (SDK v51 confirmed working API)
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const result = await manipulateAsync(
  localUri,
  [{ resize: { width: 1280 } }],
  { compress: 0.75, format: SaveFormat.JPEG }
);
// result.uri is a local file:// URI of the compressed JPEG
```

### ActionSheet via Alert.alert
```typescript
// Source: existing src/app/(tabs)/profile.tsx lines 118-153 (verified)
Alert.alert('Send Photo', undefined, [
  {
    text: 'Photo Library',
    onPress: async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as ImagePicker.MediaType,
        allowsEditing: false,
        quality: 1, // capture full quality, compress via manipulator
      });
      if (!result.canceled && result.assets[0]) {
        handlePhotoSelected(result.assets[0].uri);
      }
    },
  },
  {
    text: 'Camera',
    onPress: async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera access required',
          'Allow Campfire to access your camera in Settings.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images' as ImagePicker.MediaType,
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        handlePhotoSelected(result.assets[0].uri);
      }
    },
  },
  { text: 'Cancel', style: 'cancel' },
]);
```

### MediaLibrary Save Flow
```typescript
// Source: ctx7 /expo/expo (SDK v53 docs)
import * as MediaLibrary from 'expo-media-library';

const { status } = await MediaLibrary.requestPermissionsAsync({ writeOnly: true });
if (status === 'granted') {
  await MediaLibrary.saveToLibraryAsync(imageUrl); // local URI on Android, HTTPS ok on iOS
}
```

### Inline Image Style (aspect-ratio preserving, fixed width)
```typescript
// Source: CONTEXT.md D-08 spec + React Native StyleSheet pattern [ASSUMED sizing]
const styles = StyleSheet.create({
  imageBubbleWrapper: {
    width: 240,
    height: 180,  // 4:3 default; override with onLoad if natural ratio available
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  inlineImage: {
    width: '100%',
    height: '100%',
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ImageManipulator.manipulateAsync` | `useImageManipulator` hook + `renderAsync` | SDK 52+ | `manipulateAsync` deprecated but still works; hook is React-component-only |
| `FormData` upload | `fetch().arrayBuffer()` | Supabase RN SDK (Supabase JS v2+) | FormData + file:// silently fails; ArrayBuffer is the only reliable path |
| Manual permission checks | `expo-image-picker` built-in `requestCameraPermissionsAsync` | SDK 50+ | Unified permission request in picker itself |

**Deprecated/outdated:**
- `ImagePicker.MediaTypeOptions.Images`: Replaced by string literal `'images'` in SDK 52+. Existing code in `profile.tsx` already uses the string form (`'images' as ImagePicker.MediaType`). Replicate this pattern. [VERIFIED: existing codebase]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-image` does not auto-expose natural dimensions before load; fixed 240×180 recommended for V1 | Pattern 4 | Image appears stretched if native aspect ratio differs significantly from 4:3 — adjust onLoad if needed |
| A2 | `manipulateAsync` still works without runtime errors in SDK 55 despite deprecated label | Standard Stack / Pattern 1 | Compression fails silently; switch to `useImageManipulator` hook inside a component |
| A3 | `saveToLibraryAsync` with HTTPS URL fails on Android | Pitfall 2 | Save works on Android without extra download step — simpler code |
| A4 | Supplying `id: messageId` in Supabase insert is allowed by current RLS policies | Pattern 3 | Insert rejected; need fallback dedup strategy for image messages |
| A5 | ScrollView `minimumZoomScale`/`maximumZoomScale` works correctly in Expo Go managed workflow for iOS and Android | Pattern 5 | Zoom gestures don't work on one platform; may need `react-native-gesture-handler` |

---

## Open Questions

1. **Realtime UPDATE for image_url**
   - What we know: `sendImage()` inserts with the CDN URL directly (not updating after optimistic send).
   - What's unclear: If the Realtime INSERT event arrives and carries `image_url: cdnUrl`, the dedup guard replaces the optimistic entry. But the optimistic entry already has the CDN URL (set after upload). The replacement is still correct, just redundant.
   - Recommendation: This is fine — the dedup replacement is idempotent. No separate UPDATE needed.

2. **Chat-media bucket RLS for the saveToLibraryAsync download (Android)**
   - What we know: The `chat-media` bucket is public-read (migration 0018, `USING (bucket_id = 'chat-media')`). CDN URLs are public.
   - What's unclear: Whether `expo-file-system` can download from a public Supabase Storage CDN URL without additional auth headers.
   - Recommendation: Public buckets return files without auth. Standard `FileSystem.downloadAsync(url, localPath)` should work. Verify during hardware gate (deferred per project policy).

3. **TypeScript strict: `body: null` insert type error**
   - What we know: Phase 14 notes that `body: null` causes Supabase-generated-types type error (column marked non-nullable in types despite being nullable in DB). Fixed with `as any` cast.
   - What's unclear: Whether the same cast is needed for `message_type: 'image'` with the existing types.
   - Recommendation: Use the same `as any` cast pattern established in Phase 14. Document the eslint-disable comment.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| expo-image-picker | CHAT-04, CHAT-05 | ✓ | ~55.0.12 | — (already installed) |
| expo-image | CHAT-06 (inline render) | ✓ | ~55.0.6 | — (already installed) |
| expo-camera | CHAT-05 (camera) | ✓ | ~55.0.10 | — (already installed, used for QR) |
| expo-image-manipulator | CHAT-04, CHAT-05 (compress) | ✗ | 55.0.15 | `npx expo install expo-image-manipulator` |
| expo-media-library | CHAT-06 (save to roll) | ✗ | 55.0.15 | `npx expo install expo-media-library` |
| Supabase `chat-media` bucket | CHAT-04, CHAT-05 (upload) | ✓ | — (created in migration 0018) | — |

**Missing dependencies with no fallback:**
- `expo-image-manipulator` — required by D-04; must install before compression works
- `expo-media-library` — required by D-16; must install before save-to-roll works

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` + `tsx` runner (existing project pattern) |
| Config file | none — test files are self-contained runners |
| Quick run command | `npx tsx tests/unit/useChatRoom.imageUpload.test.ts` |
| Full suite command | `npx tsx tests/unit/aggregateReactions.test.ts && npx tsx tests/unit/birthdayFormatters.test.ts && npx tsx tests/unit/useChatRoom.reactions.test.ts && npx tsx tests/unit/useChatRoom.imageUpload.test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-04 | Photo library picker triggers compression + upload flow | unit (pure state logic) | `npx tsx tests/unit/useChatRoom.imageUpload.test.ts` | ❌ Wave 0 |
| CHAT-05 | Camera capture triggers same compress + upload path | unit (same file, camera branch) | `npx tsx tests/unit/useChatRoom.imageUpload.test.ts` | ❌ Wave 0 |
| CHAT-06 | Image bubble renders from image_url; pending state shows spinner; CDN replace works | unit (pure state mutation) | `npx tsx tests/unit/useChatRoom.imageUpload.test.ts` | ❌ Wave 0 |
| CHAT-06 | Full-screen viewer opens on tap; save action triggers MediaLibrary | manual (requires device) | — | manual-only |

### Sampling Rate
- **Per task commit:** `npx tsx tests/unit/useChatRoom.imageUpload.test.ts`
- **Per wave merge:** Full suite command above
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/useChatRoom.imageUpload.test.ts` — covers CHAT-04, CHAT-05, CHAT-06 state logic (optimistic insert, CDN replace, failure removal)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | RLS on `chat-media` bucket (already configured in migration 0018: authenticated upload, public read) |
| V5 Input Validation | yes | `message_type = 'image'` CHECK constraint in DB; client validates `result.canceled` before processing |
| V6 Cryptography | no | — |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Storage path traversal (`../../etc/passwd`) | Tampering | Path is `{user_uuid}/{message_uuid}.jpg` — UUIDs contain no path separators; Supabase Storage sanitises paths |
| Uploading non-image content with `.jpg` extension | Tampering | Content-type is forced to `image/jpeg` in upload call; Supabase does not execute uploaded files |
| Cross-user image access | Information Disclosure | `chat-media` bucket is public-read (all URLs are unauthenticated CDN); image URLs are not guessable (UUID in path) |
| Storing raw mega-pixel photos | DoS (storage budget) | Client-side compression to max 1280px / 0.75 quality is mandatory per D-04/D-05 |

---

## Sources

### Primary (HIGH confidence)
- `/expo/expo` via ctx7 — `manipulateAsync`, `SaveFormat`, `MediaLibrary.saveToLibraryAsync`, `MediaLibrary.requestPermissionsAsync` APIs
- Existing codebase: `src/lib/uploadPlanCover.ts`, `src/hooks/useChatRoom.ts`, `src/app/(tabs)/profile.tsx`, `src/components/chat/SendBar.tsx`, `src/components/chat/MessageBubble.tsx`, `src/screens/chat/ChatRoomScreen.tsx` — all read directly
- `supabase/migrations/0018_chat_v1_5.sql` — schema confirmed: `image_url`, `message_type`, `chat-media` bucket, public read policy
- `src/types/chat.ts` — `MessageType`, `Message.image_url`, `MessageWithProfile` types confirmed

### Secondary (MEDIUM confidence)
- npm registry (`npm view expo-image-manipulator version`, `npm view expo-media-library version`) — both return 55.0.15

### Tertiary (LOW confidence / ASSUMED)
- Android `saveToLibraryAsync` requires local URI — mentioned in ctx7 SDK v52 docs ("must start with file:/// on Android") [CITED: ctx7 /expo/expo SDK v52]
- ScrollView zoom works in Expo Go managed workflow without additional libraries [ASSUMED — not tested]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry and codebase
- Architecture: HIGH — all patterns are replications of existing, verified codebase patterns
- Pitfalls: MEDIUM — dedup and Android pitfalls are well-reasoned from existing code; Android save behaviour is cited but not verified on device

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable SDK — Expo SDK 55 point releases unlikely to break these APIs)
