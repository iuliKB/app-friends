---
phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-
plan: 04
subsystem: hooks
tags: [chat, tanstack-query, onSettled, realtime, mutation-policy]

requires:
  - phase: 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre
    provides: useChatRoom + useChatTodos on TanStack Query; mutationShape gate; queryKeys.chat.list/messages factories
  - phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-
    plan: 01
    provides: useChatList queryFn widened; ChatListItem.lastMessageKind + lastMessageSenderName

provides:
  - "Tiered onSettled policy: sendMessage→chat.list only (Tier A); sendImage+sendPoll+sendChatTodo+completeChatTodo→chat.messages + chat.list (Tier B)"
  - "useChatTodos.completeChatTodo extended signature: (itemId, opts?: { listId?, chatScope? }) — chatScope lets the hook derive channelId"
  - "channelIdFromScope helper inside useChatTodos.ts derives channelId from ChatScope.kind"
  - "ChatRoomScreen todo onSend flipped void refetch() → await refetch() (~500ms latency, user-accepted)"
  - "src/hooks/README.md Phase 32 'Tiered onSettled policy' subsection with pithy rule + 5-row table + Tier A/B examples"
  - "subscribe-helpers list updated to add subscribeChatList (forward reference to Plan 32-03)"

affects: [32-02-last-entry-preview-ui, 32-03-chat-list-reactivity]

tech-stack:
  added: []
  patterns:
    - "Tiered onSettled: choose Realtime-only vs invalidate based on optimistic-vs-canonical shape divergence + failure-mode visibility"
    - "onSuccess (not onSettled) for no-optimistic exempt mutations — preserves the @mutationShape: no-optimistic rationale"
    - "Optional ChatScope arg on completeMutation — backwards-compatible for non-chat callers (Squad todos, Home tile)"

key-files:
  created: []
  modified:
    - src/hooks/useChatRoom.ts
    - src/hooks/useChatTodos.ts
    - src/screens/chat/ChatRoomScreen.tsx
    - src/hooks/README.md
    - src/hooks/__tests__/useChatRoom.test.ts
    - src/hooks/__tests__/useChatTodos.test.ts

key-decisions:
  - "sendPoll keeps @mutationShape: no-optimistic exemption and wires invalidates via onSuccess (not onSettled) — preserves the exemption rationale that no-optimistic mutations don't have snapshot/rollback semantics"
  - "completeMutation's chatScope arg is optional — non-chat callers (Squad todos at src/app/squad/todos/index.tsx, Home tile mocks) keep working unchanged; only ChatRoomScreen passes chatScope"
  - "channelIdFromScope co-located inside useChatTodos.ts rather than a shared helper — only one consumer today; extract on second use"
  - "ChatRoomScreen.handleCompleteChatTodoItem (separate from the picker onSend) was also updated to pass chatScope — discovered during caller enumeration"

patterns-established:
  - "Tier A vs Tier B mutation classification (see src/hooks/README.md Phase 32 section): Tier A = optimistic = canonical AND failure is visible (text); Tier B = either diverges (image local URI vs CDN URL) or failure is invisible (poll/todo missed Realtime echo)"

requirements-completed: []

duration: ~6.5min
completed: 2026-05-13
---

# Phase 32 Plan 04: Send reliability + chat-list invalidation Summary

**Wired the Phase 32 tiered onSettled / onSuccess policy across the four widget mutations and the text-send mutation; flipped ChatRoomScreen's todo-picker refetch to await; documented the contract in src/hooks/README.md with verbatim pithy rule + per-tier code examples.**

## Performance

- **Duration:** ~6.5 min
- **Started:** 2026-05-13T13:17:38Z
- **Tasks:** 5
- **Files modified:** 6

## Accomplishments

- All five mutation policies wired to spec:
  - `useChatRoom.sendMessage` onSettled → `chat.list(currentUserId)` only (Tier A)
  - `useChatRoom.sendImage` onSettled → `chat.messages(channelId)` + `chat.list(currentUserId)` (Tier B)
  - `useChatRoom.sendPoll` onSuccess → both (Tier B; `@mutationShape: no-optimistic` exemption preserved)
  - `useChatTodos.sendChatTodo` onSettled → both + existing todos.* invalidates (Tier B)
  - `useChatTodos.completeChatTodo` onSettled → chat.list(userId) always; chat.messages(channelId) if `chatScope` supplied; + existing todos.* invalidates (Tier B)
