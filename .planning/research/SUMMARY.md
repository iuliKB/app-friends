# Research Summary — Campfire v1.5 (Chat & Profile)

**Project:** Campfire v1.5
**Domain:** Close-friend coordination app — chat enrichment + profile rework
**Researched:** 2026-04-20
**Confidence:** HIGH

---

## Executive Summary

Campfire v1.5 adds five chat enrichment features (reactions, media sharing, reply threading, polls, and a profile rework with a friend profile page) on top of a stable existing architecture. Research confirms that all features can be built without any new native modules — only one new package is required (`expo-image-manipulator` for pre-upload image compression). Every other capability is already present in the installed dependency set. This is an additive milestone, not an architectural overhaul.

The single largest technical risk is Supabase Realtime free-tier budget. Adding naive Postgres Changes subscriptions for reactions and poll votes on top of the existing messages subscription would multiply the per-subscriber event count and could exhaust the 2M message/month free-tier limit. The solution is consistent across all new features: embed state in the already-subscribed `messages` row or use Realtime Broadcast instead of Postgres Changes for high-frequency events. All schema changes ship in one migration (0018), which is additive-only and does not break existing messages.

The profile rework is completely independent of all chat phases and has zero DB migrations. Among chat features, the correct build order is: schema foundation first, then threading, then reactions, then media, then polls. This order minimises rework by building shared UI primitives (the `BubbleContextMenu` long-press layer) before features that depend on them.

---

## Key Findings

### Stack

All core capabilities are already installed. One new package required.

**New install:**
- `expo-image-manipulator` ~55.0.15 — client-side resize + JPEG compress before upload. Expo Go compatible. Resize to 1280px + quality 0.75 = ~150–300 KB per chat image.

**Reused without change:**
- `expo-image-picker` — camera + library picker (already used for plan covers/avatars)
- `expo-image` — inline image rendering with disk cache
- `react-native-reanimated` + `react-native-gesture-handler` — long-press + spring animation for reaction picker
- `@supabase/supabase-js` — Storage upload, Realtime
- `fetch().arrayBuffer()` pattern from `uploadPlanCover.ts` — direct reuse for chat uploads

**Explicitly rejected:** full emoji picker library (stale, overkill for 6-tapback strip), `react-native-fast-image` (duplicates `expo-image`, requires EAS build), separate WebSocket/Realtime library, `expo-file-system` for uploads.

**Storage:** Public `chat-media` bucket, path `{channel_type}/{channel_id}/{sender_id}/{uuid}.jpg`. Public bucket preferred over private + signed URLs (signed URLs expire and break chat history).

### Features

**Must have:**
- Reactions: long-press picker, emoji badge with count, toggle off own reaction, persist across restarts
- Media: pick from library or camera, inline in bubble, upload progress, full-screen tap, client-side compression (mandatory for free tier)
- Threading: "Reply" entry via long-press menu, quoted preview in composer, quoted block in bubble, inline only (no Slack-style threads)
- Polls: create via attachment menu, 2–4 options, tap to vote, live counts, one vote per person, distinct card message type
- Profile: remove status section from Profile tab, consolidate notification toggles, separate avatar/profile edit paths
- Friend profile page: avatar, display name, current status (via `effective_status` view), birthday, wish list, DM button

**Should have:**
- Curated 6-emoji reaction set (❤️ 😂 😮 😢 👍 🔥), haptic feedback, reaction bar visible without interaction
- Scroll-to-original on reply quote tap
- Show voter names per poll option (appropriate for 3–15 person group)

**Defer to v2+:**
- Video sharing, full emoji picker, multiple-choice polls, anonymous polls, push notifications for reactions, image deletion/unsend, separate thread view

### Architecture

Single migration 0018 (additive only). `BubbleContextMenu` is the shared long-press primitive built once in the threading phase and extended by reactions. `PollCard` uses `View` + map (max 4 options) — no nested FlatList. All components use `StyleSheet` only.

**Schema additions:**
- `messages`: `image_url`, `reply_to_message_id`, `reply_preview`, `message_type` enum, `poll_id`
- New tables: `message_reactions` (PK: message_id, user_id, emoji), `polls`, `poll_options`, `poll_votes` (PK: poll_id, user_id)
- New RPC: `create_poll()` SECURITY DEFINER — atomic poll + options + message insert
- SECURITY DEFINER helpers: `is_message_channel_member()`, `is_channel_member()` — prevent RLS recursion
- New route: `/friends/[id]` at root level (outside all tab stacks) for consistent back navigation

**New components:** `ReactionBar`, `ReactionPicker`, `ReplyPreviewBar`, `BubbleContextMenu`, `ChatImage`, `PollCard`, `PollCreateScreen`, `FriendProfileScreen`

