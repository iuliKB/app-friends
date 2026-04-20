# Domain Pitfalls — v1.5 Chat & Profile

**Domain:** React Native + Expo Managed + Supabase — chat media, reactions, threading, polls, profile rework
**Researched:** 2026-04-20
**Confidence:** HIGH for stack-specific issues (drawn from codebase history); MEDIUM for Supabase Realtime quota math

---

## 1. Image Upload in Chat

### CRITICAL — Pitfall 1A: Skipping Compression Before Upload

**What goes wrong:** User picks a 12 MP photo from their library (typically 4–8 MB). It uploads raw to Supabase Storage, immediately eating into the 1 GB free-tier quota. With 10 users each sending 5 photos a day, you exhaust the quota in under a week.

**Why it happens:** expo-image-picker returns a local URI and developers reach for the ArrayBuffer pattern (which already exists in this codebase for plan covers) without adding a compression step first.

**Consequences:** Storage quota exhausted; Storage egress costs spike (Supabase charges for downloads too); slow uploads on mobile connections cause timeouts.

**Prevention:**
1. Run `expo-image-manipulator` before the ArrayBuffer conversion:
   - Resize to max 1280px on the long edge
   - Compress to JPEG quality 0.75
   - Target < 300 KB per chat image
2. The existing fetch().arrayBuffer() pattern in the plan cover upload is the correct final step — compression just goes before it.
3. Enforce a 5 MB hard limit on the picker side (`quality: 0.7` in `launchImageLibraryAsync`), then compress further after.

**Warning signs:** Plan cover uploads already work but feel slow → the same code path without compression will feel worse for chat.

**Phase to address:** Media sharing phase (whichever phase adds image messages). Do not defer compression to a later pass — once images are in Storage at full resolution, you cannot reclaim the quota.

---

### CRITICAL — Pitfall 1B: FlatList Memory Pressure from Inline Images