- ChatRoomScreen.tsx todo onSend flipped `void refetch()` → `await refetch()` so the picker sheet does not dismiss before the bubble's children resolve
- ChatRoomScreen.tsx `handleCompleteChatTodoItem` updated to pass `chatScope` to `completeChatTodo` so the system-message bubble surfaces via the new invalidate
- `useChatTodos` API extended: now reads userId from `useAuthStore` (matches `useChatList` convention); `completeChatTodo` signature grew an optional `opts?: { listId?, chatScope? }` second arg (backwards-compatible for non-chat callers)
- `channelIdFromScope` helper added inside `useChatTodos.ts` (3 usages: definition + 2 mutation onSettled bodies)
- README.md gained a `### Tiered onSettled policy (Phase 32)` subsection under Pattern 5: pithy rule quoted verbatim from CONTEXT.md §4, 5-row policy table, Tier A example (sendMessage), Tier B example (sendImage)
- README.md subscribe-helpers list updated to add `subscribeChatList` (forward reference to Plan 32-03)
- 3 new tests in `useChatRoom.test.ts` document the tiered policy via spy assertions (one per send mutation; sendMessage test additionally asserts chat.messages is NOT invalidated)
- 2 extended tests in `useChatTodos.test.ts` assert chat.messages + chat.list invalidates on top of existing todos.* assertions; new auth-store mock provides `userId = 'u1'`
- mutationShape regression gate stays green (38/38) — no edits to the gate itself; sendPoll exemption marker preserved; all new onSettled / onSuccess bodies pass the presence-only check

## Task Commits

Each task was committed atomically:

1. **Task 1: Amend useChatRoom send mutations with tiered onSettled / onSuccess invalidates** — `ee4fb9e` (feat)
2. **Task 2: Extend useChatTodos to invalidate chat.list + chat.messages; flip ChatRoomScreen await** — `b36b333` (feat)
3. **Task 3: Document the tiered onSettled policy in src/hooks/README.md** — `72ba4fa` (docs)
4. **Task 4: Add `invalidateQueries`-spy tests for useChatRoom send mutations** — `cac2d42` (test)
5. **Task 5: Extend existing useChatTodos tests for chat.list + chat.messages invalidates** — `39d1149` (test)

(Plan metadata commit will be added by the orchestrator after this Summary lands.)

## Files Created/Modified

- `src/hooks/useChatRoom.ts` — three send mutation bodies amended (sendMessage onSettled, sendImage onSettled, sendPoll new onSuccess); the two pre-existing `// No-op: Realtime INSERT ...` placeholder comments are gone
- `src/hooks/useChatTodos.ts` — added `useAuthStore` import + `userId` selector, `channelIdFromScope` helper, extended `sendMutation.onSettled` + `completeMutation.onSettled` with chat-cache invalidates, extended `completeMutation` input + exported `completeChatTodo` signature with optional `chatScope`
- `src/screens/chat/ChatRoomScreen.tsx` — todo picker onSend flipped to `await refetch()`; `handleCompleteChatTodoItem` passes `chatScope` through to `completeChatTodo`
- `src/hooks/README.md` — new `### Tiered onSettled policy (Phase 32)` subsection; subscribe-helpers list updated
- `src/hooks/__tests__/useChatRoom.test.ts` — new `describe('Phase 32 tiered onSettled — useChatRoom send mutations')` block with 3 tests
- `src/hooks/__tests__/useChatTodos.test.ts` — new `jest.mock('@/stores/useAuthStore', …)`; two existing `onSettled` tests extended with `chat.messages('p1')` + `chat.list('u1')` assertions

## Mutation final shapes (verbatim from edited source)

### Tier A — `useChatRoom.sendMessage`

```typescript
onSettled: () => {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.chat.list(currentUserId),
  });
},
```

### Tier B — `useChatRoom.sendImage`

```typescript
onSettled: () => {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.chat.messages(channelId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.chat.list(currentUserId),
  });
},
```

### Tier B (no-optimistic exemption) — `useChatRoom.sendPoll`

```typescript
// @mutationShape: no-optimistic
const sendPollMutation = useMutation({
  mutationFn: async (...) => { /* 2-step insert+RPC */ },
  onSuccess: () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.chat.messages(channelId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.chat.list(currentUserId),
    });
  },
});
```

### Tier B — `useChatTodos.sendMutation`

```typescript
onSettled: (data, _err, args) => {
  // ... existing todos.chatList / todos.fromChats / home.all invalidates ...
  const channelId = channelIdFromScope(args.scope);
  void queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(channelId) });
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) });
  }
},
```

### Tier B — `useChatTodos.completeMutation`

```typescript
onSettled: (_data, _err, input) => {
  // ... existing todos.chatList / todos.fromChats / home.all invalidates ...
  if (input?.chatScope) {
    const channelId = channelIdFromScope(input.chatScope);
    void queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(channelId) });
  }
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) });
  }
},
```

## Caller enumeration for `completeChatTodo` (Task 2 grep verification)

