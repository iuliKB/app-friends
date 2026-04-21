# Roadmap: Campfire

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 UI/UX Design System** — Phases 7-9 (shipped 2026-03-25)
- ✅ **v1.2 Squad & Navigation** — Phases 10-12 (shipped 2026-04-04)
- ✅ **v1.3 Liveness & Notifications** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v1.3.5 Homescreen Redesign** — Phases 1-4 (shipped 2026-04-11)
- ✅ **v1.4 Squad Dashboard & Social Tools** — Phases 5-11 (shipped 2026-04-17)
- 🔄 **v1.5 Chat & Profile** — Phases 12-17 (in progress)

## Archived Milestones

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-24</summary>

- [x] Phase 1: Foundation + Auth (4/4 plans) — completed 2026-03-17
- [x] Phase 2: Friends + Status (3/3 plans) — completed 2026-03-17
- [x] Phase 3: Home Screen (2/2 plans) — completed 2026-03-18
- [x] Phase 4: Plans (3/3 plans) — completed 2026-03-18
- [x] Phase 5: Chat (2/2 plans) — completed 2026-03-18
- [x] Phase 6: Notifications + Polish (3/3 plans) — completed 2026-03-19

</details>

<details>
<summary>✅ v1.1 UI/UX Design System (Phases 7-9) — SHIPPED 2026-03-25</summary>

- [x] Phase 7: Design Tokens (2/2 plans) — completed 2026-03-24
- [x] Phase 8: Shared Components (3/3 plans) — completed 2026-03-24
- [x] Phase 9: Screen Consistency Sweep (6/6 plans) — completed 2026-03-25

</details>

<details>
<summary>✅ v1.2 Squad & Navigation (Phases 10-12) — SHIPPED 2026-04-04</summary>

- [x] Phase 10: Squad Tab (2/2 plans) — completed 2026-04-04
- [x] Phase 11: Navigation Restructure (2/2 plans) — completed 2026-04-04
- [x] Phase 12: Profile Simplification (1/1 plan) — completed 2026-04-04

</details>

<details>
<summary>✅ v1.3 Liveness & Notifications (Phases 1-5) — SHIPPED 2026-04-10</summary>

- [x] Phase 1: Push Infrastructure & DM Entry Point (10/10 plans) — completed 2026-04-07
- [x] Phase 2: Status Liveness & TTL (6/6 plans) — completed 2026-04-08
- [x] Phase 3: Friend Went Free Loop (8/8 plans) — completed 2026-04-09
- [x] Phase 4: Morning Prompt + Squad Goals Streak (6/6 plans) — completed 2026-04-10
- [x] Phase 5: Hardware Verification Gate (2/2 plans) — completed 2026-04-10

</details>

<details>
<summary>✅ v1.3.5 Homescreen Redesign (Phases 1-4) — SHIPPED 2026-04-11</summary>

- [x] Phase 1: Status Pill & Bottom Sheet (3/3 plans) — completed 2026-04-10
- [x] Phase 2: Radar View & View Toggle (4/4 plans) — completed 2026-04-11
- [x] Phase 3: Card Stack View (4/4 plans) — completed 2026-04-11
- [x] Phase 4: Upcoming Events Section (4/4 plans) — completed 2026-04-11

</details>

<details>
<summary>✅ v1.4 Squad Dashboard & Social Tools (Phases 5-11) — SHIPPED 2026-04-17</summary>

- [x] Phase 5: Database Migrations (3/3 plans) — completed 2026-04-11
- [x] Phase 6: Birthday Profile Field (2/2 plans) — completed 2026-04-12
- [x] Phase 7: Birthday Calendar Feature (3/3 plans) — completed 2026-04-12
- [x] Phase 8: IOU Create & Detail (4/4 plans) — completed 2026-04-12
- [x] Phase 9: IOU List & Summary (3/3 plans) — completed 2026-04-16
- [x] Phase 10: Squad Dashboard (2/2 plans) — completed 2026-04-16
- [x] Phase 11: Birthday Feature (8/8 plans) — completed 2026-04-17

**Key deliverables:** IOU expense tracking, birthday profiles + wish lists + group gift coordination, birthday group chats, Squad Dashboard scrollable with feature cards, native DateTimePicker, chat attachment menu, group participant sheet, home screen IOU+Birthday widgets, plan cover image upload fix.

</details>

---

## v1.5 Chat & Profile (Phases 12-17)

**Milestone goal:** Elevate chat with reactions, media, threading, and polls while cleaning up a cluttered profile into a coherent, friend-focused UX.

### Phases

