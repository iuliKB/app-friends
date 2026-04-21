# Phase 16: Media Sharing - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver photo sending in chat: a single photo icon in the SendBar triggers a native ActionSheet (Library / Camera), the selected image is compressed client-side, uploaded to the `chat-media` Supabase Storage bucket, and appears as an inline image bubble with optimistic placeholder. Tapping the bubble opens a full-screen viewer with pinch-to-zoom and save-to-camera-roll.

**In scope:** `SendBar` photo icon + ActionSheet, `expo-image-manipulator` compression pipeline, `uploadChatMedia` upload helper, `useChatRoom.sendImage()` function, `MessageBubble` image variant render, full-screen `ImageViewerModal` with zoom + save, `expo-media-library` save action.

**Out of scope:** Photo captions, video sharing, share-to-external-app, read receipts, GIFs/files.

</domain>

<decisions>
## Implementation Decisions

### Photo send entry point (D-01 through D-03)
- **D-01:** A single photo icon (📷) is added **inline in the `SendBar` row**, between the `+` attachment button and the text input. Always visible — no attachment menu required to access photo sending.
- **D-02:** Tapping the photo icon shows a native **`Alert.alert` / ActionSheet** with two options: "Photo Library" and "Camera". No third option — Camera permission denial is handled gracefully (show alert explaining why permission is needed).
- **D-03:** The `+` attachment menu (Poll / Split Expenses / To-Do List) is **unchanged** — no photo rows added there.

### Compression pipeline (D-04 through D-05)
- **D-04:** **`expo-image-manipulator` is mandatory** for compression before upload. STATE.md mandates this — raw iPhone camera photos would exhaust the 1GB free-tier storage budget in days. `npx expo install expo-image-manipulator` adds the package.
- **D-05:** Compression parameters: **max 1280px on the longest edge** (resize proportionally), **quality 0.75** JPEG. Produces a file safe for repeated sharing in a 3–15 person group.

### Upload pattern (D-06)
- **D-06:** Upload uses the established `fetch(localUri).arrayBuffer()` pattern (same as `uploadPlanCover.ts`). Path: `{user_uuid}/{message_uuid}.jpg` in the `chat-media` bucket (public read, per Phase 12 D-08). Extract into a new `src/lib/uploadChatMedia.ts` helper.

### sendMessage extension (D-07)
- **D-07:** Add a `sendImage(localUri: string, replyToId?: string)` function to `useChatRoom`. Signature is separate from `sendMessage(body: string)` — image sends always have `body = null` and `message_type = 'image'`. The optimistic message is inserted into local state immediately (with a `pending: true` flag); on upload success the real `image_url` replaces the local URI; on failure the placeholder is removed and a toast is shown.

### Inline bubble display (D-08 through D-10)
- **D-08:** Image bubbles use **aspect-ratio-preserving display**: max width ~240pt, max height ~320pt. Height scales with the image's natural aspect ratio. Same left/right alignment as text bubbles (own = right, others = left). Rounded corners match existing bubble `RADII`.
- **D-09:** **Reactions and long-press context menu work on image messages** — the same Phase 14/15 `onLongPress` overlay fires regardless of `message_type`. "Copy" is omitted from the context menu for image messages (no text to copy). "Reply" works (quoted block shows "📷 Photo" preview text, per Phase 14 D-09). "Delete" works as soft delete (body=NULL, message_type='deleted').
- **D-10:** No caption support. `body = null` for all image messages (Phase 12 D-02). Users send a separate text message if they want to add context.

### Send flow & upload state (D-11 through D-13)
- **D-11:** **Optimistic placeholder**: the image bubble appears immediately in the chat list with the local URI as source and a centered `ActivityIndicator` spinner overlay. The placeholder is flagged `pending: true` (existing pattern from text sends).
- **D-12:** On **upload success**: the placeholder message is updated with the real `image_url` from Supabase and `pending` is cleared. Spinner disappears, image renders from CDN URL.
- **D-13:** On **upload failure**: the placeholder is removed from local state and a brief error toast is shown ("Photo could not be sent"). No retry UI in V1.

### Full-screen viewer (D-14 through D-16)
- **D-14:** Tapping an image bubble opens a **full-screen `Modal`** (black background, `transparent: false`). The image fills the screen with `contain` resizeMode. Dismiss by: **X button** (top-right) or **tap anywhere on the backdrop**.
- **D-15:** Full-screen viewer supports **pinch-to-zoom** via `ScrollView` with `minimumZoomScale={1}` `maximumZoomScale={4}`. The image is wrapped in the ScrollView to enable pinch/pan without an external library.
- **D-16:** A **save-to-camera-roll icon** (download/arrow-down) is shown in the top-left corner of the viewer. Uses `expo-media-library` (`MediaLibrary.saveToLibraryAsync(imageUrl)`). `expo-media-library` is not yet installed — `npx expo install expo-media-library` required. Requests write permission via `MediaLibrary.requestPermissionsAsync()` on first use; if denied, shows an alert explaining why.

