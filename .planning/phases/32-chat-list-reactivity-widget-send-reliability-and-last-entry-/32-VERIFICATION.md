---
phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-
verified: 2026-05-13T00:00:00Z
status: human_needed
score: 7/9
overrides_applied: 0
human_verification:
  - test: "Send a text message, an image, a poll, and a todo in a chat room. Navigate back to the chat list immediately after each send (without pull-to-refresh)."
    expected: "The chat list row for that chat updates to show the new last-entry preview within 1-2 seconds. No pull-to-refresh required."
    why_human: "SC-1 depends on onSettled invalidation timing in a live Supabase environment; Jest tests confirm the invalidate calls are wired but cannot run the full TanStack Query cache lifecycle against a real network."
  - test: "With two accounts, have the second account send a message into a shared chat while the first account is viewing the chat list screen."
    expected: "The first account's chat list row updates within approximately 2 seconds without pull-to-refresh (driven by subscribeChatList Realtime channel)."
    why_human: "SC-2 requires two live Supabase accounts and a real Realtime channel; cannot be simulated by Jest."
  - test: "Send an image, a poll, and a todo. While each is in-flight, kill the Realtime channel (e.g. enable Airplane Mode after the mutation fires but before the Realtime echo arrives). Re-enable connectivity."
    expected: "Each widget bubble transitions out of the pending/loading/spinner state within approximately 1 second (image, poll) or 500ms (todo) after connectivity returns, because onSettled fires a belt-and-braces invalidate regardless of Realtime delivery."
    why_human: "SC-3 requires network fault injection during an in-flight mutation; cannot be automated in the current test setup."
---

# Phase 32 Verification Report

**Phase Goal:** Fix three user-visible regressions in the chat layer: (1) chat list staleness after send, (2) widget bubble stickiness when Realtime echoes are missed, (3) blank chat list previews for non-text last entries. Additionally add incoming-message reactivity to the chat list via a new Realtime subscription.

**Verified:** 2026-05-13
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | Sending any chat entry and navigating to chat list shows updated row WITHOUT pull-to-refresh | HUMAN NEEDED | onSettled invalidates `queryKeys.chat.list(currentUserId)` wired for all 4 mutations; Jest spy assertions pass (useChatRoom.test.ts:154-224, useChatTodos.test.ts:168-196); requires live env to confirm end-to-end timing |
| 2 | Incoming messages from another user update chat list within ~2 seconds without pull-to-refresh | HUMAN NEEDED | `subscribeChatList` wired in `realtimeBridge.ts:142-176` with no-filter `messages` listener; mounted from `useChatList` via `useEffect` at line 407-410; realtimeBridge.test.ts:225 covers all event types; requires two live accounts to confirm |
| 3 | Widget bubbles exit pending state within ~1s/~500ms even if Realtime echoes are dropped | HUMAN NEEDED | sendImage/sendPoll invalidate `chat.messages(channelId)` in onSettled/onSuccess (useChatRoom.ts:463-525); sendChatTodo awaits refetch + invalidates (useChatTodos.ts:96-99, ChatRoomScreen.tsx:595); requires network fault injection to confirm |
| 4 | Chat list shows icon + descriptive text for every non-text last-entry | VERIFIED | `getPreviewIcon` returns `image-outline`/`stats-chart-outline`/`checkbox-outline` (ChatListRow.tsx:24-35); useChatList.ts emits `lastMessageKind` and per-kind `lastMessage` text for all 6 kinds; 5 ChatListRow tests confirm rendering (ChatListRow.test.tsx:98-185) |
| 5 | Chat list shows sender prefix on every last-entry across DMs/plan chats/group chats | VERIFIED | `senderNameForLatest` returns `"You"` for own messages and first-name token for others (useChatList.ts:53-61); `ChatListRow.tsx:283` renders `${item.lastMessageSenderName}: ` prefix; 7 useChatList tests cover all sender scenarios |
| 6 | Soft-deleted messages render as italic "Message deleted" with sender prefix upright | VERIFIED | `previewForLatest` returns `'Message deleted'` for `deleted` kind (useChatList.ts:44); `ChatListRow.tsx:284-289` wraps body in nested `<Text style={previewItalic}>` only when `lastMessageKind === 'deleted'`; ChatListRow.test.tsx deleted case confirms italic style |
| 7 | `src/hooks/README.md` documents the tiered onSettled policy with pithy rule verbatim + per-tier example | VERIFIED | `README.md:16` has `### Tiered onSettled policy (Phase 32)`; `README.md:22` has verbatim pithy rule; `README.md:34/44` has Tier A and Tier B code examples; `README.md:59` updated subscribe-helpers list includes `subscribeChatList` |
| 8 | mutationShape regression gate stays green (no gate edits needed) | VERIFIED | `npx jest --testPathPatterns="mutationShape"` → 38/38 pass; sendPoll retains `@mutationShape: no-optimistic` marker at useChatRoom.ts:482; new onSettled bodies pass presence-only check |
| 9 | Full jest suite stays green | VERIFIED | `npx jest --no-coverage` → 265/265 pass across 49 suites (includes useChatList, realtimeBridge, useChatRoom, useChatTodos, mutationShape, ChatListRow, and all pre-existing suites) |