**New hook:** `usePoll(pollId)` — fetch + Realtime for poll votes

### Critical Pitfalls

1. **Realtime budget multiplier (2B, 4B)** — Do NOT add Postgres Changes subscriptions for `message_reactions` or `poll_votes`. Per-subscriber multiplier: 10 users × 3 rooms = 30 subscribers × 20 reactions/day = 180K Realtime msgs/month for reactions alone. Instead: embed reactions as JSONB on `messages` row or use Broadcast. Decide before writing any subscription code.

2. **No image compression before upload (1A)** — Always run `expo-image-manipulator` before `fetch().arrayBuffer()`. Raw iPhone photos are 4–8 MB. 10 users sending 5 photos/day at full resolution exhausts the 1 GB Storage budget in under a week. This is not an optimisation — it is required.

3. **No unique constraint on reactions (2A)** — `UNIQUE(message_id, user_id, emoji)` must be in the migration. Use upsert (`INSERT ... ON CONFLICT DO NOTHING`). Without this, double-taps create ghost reactions that inflate counts permanently.

4. **scrollToIndex fails for off-screen messages (3A)** — `getItemLayout` is not set in `ChatRoomScreen`. Implement `onScrollToIndexFailed` with a progressive scroll fallback. Scope scroll-to-original to messages within the current 50-message fetch window.

5. **Friend profile navigation route ambiguity (5A)** — Keep `/friends/[id]` at root level. Every entry point must use the same absolute path. Do not duplicate into tab-specific folders — back navigation breaks.

6. **FlatList memory from inline images (1B)** — Before adding image cells: set `removeClippedSubviews={true}` and `windowSize={5}`. Wrap `MessageBubble` in `React.memo`. Use `expo-image` with `cachePolicy="memory-disk"` at capped display size.

7. **Friend profile reads stale status (5B)** — Existing `friends/[id].tsx` queries `statuses` directly, not `effective_status` view. Fix during profile rework phase or status freshness (ALIVE/FADING/DEAD) will diverge between home screen and profile.

---

## Implications for Roadmap

### Phase 1: Schema Foundation (Migration 0018 + Types)
**Rationale:** All chat phases depend on the schema. Shipping it first prevents mid-feature migration reruns and keeps all type updates in one commit. Additive-only — zero risk to existing messages.
**Delivers:** Migration 0018 (columns, tables, RLS helpers, storage bucket, `create_poll` RPC), updated `types/chat.ts`, extended `useChatRoom` fetch and `sendMessage` signature.
**Research flag:** Standard — follows existing migration patterns directly.

### Phase 2: Profile Rework + Friend Profile Page
**Rationale:** Zero DB migrations, completely independent of chat phases, high UX visibility. Delivers immediately. Run in parallel with Phase 1 if bandwidth allows.
**Delivers:** `ProfileScreen` layout cleanup, new `FriendProfileScreen`, navigation wiring from all entry points.
**Pitfalls addressed:** 5A (root-level route), 5B (`effective_status` view), 5C (atomic removal + redesign), 5D (`split()[0]` TypeScript fix).
**Research flag:** Standard — all data sources exist, navigation pattern established.

### Phase 3: Reply Threading
**Rationale:** First chat UI phase. Builds `BubbleContextMenu` (the long-press primitive reused by reactions). No new Realtime subscriptions — lowest complexity among chat features.
**Delivers:** `ReplyPreviewBar`, `BubbleContextMenu` (Reply action), quoted preview in `SendBar`, extended `sendMessage` with `replyToId`/`replyPreview`.
**Pitfalls addressed:** 3A (`onScrollToIndexFailed` from the start), 3B (`ON DELETE SET NULL`), 3C (compact 2-line preview bounds height variance).
**Research flag:** Standard — iMessage/Telegram inline reply pattern is well-documented.

### Phase 4: Message Reactions
**Rationale:** `BubbleContextMenu` from Phase 3 already exists; React is another menu action. Validates Realtime state-patching approach before the more complex poll vote updates.
**Delivers:** `ReactionBar`, `ReactionPicker` (6-emoji hardcoded strip), haptic feedback, reactions Realtime strategy.
**Pitfalls addressed:** 2A (unique constraint + upsert), 2B (no separate Postgres Changes subscription), 2C (in-flight dedup with a `Set<string>` ref).
**Research flag:** Confirm Realtime strategy (JSONB on `messages` row vs Broadcast) at phase planning start. JSONB is simpler at 3–15 person scale; Broadcast is the fallback if budget math shows risk.

