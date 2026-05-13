# Phase 32 — Context for Planning

This document captures the architectural reasoning, root-cause findings, and locked-in design decisions made before planning, so they survive context clears. Read this before running `/gsd-plan-phase 32`.

## Why this phase exists

Phases 30 and 31 reshaped the chat layer: Phase 30 hoisted `chat/room` to the root Stack and introduced `useNavigationStore`; Phase 31 (Wave 8 specifically) migrated `useChatList`, `useChatRoom`, and `useChatMembers` to TanStack Query, stripped `useChatStore` to an empty scaffold, and added `subscribeChatRoom` + `subscribeChatAux` Realtime helpers.

After those changes shipped, three user-visible regressions / pre-existing gaps remain:

1. **Chat list staleness after send.** Sending any chat entry (text, image, poll, todo) and navigating back to the chat list does NOT update the chat row's last-entry preview — the user must pull-to-refresh.
2. **Widget bubbles stick in "pending"/"loading" state.** Most commonly images (the 70% opacity + spinner overlay never goes away), but polls (spinner card) and todos (no bubble at all) exhibit similar symptoms until the user closes and reopens the chat.
3. **Chat list preview blank for non-text entries.** Images, polls, todos, and soft-deleted messages all render as blank text in the chat list row because (a) the query doesn't select non-text discriminator columns and (b) the row has no per-kind formatter.

Plus, a related architectural gap: incoming messages from other people do NOT update the chat list in real-time while the user is sitting on the list screen. The chat list has no Realtime subscription. Fixing this is in scope.

## Root cause analysis (research conducted 2026-05-13)

### Issue 1 — chat list staleness

- After Phase 31 Wave 8, `useChatList` is a single `useQuery` with `staleTime: 30s` and the `useChatStore.chatList` mirror was stripped.
- `useChatRoom`'s send mutations (`sendMessage`, `sendImage`, `sendPoll`) have intentionally **empty `onSettled`** — Phase 31 documented this as a deliberate trade so Realtime INSERT (via `subscribeChatRoom`) reconciles the `chat.messages(channelId)` cache without a redundant fetch.
- BUT **nothing ever writes to or invalidates `queryKeys.chat.list(userId)` on send**. `subscribeChatRoom`'s INSERT/UPDATE/DELETE handlers only touch `chat.messages`. `ChatListScreen` has no `useRefreshOnFocus`, no Realtime subscription. The global default is `refetchOnWindowFocus: false`.
- Result: list stays stale until pull-to-refresh or 30s TTL + screen re-mount.
- Same root cause affects incoming messages: there's no list-scoped subscription at all.

**Evidence:**
- `src/hooks/useChatList.ts:288-298` — `useQuery` body, `staleTime: 30_000`, no Realtime/focus.
- `src/hooks/useChatRoom.ts:389-391, 454-456` — empty `onSettled` for `sendMessage`/`sendImage`.
- `src/lib/realtimeBridge.ts:148-216` — `subscribeChatRoom` handlers target only `chat.messages`; no reference to `chat.list`.
- `src/lib/queryClient.ts:24-31` — `refetchOnWindowFocus: false`, global `staleTime: 60_000`.

### Issue 2 — widget bubble stickiness (per-type root causes)

| Widget | Optimistic? | Stickiness cause |
|---|---|---|
| **Image** (`sendImage`) | Yes, pre-upload (70% opacity + spinner overlay during upload) | If `subscribeChatRoom` INSERT echo is missed (channel not yet `joined`, brief WS disconnect, dropped packet), the bubble stays at 70% opacity forever until reopen. **User reports this as the most frequent symptom.** |
| **Poll** (`sendPoll`) | Yes (manual splice outside the mutation), but `PollCard` short-circuits to a spinner card when `pending \|\| !poll_id` | The 2-step server flow does INSERT messages (Realtime INSERT replaces the pending row with `poll_id: null`) then UPDATE messages SET poll_id (Realtime UPDATE → invalidate → refetch fills `poll_id`). If either Realtime event is missed, the spinner card sticks. |
| **Todo** (`useChatTodos.sendChatTodo`) | **No** — `onMutate` returns `{}` (no cache write). The RPC `create_chat_todo_list` uses a server-generated message UUID, so client can't pre-align id | Bubble appears only via Realtime INSERT or via a `void refetch()` (un-awaited, races with subsequent renders). If both fail, no bubble at all. |
| **Split Expenses** | N/A — navigates away to `/squad/expenses/create` and writes no `messages` row | Not a regression. **Explicitly out of scope for this phase** — do not ship a new `expense` message_type. |

