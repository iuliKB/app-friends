# Technology Stack — v1.5 Chat Feature Additions

**Project:** Campfire v1.5 (Chat & Profile milestone)
**Researched:** 2026-04-20
**Scope:** Libraries needed for reactions, media sharing, reply threading, polls. Existing capabilities not re-researched.

---

## What Is Already Installed and Usable

These cover most v1.5 needs without any new installs.

| Already Installed | Version | What It Covers in v1.5 |
|---|---|---|
| `expo-image-picker` | 55.0.12 | Media library picker AND camera capture for chat |
| `expo-camera` | 55.0.10 | Already present (used by QRScanView); not needed for chat |
| `expo-image` | 55.0.6 | Inline image display in FlatList with disk caching |
| `react-native-reanimated` | 4.2.1 | Long-press gesture animation for reaction picker |
| `react-native-gesture-handler` | 2.30.0 | Long-press handler for reaction picker trigger |
| `@supabase/supabase-js` | 2.99.x | Storage upload, Realtime for reactions/polls |
| `base64-arraybuffer` | 1.0.2 | Already in use; not needed for chat uploads |
| `zustand` | 5.0.x | Local UI state (picker open/closed, draft reply) |

The `fetch().arrayBuffer()` upload pattern in `uploadPlanCover.ts` is directly reusable for chat image uploads. No new upload library is needed.

---

## One New Library Required

### expo-image-manipulator — Image Compression Before Upload

**Install:** `npx expo install expo-image-manipulator`
**Version:** ~55.0.x (Expo SDK 55 aligned, installs 55.0.15)
**Expo Go compatible:** YES — explicitly listed as "Included in Expo Go"
**Confidence:** HIGH (verified via official docs at docs.expo.dev/versions/latest/sdk/imagemanipulator/)

**Why needed:** Camera photos on modern iPhones are 3–8 MB. Uploading raw to Supabase Storage (1 GB free-tier budget shared with plan covers) will exhaust the budget quickly. `expo-image-picker`'s `quality` parameter compresses the JPEG output, but does not resize dimensions — a 4032×3024 photo at quality 0.8 is still 1–2 MB. `expo-image-manipulator` adds a `resize` step to cap pixel dimensions (e.g., max width 1200 px) before the quality compress, bringing chat images to ~150–250 KB.

**Why NOT `react-native-compressor`:** Requires a native module build, incompatible with Expo Go managed workflow.

**Why NOT `quality` alone on expo-image-picker:** Controls JPEG encoding quality but does not resize the image dimensions. A phone camera photo stays enormous in pixel count.

**API (SDK 55 — new contextual API, `manipulateAsync` is deprecated):**
```typescript
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

async function compressForChat(localUri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(localUri);
  ctx.resize({ width: 1200 }); // height auto-calculated to preserve aspect ratio
  const imageRef = await ctx.renderAsync();
  const result = await imageRef.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.75, // 0=smallest, 1=max quality
  });
  return result.uri; // local file:// URI, ready for fetch().arrayBuffer() upload
}
```

**Target output:** ~150–300 KB per chat image, acceptable for Supabase free-tier Storage budget.

---

## What NOT to Add (and Why)

### Do NOT add a third-party emoji picker library

**Recommendation:** Build a hardcoded tapback strip (6 emoji: heart, thumbs up, laugh, wow, cry, fire) rendered in a popover. No library needed.

**Why NOT `rn-emoji-keyboard` (33K weekly downloads, no native modules):**
- Full emoji keyboard (1,800+ emoji) is overkill for tapback reactions. iMessage, WhatsApp, Telegram all use a fixed 6–8 emoji strip as the primary reaction surface.
- The library is at v1.7.0, last published in 2024 with no releases since. Maintenance risk for a dependency on the hot-path of every message.
- A hardcoded strip is ~25 lines of JSX using Text components with a `react-native-reanimated` spring-in animation. Zero new dependency, zero version drift.

**Why NOT `expo-emoji-popup`:** Uses a native module. Not compatible with Expo Go managed workflow.

**Implementation path:** A `ReactionPicker` component using `Animated.spring` from `react-native-reanimated` (already installed). Long-press on a message bubble opens the strip above the tapped message. Follows the existing `Animated.timing` pattern in `MessageBubble.tsx`.

### Do NOT add a dedicated media picker library

**Why:** `expo-image-picker` already handles both camera and library. No gap exists.

### Do NOT add react-native-fast-image