| File | Hook | Scope available? | Action taken |
|---|---|---|---|
| `src/screens/chat/ChatRoomScreen.tsx:283` (handleCompleteChatTodoItem) | `useChatTodos` | YES — `chatScope` in scope | Updated to pass `{ chatScope: chatScope ?? undefined }` |
| `src/app/squad/todos/index.tsx:207` | `useTodos` (NOT useChatTodos) | N/A — different hook | Untouched; `useTodos.completeChatTodo` is a separate function |
| `src/screens/chat/__tests__/ChatRoomScreen.surface.test.tsx:50` | `useChatTodos` (mock) | N/A — mocked | Untouched (mock signature is permissive `jest.fn()`) |
| `src/components/home/__tests__/HomeTodosTile.test.tsx:36` | (mock) | N/A | Untouched |
| `src/components/squad/bento/__tests__/TodosTile.test.tsx:36` | (mock) | N/A | Untouched |
| `src/components/squad/bento/__tests__/BentoGrid.test.tsx:94` | (mock) | N/A | Untouched |

The Squad `useTodos.completeChatTodo` (different hook, line 150 of `useTodos.ts`) is a parallel implementation that calls the RPC directly — it is NOT a wrapper around `useChatTodos.completeChatTodo`. It is out of scope for this plan (CONTEXT.md only references `useChatTodos`). No table-row in the plan listed it; no action required.

## mutationShape gate status

- Pre-plan: 38/38 pass
- Post-plan: 38/38 pass (no gate edits)
- All new `onSettled` bodies in `useChatRoom.sendMessage` + `useChatRoom.sendImage` are non-empty and contain the required `onSettled` keyword (gate is presence-only, not emptiness)
- `useChatRoom.sendPoll` keeps its `// @mutationShape: no-optimistic` marker at the marker location; new `onSuccess` block does NOT count as a gate-relevant property because the exemption short-circuits the required-key walk
- `useChatTodos.sendMutation` + `useChatTodos.completeMutation` retain their `// @mutationShape: no-optimistic` markers (lines 56 + 95 post-edit)

## Test count delta

- `src/hooks/__tests__/useChatRoom.test.ts`: 3 → 6 (+3 new — sendMessage / sendImage / sendPoll invalidate-spy assertions)
- `src/hooks/__tests__/useChatTodos.test.ts`: 7 → 7 (0 net — two existing tests extended with additional assertions; no new test names added because the existing test names cover both mutations)

Combined: 10 → 13 (+3)

## Test verification (final)

```
$ npx jest --testPathPatterns="mutationShape" --no-coverage
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total

$ npx jest src/hooks/__tests__/useChatRoom.test.ts src/hooks/__tests__/useChatTodos.test.ts --runInBand --no-coverage
Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
```

## TypeScript verification (modified files)

```
$ npx tsc --noEmit -p . 2>&1 | grep -E "src/hooks/useChatTodos\.ts|src/screens/chat/ChatRoomScreen\.tsx|src/hooks/README\.md"
# (no output — zero new errors in source files modified by this plan)

$ npx tsc --noEmit -p . 2>&1 | grep "src/hooks/useChatRoom\.ts"
src/hooks/useChatRoom.ts(499,54): error TS2345: Argument of type '"create_poll"' is not assignable ...
```

The single `useChatRoom.ts` TS error at line 499 is **pre-existing** (verified by stashing the plan changes — it surfaces at line 479 on main HEAD with the same shape). The `create_poll` RPC is not in the generated `src/types/database.ts` Database type union; this is the same untyped-RPC issue documented in Plan 32-01 SUMMARY (and Phase 29.1 Plan 05). Out of scope per the plan's `<context>` block ("`(supabase as any)` cast is the established pattern" — but the existing call here uses `supabase.rpc` without the cast, predating this plan). Documented here only because the shift from 479 → 499 is caused by added lines.

## Decisions Made

