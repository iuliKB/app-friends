# Phase 32: Chat list reactivity, widget send reliability, and last-entry previews — Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 9 (5 source modifications + 1 new type field + 1 doc + tests + regression gate)
**Analogs found:** 9 / 9 (all in-codebase; no greenfield)

CONTEXT.md is the de-facto research document for this phase (no formal RESEARCH.md). All analogs below are real source files referenced by line number — copy patterns verbatim and amend only what each section flags.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/realtimeBridge.ts` (add `subscribeChatList`) | service | event-driven (pub-sub) | `subscribeChatRoom` + `subscribeHabitCheckins` (same file) | exact (in-file twin) |
| `src/hooks/useChatList.ts` (extend SELECTs + `useEffect`) | hook | request-response + event-driven | `useChatRoom.ts:222-225` (its existing `subscribeChatRoom` mount) | exact |
| `src/hooks/useChatRoom.ts` (amend 3 mutation `onSettled` blocks) | hook | CRUD (mutation) | `useHabits.ts:80-82` (canonical non-empty `onSettled`) + `usePlans.ts:217-223` (multi-key invalidate) | exact |
| `src/hooks/useChatTodos.ts` (`void`→`await refetch` is in ChatRoomScreen, hook gets `chat.list` invalidate) | hook | CRUD (mutation) | `useChatTodos.ts:71-79` (the file's own existing `onSettled`) | exact (in-file) |
| `src/components/chat/ChatListRow.tsx` (preview composition refactor) | component | request-response (render) | `ChatListRow.tsx:217-228, 242-253` (own icon+avatar render); `ChatTodoBubble.tsx:31, 227, 340` (Ionicons size+color) | exact |
| `src/types/chat.ts` (extend `ChatListItem`) | model | (type-only) | `src/types/chat.ts:33-44` (the type itself) | exact (in-file) |
| `src/hooks/README.md` (Pattern 5 tier note) | doc | (doc) | `src/hooks/README.md:14` + `src/hooks/README.md:43-47` (Pattern 5 + Hybrid Patterns blocks) | exact |
| Tests (4 files) | test | request-response | `src/hooks/__tests__/useChatRoom.test.ts`, `useChatList.test.ts`, `useChatTodos.test.ts`, `src/lib/__tests__/realtimeBridge.test.ts` | exact (same files) |
| `mutationShape.test.ts` regression gate (allow non-empty `onSettled`) | test (gate) | static-fs walk | `src/hooks/__tests__/mutationShape.test.ts:19, 70-101` | exact (the gate is already permissive — REQUIRED only checks `onSettled` is present, NOT that it is empty) |

**Sharp note on the gate.** The `mutationShape` gate already requires `onSettled` to be PRESENT in every non-exempt mutation. It does NOT enforce emptiness. So the new non-empty `onSettled` bodies for `sendMessage` / `sendImage` / `sendPoll` (and the existing `useChatTodos` mutations already use `onSettled`) need ZERO gate edits to pass — they keep passing. The gate task is reduced to "verify gate still passes" rather than "modify gate to allow."

But: `sendPollMutation` currently has NO `onMutate` / `onError` / `onSettled` (it's exempted by being a no-optimistic exemption, but lacks the marker). It is technically broken today. The plan should add the `// @mutationShape: no-optimistic` marker OR add the full Pattern 5 shape. Verify by running the gate today — see #4.

---

## Pattern Assignments

### 1. `src/lib/realtimeBridge.ts` — add `subscribeChatList(queryClient, userId)`

**Role:** service / event-driven pub-sub
**Analog A (primary):** `subscribeChatRoom` at `src/lib/realtimeBridge.ts:148-216` — same module, same convention, same refcount registry.
**Analog B (secondary):** `subscribeHabitCheckins` at `src/lib/realtimeBridge.ts:50-83` — simpler single-event channel that matches what `subscribeChatList` actually needs (one `.on('*', ...)`, invalidate on any payload).

**Imports pattern (top of file, lines 15-17 — already there):**
```typescript
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
```

**Refcount registry header (already there, lines 19-44):**
```typescript
type Unsubscribe = () => void;

interface RegistryEntry {
  refCount: number;
  teardown: () => void;
}

const registry = new Map<string, RegistryEntry>();

function releaseSubscription(channelName: string) {
  const entry = registry.get(channelName);
  if (!entry) return;
  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.teardown();
    registry.delete(channelName);
  }
}
```