**Why:** `expo-image` (already installed, already used for plan covers and avatars) provides disk caching, priority loading, and performs better than RN's built-in Image on Android. It is the correct choice for inline chat images in a FlatList. Adding `react-native-fast-image` would duplicate functionality and requires an EAS build (native module), breaking Expo Go compatibility.

### Do NOT add a polling library

**Why:** Polls are a data model (two Postgres tables: `polls`, `poll_options`, `poll_votes`) plus a `PollBubble` React component. No external library adds meaningful value. The Supabase Realtime channel already on the chat room delivers vote count updates.

### Do NOT add a WebSocket or additional Realtime library

**Why:** Supabase Realtime already powers the chat. Reactions and polls are delivered via `postgres_changes` on `message_reactions` and `poll_votes` tables, filtered by channel. No additional Realtime infrastructure needed. The 200 concurrent connection limit on the free tier is not exceeded by reactions/polls sharing the existing per-room channel.

### Do NOT add expo-file-system for uploads

**Why:** The `fetch(localUri).arrayBuffer()` pattern already works (proven by `uploadPlanCover.ts`). `expo-file-system` would be an extra dependency to achieve what `fetch` already handles for `file://` URIs in React Native.

---

## expo-image-picker: Camera vs Library in Expo Go

**Confidence:** MEDIUM (verified via official docs + GitHub issue tracker)

Both `launchImageLibraryAsync` and `launchCameraAsync` are included in Expo Go and work on iOS. The current project already calls `launchImageLibraryAsync` successfully for plan covers.

**Camera (`launchCameraAsync`) caveats:**
- Requires `requestCameraPermissionsAsync()` before first call; `launchImageLibraryAsync` does not require this on iOS 14+.
- On Android in older Expo Go versions, `launchCameraAsync` threw a NullPointerException at permission check time. This was an Expo Go / Android interaction bug, improved in recent releases. SDK 55 (Expo Go 2.32+) has resolved the main reported cases.
- A 2025-09 Android security patch caused a separate camera-launch delay bug on specific devices. This is device firmware, not a managed workflow issue.
- iOS: no known Expo Go issues for SDK 55 with `launchCameraAsync`.

**Practical recommendation:** Implement camera via `launchCameraAsync` with a try/catch that falls back to a user-visible error message on Android failure. Request camera permissions explicitly before the call. Use `quality: 0.8` in the picker call as the first compression pass, then `expo-image-manipulator` for pixel dimension capping as the second pass. The existing plan-cover flow uses `quality: 0.8` on the picker — same approach here.

### Permission flow for chat image send:
1. User taps image icon in SendBar.
2. Show action sheet: "Camera" or "Photo Library".
3. Camera path: call `ImagePicker.requestCameraPermissionsAsync()`, then `launchCameraAsync({ quality: 0.8 })`.
4. Library path: call `launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })`.
5. On asset returned: call `compressForChat(asset.uri)` via expo-image-manipulator (resize to 1200px wide).
6. Upload with `uploadChatImage(channelId, senderId, compressedUri)` using the fetch+arrayBuffer pattern.
7. Insert message row with `message_type: 'image'` and `image_url`.

---

## Supabase Storage: chat-images Bucket Setup

**Confidence:** HIGH (based on existing `plan-covers` bucket migration in `0014_plan_covers_bucket.sql`)

**Recommendation: Use a public bucket with UUID-based paths.** This matches the plan-covers pattern exactly, avoids signed URL complexity (signed URLs expire and would break chat history), and the friend-only nature of the app means no meaningful privacy loss vs. a private bucket.

**Path convention:** `{channel_type}/{channel_id}/{sender_id}/{timestamp_ms}.jpg`
- Example: `chat-images/dm/abc-uuid/def-uuid/1713619200000.jpg`
- This is human-inspectable in the Storage dashboard and easy to clean up per channel.
- The channel_id in the path allows a future DELETE policy to let channel members remove images.

**Migration pattern** (follows `0014_plan_covers_bucket.sql` exactly):
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload chat images
CREATE POLICY "chat_images_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images');

-- Authenticated users can update (upsert)
CREATE POLICY "chat_images_update_authenticated"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'chat-images');