**Pre-existing vs Phase 31 regression:** None of these are Phase 31 regressions — they're all pre-existing patterns. Phase 31 documented the empty-`onSettled` choice; this phase amends that contract for widget paths (text sends keep the Realtime-only reconciliation since text optimistic shape matches canonical).

**Evidence:**
- `src/hooks/useChatRoom.ts:336-392` — `sendMessageMutation`.
- `src/hooks/useChatRoom.ts:395-457` — `sendImageMutation` (Pattern-5; `onMutate` writes optimistic before upload).
- `src/hooks/useChatRoom.ts:463-490, 525-562` — `sendPollMutation` (no-optimistic mutation + manual splice outside).
- `src/hooks/useChatTodos.ts:48-80` — `sendMutation`, `onMutate` returns `{}` (no cache write).
- `src/lib/realtimeBridge.ts:163-186` — INSERT dedup logic (replaces by id).
- `src/components/chat/MessageBubble.tsx:617-651, 681-717` — per-type pending render.
- `src/components/chat/PollCard.tsx:261-267` — spinner short-circuit when `pending \|\| !poll_id`.
- `src/screens/chat/ChatRoomScreen.tsx:582-591` — todo picker `onSend` with `void refetch()`.
- `supabase/migrations/0026_chat_todos_multi_scope.sql:152-156, 178` — server-generated message UUID; RPC returns only `list_id`.

### Issue 3 — chat list preview gap

Two compounding gaps:

- **Data layer:** `useChatList`'s queryFn selects only `body, created_at, sender_id` from `messages` (in all three branches: plan, dm, group). It NEVER selects `message_type`, `image_url`, or `poll_id`. For non-text messages (`message_type` in `image | poll | deleted`), `body` is NULL — coerced or stripped, ends up blank.
- **UI layer:** `ChatListRow.tsx:239-241` blindly renders `<Text>{item.lastMessage}</Text>` — no per-kind formatter, no icon, no fallback for null/empty body, no italic for deleted.

**Evidence:**
- `src/hooks/useChatList.ts:18` — `MsgEntry` shape (3 fields only).
- `src/hooks/useChatList.ts:57-72, 79-94, 151-167` — three SELECTs, all missing `message_type`/`image_url`/`poll_id`.
- `src/hooks/useChatList.ts:184, 206, 226` — `lastMessage: latest.body` assignment.
- `src/components/chat/ChatListRow.tsx:239-241` — preview render, no conditional.
- `src/types/chat.ts:1` — `MessageType = 'text' \| 'image' \| 'poll' \| 'deleted' \| 'system' \| 'todo'`.
- `supabase/migrations/0024_habits_todos_v1_8.sql:25-36, 524-528` — `message_type` CHECK, body nullability, todo body carries title.
- `supabase/migrations/0018_chat_v1_5.sql:41-47, 69` — `polls.question` lives in `polls` table (must be joined).

## Locked-in design decisions

### 1. Icon library

Use **Ionicons** from `@expo/vector-icons`. This is the consistent choice across every chat surface today (`SendBar`, `ChatSearchBar`, `PollCreationSheet`, `ChatTodoPickerSheet`, `ChatListRow`, `ChatTodoBubble`, `SystemMessageRow`). NO emoji prefixes — the user explicitly rejected emoji as too "vibecoded." Use outline-style icon names to match the existing convention.

### 2. Per-kind preview format