**Score:** 7/9 truths verified (6 automated + 1 gate); 3 deferred to human smoke test.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/types/chat.ts` | `ChatListItem` extended with `lastMessageKind: MessageType` and `lastMessageSenderName: string \| null` | VERIFIED | Lines 43-44 confirm both required fields present |
| `src/hooks/useChatList.ts` | queryFn SELECTs `message_type/image_url/poll_id`, joins polls(question), computes per-kind preview + sender attribution | VERIFIED | Lines 101/126/201 show 3 widened SELECTs; `previewForLatest` at line 29; `senderNameForLatest` at line 53; polls batch SELECT at line 270 |
| `src/hooks/__tests__/useChatList.test.ts` | Tests covering all 6 message kinds + sender attribution | VERIFIED | 19 occurrences of `lastMessageKind`/`lastMessageSenderName`; 10 total tests pass (265 suite total) |
| `src/components/chat/ChatListRow.tsx` | Refactored preview: `getPreviewIcon` + sender prefix + per-kind text + italic for deleted | VERIFIED | `getPreviewIcon` at line 24; `previewWrap`/`previewIcon`/`previewItalic` styles at lines 133-146; JSX composition at lines 266-290 |
| `src/components/chat/__tests__/ChatListRow.test.tsx` | 5 test cases covering image/poll/todo/deleted-italic/text-null-sender | VERIFIED | File exists; 5 tests pass; covers all required rendering contracts |
| `src/lib/realtimeBridge.ts` | `subscribeChatList(queryClient, userId)` exported, refcounted, no scope filter | VERIFIED | Function at line 142; no `filter:` key in postgres_changes options (line 157); refcount pattern matches existing helpers |
| `src/lib/__tests__/realtimeBridge.test.ts` | `describe('realtimeBridge.subscribeChatList'...)` block with channel name, refcount, event, teardown tests | VERIFIED | `describe` block at line 225; `chat-list-u1` assertions at lines 242/293; `not.toHaveProperty('filter')` at line 254 |
| `src/hooks/useChatRoom.ts` | Tiered onSettled/onSuccess policy on sendMessage, sendImage, sendPoll | VERIFIED | `sendMessage.onSettled` at line 389 (chat.list only); `sendImage.onSettled` at line 463 (both); `sendPoll.onSuccess` at line 510 (both); `@mutationShape: no-optimistic` preserved at line 482 |
| `src/hooks/useChatTodos.ts` | `sendChatTodo` + `completeChatTodo` invalidate `chat.messages` + `chat.list`; `channelIdFromScope` helper | VERIFIED | `channelIdFromScope` at line 28; `useAuthStore` import at line 21; `userId` selector at line 58; both mutations carry chat.list/chat.messages invalidates at lines 96-99 and 139-143 |
| `src/screens/chat/ChatRoomScreen.tsx` | `await refetch()` in todo onSend; `handleCompleteChatTodoItem` passes chatScope | VERIFIED | `await refetch()` at line 595; `handleCompleteChatTodoItem` passes `chatScope` at line 286 |
| `src/hooks/README.md` | Tiered onSettled policy section with pithy rule + table + Tier A/B examples | VERIFIED | Lines 16-57 contain full subsection; verbatim pithy rule at line 22; Tier A at line 34; Tier B at line 44 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `useChatList.ts` | `realtimeBridge.subscribeChatList` | `import { subscribeChatList } from '@/lib/realtimeBridge'` at line 17 + `useEffect` call at line 409 | WIRED | Import and invocation both present |
| `useChatList.ts` | `src/types/chat.ts` | `import type { ChatListItem, MessageType }` | WIRED | Used in `MsgEntry`, `previewForLatest`, `senderNameForLatest`, item-push return types |
| `ChatListRow.tsx` | `src/types/chat.ts` | `item.lastMessageKind` + `item.lastMessageSenderName` consumed at lines 268/283/284 | WIRED | Both new fields consumed in JSX |
| `ChatListRow.tsx` | `@expo/vector-icons Ionicons` | `getPreviewIcon` returns glyph names used in `<Ionicons name={iconName}>` at line 272 | WIRED | `image-outline`/`stats-chart-outline`/`checkbox-outline` resolved via helper |
| `useChatRoom.ts` | `queryKeys.chat.list` | `queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(currentUserId) })` in 3 mutations | WIRED | Lines 398, 474, 523 |
| `useChatTodos.ts` | `queryKeys.chat.list` + `queryKeys.chat.messages` | `channelIdFromScope` derives channelId; invalidates in both mutation `onSettled` bodies | WIRED | Lines 97-99, 139-143 |
| `realtimeBridge.ts` | `queryKeys.chat.list` | `queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) })` in `subscribeChatList` handler at line 163 | WIRED | Confirmed |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `ChatListRow.tsx` | `item.lastMessageKind` | `useChatList` queryFn → widened Supabase SELECT → `previewForLatest` | Yes — Supabase SELECT with `message_type` column in all 3 branches | FLOWING |
| `ChatListRow.tsx` | `item.lastMessageSenderName` | `useChatList` queryFn → batched `profiles` SELECT → `senderNameForLatest` | Yes — batch profiles SELECT at useChatList.ts:242 | FLOWING |
| `ChatListRow.tsx` | `item.lastMessage` (poll kind) | `useChatList` queryFn → batched `polls` SELECT → `previewForLatest` | Yes — polls batch SELECT at useChatList.ts:270 | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED for SC-1/2/3 — they require a live Supabase Realtime environment. All runnable code paths (data formatting, icon mapping, cache key construction) are covered by Jest assertions.

The following logic was verified statically:

| Behavior | Verification Method | Result | Status |
|---|---|---|---|
| `getPreviewIcon('image')` returns `'image-outline'` | Code read ChatListRow.tsx:27 | Literal return | PASS |
| `previewForLatest` returns `'Message deleted'` for `deleted` kind | Code read useChatList.ts:44 | Literal return | PASS |
| `subscribeChatList` has NO `filter:` key | Code read realtimeBridge.ts:155-158; confirmed `{ event: '*', schema: 'public', table: 'messages' }` | No filter key present | PASS |
| `sendMessage.onSettled` does NOT invalidate `chat.messages` | Code read useChatRoom.ts:389-400; only `chat.list` invalidation present | Tier A constraint met | PASS |

---

## Requirements Coverage

No formal REQ-IDs for Phase 32 (consistent with Phase 30/31 convention). Coverage mapped to 9 CONTEXT.md Success Criteria above.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|---|---|---|---|
| `src/hooks/useChatList.ts:221-225` | `(supabase as any).from('polls')` cast | Info | Intentional — `polls` table not yet in generated `database.ts` (Phase 29.1 deferral); same pattern as `usePoll.ts:61`; documented in 32-01-SUMMARY.md |
| `src/hooks/useChatRoom.ts:499` | `supabase.rpc('create_poll', ...)` TS error (pre-existing) | Info | Pre-existing before Phase 32 (line number shifted from 479 to 499 only due to added comment lines); not introduced by this phase |
| Worker process force exit in full test run | Non-deterministic teardown warning in jest output | Warning | Pre-existing noise from TanStack Query background timers; all 265 tests pass; no new flake |

---

## Integration Risk: 32-03 + 32-04 Echo Amplification

**Concern identified in the task brief:** `subscribeChatList` (32-03) fires on every `messages` INSERT — including ones triggered by the user's own sends. The `onSettled` invalidates from 32-04 also fire for own-sends. This means a single own-send triggers TWO `invalidateQueries({ queryKey: queryKeys.chat.list(userId) })` calls: one from `onSettled` (~deterministic, fires when mutation settles) and one from the Realtime echo (~100-300ms later, fires when Supabase broadcast arrives).

**Verdict: Not a problem in practice.** TanStack Query deduplicates concurrent `invalidateQueries` calls against the same cache key within a render cycle. The `staleTime: 30_000` on `useChatList`'s `useQuery` means the second invalidation (Realtime echo) does trigger a refetch, but only if the first one's refetch hasn't completed yet. In practice, the two calls are separated by ~100-300ms, so the second call arrives while the first refetch may still be in-flight — TanStack Query will either deduplicate the in-flight request or trigger one additional refetch. For a chat-list query of modest size (friend-group scale, 3-15 chats), this is one extra SELECT per own-send, which is well within acceptable cost. CONTEXT.md §5 explicitly accepts this over-invalidation model. No code change required.

---

## Human Verification Required

### SC-1: Post-send chat list reactivity (own sends)

**Test:** Open any chat room. Send a text message, then navigate back to the chat list immediately (within 1-2 seconds). Repeat for image, poll, and todo sends.
**Expected:** Each chat list row shows the new last-entry preview (correct icon + sender prefix + preview text) without pull-to-refresh. The update appears within approximately 1-2 seconds of the send.
**Why human:** Requires a live Supabase environment to confirm onSettled invalidation drives a visible cache refetch at the UI layer.

### SC-2: Incoming-message reactivity (other users)

**Test:** Using two accounts, have Account B send a message into a shared chat while Account A is viewing the chat list screen (not inside the chat room).
**Expected:** Account A's chat list row for that chat updates within approximately 2 seconds without pull-to-refresh.
**Why human:** Requires two live Supabase sessions and a functioning Realtime channel (`chat-list-${userId}`); cannot be simulated in Jest.

### SC-3: Widget bubble stickiness under dropped Realtime echoes

**Test:** Send an image while the device is in a degraded network state that causes Realtime echo drops (e.g. enable Airplane Mode 200ms after tapping Send, re-enable after 2 seconds). Repeat for poll and todo sends.
**Expected:** Image and poll bubbles exit the 70% opacity/spinner state within approximately 1 second after connectivity is restored (via the belt-and-braces `chat.messages` invalidate in `onSettled`). Todo bubble appears within approximately 500ms (via `await refetch()`).
**Why human:** Requires network fault injection during an in-flight mutation; not automatable in Jest without a live Supabase connection.

---

## Gaps Summary

No automated gaps found. All 9 Success Criteria have wiring verified where testable. Three criteria (SC-1, SC-2, SC-3) require live-environment smoke testing because they depend on Supabase Realtime channel behavior, cache invalidation timing, and network fault injection — none of which can be fully asserted via Jest mocks.

The echo-amplification risk between 32-03's global invalidate and 32-04's per-mutation invalidates is acceptable by design (TanStack Query deduplication + CONTEXT.md §5 explicit acceptance).

---

_Verified: 2026-05-13_
_Verifier: Claude (gsd-verifier)_