### Phase 5: Media Sharing
**Rationale:** Independent of threading/reactions. The upload pipeline (picker → compress → upload → insert) closely follows the proven `uploadPlanCover` path — low architectural novelty.
**Delivers:** `ChatImage` component, photo action in `SendBar`, `uploadChatImage` utility, `compressForChat` (via `expo-image-manipulator`), full-screen modal, upload progress.
**Pitfalls addressed:** 1A (compression required), 1B (`removeClippedSubviews` + `windowSize` before first image cell), 1C (preview strip inside `SendBar`), 1D (public bucket with UUID paths).
**Research flag:** Quick Android camera smoke test in Expo Go before implementation (historical `launchCameraAsync` issues resolved in SDK 55 but worth confirming).

### Phase 6: Polls
**Rationale:** Most complex feature — new navigation screen, new hook, SECURITY DEFINER RPC. Building last means all chat patterns (BubbleContextMenu, message-type branching, Realtime patching) are already proven.
**Delivers:** `PollCreateScreen` at `/chat/poll-create`, `PollCard` in `MessageBubble`, `usePoll` hook, `create_poll` RPC wired to `SendBar` (currently "Coming Soon").
**Pitfalls addressed:** 4A (unique constraint on `poll_votes`, upsert), 4B (no separate Postgres Changes on `poll_votes` — use RPC counts + messages row trigger or Broadcast), 4C (show voter names openly — right call for this group size).
**Research flag:** Confirm vote-count Realtime strategy (trigger vs Broadcast vs RPC polling) at phase planning start.

### Phase Ordering Rationale

- Schema first prevents mid-feature migration reruns.
- Profile is independent and high-visibility — ships early.
- Threading before reactions: `BubbleContextMenu` built once and extended.
- Media after reactions: independent, but benefits from settled long-press pattern.
- Polls last: most complex, builds on all prior patterns.

### Research Flags

Needs deeper research during phase planning:
- **Phase 4 (Reactions):** Realtime strategy — JSONB vs Broadcast. Decide before writing subscription code.
- **Phase 6 (Polls):** Vote-count Realtime strategy — trigger on messages row vs Broadcast vs RPC polling. Validate free-tier budget math for chosen approach.

Standard patterns (skip additional research):
- **Phase 1, 2, 3, 5** — migration patterns, navigation, upload pipeline, threading all follow established codebase conventions directly.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | One new library verified via official SDK 55 docs; all others in active use. |
| Features | HIGH (reactions/threading/profile) / MEDIUM (polls) | iMessage/WhatsApp patterns are stable. Fewer reference implementations for polls in small-group intimate apps. |
| Architecture | HIGH | Based on direct codebase inspection of migrations, hooks, and screen files. |
| Pitfalls | HIGH (stack-specific) / MEDIUM (Realtime quota math) | Stack pitfalls from codebase history and confirmed GitHub issues. Realtime budget is estimated — depends on actual concurrent user count. |

**Overall confidence:** HIGH

### Gaps to Address

- **Realtime strategy for reactions and polls:** Research identifies the risk and two viable solutions (JSONB embed vs Broadcast). Final choice should be made at the start of Phase 4 and Phase 6 after reviewing actual concurrent subscriber count in production.
- **Android camera in Expo Go:** SDK 55 resolved the main known issues but a quick physical-device smoke test before Phase 5 ships is recommended. Android emulator is sufficient (no Apple Dev account needed).
- **Poll close UX:** Schema includes `closes_at` as nullable. Whether to surface a "Close poll" button in v1.5 or defer entirely to v2 is a product decision — not a technical blocker.

---

## Sources

### Primary (HIGH confidence)
- Expo ImageManipulator SDK 55 docs — compression API, contextual API (not deprecated `manipulateAsync`)
- Expo ImagePicker SDK 55 docs — camera + library, permission flow
- Supabase Storage Access Control docs — bucket policies, `storage.foldername` helper
- Supabase Realtime Pricing docs — per-subscriber multiplier, 2M/month free-tier limit
- Direct codebase inspection — `useChatRoom.ts`, `MessageBubble.tsx`, `SendBar.tsx`, `ChatRoomScreen.tsx`, `uploadPlanCover.ts`, migrations 0001–0017, `PROJECT.md`

### Secondary (MEDIUM confidence)
- expo/expo#24824, #37561 — `expo-image` inside FlatList memory/framedrops
- expo/expo#21544, #39480 — `launchCameraAsync` Android issues (SDK 55 resolved)
- React Native `scrollToIndex` beyond render limit — `onScrollToIndexFailed` pattern

### Tertiary (LOW confidence / pattern reference)
- iMessage iOS 18 tapback expansion — curated emoji set rationale
- WhatsApp threaded replies 2025 — inline-only recommendation for small groups

---

*Research completed: 2026-04-20*
*Ready for roadmap: yes*