**What goes wrong:** The chat FlatList renders message bubbles. Adding `<Image>` or `<expo-image>` components inline causes memory pressure that accumulates as the user scrolls, leading to OOM crashes on low-end Android devices and visible jank on all devices. A known issue (expo/expo#24824, expo/expo#37561) documents massive framedrops from `expo-image` inside FlatList.

**Why it happens:** Every rendered cell holds decoded bitmap memory. FlatList with `inverted` already has higher overhead (inverted prop uses CSS transform on Android which costs extra compositing). Adding large bitmaps to each row multiplies that cost.

**Consequences:** 30-40 FPS drop on Android in dev; crashes in production; keyboard stutter when the image row is on screen.

**Prevention:**
- Use `expo-image` (not RN's `Image`) with `cachePolicy="memory-disk"` — it pools decoded bitmaps.
- Fix display size via `contentFit="cover"` at a capped size (e.g., 240×180). Never render at pick resolution.
- Set `removeClippedSubviews={true}` and `windowSize={5}` on the FlatList (currently neither is set in `ChatRoomScreen`).
- For mixed text+image cells, use `React.memo` on `MessageBubble` and ensure stable `keyExtractor`.
- Do NOT use `FlashList` as a drop-in — the inverted FlatList pattern in this codebase uses index-based grouping logic (`isFirstInGroup`) that assumes a stable `messages` array; FlashList's recycling breaks that assumption without significant rework.

**Warning signs:** FlatList `windowSize` is not set in `ChatRoomScreen.tsx` → add it before adding image cells.

**Phase to address:** Media sharing phase, before any image cells are rendered.

---

### MODERATE — Pitfall 1C: KeyboardAvoidingView Height Breaks When Image Preview Is Shown

**What goes wrong:** A common pattern for image-send UX is to show a preview strip above the SendBar after picking. This adds height to the input area. `KeyboardAvoidingView` with `behavior="padding"` calculates offset once at mount; adding a preview view changes layout height without recalculating the keyboard offset, causing the preview to be obscured by the keyboard on iOS.

**Why it happens:** `keyboardVerticalOffset={headerHeight}` (already in `ChatRoomScreen`) accounts for the native header but not for the preview strip's dynamic height. On Android `behavior="height"` is already used which avoids this, but iOS `behavior="padding"` is sensitive to layout changes below the KAV.

**Consequences:** Preview strip hidden under keyboard; user cannot see the image they selected.

**Prevention:**
- Track preview-strip height with `onLayout` and add it to `keyboardVerticalOffset`.
- Or restructure: put the preview strip inside the SendBar component so KAV sees a single input region.
- Do not attempt `react-native-keyboard-controller` — it requires a custom native module, which is incompatible with Expo Go managed workflow.

**Warning signs:** You will see this immediately on iOS Simulator when the preview appears — the keyboard covers part of it.

**Phase to address:** Media sharing phase, when preview strip is first implemented.

---

### MINOR — Pitfall 1D: Supabase Storage Public vs Signed URLs for Chat Images

**What goes wrong:** Making the chat-images bucket public means anyone with a URL can view the image forever. Using signed URLs (expiry 1h) breaks if the message is scrolled into view after the URL expires (common for old messages).

**Why it happens:** Developers reach for `getPublicUrl()` (simpler) or short-lived signed URLs without thinking through the access model.

**Consequences:** Either security hole (public bucket, friends-only app) or broken images in chat history.

**Prevention:**
- Create the bucket as **private**.
- Store only the storage path in the messages table (not the full URL).
- Generate signed URLs on-the-fly when rendering, with a long TTL (e.g., 1 week). At 3–15 users per group, the RLS already limits who can request a signed URL — the RLS policy on the bucket restricts `storage.objects` to users in the same plan/DM channel.
- Cache the signed URL in component state or a ref keyed by storage path.

**Phase to address:** Media sharing phase, during schema design for image_url storage.

---

## 2. Message Reactions

### CRITICAL — Pitfall 2A: No Database Unique Constraint → Ghost Duplicates

**What goes wrong:** A user taps a reaction. The optimistic update fires. The INSERT is in-flight. User taps again (impatient or double-tap). Two INSERTs reach Supabase. Both succeed. The user now has two identical reactions and the UI shows count=2 for their own tap.

**Why it happens:** Without a `UNIQUE(message_id, user_id, emoji)` constraint, the database accepts all duplicates. Client-side "is request pending?" flags can fail if the user switches tabs and returns.

**Consequences:** Reaction counts inflate permanently; removing one row doesn't clean the ghost; Realtime broadcasts the duplicate INSERT and all subscribers see a count flicker.

**Prevention:**
- Add `UNIQUE(message_id, user_id, emoji)` to the `message_reactions` table in the migration.
- Use an upsert (`INSERT ... ON CONFLICT DO NOTHING`) from the client — not a plain INSERT — so idempotency is guaranteed regardless of double-taps.
- Toggle logic: if user already has that reaction, DELETE it; otherwise UPSERT. Never INSERT without conflict handling.

**Warning signs:** If you see the same reaction appear twice for one user during testing → constraint is missing.

**Phase to address:** Reactions schema migration (first reactions phase).

---

### CRITICAL — Pitfall 2B: Realtime Message Budget Multiplier from Reactions Table

**What goes wrong:** Each Supabase Postgres Change event is counted once **per subscriber**. The free tier gives 2 million messages/month. The messages table already subscribes all users in a chat room. Adding a `message_reactions` table subscription means: for every reaction INSERT/DELETE, Supabase sends an event to every subscriber in the room. For a group of 10 people in 3 active chats: 10 subscribers × N reactions per day × 3 chats = the budget evaporates fast.

**Why it happens:** The per-subscriber multiplier is documented but easy to underestimate. Quote from Supabase docs: "if a database change occurs and 5 clients listen to that event, it counts as 5 messages."

**Consequences:** Realtime quota exhausted → live chat stops working for all users until next billing period.

**Prevention:**
- Do NOT add a separate Realtime subscription to `message_reactions`. Instead, embed reactions in the messages row.
- Two options:
  1. **JSONB column**: Add `reactions jsonb DEFAULT '{}'` to `messages` (structure: `{"👍": ["user_id_a", "user_id_b"]}`). Each reaction change triggers one messages-table UPDATE, already subscribed. Subscribers get the full reactions payload in the existing channel.
  2. **Separate table + Broadcast**: Use a separate `message_reactions` table for clean schema, but push reaction changes via Supabase Realtime **Broadcast** (not Postgres Changes). Broadcast is billed differently and cheaper for high-frequency small events.
- For a group of 3–15 people, the JSONB approach is simpler and fits within the free tier easily.

**Warning signs:** Adding a Supabase `.on('postgres_changes', ..., { table: 'message_reactions' })` subscription in the same channel — check how many concurrent subscribers you have.

**Phase to address:** Reactions schema design, before any subscription code is written.

---

### MODERATE — Pitfall 2C: Optimistic Reaction Update Race with Realtime INSERT Event

**What goes wrong:** The existing optimistic-send pattern in `useChatRoom` deduplicates by matching `pending === true && sender_id === incoming.sender_id && body === incoming.body`. Reactions have no `body` field and no `pending` flag equivalent. Without a dedup guard, the Realtime INSERT event causes a double-render: the optimistic count update plus the server confirmation both apply.

**Why it happens:** The current dedup logic is text-message-specific. Reaction state management will need its own pattern.

**Prevention:**
- Maintain a `Set<string>` of in-flight reaction keys (`"${messageId}:${emoji}"`) in a ref.
- On optimistic update: add key to set; on server confirm (via Realtime or RPC return): remove from set.
- When Realtime event arrives: if key is in the in-flight set, skip state update (it's already reflected).
- If using the JSONB approach above, the Realtime event carries the full updated `reactions` JSONB — just replace the whole reactions map for that message in state, no dedup needed.

**Phase to address:** Reactions implementation phase.

---

## 3. Reply Threading on Inverted FlatList

### CRITICAL — Pitfall 3A: scrollToIndex Fails for Messages Not Yet Rendered

**What goes wrong:** User taps "scroll to original message" on a reply. The app calls `flatListRef.current.scrollToIndex({ index: targetIndex })`. If `targetIndex` is beyond `initialNumToRender` (default: 10), the FlatList hasn't rendered that cell yet, and React Native throws: "scrollToIndex should be used in conjunction with getItemLayout or onScrollToIndexFailed."

**Why it happens:** inverted FlatList only renders `initialNumToRender` items at mount. Older messages (higher index in the array) are outside the initial render window.

**Consequences:** Scroll fails silently or throws; user sees no response to their tap.

**Prevention:**
- Always provide `onScrollToIndexFailed` that progressively scrolls toward the target:
  ```ts
  onScrollToIndexFailed={({ index }) => {
    flatListRef.current?.scrollToOffset({ offset: index * ESTIMATED_ROW_HEIGHT, animated: false });
    setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: true }), 100);
  }}
  ```
- Use `maintainVisibleContentPosition={{ minIndexForVisible: 0 }}` to prevent scroll position jumping when older messages load above.
- Keep the "scroll to original" feature scoped to messages currently in the 50-message window fetched from DB. If the original is not loaded, show the quoted context inline (the reply bubble) without scroll-to capability. This is what iMessage does.

**Warning signs:** `getItemLayout` is not currently provided in `ChatRoomScreen` → any `scrollToIndex` call will fail without `onScrollToIndexFailed`.

**Phase to address:** Threading/replies phase.

---

### MODERATE — Pitfall 3B: `reply_to_id` Foreign Key + Cascade Behavior

**What goes wrong:** Adding `reply_to_id uuid REFERENCES messages(id) ON DELETE CASCADE` to the messages table means deleting a parent message deletes all replies to it. For a future moderation/delete flow this is destructive. `ON DELETE SET NULL` is safer but requires the schema to express "reply to a now-deleted message" gracefully in the UI.

**Why it happens:** Developers default to CASCADE because it's clean, without thinking through the user-visible consequence.

**Prevention:**
- Use `ON DELETE SET NULL` for `reply_to_id`.
- In the UI, render a "Original message was deleted" placeholder in the quoted context when `reply_to_id IS NOT NULL` but the referenced row is missing from state.

**Phase to address:** Threading schema migration.

---

### MODERATE — Pitfall 3C: Nested Content Inflates FlatList Cell Height, Disrupting `getItemLayout`

**What goes wrong:** `getItemLayout` (if ever added for scroll performance) assumes a fixed or estimated row height. Reply bubbles include a quoted context block above the message body, making them taller than plain messages. Using a single constant for `getItemLayout` causes scroll position drift.

**Why it happens:** Chat FlatLists often omit `getItemLayout` entirely (this codebase does), which is acceptable for text-only chats. Adding variable-height reply cells makes the missing estimate hurt scroll-to-index reliability.

**Prevention:**
- Continue omitting `getItemLayout` — accept the scroll-to-index limitation noted in Pitfall 3A.
- OR measure actual cell heights via `onLayout` and cache them in a `useRef<Map<string, number>>` keyed by message ID. Pass the cache into `getItemLayout`. Only worthwhile if scroll-to-quoted-message is a hard requirement.
- Simpler: display the quoted context as a compact 2-line preview (truncated), bounding height variance.

**Phase to address:** Threading implementation phase.

---

## 4. Polls in Supabase

### CRITICAL — Pitfall 4A: Vote Deduplication Requires Both DB Constraint and RLS

**What goes wrong:** Without a `UNIQUE(poll_id, user_id)` constraint (for single-choice polls) or `UNIQUE(poll_option_id, user_id)` (for option-level), a user can vote multiple times by rapid-tapping or via a crafted request. RLS alone does not prevent duplicates — RLS controls visibility and write access, not uniqueness.

**Why it happens:** Developers add RLS and assume it covers vote uniqueness. It does not. The DB constraint is the only guarantee.

**Consequences:** Inflated vote counts; skewed poll results; users confused by their own vote registering multiple times.

**Prevention:**
- Add `UNIQUE(poll_id, user_id)` if single-choice per poll.
- Add `UNIQUE(poll_option_id, user_id)` if multi-select per option.
- Use `INSERT ... ON CONFLICT (poll_option_id, user_id) DO NOTHING` or `DO UPDATE` (toggle).
- RLS policy: `FOR INSERT WITH CHECK (user_id = auth.uid())` — ensures you can only vote as yourself.

**Phase to address:** Polls schema migration.

---

### CRITICAL — Pitfall 4B: Real-Time Vote Counts via Postgres Changes — Subscriber Multiplier Again

**What goes wrong:** Same as Pitfall 2B for reactions. Subscribing to a `poll_votes` table via Postgres Changes fires an event per subscriber per vote. In a group of 10 chatting in 2 rooms simultaneously, each vote INSERT generates 20 Realtime messages.

**Prevention:**
- Use an RPC function `get_poll_results(poll_id)` that returns a count per option — call it on mount and after the user votes.
- For live updates: subscribe to the `messages` table (already subscribed) and embed a `vote_count` JSONB field on the poll message row that is updated via a trigger on `poll_votes`. This means one Realtime event on the `messages` table (already counted) instead of a new subscription.
- Alternatively: use a Realtime Broadcast channel for poll vote events (cheaper than Postgres Changes).
- Avoid the simplest pattern (subscribe to `poll_votes` table) — it will consume disproportionate Realtime budget.

**Phase to address:** Polls schema design, before any subscription code.

---

### MODERATE — Pitfall 4C: RLS Visibility for Vote Results Before Poll Closes

**What goes wrong:** If you store individual votes with `user_id`, RLS for SELECT allows each user to read all votes (since they're in the same chat). This lets users see who voted for what before the poll closes, biasing results.

**Why it happens:** Correct access control (friends can see the chat) conflicts with poll anonymity.

**Consequences:** Users see "Alice voted for Option B" → they change their vote to match the popular choice → poll results are influenced.

**Prevention:** Two options:
1. **Anonymous polls (simpler for v1.5):** Don't store individual votes at all. Store only aggregate counts per option (increment a `vote_count` integer column via an RPC, not a row per vote). No individual vote rows = no visibility problem. Deduplicate via a `voter_ids uuid[]` array on the option row and check with `@>` operator before incrementing.
2. **Attributed votes (for future):** Store votes with `user_id` but create a view that only exposes counts (no user_id). Grant SELECT only on the view, not the underlying table.

For v1.5 with 3–15 person groups, anonymous aggregate counts are sufficient and simpler.

**Phase to address:** Polls schema design.

---

### MINOR — Pitfall 4D: Poll Embedded in messages Table vs Separate Tables

**What goes wrong:** Storing poll data (options, votes) in separate tables (polls, poll_options, poll_votes) requires joining when rendering a message list. The messages table is already fetched with `.select('*')`, and adding joins to the 50-message fetch increases query complexity. Alternatively, embedding poll data in a `metadata jsonb` column on the messages table means the whole column updates on every vote, causing the Realtime event to carry a large payload.

**Prevention:**
- Use separate tables for polls and poll_options (clean schema, easy to query by poll_id).
- Store only a reference (`poll_id uuid`) in the messages row.
- On chat load, identify message rows where `message_type = 'poll'`, then batch-fetch poll data: `supabase.from('polls').select('*, poll_options(*)').in('id', pollIds)`.
- On vote: update the option's aggregate count, then broadcast via the existing messages channel (or trigger an UPDATE on the messages row to push a Realtime event).

**Phase to address:** Polls schema migration.

---

## 5. Profile Page Rework and Friend Profile Route

### CRITICAL — Pitfall 5A: Multiple Entry Points to Friend Profile Create Route Ambiguity

**What goes wrong:** The current `friends/[id].tsx` serves as the friend profile screen. v1.5 plans to make friend profiles richer (birthday, wish list, status). The new profile will need to be reachable from: Squad → Friends list, Home → HomeFriendCard, Home → Radar bubbles, Chat → tapping a sender avatar. Each of these entry points lives in a different Expo Router stack group (`(tabs)/squad`, `(tabs)/index`, `(tabs)/chat`). If you push `router.push('/friends/[id]')` from inside the Chat tab stack, Expo Router presents the screen in the Chat stack's native header context — not the Squad stack. The back button goes back to chat, not to the friends list.

**Why it happens:** Expo Router's file-based routing presents route groups as independent stacks. A shared screen (`friends/[id]`) outside all tab stacks is accessible from any tab but behaves differently depending on which stack initiated the push.

**Consequences:** Inconsistent back navigation — tapping back from the friend profile goes to different places depending on how you arrived; header title style may differ between stacks.

**Prevention:**
- Keep `friends/[id].tsx` at the root level (outside `(tabs)`) — which it already is. This is correct.
- This means any tab can push to `/friends/{id}` and get a modal-style presentation (stack push on top of tab navigator).
- Verify that `Stack.Screen options={{ presentation: 'card' }}` is set in `friends/_layout.tsx` rather than inheriting from the tab layout.
- Do not duplicate the screen as `(tabs)/chat/friend/[id].tsx` — that creates two separate screens with different back destinations.
- The existing pattern of `router.push('/friends/[id]')` from `HomeFriendCard` already works; audit that every new entry point uses the same absolute path.

**Warning signs:** If you see the friend profile presented with a bottom tab bar visible — it means you pushed within a tab stack instead of the root stack.

**Phase to address:** Profile rework phase, at the start when auditing navigation entry points.

---

### MODERATE — Pitfall 5B: Status State Shared Between Home and Friend Profile Reads Stale Data

**What goes wrong:** The home screen fetches statuses via `effective_status` view, which computes freshness (ALIVE/FADING/DEAD). The friend profile screen (`friends/[id].tsx`) fetches directly from `statuses` table — not the view. The user's status shown on the home card and on their profile page can diverge: home shows "FADING" (correctly expired) while the profile shows "Free" (raw status without expiry computation).

**Why it happens:** The profile screen queries `statuses` directly (line 39 of `friends/[id].tsx`). The `effective_status` view was added in v1.3 as the source of truth but the friend profile does not use it.

**Consequences:** User profile shows a status that the home screen correctly marks as expired. Confusing for users.

**Prevention:**
- Change the friend profile status query from `from('statuses')` to `from('effective_status')`.
- The `effective_status` view already has `security_invoker=true` so RLS applies correctly.
- Also display the `expires_at` window and freshness label (ALIVE/FADING/DEAD) on the profile, consistent with the home card treatment.

**Phase to address:** Profile rework phase.

---

### MODERATE — Pitfall 5C: Removing Status Section from Profile Tab Breaks Mental Model During Transition

**What goes wrong:** v1.5 removes status display from the Profile tab (home is source of truth). If this removal happens mid-development (another phase active), users of the dev build lose access to status editing for a period. More subtly: the status pill in the header (added in v1.3.5) is only on the Home tab. If the Profile tab status section is removed without the header pill being clearly discoverable, new users can't find where to set their status.

**Consequences:** Not a technical bug, but a UX regression during development.

**Prevention:**
- Remove the Profile status section and complete the Profile rework in a single phase — do not split the removal into one phase and the profile redesign into another.
- Verify the header status pill is visible from Home before the Profile section removal ships.

**Phase to address:** Profile rework phase — do removal and redesign atomically.

---

### MINOR — Pitfall 5D: noUncheckedIndexedAccess on Profile Display Name Parsing

**What goes wrong:** The existing code in `friends/[id].tsx` (line 107) does:
```ts
const firstName = profile.display_name.split(' ')[0];
```
Under `noUncheckedIndexedAccess: true`, `split()[0]` is typed as `string | undefined`. TypeScript strict mode will flag this. The codebase already has suppressions for similar patterns (assets?.[0]) — the fix pattern is consistent:
```ts
const firstName = profile.display_name.split(' ')[0] ?? profile.display_name;
```

**Warning signs:** TypeScript error TS2532: "Object is possibly undefined" on split()[0] or similar.

**Phase to address:** Profile rework phase, when the friend profile screen is extended. This specific line is in current code — fix it before the rework touches this file.

---

## Phase Assignment Summary

| Pitfall | ID | Severity | Phase |
|---------|----|----------|-------|
| No compression before Supabase upload | 1A | CRITICAL | Media sharing phase |
| FlatList memory from inline images | 1B | CRITICAL | Media sharing phase |
| KAV breaks with image preview strip | 1C | MODERATE | Media sharing phase |
| Public vs signed URL for chat images | 1D | MINOR | Media sharing phase (schema design) |
| No unique constraint on reactions | 2A | CRITICAL | Reactions schema migration |
| Realtime budget multiplier for reactions | 2B | CRITICAL | Reactions schema design |
| Optimistic reaction dedup with Realtime | 2C | MODERATE | Reactions implementation |
| scrollToIndex fails beyond render window | 3A | CRITICAL | Threading phase |
| reply_to_id cascade deletes replies | 3B | MODERATE | Threading schema migration |
| Variable height disrupts scroll estimate | 3C | MODERATE | Threading implementation |
| Vote dedup requires DB constraint + RLS | 4A | CRITICAL | Polls schema migration |
| Realtime budget multiplier for votes | 4B | CRITICAL | Polls schema design |
| Vote visibility biases results | 4C | MODERATE | Polls schema design |
| Poll tables vs messages join complexity | 4D | MINOR | Polls schema migration |
| Multiple entry points route ambiguity | 5A | CRITICAL | Profile rework phase |
| Friend profile reads stale status | 5B | MODERATE | Profile rework phase |
| Status removal UX regression during dev | 5C | MODERATE | Profile rework phase |
| noUncheckedIndexedAccess on split()[0] | 5D | MINOR | Profile rework phase |

---

## Cross-Cutting: Supabase Realtime Free-Tier Budget

The single highest-risk area for this milestone as a whole is **Supabase Realtime budget consumption**. The current system already subscribes to the `messages` table per chat room. Adding subscriptions for reactions AND polls AND possibly a friend-profile presence would multiply the message count drastically.

**Budget math (conservative):**
- 10 active users, 3 chat rooms each, 1 subscription per table per room
- Messages table: 10 × 3 = 30 concurrent subscriptions
- If reactions use their own Postgres Changes table: 30 more
- If polls use their own Postgres Changes table: 30 more
- Total: 90 concurrent subscriptions
- A group of 10 exchanging 20 reactions/day = 200 DB events × 30 subscribers = 6,000 Realtime messages/day → 180K/month for reactions alone

Free tier: 2M/month. With chat messages + reactions + polls all using Postgres Changes, you could hit the limit with only a moderate amount of app activity.

**Strategic prevention:** For all new real-time features in v1.5, default to one of:
1. **Embed state in the messages row** and rely on the already-subscribed `messages` channel
2. **Supabase Realtime Broadcast** (not Postgres Changes) for high-frequency events — it has a separate and more generous quota

---

## Sources

- Supabase Realtime Pricing (per-subscriber multiplier): https://supabase.com/docs/guides/realtime/pricing
- Supabase Realtime Limits: https://supabase.com/docs/guides/realtime/limits
- Supabase Storage File Limits (free tier 50 MB per file): https://supabase.com/docs/guides/storage/uploads/file-limits
- expo-image inside FlatList framedrops (issue #24824, #37561): https://github.com/expo/expo/issues/24824
- React Native scrollToIndex beyond render limit: https://ikevin127.medium.com/react-native-auto-scrolling-to-inverted-flatlist-items-beyond-the-initial-render-limit-bff8f085444b
- KAV hides input Android 15 / SDK 35: https://github.com/facebook/react-native/issues/49759
- expo-image-manipulator compression: https://docs.expo.dev/versions/latest/sdk/imagemanipulator/
- Uploaded files 0 bytes iOS (ArrayBuffer fix): https://github.com/orgs/supabase/discussions/2336
- FlatList inverted performance drop: https://github.com/facebook/react-native/issues/35983