- [x] **Phase 12: Schema Foundation** - Migration 0018 with all additive columns, tables, RLS helpers, storage bucket, and updated TypeScript types (completed 2026-04-20)
- [x] **Phase 13: Profile Rework + Friend Profile** - Remove status duplication, consolidate notification toggles, separate edit paths, new friend profile screen (completed 2026-04-20)
- [x] **Phase 14: Reply Threading** - Long-press context menu primitive + inline quoted reply in chat (completed 2026-04-20)
- [x] **Phase 15: Message Reactions** - Tapback emoji strip extending the context menu; live counts inline below bubbles (completed 2026-04-21)
- [x] **Phase 16: Media Sharing** - Photo library + camera capture, compressed upload, inline image bubbles (completed 2026-04-21)
- [ ] **Phase 17: Polls** - Poll creation via attachment menu, live vote counts, per-person single vote

## Phase Details

### Phase 12: Schema Foundation
**Goal**: All database objects, RLS helpers, storage bucket, and TypeScript types required by Phases 13-17 exist and are active — existing chat continues to work without change
**Depends on**: Phase 11 (v1.4 complete)
**Requirements**: (none — infrastructure enabling CHAT-01 through CHAT-11)
**Success Criteria** (what must be TRUE):
  1. Migration 0018 applies cleanly to the Supabase project with zero errors
  2. Existing chat messages load and send normally after migration
  3. `types/chat.ts` exports compile with strict TypeScript and include `image_url`, `reply_to_message_id`, `message_type`, `poll_id`, and `reactions` fields
  4. `chat-media` storage bucket exists in Supabase with public read access and UUID-namespaced paths
  5. `create_poll()` SECURITY DEFINER RPC, `message_reactions` table, `polls`/`poll_options`/`poll_votes` tables, and `is_channel_member()` helper all exist with correct RLS
**Plans**: 2 plans
Plans:
- [x] 12-01-PLAN.md — Write and apply migration 0018 (schema objects, RLS, storage bucket)
- [x] 12-02-PLAN.md — Update src/types/chat.ts + fix TypeScript compile

### Phase 13: Profile Rework + Friend Profile
**Goal**: Users experience a cleaner, less cluttered Profile tab and can view any friend's full profile in one tap
**Depends on**: Phase 11 (v1.4 complete) — no dependency on Phase 12
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05
**Success Criteria** (what must be TRUE):
  1. Profile tab shows no status display — the status pill and mood section are absent from this screen
  2. All notification toggles appear under a single "Notifications" section header with no orphan toggles elsewhere on the screen
  3. Tapping "Edit Profile" opens a detail-only editor (display name, username) separate from the avatar/photo edit flow
  4. Tapping a friend's name or avatar from any screen opens a dedicated Friend Profile screen showing avatar, display name, current status (freshness-aware via `effective_status`), birthday, and wish list
  5. Back navigation from Friend Profile returns the user to the exact screen they came from regardless of entry point
**Plans**: 3 plans
Plans:
- [x] 13-01-PLAN.md — Profile tab restructure (remove status, consolidate notifications, inline avatar tap, add Edit Profile + My Wish List rows)
- [x] 13-02-PLAN.md — Strip edit.tsx to details-only + create wish-list.tsx screen + register in _layout.tsx
- [x] 13-03-PLAN.md — Enrich friend profile with effective_status, birthday display, and wish list section
**UI hint**: yes

### Phase 14: Reply Threading
**Goal**: Users can reply to any specific message with inline quoted context visible to all participants
**Depends on**: Phase 12
**Requirements**: CHAT-07, CHAT-08
**Success Criteria** (what must be TRUE):
  1. Long-pressing any message bubble opens a context menu with at least a "Reply" action
  2. Selecting Reply attaches a quoted preview bar above the composer showing the original sender and first line of the message
  3. The sent reply appears in the chat as a bubble with a compact quoted block above the reply text, attributed to the original sender
  4. Tapping the quoted block in a reply bubble scrolls the chat to the original message when it is within the currently loaded 50-message window
**Plans**: 4 plans
Plans:
- [x] 14-01-PLAN.md — Write migration 0019 (message_type CHECK + RLS UPDATE policy) and update MessageType
- [x] 14-02-PLAN.md — Extend MessageBubble (context menu, quoted block, deleted placeholder, highlight flash)
- [x] 14-03-PLAN.md — Extend useChatRoom (sendMessage replyToId, deleteMessage, Realtime UPDATE listener)
- [x] 14-04-PLAN.md — Wire SendBar reply bar + ChatRoomScreen (FlatList ref, scroll-to-original, toast)
**UI hint**: yes