| `message_type` | Icon (Ionicons) | Text |
|---|---|---|
| `text` | (none) | `body` as-is |
| `image` | `image-outline` | `"Photo"` |
| `poll` | `stats-chart-outline` | `"Poll: <polls.question>"` (requires joining `polls`) |
| `todo` | `checkbox-outline` | `"To-do: <body>"` (body already carries the title — see migration 0026 line 524-528) |
| `system` | (none) | `body` as-is |
| `deleted` | (none) | `"Message deleted"` rendered **italic** |

### 3. Sender attribution — applies to ALL scopes (DMs + plan chats + group chats)

- **Own messages** → prefix `"You: "`
- **Other users' messages** → prefix `"<FirstName>: "` (from `profiles.first_name` join)
- Applies to DMs too (user explicitly confirmed — iMessage/WhatsApp convention).
- Hardcoded English strings; no i18n scaffolding (user explicitly deferred multilanguage to a later phase).
- For deleted messages, the italic styling applies ONLY to `"Message deleted"` — the sender prefix stays upright. Example rendering: `Alice: ` (upright) + `Message deleted` (italic).

### 4. `onSettled` tiered policy

The Phase 31 contract (empty `onSettled`, Realtime-only reconciliation) is **amended** for widget paths. Document in `src/hooks/README.md` Pattern 5 section.

| Mutation | `onSettled` invalidates `chat.messages(channelId)`? | `onSettled` invalidates `chat.list(userId)`? |
|---|---|---|
| `sendMessage` (text) | **No** — empty (Realtime-only, optimistic shape matches canonical) | **Yes** (new) |
| `sendImage` | **Yes** (new — belt-and-braces fixes 70% opacity stickiness) | **Yes** (new) |
| `sendPoll` | **Yes** (new — fixes spinner card stickiness when Realtime UPDATE missed) | **Yes** (new) |
| `sendChatTodo` (in `useChatTodos`) | **Yes** (new) + `void refetch()` → `await refetch()` (~500ms latency, user-accepted) | **Yes** (new) |
| `deleteMessage`, `addReaction`, `removeReaction` | (unchanged — direct setQueryData; no policy change in scope) | n/a |

**Pithy rule (document this verbatim in `src/hooks/README.md`):**

> "Use Realtime-only reconciliation only when the optimistic shape is identical to the canonical shape AND the failure mode is invisible. Otherwise, invalidate in `onSettled`."

### 5. Chat list reactivity for INCOMING messages

NEW `realtimeBridge.subscribeChatList(userId, queryClient)` helper:

- Global postgres_changes subscription on `messages` (INSERT + UPDATE + DELETE), **no scope filter**.
- Each event → `queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) })`.
- Refcounted (matches `subscribeChatRoom` / `subscribeChatAux` convention from Phase 31 Wave 8).
- Channel name shape: `chat-list-${userId}` (dash-separated — matches existing `chat-${channelId}` / `chat-aux-${channelId}` / `home-statuses-${userId}` convention).
- Mounted via `useEffect` inside `useChatList`, keyed on `userId`, with teardown on unmount / userId change.

**Why global (not column-scoped):** Supabase Realtime postgres_changes filters support only single `eq`, not `IN (list)`. One global subscription that over-invalidates is cheaper and simpler than N per-room subscriptions. Over-invalidation is cheap because the chat-list join naturally filters by membership — a "spurious" invalidate just re-runs the same SELECT and produces the same result.

**Cost:** one Realtime channel per active chat-list view, fires once per message inserted anywhere in the DB. Acceptable for a friend-group app at 3–15 users per group; well within Supabase free-tier Realtime budget.

This subscription also handles your-own-sends as a belt-and-braces (Supabase echoes the INSERT through Realtime too), in addition to the explicit `onSettled` invalidates from policy #4.

## Tentative plan slices (refine in `/gsd-plan-phase 32`)

4 plans, 2 waves.

### Wave 1 (parallel — no inter-dependencies)