-- Public read access (bucket is public, friend-only access enforced at app layer)
CREATE POLICY "chat_images_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-images');
```

**Why not a private bucket with signed URLs:** Signed URLs have a TTL (max 1 week for Supabase free tier). A chat message from 2 weeks ago would show a broken image. Workarounds (re-generating signed URLs on load, storing expiry, background refresh) add significant complexity. For a 3–15 person closed friend group, the simpler public bucket with UUID paths is the right call. The message is visible only if someone knows the UUID path, and all users are authenticated friends.

---

## Database Schema Additions (Stack-Level Decisions, Not Libraries)

These inform integration architecture. New Postgres tables for v1.5.

**ALTER TABLE messages (additive only):**
- `message_type` text NOT NULL DEFAULT 'text' — discriminator: 'text' | 'image' | 'poll'
- `image_url` text — Storage public URL, nullable (set only when `message_type = 'image'`)
- `reply_to_id` uuid REFERENCES messages(id) ON DELETE SET NULL — nullable, for threading
- `reply_preview` text — denormalized snippet of parent message body (avoids JOIN per message on render; 100 char truncation)

**Note on `body` constraint:** Currently `body text NOT NULL`. When `message_type = 'image'`, body can be an empty string or optional caption. Change to allow empty string (already allowed — NOT NULL does not prevent empty string in Postgres). No schema change needed.

**New tables:**
- `message_reactions` — (id uuid PK, message_id uuid FK, sender_id uuid FK, emoji text NOT NULL, created_at). UNIQUE (message_id, sender_id, emoji) prevents double-react with same emoji. Realtime on INSERT/DELETE.
- `polls` — (id uuid PK, message_id uuid FK UNIQUE, question text NOT NULL, allows_multiple bool DEFAULT false, created_at).
- `poll_options` — (id uuid PK, poll_id uuid FK, body text NOT NULL, position smallint NOT NULL).
- `poll_votes` — (id uuid PK, poll_option_id uuid FK, voter_id uuid FK, created_at). UNIQUE (poll_option_id, voter_id) for single-choice enforcement. Realtime on INSERT/DELETE.

**Existing CHECK constraint:** `messages_exactly_one_channel` in 0001_init.sql allows exactly one of (plan_id, dm_channel_id). Migration 0017 extended this for group_channel_id. v1.5 does not need to change this — `message_type = 'poll'` or `'image'` works with any channel type.

---

## Integration Points With Existing Code

| New Feature | Reuses | Change Needed |
|---|---|---|
| Image upload | `uploadPlanCover` fetch+arrayBuffer pattern | New `src/lib/uploadChatImage.ts`; same shape as uploadPlanCover |
| Image compression | New: `expo-image-manipulator` | Call `compressForChat()` between picker return and upload |
| Image display | `expo-image` (already used) | `ImageBubble` component variant inside `MessageBubble` |
| Camera access | `expo-image-picker` `launchCameraAsync` | Same import; add camera permission request |
| Reactions | `react-native-reanimated` (already installed) | New `ReactionPicker` component; `message_reactions` table |
| Reply threading | Existing `MessageBubble`, `useChatRoom` | Add `reply_to_id`+`reply_preview` columns; `QuotedMessage` sub-component |
| Polls | Existing `SendBar` (poll action stub exists) | `PollBubble` component; `polls`/`poll_options`/`poll_votes` tables |
| Realtime reactions | Existing `useChatRoom` Realtime channel | Subscribe to `message_reactions` INSERT/DELETE for the channel |
| Realtime polls | Existing `useChatRoom` Realtime channel | Subscribe to `poll_votes` INSERT/DELETE |

---

## Summary

**One new install:** `expo-image-manipulator` (~55.0.15) for pre-upload resize and compression. Everything else reuses existing dependencies.

**Zero new installs for:** emoji reactions (hardcoded tapback strip), reply threading (data model + component only), polls (data model + component only), inline image display (`expo-image` already installed), upload mechanics (`fetch+arrayBuffer` pattern already proven in `uploadPlanCover.ts`).

**Key constraint reconfirmed:** All additions work in Expo Go. `expo-image-manipulator` is explicitly "Included in Expo Go". No native module additions. No EAS build required for v1.5.

---

## Sources

- [Expo ImageManipulator SDK 55 docs](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/) — HIGH confidence
- [Expo ImagePicker SDK 55 docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/) — HIGH confidence
- [expo-image-picker launchCameraAsync Android issues — GitHub #21544](https://github.com/expo/expo/issues/21544) — MEDIUM confidence
- [expo-image-picker launchCameraAsync Android 2025 security patch — GitHub #39480](https://github.com/expo/expo/issues/39480) — MEDIUM confidence
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — HIGH confidence
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) — HIGH confidence
- [rn-emoji-keyboard GitHub](https://github.com/TheWidlarzGroup/rn-emoji-keyboard) — considered and rejected; MEDIUM confidence on assessment