- **sendPoll uses `onSuccess`, not `onSettled`, for the new invalidates.** Adding `onSettled` would make the mutation look like Pattern 5 (snapshot/rollback semantics) when in fact it's a no-optimistic create. The `@mutationShape: no-optimistic` marker is preserved unchanged. The invalidates only need to fire on success (on error, the orphan-message cleanup path inside `mutationFn` already runs).
- **`completeChatTodo`'s `chatScope` arg is optional.** Non-chat callers (Squad-tab `useTodos.completeChatTodo`, plus all `useChatTodos` test mocks) keep working with the original `(itemId)` signature. Only `ChatRoomScreen.handleCompleteChatTodoItem` passes the scope. When the arg is omitted, `chat.list(userId)` still invalidates (no scope needed) but `chat.messages(channelId)` is skipped (no channelId derivable).
- **`channelIdFromScope` is co-located inside `useChatTodos.ts`** rather than a shared `src/utils/` helper. Only one file consumes it today. CLAUDE.md / project convention: extract on second use, not first.
- **The README.md subscribe-helpers list was updated to include `subscribeChatList` as a forward reference to Plan 32-03**, even though that helper is not yet shipped. The README sentence reads "as of Phase 32: …, `subscribeChatList`." — clear that this is the plan-32 state, not a present-tense claim. Plan 32-03 will land the helper itself.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Out-of-plan caller discovered] `ChatRoomScreen.handleCompleteChatTodoItem` (line 283) was a second `completeChatTodo` call site not enumerated in the plan's caller table**
- **Found during:** Task 2 (the `grep -rn "completeChatTodo" src/` cross-check the plan instructed)
- **Plan's table covered:** Squad `[id].tsx` (different hook) and Home tile (no wired call sites found beyond mocks).
- **Plan's table missed:** `ChatRoomScreen.handleCompleteChatTodoItem` — the chat-bubble checkbox tap path, distinct from the picker sheet's onSend.
- **Decision:** This is a "Pass `{ chatScope }`" row by the plan's rubric — the file already has `chatScope` in scope and it's exactly the chat-surface caller the new invalidate is intended to cover. Updated the call site to pass `{ chatScope: chatScope ?? undefined }`.
- **Files modified:** `src/screens/chat/ChatRoomScreen.tsx` (Task 2 commit)
- **Why this is Rule 3 and not Rule 4:** The plan's `<action>` block for Task 2 explicitly directed enumeration of callers and updating "Pass `{ chatScope }`" rows; the cross-reference rubric was already authorized. The miss was in the plan's pre-computed table, not in the rubric. No architectural change required.
- **Committed in:** `b36b333` (Task 2 commit)

**Total deviations:** 1 auto-fixed (1 missed caller in the plan's pre-computed table)
**Impact on plan:** Strictly additive — the missed call site now correctly invalidates `chat.messages(channelId)` when a user taps a todo checkbox in the chat bubble, matching the plan's intent.

## Issues Encountered

- The `npx tsc --noEmit` run surfaces pre-existing `'create_poll'` RPC typing errors in `useChatRoom.ts` (now at line 499; previously at 479 — only the line number shifted from the added Tier B comment block). This is a Phase 29.1 deferral (database.ts regeneration), unrelated to this plan. Documented in TypeScript verification above.
- Jest emits an `act()` warning during the new `useChatRoom` send-mutation tests — this is background TanStack Query notification noise that surfaces in every test in the file (same warning appears for the pre-existing tests in `useChatTodos.test.ts`). The tests still pass cleanly; no new flake introduced.

## Next Phase Readiness

- **Plan 32-03 (subscribeChatList)** is independent — it adds the Realtime backstop for the incoming-message reactivity gap. This plan's `onSettled` invalidates handle the own-send half; Plan 32-03 handles the other-user-send half. They compose without coordination.
- **Plan 32-02 (UI refactor)** is unaffected by this plan — Plan 32-02 reads `lastMessageKind` and `lastMessageSenderName` from `ChatListItem` (already shipped by Plan 32-01); this plan just makes sure those fields update faster after own-sends.

## Self-Check: PASSED

Verified via `git log --oneline` and `grep` against modified files:

- src/hooks/useChatRoom.ts exists with 3 `queryKeys.chat.list(currentUserId)` references + new `onSuccess` block + `@mutationShape: no-optimistic` marker preserved at line 482
- src/hooks/useChatTodos.ts exists with `channelIdFromScope` (3 occurrences), `useAuthStore` (2), `chatScope?:` (2), `queryKeys.chat.list(userId)` (2), `queryKeys.chat.messages(channelId)` (2)
- src/screens/chat/ChatRoomScreen.tsx has `await refetch()` (line 595); no `void refetch()` matches
- src/hooks/README.md has `### Tiered onSettled policy (Phase 32)` heading, pithy rule verbatim, `subscribeChatList` mentioned (2 occurrences — Phase 32 section + subscribe-helpers list), Tier A / Tier B examples
- src/hooks/__tests__/useChatRoom.test.ts has 3 new test names (`sendMessage onSettled`, `sendImage onSettled`, `sendPoll onSuccess`) and `not.toHaveBeenCalledWith` for the Tier A negative assertion
- src/hooks/__tests__/useChatTodos.test.ts has `useAuthStore` mock, 2 each of `queryKeys.chat.list` and `queryKeys.chat.messages`
- Commit `ee4fb9e` (Task 1) present in `git log`
- Commit `b36b333` (Task 2) present in `git log`
- Commit `72ba4fa` (Task 3) present in `git log`
- Commit `cac2d42` (Task 4) present in `git log`
- Commit `39d1149` (Task 5) present in `git log`

---
*Phase: 32-chat-list-reactivity-widget-send-reliability-and-last-entry-*
*Plan: 04 — Send reliability + chat-list invalidation*
*Completed: 2026-05-13*