### Claude's Discretion
- Exact `SendBar` icon name from Ionicons for the photo button (e.g., `image-outline`, `camera-outline`, or `images-outline` — pick what reads clearly as "send a photo").
- Whether `ImageViewerModal` is a new file at `src/components/chat/ImageViewerModal.tsx` or defined inline in `MessageBubble.tsx`. Prefer a separate file given the zoom + save complexity.
- Exact toast implementation for upload failure (reuse existing toast pattern from Phase 14 out-of-window scroll, or `Alert.alert`).
- Whether the `pending` optimistic placeholder uses the local file URI directly as the `Image` source (works in RN for local files) or a base64 encoded preview.
- Spinner overlay positioning (centered `ActivityIndicator` with semi-transparent `View` over the image, same dimensions as bubble).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema (already exists — no migration needed)
- `supabase/migrations/0018_chat_v1_5.sql` — `messages.image_url`, `messages.message_type` ('image' value), `messages.body` nullable; `chat-media` bucket creation

### Upload pattern to replicate
- `src/lib/uploadPlanCover.ts` — `fetch(localUri).arrayBuffer()` upload pattern; create `src/lib/uploadChatMedia.ts` following this exactly

### Image picker pattern to replicate
- `src/app/(tabs)/profile.tsx` — `launchImageLibraryAsync` + `launchCameraAsync` + `requestCameraPermissionsAsync` usage; AlertSheet for library/camera choice

### Chat hook to extend
- `src/hooks/useChatRoom.ts` — add `sendImage()` alongside `sendMessage()`, extending the optimistic update pattern

### Component to extend
- `src/components/chat/MessageBubble.tsx` — add image variant render branch; `message.image_url` and `message.message_type === 'image'` check
- `src/components/chat/SendBar.tsx` — add photo icon between `+` and text input; `AttachmentAction` type extension not needed (photo is handled inline, not via `onAttachmentAction`)

### TypeScript types
- `src/types/chat.ts` — `Message.image_url: string | null` and `MessageType` ('image') already typed

### Project constraints
- `.planning/PROJECT.md` §Constraints — Expo Go managed workflow, no UI libraries, TypeScript strict, design tokens required, RLS is security, no raw hex/px values

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `uploadPlanCover.ts` — copy pattern verbatim for `uploadChatMedia.ts`; change bucket name and path scheme
- `expo-image-picker` — already installed (v55); `launchImageLibraryAsync` + `launchCameraAsync` both available
- `expo-camera` — already installed (v55); used for QR scan via `CameraView`; `requestCameraPermissionsAsync` pattern established
- `expo-image` — already installed; use `<Image>` from `expo-image` for inline bubble rendering (already used in `EventCard`, `AvatarCircle` area)
- `MessageBubble.tsx` — already references `message.image_url` and `'📷 Photo'` fallback; image variant is anticipated
- `RADII.md`, `COLORS.surface.card`, `COLORS.text.secondary` — reuse for bubble rounded corners and spinner tint

### Established Patterns
- Optimistic send: `pending: true` flag on `MessageWithProfile` — extend for image messages
- ActionSheet via `Alert.alert` with option array — used throughout app (e.g., profile avatar picker)
- `fetch(uri).arrayBuffer()` for local file upload — proven pattern; never use FormData with file://
- Compression parameters: existing plan cover uses `quality: 0.8` via picker; this phase requires `expo-image-manipulator` for the 1280px dimension cap

### Integration Points
- `SendBar.tsx`: new photo icon TouchableOpacity inserted between `attachBtn` and `TextInput` in the row; `onPhotoPress` new prop
- `useChatRoom.ts`: new `sendImage(localUri: string, replyToId?: string)` function returns `{ error }` — mirrors `sendMessage` signature style
- `ChatRoomScreen.tsx`: wire `onPhotoPress` → `sendImage`; pass image viewer open state down to `MessageBubble` via callback prop `onImagePress`

</code_context>

<specifics>
## Specific Ideas

- Photo icon in SendBar: inline between `+` and `TextInput`, same size as the existing `add-circle` icon (~28pt)
- ActionSheet: `Alert.alert('Send Photo', null, [{ text: 'Photo Library', ... }, { text: 'Camera', ... }, { text: 'Cancel', style: 'cancel' }])`
- Compression: `ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.75, format: SaveFormat.JPEG })`
- Storage path: `${currentUserId}/${messageId}.jpg` — messageId generated client-side as UUID before optimistic insert
- Full-screen Modal: `<Modal visible={...} animationType="fade" statusBarTranslucent>` black background + `ScrollView` zoom wrapper + `expo-image` `<Image>` + `[X]` and `[↓]` absolute buttons

</specifics>

<deferred>
## Deferred Ideas

- Photo captions — not in CHAT-04/05/06 scope; separate text message is the workaround
- Video sharing — V2; 1GB free-tier storage risk flagged in PROJECT.md
- Share-to-external-app from viewer — V2 addition to the full-screen viewer
- Retry UI on upload failure — V2; toast + remove is sufficient for V1
- Multiple photo selection (pick several at once) — V2; single photo per message is the scope

</deferred>

---

*Phase: 16-media-sharing*
*Context gathered: 2026-04-21*