**Closest "single-channel single-event invalidate" template — `subscribeHabitCheckins` (lines 50-83):**
```typescript
export function subscribeHabitCheckins(
  queryClient: QueryClient,
  userId: string,
  today: string,
): Unsubscribe {
  const channelName = `habit-checkins-${userId}`;
  const existing = registry.get(channelName);
  if (existing) {
    existing.refCount++;
    return () => releaseSubscription(channelName);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'habit_checkins', filter: `user_id=eq.${userId}` },
      (_payload) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.habits.overview(today) });
      },
    )
    .subscribe();

  registry.set(channelName, {
    refCount: 1,
    teardown: () => {
      void supabase.removeChannel(channel);
    },
  });

  return () => releaseSubscription(channelName);
}
```

**Multi-event/scope-filter reference — `subscribeChatRoom` (lines 148-216), excerpt of the channel construction (lines 164-206):**
```typescript
const filter = `${column}=eq.${channelId}`;

const channel = supabase
  .channel(channelName)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter },
    (payload: { new: { id?: string } & Record<string, unknown> }) => { /* ... */ },
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'messages', filter },
    () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(channelId) });
    },
  )
  .on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'messages', filter },
    (payload: { old?: { id?: string } | null }) => { /* ... */ },
  )
  .subscribe();

registry.set(channelName, {
  refCount: 1,
  teardown: () => {
    void supabase.removeChannel(channel);
  },
});

return () => releaseSubscription(channelName);
```

