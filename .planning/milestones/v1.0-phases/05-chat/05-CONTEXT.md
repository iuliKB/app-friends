# Phase 5: Chat - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Plan group chats and 1:1 DMs with realtime messaging, chat list screen, and pinned plan card in plan chats. Text-only in V1 — no images, files, reactions, or read receipts. No push notifications (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Chat Room Layout
- **Colored message bubbles**: sender messages orange (`#f97316`) background, right-aligned. Others' messages `#2a2a2a` background, left-aligned with avatar + sender name.
- **No avatar for self** — own messages show just the orange bubble. Others show AvatarCircle + display name + bubble.
- **Consecutive message grouping**: same sender in a streak shows name + avatar only on the first message. Subsequent bubbles are just the bubble.
- **Timestamp on every message**: small relative time on each bubble (not grouped separators).
- **Send bar**: TextInput with placeholder "Message..." + send icon button on the right. Send button only active when text is non-empty.
- **Inverted FlatList**: newest messages at bottom, scroll up for history.
- **KeyboardAvoidingView**: send bar stays above keyboard.
- **Empty state**: "Start the conversation!" centered text. Disappears when first message is sent.

### Pinned Plan Card (Plan Chats Only)
- **Banner-style**: thin banner across the top with plan title + time on one line. Tap to expand or navigate to plan dashboard.
- Only shown in plan chats (where `plan_id` is set). DMs don't have a pinned card.

### Chat List Screen
- **Mixed list**: plan chats and DMs in one FlatList, sorted by most recent message time.
- Plan chats: campfire emoji + plan title. DMs: friend avatar + friend name.
- Each row shows: avatar/emoji, title/name, **last message preview** (truncated), **relative time** ("2 min ago").
- **Simple unread dot**: blue dot on chats with messages newer than user's last visit. No count, just a dot.
- Empty state: "No chats yet" + "Create a plan or message a friend to get started". Warm tone.

### DM Navigation Flow
- **Entry point**: friend card bottom sheet "Start DM" action (Phase 2 existing UI).
- Tapping "Start DM" calls `get_or_create_dm_channel` RPC, shows **brief loading on the button** (server confirmation pattern), then navigates to chat room.
- DM header: friend's display name + back arrow (standard Expo Router stack).
- **One ChatRoomScreen component** handles both plan chats and DMs. Plan chats get the pinned banner. DMs don't. Determined by whether `plan_id` or `dm_channel_id` is passed as route param.

### Plan Chat Navigation
- Plan dashboard "Open Chat" button navigates to the chat room with `plan_id` param.
- Chat room header for plan chats: plan title + back arrow.

### Realtime Messaging
- **Supabase Realtime subscription** on `messages` table while chat room is open (overrides init "statuses only" decision — CHAT-03 explicitly requires realtime for chat).
- **Subscribe on mount, unsubscribe on unmount** — no app-wide subscription. Budget-conscious for free tier.
- **Append new messages to local state** from Realtime payload — no re-fetch.
- **Optimistic send**: message appears instantly in chat with subtle pending state. If insert fails, show error with retry. Chat feels fast.

### Unread Tracking
- **Simple approach**: store `last_read_at` timestamp per chat (could be in AsyncStorage or a small Supabase table). Compare against latest message `created_at` to show the blue unread dot.
- No read receipts — V2 feature per PROJECT.md.

### Claude's Discretion
- Exact bubble border radius and padding
- Send bar icon choice and styling
- Banner pinned card expand/collapse animation
- Unread tracking storage mechanism (AsyncStorage vs Supabase)
- Message retry UI for failed optimistic sends
- Chat list row height and spacing
- Keyboard handling specifics (KeyboardAvoidingView behavior prop)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `.planning/PROJECT.md` — Chat text-only in V1, no read receipts/reactions, Supabase free-tier budget
- `.planning/REQUIREMENTS.md` — Phase 5 requirements: CHAT-01 through CHAT-07
- `.planning/ROADMAP.md` — Phase 5 plans structure, success criteria

### Prior Phases
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — Supabase patterns, Zustand store, Expo Router
- `.planning/phases/02-friends-status/02-CONTEXT.md` — FriendCard bottom sheet with "Start DM" action, FriendActionSheet
- `.planning/phases/03-home-screen/03-CONTEXT.md` — Realtime subscription pattern (single channel, cleanup on unmount)
- `.planning/phases/04-plans/04-CONTEXT.md` — Plan dashboard "Open Chat" button, server confirmation pattern

### Schema
- `supabase/migrations/0001_init.sql` — `messages` table (plan_id/dm_channel_id constraint), `dm_channels` table (canonical pair), `get_or_create_dm_channel()` RPC, RLS policies for messages and dm_channels

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/common/AvatarCircle.tsx` — Avatar with initials fallback. Use for message sender avatars and DM chat list rows.
- `src/components/common/PrimaryButton.tsx` — For send button styling reference.
- `src/hooks/useHomeScreen.ts` — Supabase Realtime subscription pattern (subscribe/unsubscribe on mount/unmount). Reuse pattern for chat messages.
- `src/hooks/usePlanDetail.ts` — Plan data fetching for pinned plan card.
- `src/components/friends/FriendActionSheet.tsx` — Bottom sheet with "Start DM" action. Wire to `get_or_create_dm_channel` RPC.
- `src/constants/colors.ts` — Accent orange for sender bubbles, `#2a2a2a` for others' bubbles, `COLORS.dominant` for background.
- `src/screens/plans/PlanDashboardScreen.tsx` — "Open Chat" button already exists, needs to navigate to chat room with plan_id.

### Established Patterns
- Supabase Realtime: single channel with filter, cleanup on unmount (Phase 3 pattern)
- Server confirmation for mutations (Phase 2/4 pattern) — used for DM channel creation
- Inverted FlatList not yet used but standard React Native pattern
- Zustand store for caching (useHomeStore, usePlansStore patterns)

### Integration Points
- Chat tab (`src/app/(tabs)/chat.tsx`) — currently a stub, replace with chat list screen
- Friend action sheet — wire "Start DM" to `get_or_create_dm_channel` RPC
- Plan dashboard — update "Open Chat" button to navigate to chat room with `plan_id`
- `messages` table — insert with either `plan_id` or `dm_channel_id`
- `dm_channels` table — query via RPC

</code_context>

<specifics>
## Specific Ideas

- One ChatRoomScreen handles both plan and DM chats — less code, consistent UX
- Optimistic send for messages is the right call since chat speed matters more than status/RSVP where confirmation is important
- Unread blue dot adds polish without the complexity of full read receipts
- Banner-style pinned plan card is less intrusive than a full card — leaves more room for messages

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-chat*
*Context gathered: 2026-03-19*