- **32-01 — Last-entry preview data layer**
  - Extend `useChatList` queryFn SELECT to add `message_type, image_url` from `messages` (all 3 branches: plan / dm / group).
  - Join `polls(question)` when latest message kind is `poll` (a small follow-up SELECT keyed by the latest poll's `poll_id` per chat is simplest; an inline join would over-fetch).
  - Ensure `profiles(first_name)` is available for the latest message's sender_id (already joined in some branches; verify).
  - Compute per-row:
    - `lastMessage: string` — preview text only, no icon: `body` for text/system, `"Photo"` for image, `"Poll: <question>"` for poll, `"To-do: <body>"` for todo, `"Message deleted"` for deleted.
    - `lastMessageKind: MessageType` — discriminator passed to UI.
    - `lastMessageSenderName: string \| null` — `"You"` for own messages, `first_name` for others, `null` only if the chat has no messages.
  - Extend `ChatListItem` type in `src/types/chat.ts` with the two new fields.
  - Update `useChatList` tests (`src/hooks/__tests__/useChatList.test.ts`) to cover new fields across all 6 message kinds.

- **32-03 — Chat list reactivity (incoming message subscription)**
  - Add `realtimeBridge.subscribeChatList(userId, queryClient)`:
    - Channel name shape: `chat-list-${userId}` (dash convention — matches existing `chat-${channelId}` / `chat-aux-${channelId}` / `home-statuses-${userId}`).
    - Single `.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, ...)` listener (one channel covers INSERT + UPDATE + DELETE without per-event branching).
    - Handler: `queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) })`.
    - Refcounted (same Map-based pattern as `subscribeChatRoom` / `subscribeChatAux`).
  - Mount via `useEffect` inside `useChatList` keyed on `userId`; return cleanup.
  - 4-6 new realtimeBridge tests: channel name shape, refcount dedup, INSERT/UPDATE/DELETE each invalidate the right key, teardown on userId change, teardown order.

- **32-04 — Send reliability + chat-list invalidation**
  - `useChatRoom.sendMessage` (text): `onSettled` adds `invalidateQueries({ queryKey: queryKeys.chat.list(userId) })`. Keep empty for `chat.messages` (text optimistic shape matches canonical; Realtime-only is fine).
  - `useChatRoom.sendImage`: `onSettled` adds `invalidate(chat.messages(channelId))` + `invalidate(chat.list(userId))`.
  - `useChatRoom.sendPoll`: same — both invalidates in `onSettled`.
  - `useChatTodos.sendChatTodo`:
    - `void refetch()` → `await refetch()` (~500ms latency accepted by user).
    - `onSettled` adds `invalidate(chat.messages(channelId))` + `invalidate(chat.list(userId))`.
  - Update `src/hooks/README.md` Pattern 5 section to document the tiered `onSettled` policy with the pithy rule verbatim + a concrete example per tier.
  - Update mutationShape regression gate to allow the new non-empty `onSettled` bodies for widget mutations. (Today the gate accepts empty `onSettled`; this is an additive change to allow invalidate bodies on the named widget mutations.)
  - Update existing `useChatRoom` and `useChatTodos` tests to mock `invalidateQueries` and assert calls with correct keys.

### Wave 2 (depends on 32-01)

- **32-02 — Last-entry preview UI**
  - Refactor `src/components/chat/ChatListRow.tsx:239-241`:
    - Replace plain `<Text>{item.lastMessage}</Text>` with horizontal `<View flexDirection="row" alignItems="center">` containing:
      - Optional `<Ionicons size={14} color={...}>` per `lastMessageKind` (`null` for text/system/deleted; `image-outline` / `stats-chart-outline` / `checkbox-outline` for image/poll/todo).
      - `<Text numberOfLines={1}>` with:
        - Sender prefix: `"You: "` (own message) or `"<FirstName>: "` (other) — always, in all scopes.
        - Preview text — italic styling ONLY for the deleted-kind preview portion; sender prefix stays upright.
  - Add icon-mapping helper: `getPreviewIcon(kind: MessageType): keyof typeof Ionicons.glyphMap \| null`. Co-locate with `ChatListRow` or in a small `src/components/chat/chatListPreview.ts` if it needs to be used elsewhere.
  - Add italic style for deleted kind: split the Text into two `<Text>` children where the second has `fontStyle: 'italic'`. Maintain existing `styles.preview` / `styles.previewUnread` (bold for unread).
  - Sender name color: do NOT bold (user didn't ask for it; keep visual weight consistent with current preview).
  - Update any Playwright visual regression snapshots that include the chat list (check `tests/` and `playwright.config.ts`).
  - Update `ChatListScreen` and `ChatListRow` tests if any assert preview text shape.

## Out of scope (hard boundaries — do NOT expand)

- **Do NOT** introduce a new `expense` message_type or chat bubble for Split Expenses. Expenses remain a Squad-tab-only flow.
- **Do NOT** change the `create_chat_todo_list` RPC signature (keep server-generated message UUID; the 500ms latency from `await refetch()` is accepted).
- **Do NOT** add i18n / localization scaffolding for the new hardcoded strings (`"You: "`, `"Photo"`, `"Poll: "`, `"To-do: "`, `"Message deleted"`). Keep them inline. User explicitly deferred this.
- **Do NOT** migrate `ChatListScreen`'s other interactions (delete/mute/markRead). Those already write to the cache correctly via Phase 31 Wave 8.
- **Do NOT** change `sendMessage`'s empty-`onSettled` convention for `chat.messages` — text sends stay Realtime-only for the messages cache. Only `chat.list` gets the invalidate for text.
- **Do NOT** bold the sender prefix or add other typography changes beyond italic-for-deleted.
- **Do NOT** add a `useRefreshOnFocus` to `ChatListScreen` — `subscribeChatList` handles list freshness and is the cleaner mechanism. Avoid two competing freshness systems.
- **Do NOT** rework `subscribeChatRoom` — it stays column-scoped exactly as Phase 31 left it.

## Success criteria (verification anchor)

1. Sending any chat entry (text / image / poll / todo) and immediately navigating back to the chat list shows the updated last-entry row WITHOUT pull-to-refresh.
2. Another user sending a message into a chat the current user is a member of updates that chat's row in the chat list WITHIN ~2 seconds, while the chat list is foregrounded, WITHOUT pull-to-refresh.
3. Sending an image, poll, or todo causes the in-room bubble to transition out of "pending"/"loading" state within ~1 second (or ~500ms for todos), even if Realtime broadcasts are dropped — verified by intentionally killing the Realtime channel mid-send during smoke.
4. The chat list shows an Ionicons icon + descriptive text for every non-text last-entry: image → `image-outline` icon + "Photo"; poll → `stats-chart-outline` icon + "Poll: <question>"; todo → `checkbox-outline` icon + "To-do: <title>".
5. The chat list shows a sender prefix on every last-entry across DMs / plan chats / group chats: `"You: "` for own messages, `"<FirstName>: "` for others.
6. Soft-deleted messages render as italic `"Message deleted"` (with sender prefix in upright) — not blank.
7. `src/hooks/README.md` documents the tiered `onSettled` policy with the pithy rule verbatim plus a concrete example per tier.
8. mutationShape regression gate stays green (updated to allow the new invalidate bodies for the named widget mutations).
9. Full jest suite stays green (no new flake; existing `useChatList` / `useChatRoom` / `useChatTodos` / `realtimeBridge` / `persistQueryClient` tests still pass).

## Requirements

TBD — no formal REQ-IDs (consistent with Phase 30 / Phase 31 convention). Verification anchored to the Success Criteria above.

## Depends on

Phase 31 — TanStack Query foundation, `realtimeBridge.subscribeChatRoom` / `subscribeChatAux`, `queryKeys.chat` taxonomy, `useChatList` / `useChatRoom` / `useChatMembers` all on `useQuery`, `src/hooks/README.md` Pattern 5 baseline.

## UI hint

Yes — Plan 32-02 is a UI refactor of `ChatListRow`. The visual change is constrained (icon + text preview line within an existing row layout), so likely does not warrant the full `/gsd-ui-phase` UI-SPEC dance. Planner's call; if invoked, focus only on the preview-line composition and Ionicon choices.