**What to copy vs change for `subscribeChatList`:**
- **Copy verbatim:** registry / refcount / teardown shape (`Unsubscribe`, `registry.get`, `releaseSubscription`, `supabase.removeChannel(channel)`), the `.subscribe()` chain, the `void queryClient.invalidateQueries({ queryKey: ... })` handler body.
- **Change:** channel name = `` `chat:list:${userId}` `` (CONTEXT.md §5; matches the dash/colon mix already established by `chat-${channelId}` and `chat-aux-${channelId}` — verify the exact separator convention with the planner — CONTEXT.md uses a colon, but in-file convention is dashes; recommend dash `chat-list-${userId}` for consistency unless planner overrides). The filter is OMITTED (no scope filter — global listener on `messages`). Use a SINGLE `.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, ...)` listener (not three; matches `subscribeHabitCheckins`'s single-event/single-handler shape because all three events invalidate the same key anyway). The handler body invalidates `queryKeys.chat.list(userId)`.

---

### 2. `src/hooks/useChatList.ts` — extend queryFn SELECTs + mount `subscribeChatList`

**Role:** hook / request-response + event-driven
**Analog A (mount pattern):** `src/hooks/useChatRoom.ts:222-225` — exact shape of the `useEffect` that mounts `subscribeChatRoom`.
**Analog B (existing SELECT shape):** `src/hooks/useChatList.ts:57-72, 79-94, 151-167` — current 3 SELECT branches that need extension.

**Existing SELECT branches in `useChatList.ts:57-72` (plan branch — same shape repeats at 79-94 dm and 151-167 group):**
```typescript
if (memberPlanIds.length > 0) {
  const { data: planMsgs } = await supabase
    .from('messages')
    .select('plan_id, body, created_at, sender_id')
    .not('plan_id', 'is', null)
    .in('plan_id', memberPlanIds)
    .order('created_at', { ascending: false });

  for (const msg of planMsgs ?? []) {
    const pid = msg.plan_id as string;
    if (!planMsgsMap.has(pid)) planMsgsMap.set(pid, []);
    planMsgsMap.get(pid)!.push({
      body: msg.body as string,
      created_at: msg.created_at as string,
      sender_id: msg.sender_id as string,
    });
  }
}
```

**Existing `MsgEntry` type at line 18:**
```typescript
type MsgEntry = { body: string; created_at: string; sender_id: string };
```

**Existing item-emit assignment at lines 184, 206, 226:**
```typescript
// line 184 (plan)
lastMessage: latest.body,
// line 206 (dm)
lastMessage: latest.body,
// line 226 (group)
lastMessage: latest?.body ?? 'No messages yet',
```

**Realtime subscription mount template — copy verbatim from `useChatRoom.ts:222-225`:**
```typescript
useEffect(() => {
  if (!channelId) return;
  return subscribeChatRoom(queryClient, { channelId, column: filterColumn });
}, [queryClient, channelId, filterColumn]);
```

**What to copy vs change for `useChatList.ts`:**
- **Copy verbatim (mount):** the `useEffect` body shape — return the unsubscribe directly from the effect; guard on the keying identifier; include `queryClient` and the keying id in the dependency array.
- **Change (mount):** `channelId` → `userId`; gate on `if (!userId) return;`; call `subscribeChatList(queryClient, userId)`. Dep array: `[queryClient, userId]`. Import `subscribeChatList` from `@/lib/realtimeBridge` (matches the existing `subscribeChatRoom`/`subscribeChatAux` import on `useChatRoom.ts:23`).
- **Copy verbatim (SELECT):** the chainable `from().select().not().in().order()` shape and the `for (const msg of ... ?? [])` loop on lines 57-72, 79-94, 151-167.
- **Change (SELECT):** widen `.select(...)` to include `message_type, image_url, poll_id` in all three branches (CONTEXT.md §3); widen `MsgEntry` at line 18 to carry those fields plus `sender_first_name: string | null` (sourced from a profiles join — current code joins profiles separately for DM at line 115-118, so adopt the same per-row pattern OR a single batched profile fetch). For polls, add the small follow-up SELECT against `polls(id, question)` keyed by the latest poll_id per chat (CONTEXT.md tentative plan).
- **Change (emit):** replace `lastMessage: latest.body` with a per-kind formatter at lines 184/206/226 that produces `lastMessage: string` (preview text only, no icon — UI handles the icon); also emit the two new fields `lastMessageKind` and `lastMessageSenderName` from the type extension (see §6 below).

---

### 3. `src/hooks/useChatRoom.ts` — amend `onSettled` on `sendMessageMutation`, `sendImageMutation`, `sendPollMutation`

**Role:** hook / CRUD mutation
**Analog A (canonical non-empty `onSettled`):** `src/hooks/useHabits.ts:80-82` — single-key invalidate.
**Analog B (multi-key invalidate):** `src/hooks/usePlans.ts:217-223` — fans out to three keys.
**Analog C (file's own existing non-empty `onSettled`):** none in `useChatRoom.ts` today — all three send mutations have empty bodies. Use Analog A/B as the model.

**Current empty `onSettled` at `useChatRoom.ts:389-392` (sendMessage):**
```typescript
onSettled: () => {
  // No-op: Realtime INSERT (subscribeChatRoom) reconciles the optimistic row by id.
},
```

**Current empty `onSettled` at `useChatRoom.ts:454-456` (sendImage):**
```typescript
onSettled: () => {
  // No-op: Realtime INSERT reconciles by id.
},
```

**Current `sendPollMutation` at `useChatRoom.ts:463-490`** — has NO `onMutate`, NO `onError`, NO `onSettled` (entirely missing). Today this would fail the `mutationShape` gate unless exempted. CONTEXT.md says "Update mutationShape regression gate to allow the new non-empty `onSettled` bodies for widget mutations" — the planner should verify whether `sendPollMutation` is currently passing the gate (likely via an unwritten exemption marker — read the file around line 463 in the FIRST plan task). If it's failing, the fix is to add `// @mutationShape: no-optimistic` directly above the `useMutation({` line OR adopt the full Pattern 5 shape.

**Canonical single-key invalidate — `useHabits.ts:80-82`:**
```typescript
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.habits.overview(today) });
},
```

**Canonical multi-key invalidate — `usePlans.ts:217-223`:**
```typescript
onSettled: (_data, _err, input) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.plans.list(userId ?? '') });
  void queryClient.invalidateQueries({ queryKey: queryKeys.plans.detail(input.planId) });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.home.upcomingEvents(userId ?? ''),
  });
},
```

**What to copy vs change:**
- **Copy verbatim:** the `void queryClient.invalidateQueries({ queryKey: ... })` shape; the multi-key fan-out shape from `usePlans.ts`.
- **Change for `sendMessage` (text)** at line 389-391: body becomes a single invalidate against `queryKeys.chat.list(currentUserId)`. Keep the explanatory comment ("Realtime-only reconciliation for messages cache; list invalidate for cross-screen freshness"). Per CONTEXT.md §4, do NOT add `chat.messages(channelId)` here — text optimistic shape matches canonical, Realtime is enough.
- **Change for `sendImage`** at line 454-456: body becomes TWO invalidates — `chat.messages(channelId)` AND `chat.list(currentUserId)`. Belt-and-braces for the 70% opacity stickiness when Realtime echo is missed.
- **Change for `sendPoll`** at line 463-490: depending on the gate state — either add the full Pattern 5 shape (`onMutate`+`onError`+`onSettled`) and put the two invalidates in `onSettled`, or keep the no-optimistic exemption and add an `onSuccess: () => { ...invalidates }` block. The cleanest path per CONTEXT.md is to add a `// @mutationShape: no-optimistic` marker above the `useMutation({` and an `onSuccess` body with the two invalidates. Verify with planner.

---

### 4. `src/hooks/useChatTodos.ts` — extend existing `onSettled` blocks to invalidate `chat.list(userId)`; also flip `void refetch()` → `await refetch()` in `ChatRoomScreen.tsx:588`

**Role:** hook / CRUD mutation (`useChatTodos.ts` already has non-empty `onSettled` — just extend)
**Analog A (in-file twin):** `src/hooks/useChatTodos.ts:71-79` (sendMutation's `onSettled`).
**Analog B (in-file twin):** `src/hooks/useChatTodos.ts:101-110` (completeMutation's `onSettled`).

**Existing `onSettled` at `useChatTodos.ts:71-79`:**
```typescript
onSettled: (data) => {
  // Invalidate the newly created list's chatList key (best-effort).
  const newListId = (data as string | null) ?? null;
  if (newListId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.todos.chatList(newListId) });
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.todos.fromChats(todayLocal()) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
},
```

**Existing `onSettled` at `useChatTodos.ts:101-110`:**
```typescript
onSettled: (_data, _err, input) => {
  if (input?.listId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.todos.chatList(input.listId) });
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.todos.fromChats(todayLocal()) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.home.all() });
},
```

**Existing `void refetch()` site at `ChatRoomScreen.tsx:582-591`:**
```typescript
onSend={async (args) => {
  const result = await sendChatTodo(args);
  if (!result.error) {
    // sendChatTodo writes the parent 'todo' message via the RPC; the
    // existing useChatRoom realtime subscription surfaces it, then the
    // lazy-fetch effect above resolves the list + items for the bubble.
    void refetch();
  }
  return result;
}}
```

**What to copy vs change:**
- **Copy verbatim:** the in-file shape — `void queryClient.invalidateQueries({ queryKey: ... })` lines stacked.
- **Change in `useChatTodos.ts:71-79`:** append `void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) })` — note: the hook currently does NOT take `userId`. The planner must add a `userId` arg (either via `useAuthStore` selector inside the hook — matches the convention in `useChatList.ts:285` — or via a hook arg; the auth-store path is least intrusive).
- **Change in `useChatTodos.ts:101-110`:** same addition (append `chat.list(userId)` invalidate).
- **Change in `ChatRoomScreen.tsx:582-591`:** `void refetch()` → `await refetch()`. The lambda is already `async`; user accepts the ~500ms latency per CONTEXT.md §2 (todo bubble row).
- **Also change:** the hook also needs to receive (or compute) the `channelId` to invalidate `chat.messages(channelId)` per CONTEXT.md §4 row "sendChatTodo". Pass as a hook arg, OR pass `chatScope` (already a CONTEXT.md type) and derive `channelId` inside the hook with the same `planId ?? dmChannelId ?? groupChannelId` precedence used by `useChatRoom.ts:74`.

---

### 5. `src/components/chat/ChatListRow.tsx` — refactor preview rendering at lines 239-241

**Role:** component / render
**Analog A (in-file Ionicons placement next to text in the same Row 2 layout):** `ChatListRow.tsx:242-253` (the existing muted/badge conditional in row2 — Ionicon `name="notifications-off-outline" size={14}` next to `<Text>{item.lastMessage}</Text>` in the same `flexDirection: 'row'` parent).
**Analog B (Ionicons size/color convention for inline-with-text):** `ChatTodoBubble.tsx:227` (`<Ionicons name="checkmark" size={14} color={accent} />`).
**Analog C (Ionicons size for chat surfaces):** `SendBar.tsx:323` (`<Ionicons name="image-outline" size={22} color={colors.text.secondary} />` — but this is button-sized; for inline-with-text use size 14 from Analogs A/B).

**Current preview render at `ChatListRow.tsx:238-254`:**
```tsx
<View style={styles.row2}>
  <Text style={[styles.preview, item.hasUnread && styles.previewUnread]} numberOfLines={1}>
    {item.lastMessage}
  </Text>
  {item.isMuted ? (
    <Ionicons
      name="notifications-off-outline"
      size={14}
      color={colors.text.secondary}
      style={styles.mutedIcon}
    />
  ) : item.unreadCount > 0 ? (
    <View style={styles.unreadBadge}>
      <Text style={styles.unreadBadgeText}>{badgeLabel}</Text>
    </View>
  ) : null}
</View>
```

**Existing `styles.preview` / `styles.previewUnread` at lines 117-127:**
```typescript
preview: {
  fontSize: FONT_SIZE.sm,
  fontFamily: FONT_FAMILY.body.regular,
  color: colors.text.secondary,
  flex: 1,
  marginRight: SPACING.sm,
},
previewUnread: {
  color: colors.text.primary,
  fontFamily: FONT_FAMILY.body.medium,
},
```

**Existing `styles.row2` at lines 112-116 (the parent that will host the new icon+text composition):**
```typescript
row2: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
```

**What to copy vs change:**
- **Copy verbatim:** the `<View style={styles.row2}>` flexbox shape; the `<Ionicons ... size={14} color={colors.text.secondary} />` shape from line 243-248 (the mute icon — size 14, secondary color); the `numberOfLines={1}` truncation on the preview Text.
- **Change:** introduce a NEW inner horizontal `<View>` that wraps the optional icon + sender prefix + per-kind text (CONTEXT.md §2). This inner View REPLACES the current `<Text style={[styles.preview, ...]}>` at line 239-241. The mute icon / unread badge conditional at lines 242-253 stays UNCHANGED in its position (it's the trailing right-aligned element).
- **Icon mapping:** introduce `getPreviewIcon(kind: MessageType): keyof typeof Ionicons.glyphMap | null` returning `'image-outline'` / `'stats-chart-outline'` / `'checkbox-outline'` / `null` per CONTEXT.md §2. Co-locate inside the same file unless reused elsewhere.
- **Italic for deleted:** split the `<Text>` into two children (sender prefix upright, preview body italic) only on `lastMessageKind === 'deleted'`. Use `fontStyle: 'italic'` on the second `<Text>`'s `style` prop. The sender prefix stays in `styles.preview` family; the italic preview body inherits the same `styles.preview` / `styles.previewUnread` PLUS adds `fontStyle: 'italic'`.
- **Icon spacing:** between icon and text, use `marginRight: SPACING.xs` (matches the existing token weight). Do not introduce new tokens.

---

### 6. `src/types/chat.ts` — extend `ChatListItem`

**Role:** type-only
**Analog:** the existing `ChatListItem` declaration at `src/types/chat.ts:33-44` (the file itself).

**Existing declaration:**
```typescript
export interface ChatListItem {
  id: string;
  type: 'plan' | 'dm' | 'group';
  title: string;
  avatarUrl?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  hasUnread: boolean;
  unreadCount: number;
  isMuted: boolean;
  birthdayPersonId?: string | null;
}
```

**What to copy vs change:**
- **Copy verbatim:** the interface shape, optional-vs-required convention (mandatory fields are unmodified types; optional flags use `?:` like `birthdayPersonId?`).
- **Change:** append two REQUIRED fields per CONTEXT.md §3:
  ```typescript
  lastMessageKind: MessageType;
  lastMessageSenderName: string | null; // 'You' for own messages, first_name for others, null if no messages
  ```
  `MessageType` is already exported from line 1 of the same file. The required-not-optional choice mirrors CONTEXT.md ("`lastMessageSenderName: string \| null` — `null` only if the chat has no messages").

---

### 7. `src/hooks/README.md` — document tiered `onSettled` policy

**Role:** doc
**Analog A:** the existing Pattern 5 bullet at `src/hooks/README.md:14`.
**Analog B:** the "Hybrid Patterns (sanctioned exceptions)" block at `src/hooks/README.md:43-47`.

**Existing Pattern 5 bullet (line 14):**
```markdown
- **Mutations:** ALWAYS follow the canonical Pattern 5 shape (`mutationFn` + `onMutate` snapshot + `onError` rollback + `onSettled` invalidate). The `mutationShape.test.ts` regression gate enforces this. Exempt only with `// @mutationShape: no-optimistic` directly above the `useMutation({` block (use for create/destroy with server side effects — e.g., `usePlans.createPlan`, `usePlanPhotos.uploadPhoto`, `useChatRoom.sendPoll`, `useChatTodos.*`).
```

**Existing Hybrid Patterns block (lines 43-47):**
```markdown
## Hybrid Patterns (sanctioned exceptions)

- **`useStatus` (Wave 6):** TanStack Query owns the fetch, but `useStatusStore.currentStatus` mirrors the value for the out-of-React-tree notification dispatcher. The mutation's `onMutate` writes to BOTH `setQueryData` and `useStatusStore.setCurrentStatus`; `onError` restores from both. The auth bridge clears both on sign-out.
- **`useSpotlight` (Wave 7):** Pure synchronous derivation (`useMemo`) PLUS a cache anchor (`useQuery` with `initialData`). The derivation runs on every render of any of the 5 source caches; `setQueryData` mirrors into `queryKeys.home.spotlight(userId)` so future direct consumers can participate in the canonical taxonomy.
- **`useChatRoom` (Wave 8):** `subscribeChatRoom` owns the messages-table Realtime subscription. The reactions/poll-votes inline subscription is encapsulated by `subscribeChatAux` because those tables have no server-side scope column. `lastPollVoteEvent` stays in local `useState` — it's a fire-and-forget signal to `PollCard`, not server state.
```

**What to copy vs change:**
- **Copy verbatim:** the markdown heading style (`### **<name> (Wave N):**`-styled bullets under a `## Hybrid Patterns` heading); the prose tone (mechanism + reason + cross-reference); the inline code-fence convention for hook names and key factories.
- **Change:** insert a new subsection (recommended title: `### Tiered onSettled policy (Phase 32)`) UNDER the Pattern 5 bullet at line 14 (NOT under Hybrid Patterns — this is a Pattern 5 elaboration). Include CONTEXT.md §4's pithy rule verbatim, then a 3-row table (text / image / poll / todo) showing which mutation invalidates which key — copy the markdown table from CONTEXT.md §4 since it's already authoritative. End with a concrete example per tier:
  - **Tier A (Realtime-only):** show `sendMessage`'s 3-line invalidate body (chat.list only).
  - **Tier B (Belt-and-braces):** show `sendImage`'s 4-line body (chat.messages + chat.list).

---

### 8. Tests — extend the four existing test files

**Role:** test
**Analogs:** the four test files themselves, listed below with one representative excerpt each.

#### 8a. `src/lib/__tests__/realtimeBridge.test.ts` — add `subscribeChatList` describe block

**Analog (existing `subscribePollVotes` describe block, lines 163-222):**
```typescript
describe('realtimeBridge.subscribePollVotes', () => {
  let qc: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCapturedHandler = null;
    _resetRealtimeBridgeForTests();
    mockChannel.mockClear();
    mockOn.mockClear();
    mockRemoveChannel.mockClear();
    qc = new QueryClient();
    invalidateSpy = jest.spyOn(qc, 'invalidateQueries').mockResolvedValue();
  });

  it('subscribes to poll-votes-${pollId} with a poll_id eq filter', () => {
    subscribePollVotes(qc, 'p1');
    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockChannel).toHaveBeenCalledWith('poll-votes-p1');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'poll_votes',
        filter: 'poll_id=eq.p1',
      }),
      expect.any(Function),
    );
  });

  it('dedups two subscriptions to the same pollId into ONE supabase.channel call', () => { /* ... */ });
  it.each(['INSERT', 'UPDATE', 'DELETE'] as const)(
    'invalidates polls.poll on %s payload',
    (eventType) => { /* ... */ },
  );
  it('tears down only after all subscribers have unsubscribed', () => { /* ... */ });
});
```

**What to copy vs change:** add a new `describe('realtimeBridge.subscribeChatList', ...)` block immediately after the `subscribePollVotes` block (line 223 area). Copy the 5 test names verbatim, swap `subscribePollVotes(qc, 'p1')` → `subscribeChatList(qc, 'u1')`, swap channel name assertion `'poll-votes-p1'` → `'chat-list-u1'` (or whatever convention the planner picks), swap filter assertion to be ABSENT (the chat-list subscription has no filter — assert `mockOn` is called with an object that does NOT include a `filter` key, OR omit the filter assertion entirely), and swap invalidate-key to `queryKeys.chat.list('u1')`. The `.each(['INSERT','UPDATE','DELETE'])` block matches Phase 32 exactly because all 3 events invalidate the same key.

#### 8b. `src/hooks/__tests__/useChatList.test.ts` — assert new fields + subscribe mount

**Analog (existing populated-cache assertion, lines 70-78):**
```typescript
it('queryKeys.chat.list(userId) is populated after queryFn resolves', async () => {
  const { wrapper, client } = createTestQueryClient();
  const { result } = renderHook(() => useChatList(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  const cached = client.getQueryData(queryKeys.chat.list('u1'));
  expect(cached).toBeDefined();
  expect(Array.isArray(cached)).toBe(true);
});
```

**Analog (subscribe mock pattern from `useChatRoom.test.ts:77-86`):**
```typescript
const mockChatRoomUnsubscribe = jest.fn();
const mockAuxUnsubscribe = jest.fn();
const mock_subscribeChatRoom = jest.fn(() => mockChatRoomUnsubscribe);
const mock_subscribeChatAux = jest.fn(() => mockAuxUnsubscribe);
jest.mock('@/lib/realtimeBridge', () => ({
  subscribeChatRoom: (...args: unknown[]) => mock_subscribeChatRoom(...args),
  subscribeChatAux: (...args: unknown[]) => mock_subscribeChatAux(...args),
  _resetRealtimeBridgeForTests: jest.fn(),
}));
```

**What to copy vs change:**
- Add a `jest.mock('@/lib/realtimeBridge', ...)` block mirroring `useChatRoom.test.ts:80-86`, adding `subscribeChatList` to the mocked exports.
- Add a new test: `'subscribeChatList is called on mount; unsubscribe runs on unmount'` — copy the body shape from `useChatRoom.test.ts:117-129` verbatim, swap helper name.
- Per CONTEXT.md "cover new fields across all 6 message kinds": extend the existing `makeChain` factory to return rows that include `message_type`, `image_url`, `poll_id`, and a profiles join shape. Either provide 6 separate tests (one per kind) or one parametrized `.each()` block that asserts `chatList[0].lastMessageKind` matches the input message_type and `chatList[0].lastMessage` matches the per-kind preview from CONTEXT.md §2.

#### 8c. `src/hooks/__tests__/useChatRoom.test.ts` — assert invalidate calls on send mutations

**Analog (existing populated-cache assertion, lines 131-141):**
```typescript
it('cache key queryKeys.chat.messages(channelId) is populated after queryFn resolves', async () => {
  const { wrapper, client } = createTestQueryClient();
  const { result } = renderHook(
    () => useChatRoom({ planId: 'p1', dmChannelId: undefined, groupChannelId: undefined }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  const cached = client.getQueryData(queryKeys.chat.messages('p1'));
  expect(cached).toBeDefined();
  expect(Array.isArray(cached)).toBe(true);
});
```

**Analog (`invalidateQueries` spy pattern from `useChatTodos.test.ts:138-161`):**
```typescript
it('sendChatTodo onSettled invalidates todos.fromChats + home.all() + the new listId chatList key', async () => {
  mockRpc.mockResolvedValueOnce({ data: 'list-new', error: null });
  const { client, wrapper } = createTestQueryClient();
  const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
  const { result } = renderHook(() => useChatTodos(), { wrapper });
  await act(async () => {
    await result.current.sendChatTodo({ /* ... */ });
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: queryKeys.todos.chatList('list-new'),
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: queryKeys.todos.fromChats('2026-05-13'),
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: queryKeys.home.all(),
  });
});
```

**What to copy vs change:** Add three new tests, one per send mutation:
- `'sendMessage onSettled invalidates chat.list(userId) (and not chat.messages)'`
- `'sendImage onSettled invalidates chat.messages(channelId) AND chat.list(userId)'`
- `'sendPoll onSuccess/onSettled invalidates chat.messages(channelId) AND chat.list(userId)'`

Each copies the spy + `act(async () => result.current.sendXxx(...))` + `expect(invalidateSpy).toHaveBeenCalledWith(...)` shape verbatim. For sendImage, the test will need to mock `uploadChatMedia` to resolve (already mocked at lines 73-75 of the existing test file).

#### 8d. `src/hooks/__tests__/useChatTodos.test.ts` — extend existing tests

**Analog:** the existing two tests at lines 138-177 already assert `todos.fromChats` + `home.all()` invalidates. Just add `chat.list(userId)` to the assertion list.

**Existing test at lines 138-161:**
```typescript
it('sendChatTodo onSettled invalidates todos.fromChats + home.all() + the new listId chatList key', async () => {
  // ... see above ...
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: queryKeys.todos.chatList('list-new'),
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: queryKeys.todos.fromChats('2026-05-13'),
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: queryKeys.home.all(),
  });
});
```

**What to copy vs change:** Append one new `expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.chat.list('u1') })` line. If `useChatTodos` now requires a `userId` arg (or pulls from useAuthStore), add a `jest.mock('@/stores/useAuthStore', ...)` mock copy of the one in `useChatList.test.ts:42-45` so the hook sees a session. Also add a `chat.messages(channelId)` assertion if the hook is updated to take channelId / chatScope per CONTEXT.md §4.

---

### 9. `mutationShape.test.ts` — verify gate still passes (probably NO change needed)

**Role:** test (regression gate, static file walk)
**Analog:** the file itself at `src/hooks/__tests__/mutationShape.test.ts:19, 70-101`.

**The REQUIRED array at line 19:**
```typescript
const REQUIRED = ['mutationFn', 'onMutate', 'onError', 'onSettled'] as const;
```

**The enforcement loop at lines 77-100:**
```typescript
it.each(files)('every useMutation in %s follows the canonical shape', (file) => {
  const src = fs.readFileSync(file, 'utf8');
  const blocks = extractMutationBlocks(src);
  if (blocks.length === 0) return;
  for (const block of blocks) {
    if (block.exempt) continue;
    for (const required of REQUIRED) {
      expect({ /* diagnostic shape */ }).toEqual(
        expect.objectContaining({ missing: expect.any(String) }),
      );
      expect(block.body).toContain(required);
    }
  }
});
```

**What to copy vs change:** Nothing in the gate itself. The gate already requires only the PRESENCE of `onSettled` (not emptiness). The non-empty `onSettled` bodies for `sendMessage`, `sendImage`, and `sendPoll` will pass the gate unchanged. ACTION FOR PLANNER: include a "verify gate passes" task in the plan (run `npx jest --testPathPatterns="mutationShape" --no-coverage` after each mutation amendment). If `sendPollMutation` is the only mutation in `useChatRoom.ts` currently failing the gate (it has no `onMutate` / `onError` / `onSettled` — lines 463-490), the planner must either add the `// @mutationShape: no-optimistic` marker above `useMutation({` at line 463, or grow the full Pattern 5 shape. CONTEXT.md says "Allow non-empty `onSettled` for named widget mutations" — interpret this as "ensure the gate is still passing after the amendments," NOT as "rewrite the gate's REQUIRED array."

---

## Shared Patterns

### Refcounted Supabase channel subscription
**Source:** `src/lib/realtimeBridge.ts:19-44, 50-83`
**Apply to:** `subscribeChatList` (new — Phase 32 §3)
```typescript
const existing = registry.get(channelName);
if (existing) {
  existing.refCount++;
  return () => releaseSubscription(channelName);
}
const channel = supabase.channel(channelName).on(...).subscribe();
registry.set(channelName, {
  refCount: 1,
  teardown: () => { void supabase.removeChannel(channel); },
});
return () => releaseSubscription(channelName);
```

### `useEffect`-mounted realtime subscription with key + cleanup
**Source:** `src/hooks/useChatRoom.ts:222-225`
**Apply to:** `useChatList.ts` (new mount of `subscribeChatList`)
```typescript
useEffect(() => {
  if (!channelId) return;
  return subscribeChatRoom(queryClient, { channelId, column: filterColumn });
}, [queryClient, channelId, filterColumn]);
```

### Canonical `onSettled` invalidate body
**Source:** `src/hooks/useHabits.ts:80-82` (single key) + `src/hooks/usePlans.ts:217-223` (multi-key)
**Apply to:** all three send mutations in `useChatRoom.ts` and both mutations in `useChatTodos.ts` (extend, not replace)
```typescript
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(currentUserId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(channelId) });
},
```

### Ionicons inline-with-text size + color
**Source:** `src/components/chat/ChatListRow.tsx:242-248` + `ChatTodoBubble.tsx:227`
**Apply to:** the new preview icon in `ChatListRow.tsx` (Phase 32 §5)
```tsx
<Ionicons name={previewIcon} size={14} color={colors.text.secondary} />
```

### Test mock for realtimeBridge subscribe helpers
**Source:** `src/hooks/__tests__/useChatRoom.test.ts:77-86`
**Apply to:** `useChatList.test.ts` (assert mount/unmount)
```typescript
const mockChatRoomUnsubscribe = jest.fn();
const mock_subscribeChatRoom = jest.fn(() => mockChatRoomUnsubscribe);
jest.mock('@/lib/realtimeBridge', () => ({
  subscribeChatRoom: (...args: unknown[]) => mock_subscribeChatRoom(...args),
  // ... add subscribeChatList here for Phase 32
  _resetRealtimeBridgeForTests: jest.fn(),
}));
```

### `invalidateQueries` spy assertion
**Source:** `src/hooks/__tests__/useChatTodos.test.ts:138-161`
**Apply to:** new tests in `useChatRoom.test.ts` for send mutations
```typescript
const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
await act(async () => { await result.current.sendXxx(...); });
expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.chat.list('u1') });
```

---

## No Analog Found

None. Every file modification in this phase has a direct in-codebase analog, often in the same file being modified (the strongest possible match quality). Phase 32 is purely additive/refining over Phase 31's already-established Pattern 5 + realtimeBridge taxonomy.

---

## Metadata

**Analog search scope:** `src/lib/`, `src/hooks/`, `src/components/chat/`, `src/screens/chat/`, `src/types/`, `src/hooks/__tests__/`, `src/lib/__tests__/`
**Files scanned:** 12 source files read in full or in relevant ranges
**Pattern extraction date:** 2026-05-13
**Project skill checked:** `.claude/skills/ui-ux-pro-max/SKILL.md` (UI/UX design tool — not invoked for this pattern-mapping pass since CONTEXT.md §1 already locks the icon library + per-kind text/icon mapping)

## PATTERN MAPPING COMPLETE
