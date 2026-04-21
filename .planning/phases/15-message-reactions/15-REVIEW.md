---
phase: 15-message-reactions
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/components/chat/MessageBubble.tsx
  - src/components/chat/ReactionsSheet.tsx
  - src/hooks/useChatRoom.ts
  - src/screens/chat/ChatRoomScreen.tsx
  - src/types/database.ts
  - src/utils/aggregateReactions.ts
  - tests/unit/aggregateReactions.test.ts
  - tests/unit/useChatRoom.reactions.test.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The Phase 15 message-reactions implementation is well-structured overall. The optimistic update pattern is sound, the aggregation utility is clean and well-tested, and the realtime dedup guards for own-user events are correct. The test coverage for pure state mutation logic is good.

Three areas need attention before shipping:

1. A **data-loss bug** in `addReaction` when the user switches emojis — the delete step can succeed while the insert fails, leaving the DB in an emoji-less state that the client rollback cannot recover.
2. **Stale closure reads** in `addReaction` and `removeReaction` that read `messages` state directly outside the `setMessages` callback, making snapshots potentially out-of-date under concurrent updates.
3. **Silent error swallowing** in `ReactionsSheet` — Supabase query errors are destructured but never surfaced, so the sheet can appear empty with no indication of failure.
4. The `database.ts` `messages` Row type is **materially out of sync** with the actual schema — `body` is marked non-nullable and four columns added in migration 0018 are missing entirely.

---

## Critical Issues

### CR-01: Reaction swap leaves DB emoji-less if insert fails after successful delete

**File:** `src/hooks/useChatRoom.ts:477-494`

**Issue:** In `addReaction`, when the user switches from one emoji to another, the code issues two sequential DB writes: a `delete` then an `insert`. If the `delete` succeeds but the `insert` fails, the client-side rollback correctly restores the pre-tap UI state, but the database now has no reaction at all for that user on that message. The user's original reaction is permanently gone from the DB while the UI shows it as still present — creating a persistent client/server split that only resolves on the next full fetch.

```typescript
// Current code (lines 477-494)
if (oldReaction) {
  await supabase           // ← fire-and-forget: error is not captured
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', currentUserId);
}
const { error: insertError } = await supabase
  .from('message_reactions')
  .insert({ message_id: messageId, user_id: currentUserId, emoji });

if (insertError) {
  // Rollback restores UI, but DB already lost the old emoji
  setMessages((prev) =>
    prev.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m))
  );
  return { error: insertError };
}
```

**Fix:** Either (a) capture and handle the delete error before proceeding to insert, or (b) use an upsert-based approach where the DB table has a unique constraint on `(message_id, user_id)` and you upsert the new emoji directly (requires schema support). The simplest safe fix is to check the delete error and abort early:

```typescript
if (oldReaction) {
  const { error: deleteError } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', currentUserId);

  if (deleteError) {
    // Rollback optimistic update; original reaction is still in DB
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m))
    );
    return { error: deleteError };
  }
}
const { error: insertError } = await supabase
  .from('message_reactions')
  .insert({ message_id: messageId, user_id: currentUserId, emoji });

if (insertError) {
  // At this point the delete succeeded but insert failed.
  // Re-insert the old reaction to restore DB consistency.
  if (oldReaction) {
    await supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: currentUserId,
      emoji: oldReaction.emoji,
    });
  }
  setMessages((prev) =>
    prev.map((m) => (m.id === messageId ? { ...m, reactions: preSnapshot } : m))
  );
  return { error: insertError };
}
```

Alternatively, model the swap as a single server-side RPC to make it atomic.

---

## Warnings

### WR-01: Stale closure — snapshot captured outside setMessages callback

**File:** `src/hooks/useChatRoom.ts:445` and `src/hooks/useChatRoom.ts:501`

**Issue:** Both `addReaction` and `removeReaction` read `messages` state directly to capture a pre-tap snapshot:

```typescript
// line 445
const preSnapshot = messages.find((m) => m.id === messageId)?.reactions ?? [];
// line 501
const preSnapshot = messages.find((m) => m.id === messageId)?.reactions ?? [];
```

`messages` here is the value captured in the closure at the time the async function was called. If a concurrent state update (e.g., an incoming realtime event) runs between the function call and this read, the snapshot may already be stale and the rollback would restore an incorrect state. React batches state updates, so this is a real risk when realtime events arrive during the async Supabase call.

**Fix:** Capture the snapshot inside a `setMessages` updater to guarantee it reads the latest state:

```typescript
let preSnapshot: MessageReaction[] = [];

setMessages((prev) => {
  const msg = prev.find((m) => m.id === messageId);
  preSnapshot = msg?.reactions ?? [];
  return prev; // no-op update just to read latest state
});

// Then use preSnapshot for the toggle check and rollback
```

Or refactor to pass the snapshot as a parameter obtained within a `setMessages` call before issuing the optimistic update.

---

### WR-02: ReactionsSheet silently swallows Supabase query errors

**File:** `src/components/chat/ReactionsSheet.tsx:56-83`

**Issue:** Both Supabase queries in `fetchRows` destructure only `data`, discarding the `error` field. If either query fails (network error, RLS denial, etc.), the sheet renders empty with no indication of failure:

```typescript
const { data: reactionsData } = await supabase   // error dropped
  .from('message_reactions')
  .select('emoji, user_id')
  .eq('message_id', messageId);

// ...

const { data: profilesData } = await supabase    // error dropped
  .from('profiles')
  .select('id, display_name, avatar_url')
  .in('id', userIds);
```

**Fix:** Check errors and set a failure state or surface an error message:

```typescript
const { data: reactionsData, error: reactionsFetchError } = await supabase
  .from('message_reactions')
  .select('emoji, user_id')
  .eq('message_id', messageId);

if (reactionsFetchError) {
  setLoading(false);
  // surface error to user or log it
  return;
}
```

---

### WR-03: database.ts messages Row type is materially out of sync with actual schema

**File:** `src/types/database.ts:299-308`

**Issue:** The `messages` table `Row` type was not updated when migration 0018 added several columns. The current definition has `body: string` (non-nullable) and is missing `image_url`, `reply_to_message_id`, `message_type`, and `poll_id`. The runtime code in `useChatRoom.ts` already handles these columns correctly via explicit casting, but TypeScript safety is lost and any future code generated from this type will be incorrect.

```typescript
// Current (lines 299-308) — outdated
messages: {
  Row: {
    id: string;
    plan_id: string | null;
    dm_channel_id: string | null;
    group_channel_id: string | null;
    sender_id: string;
    body: string;             // should be: string | null
    created_at: string;
    // missing: image_url, reply_to_message_id, message_type, poll_id
  };
```

**Fix:** Regenerate the type file from the live schema, or manually update the `Row`, `Insert`, and `Update` shapes to match `src/types/chat.ts`:

```typescript
messages: {
  Row: {
    id: string;
    plan_id: string | null;
    dm_channel_id: string | null;
    group_channel_id: string | null;
    sender_id: string;
    body: string | null;
    created_at: string;
    image_url: string | null;
    reply_to_message_id: string | null;
    message_type: string;
    poll_id: string | null;
  };
```

Also add the `message_reactions` table type alias at the bottom of the file alongside the existing `export type` aliases.

---

### WR-04: ReactionsSheet tab counts can drift out of sync with displayed rows

**File:** `src/components/chat/ReactionsSheet.tsx:90-93` and `111-113`

**Issue:** Tab labels are derived from the `reactions` prop (aggregated data passed by the parent) while tab content comes from `rows` (fetched fresh from Supabase). The two data sources are not kept in sync. If the parent component receives a real-time reaction update after the sheet opened, `reactions` (and therefore tab labels and counts) will update, but `rows` will not re-fetch because `fetchRows` only re-runs when `messageId` changes. This can produce tabs showing a count of 2 while the list shows only 1 row.

```typescript
// line 90 — tabs derived from prop, not from fetched rows
const tabs = [ALL_TAB, ...reactions.map((r) => r.emoji)];

// line 111-113 — tab count pulls from reactions prop
const count = tab === ALL_TAB
  ? rows.length                                        // from fetch
  : (reactions.find((r) => r.emoji === tab)?.count ?? 0);  // from prop
```

**Fix:** Derive both tabs and counts exclusively from `rows` once loaded, so both sources of truth agree:

```typescript
// After loading, compute tabs from rows directly
const emojiSet = [...new Set(rows.map((r) => r.emoji))];
const tabs = [ALL_TAB, ...emojiSet];

// Count from rows, not from reactions prop
const count = tab === ALL_TAB
  ? rows.length
  : rows.filter((r) => r.emoji === tab).length;
```

---

## Info

### IN-01: Reaction badge row JSX is duplicated verbatim between own and others branches

**File:** `src/components/chat/MessageBubble.tsx:311-331` and `385-405`

**Issue:** The reaction badge row rendering (~20 lines of JSX including the `TouchableOpacity`, `accessibilityLabel` logic, and emoji/count display) is copy-pasted identically into both the own-message branch and the others-message branch. The only difference is the `style` prop on the outer `View`. This creates two maintenance surfaces for any future changes to badge appearance or interaction.

**Fix:** Extract a `ReactionBadgeRow` sub-component that accepts an `alignSelf` or `isOwn` prop:

```typescript
function ReactionBadgeRow({
  reactions,
  isOwn,
  onPress,
}: {
  reactions: MessageReaction[];
  isOwn: boolean;
  onPress: () => void;
}) {
  if (reactions.length === 0) return null;
  return (
    <View style={[styles.reactionBadgeRow, !isOwn && styles.reactionBadgeRowOthers]}>
      {reactions.map((r) => (
        // ... badge rendering
      ))}
    </View>
  );
}
```

---

### IN-02: Missing type alias export for message_reactions in database.ts

**File:** `src/types/database.ts:770-790`

**Issue:** Phase 15 added the `message_reactions` table to the `Database` type but did not add a convenience `export type MessageReaction = Tables<'message_reactions'>` alias at the bottom of the file, inconsistent with the pattern used for all other tables (`Profile`, `Message`, `IouGroup`, etc.). Note: the `MessageReaction` name is already taken in `src/types/chat.ts` for a different shape; a distinct name like `MessageReactionRow` would be appropriate.

**Fix:**
```typescript
// Add to the type alias block at the bottom of database.ts
export type MessageReactionRow = Tables<'message_reactions'>;
```

---

### IN-03: useChatRoom reactions test file does not cover the toggle-off path

**File:** `tests/unit/useChatRoom.reactions.test.ts`

**Issue:** The `addReaction` tests cover: new emoji on empty message, incrementing an existing emoji, and switching emojis (one-emoji-per-user). However, the toggle-off path — tapping the same emoji the user already reacted with, which routes to `removeReaction` — is not exercised in the pure-function tests. The toggle detection (`isSameEmoji` at line 448 of `useChatRoom.ts`) is not testable from `applyAddReaction` alone since it short-circuits before reaching that function, but the test file has no coverage note explaining this gap.

**Fix:** Add a test that documents the toggle-off contract, or add a comment in the test file explicitly noting that the `isSameEmoji → removeReaction` path is covered by the `removeReaction` tests above.

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