### Phase 15: Message Reactions
**Goal**: Users can express quick reactions to any message using a curated 6-emoji tapback strip, with live counts visible to all participants
**Depends on**: Phase 14 (BubbleContextMenu primitive)
**Requirements**: CHAT-01, CHAT-02, CHAT-03
**Success Criteria** (what must be TRUE):
  1. Long-pressing a message bubble opens the context menu with a row of 6 emoji choices (❤️ 😂 😮 😢 👍 🔥) above the action list
  2. Tapping an emoji adds the user's reaction and immediately shows the count badge below the message bubble without a full reload
  3. Tapping the same emoji a second time removes the reaction and the count badge disappears if the count reaches zero
  4. Reactions from all chat participants are visible and update in real time without page refresh
**Plans**: 4 plans
Plans:
- [x] 15-01-PLAN.md — aggregateReactions utility + unit tests (TDD)
- [x] 15-02-PLAN.md — MessageBubble: EmojiStripRow + ReactionBadgeRow + onReact prop
- [x] 15-03-PLAN.md — useChatRoom: reactions load, addReaction/removeReaction, realtime extension
- [x] 15-04-PLAN.md — ChatRoomScreen: wire onReact + human verification checkpoint
**UI hint**: yes

### Phase 16: Media Sharing
**Goal**: Users can send photos from their library or camera directly in chat, displayed inline as compressed image bubbles
**Depends on**: Phase 12
**Requirements**: CHAT-04, CHAT-05, CHAT-06
**Success Criteria** (what must be TRUE):
  1. A photo attach action in the send bar opens the device photo library picker; selecting an image queues it for send with a visible progress indicator
  2. A camera action opens the in-app camera; capturing a photo queues it for send with the same progress indicator
  3. Sent images appear inline inside the chat bubble at a capped display size — no link, no download required
  4. Tapping an inline image opens it full-screen with a close control
  5. Images are compressed client-side before upload (max 1280px, ~75% quality) — raw camera photos are never uploaded at full resolution
**Plans**: 4 plans
Plans:
- [x] 16-01-PLAN.md — Install packages + uploadChatMedia helper + Wave 0 test scaffold
- [x] 16-02-PLAN.md — useChatRoom: add sendImage() (optimistic insert, upload, CDN replace, rollback)
- [x] 16-03-PLAN.md — SendBar photo icon + MessageBubble image variant + ImageViewerModal component
- [x] 16-04-PLAN.md — ChatRoomScreen: wire picker, compression, sendImage, viewer + human checkpoint
**UI hint**: yes

### Phase 17: Polls
**Goal**: Users can create single-choice polls in any chat via the attachment menu, vote, change their vote, and see live per-option counts
**Depends on**: Phase 12, Phase 14 (message-type branching established)
**Requirements**: CHAT-09, CHAT-10, CHAT-11
**Success Criteria** (what must be TRUE):
  1. Tapping "Poll" in the chat attachment menu opens a poll creation screen where the user can enter a question and 2–4 option labels, then send
  2. The poll appears in the chat as a distinct card (not a text bubble) visible to all participants, showing the question and all options
  3. Tapping an option casts the user's vote; their selected option is visually distinguished from unselected options
  4. A participant who already voted can tap a different option to change their vote — only one vote per person is counted at any time
  5. Vote counts per option update in real time for all participants without requiring a manual refresh
**Plans**: 4 plans
Plans:
- [x] 17-01-PLAN.md — usePoll hook + useChatRoom sendPoll() + poll_votes Realtime extension (data layer)
- [x] 17-02-PLAN.md — PollCreationSheet component (bottom sheet modal, validation, D-01 through D-04)
- [ ] 17-03-PLAN.md — PollCard component (unvoted/voted states, animated progress bars, D-05 through D-09)
- [ ] 17-04-PLAN.md — MessageBubble isPoll branch + ChatRoomScreen wire-up + human verification checkpoint
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Schema Foundation | v1.5 | 2/2 | Complete    | 2026-04-20 |
| 13. Profile Rework + Friend Profile | v1.5 | 3/3 | Complete    | 2026-04-20 |
| 14. Reply Threading | v1.5 | 4/4 | Complete    | 2026-04-20 |
| 15. Message Reactions | v1.5 | 4/4 | Complete    | 2026-04-21 |
| 16. Media Sharing | v1.5 | 4/4 | Complete    | 2026-04-21 |
| 17. Polls | v1.5 | 2/4 | In Progress|  |

---

*Roadmap updated: 2026-04-21 — Phase 17 plans created (4 plans, 3 waves)*
