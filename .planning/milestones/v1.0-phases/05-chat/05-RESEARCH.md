# Phase 5: Chat - Research

**Researched:** 2026-03-19
**Domain:** React Native chat UI, Supabase Realtime, Expo Router nested stacks, AsyncStorage unread tracking
**Confidence:** HIGH

## Summary

Phase 5 builds on a solid, consistent codebase. All four prior phases have established clear patterns: Zustand stores for cached data, Supabase Realtime via `channelRef` with subscribe/unsubscribe on mount/unmount, server confirmation for async mutations, and Expo Router stack navigation under `src/app/<group>/_layout.tsx`. Chat follows these patterns without introducing new third-party libraries.

The most complex technical decisions — messages table schema, `get_or_create_dm_channel` RPC, RLS policies — are already done and applied in the migration. The `messages` table enforces the exactly-one-channel constraint at the DB level, so the client just inserts with either `plan_id` or `dm_channel_id`. The realtime subscription pattern from `useHomeScreen.ts` is the direct template for chat messages: subscribe on mount, append from payload, unsubscribe on unmount.

The primary implementation concerns are: (1) getting the inverted FlatList to behave correctly with `KeyboardAvoidingView` on both iOS and Android, (2) correct optimistic send rollback on error, (3) building the chat list screen that queries both plan chats and DMs sorted by last message time, and (4) wiring the Expo Router `chat` group to support a stack with `ChatRoomScreen` as a child route.

**Primary recommendation:** Follow the `useHomeScreen.ts` Realtime pattern verbatim for the chat hook. Use `inverted` FlatList with `KeyboardAvoidingView behavior="padding"` on iOS and `"height"` on Android. Store `last_read_at` per chat key in AsyncStorage (same client that Supabase already uses for session storage).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Colored message bubbles**: sender messages orange (`#f97316`) background, right-aligned. Others' messages `#2a2a2a` background, left-aligned with avatar + sender name.
- **No avatar for self** — own messages show just the orange bubble. Others show AvatarCircle + display name + bubble.
- **Consecutive message grouping**: same sender in a streak shows name + avatar only on the first message. Subsequent bubbles are just the bubble.
- **Timestamp on every message**: small relative time on each bubble (not grouped separators).
- **Send bar**: TextInput with placeholder "Message..." + send icon button on the right. Send button only active when text is non-empty.
- **Inverted FlatList**: newest messages at bottom, scroll up for history.
- **KeyboardAvoidingView**: send bar stays above keyboard.
- **Empty state**: "Start the conversation!" centered text. Disappears when first message is sent.
- **Banner-style pinned plan card**: thin banner across the top with plan title + time on one line. Tap to expand or navigate to plan dashboard. Only shown in plan chats.
- **Mixed chat list**: plan chats and DMs in one FlatList, sorted by most recent message time.
- Plan chats: campfire emoji + plan title. DMs: friend avatar + friend name.
- Each row shows: avatar/emoji, title/name, last message preview (truncated), relative time ("2 min ago").
- **Simple unread dot**: blue dot on chats with messages newer than user's last visit. No count, just a dot.
- Empty chat list state: "No chats yet" + "Create a plan or message a friend to get started".
- **Entry point for DM**: friend card bottom sheet "Start DM" action (Phase 2 existing UI).
- Tapping "Start DM" calls `get_or_create_dm_channel` RPC, shows brief loading on the button, then navigates to chat room.
- DM header: friend's display name + back arrow.
- **One ChatRoomScreen component** handles both plan chats and DMs. Determined by whether `plan_id` or `dm_channel_id` is passed as route param.
- Plan dashboard "Open Chat" button navigates to the chat room with `plan_id` param.
- **Supabase Realtime subscription** on `messages` table while chat room is open.
- **Subscribe on mount, unsubscribe on unmount** — no app-wide subscription.
- **Append new messages to local state** from Realtime payload — no re-fetch.
- **Optimistic send**: message appears instantly with subtle pending state. On insert failure, show error with retry.
- **Simple unread tracking**: store `last_read_at` timestamp per chat in AsyncStorage or a small Supabase table.

### Claude's Discretion
- Exact bubble border radius and padding
- Send bar icon choice and styling
- Banner pinned card expand/collapse animation
- Unread tracking storage mechanism (AsyncStorage vs Supabase)
- Message retry UI for failed optimistic sends
- Chat list row height and spacing
- Keyboard handling specifics (KeyboardAvoidingView behavior prop)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | User can view chat room with chronological messages (sender avatar, name, body, timestamp) | Inverted FlatList pattern, message grouping logic, AvatarCircle reuse, `usePlanDetail` for member profiles |
| CHAT-02 | User can send text messages in a chat room | Supabase `messages` insert with `plan_id` or `dm_channel_id`, optimistic append pattern |
| CHAT-03 | Chat room updates in realtime via Supabase subscription on messages | Direct port of `useHomeScreen.ts` Realtime pattern, filter `plan_id=eq.X` or `dm_channel_id=eq.X` |
| CHAT-04 | User can view chat list showing active plan chats and DMs sorted by last message | New query pattern: join `messages` with `plans`/`dm_channels`, sort by `max(created_at)` |
| CHAT-05 | Plan chat is accessible from plan dashboard with plan_id on messages | Update `PlanDashboardScreen.tsx` Open Chat button to `router.push('/chat/room?plan_id=X')` |
| CHAT-06 | DM chat opens from friend card, using get_or_create_dm_channel RPC | Wire `FriendActionSheet.tsx` `onStartDM` to call RPC then navigate, server confirmation pattern |
| CHAT-07 | Plan dashboard pinned card appears at top of plan chat (title, time, RSVP summary) | Banner component using `usePlanDetail` data, shown when `plan_id` route param present |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.99.2 (installed) | Realtime subscription + DB queries | Already in project, all schema in place |
| `react-native` FlatList | 0.83.2 (installed) | Inverted message list | Built-in, `inverted` prop handles bottom-pinned layout |
| `react-native` KeyboardAvoidingView | 0.83.2 (installed) | Keep send bar above keyboard | Built-in, cross-platform keyboard avoidance |
| `@react-native-async-storage/async-storage` | 2.2.0 (installed) | `last_read_at` unread tracking | Already in project for Supabase session storage |
| `expo-router` | ~55.0.5 (installed) | Chat stack navigation + route params | Already in project, Stack under `(tabs)/chat` group |
| `zustand` | ^5.0.12 (installed) | Chat list cache (`useChatStore`) | Already in project, established store pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@expo/vector-icons` Ionicons | bundled with expo | Send button icon | Already used throughout — `chatbubble-outline`, `send` |
| `expo-router` `useLocalSearchParams` | ~55.0.5 | Read `plan_id` / `dm_channel_id` route params | ChatRoomScreen needs to know which channel to subscribe |
| `expo-router` `useFocusEffect` | ~55.0.5 | Refresh chat list on tab focus | Same pattern as `usePendingRequestsCount` |

### No New Installs Required
All dependencies needed for Phase 5 are already installed. No `npm install` needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── (tabs)/
│       └── chat/                    # NEW: chat stack group (replaces stub chat.tsx)
│           ├── _layout.tsx          # Stack layout matching plans/_layout.tsx pattern
│           ├── index.tsx            # Chat list route (renders ChatListScreen)
│           └── room.tsx             # Chat room route (renders ChatRoomScreen)
├── screens/
│   └── chat/                        # NEW: screen components
│       ├── ChatListScreen.tsx
│       └── ChatRoomScreen.tsx
├── components/
│   └── chat/                        # NEW: chat-specific components
│       ├── MessageBubble.tsx
│       ├── SendBar.tsx
│       ├── ChatListRow.tsx
│       └── PinnedPlanBanner.tsx
├── hooks/
│   ├── useChatRoom.ts               # NEW: messages fetch + realtime subscription
│   └── useChatList.ts               # NEW: all chats sorted by last message
└── stores/
    └── useChatStore.ts              # NEW: Zustand store for chat list cache
```

### Pattern 1: Chat Tab — Replace Stub with Stack Group
**What:** The current `src/app/(tabs)/chat.tsx` is a single-file stub. To support nested routes (list + room), replace it with a `chat/` directory containing a `_layout.tsx` stack and `index.tsx` entry.

**When to use:** Whenever a tab needs push navigation to deeper screens (same approach as `plans/`).

**Example:**
```typescript
// src/app/(tabs)/chat/_layout.tsx
// Source: mirrors src/app/plans/_layout.tsx
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function ChatStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.dominant },
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
      }}
    />
  );
}
```

**Migration note:** Delete `src/app/(tabs)/chat.tsx`, create `src/app/(tabs)/chat/` directory with `_layout.tsx` and `index.tsx`.

### Pattern 2: Supabase Realtime for Messages
**What:** Subscribe to `postgres_changes` on the `messages` table filtered by `plan_id=eq.X` or `dm_channel_id=eq.X`. Append new message directly to local state from payload — no re-fetch.

**When to use:** ChatRoomScreen mount. Unsubscribe on unmount.

**Example:**
```typescript
// src/hooks/useChatRoom.ts
// Source: adapted from src/hooks/useHomeScreen.ts — established project pattern

const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

function subscribeRealtime(channelKey: 'plan_id' | 'dm_channel_id', channelValue: string) {
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }

  const filter = `${channelKey}=eq.${channelValue}`;
  channelRef.current = supabase
    .channel(`chat-${channelValue}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter },
      (payload) => {
        // Append to local state — payload.new is the new message row
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
      }
    )
    .subscribe();
}

useEffect(() => {
  fetchMessages();
  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [planId, dmChannelId]);
```

**Critical difference from Phase 3:** Phase 3 re-fetches all data on realtime event. Chat instead appends `payload.new` directly, which is safe because messages are append-only and the payload contains the full new row.

### Pattern 3: Optimistic Send
**What:** Insert message to local state immediately with a `pending: true` flag. Submit to Supabase in parallel. If Supabase returns an error, remove the optimistic message and show error. If success, the realtime subscription will fire with the canonical row — update local state to replace the optimistic entry (match by body + sender + approximate time), or simply remove the optimistic entry when the real one arrives via realtime.

**Simpler approach (recommended for V1):** Use a client-generated `tempId`. On send:
1. Append `{ ...message, id: tempId, pending: true }` to state.
2. Insert to Supabase.
3. If error: filter out `tempId` from state, show Alert with retry.
4. If success: realtime INSERT fires and appends the canonical message. Also remove `tempId` entry to avoid duplicate — compare `body + sender_id` within a 2-second window.

**When to use:** All message sends in ChatRoomScreen.

### Pattern 4: Inverted FlatList
**What:** `<FlatList inverted />` renders items in reverse order, keeping newest at bottom without manual scroll management. Data array is still chronological (oldest first) but visually reversed by the component.

**When to use:** ChatRoomScreen message list.

**Example:**
```typescript
// Source: React Native docs + established chat app pattern
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={headerHeight} // accounts for navigation header
>
  <FlatList
    data={messages}           // chronological order — FlatList inverts visually
    inverted
    keyExtractor={(item) => item.id}
    renderItem={({ item, index }) => (
      <MessageBubble
        message={item}
        isOwn={item.sender_id === currentUserId}
        showSenderInfo={isFirstInGroup(messages, index)}
      />
    )}
    contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
  />
  <SendBar onSend={handleSend} />
</KeyboardAvoidingView>
```

**`keyboardVerticalOffset` note:** With Expo Router Stack headers, the header height is typically 56pt on iOS. Use `useHeaderHeight()` from `@react-navigation/elements` (already installed) to get the exact value at runtime.

### Pattern 5: Chat List Query
**What:** No dedicated RPC exists for the chat list. Query must be constructed client-side by fetching:
1. All plan_ids where user is a member → join with latest message per plan_id
2. All dm_channel_ids where user is participant → join with latest message per dm_channel_id

**Approach:** Two separate Supabase queries, merge results, sort by `lastMessageAt` descending. Supabase supports ordering with `.order('created_at', { ascending: false }).limit(1)` subquery patterns via PostgREST embed syntax, but simpler is two flat queries:

```typescript
// Query 1: Plan chats with last message
const { data: planMessages } = await supabase
  .from('messages')
  .select('plan_id, body, created_at, sender_id')
  .not('plan_id', 'is', null)
  .in('plan_id', memberPlanIds)
  .order('created_at', { ascending: false });
// Deduplicate to get one entry per plan_id (first result per plan)

// Query 2: DM channels with last message
const { data: dmMessages } = await supabase
  .from('messages')
  .select('dm_channel_id, body, created_at, sender_id')
  .not('dm_channel_id', 'is', null)
  .in('dm_channel_id', userDmChannelIds)
  .order('created_at', { ascending: false });
// Deduplicate to get one entry per dm_channel_id
```

Then merge and sort. This is acceptable for V1 where chat counts are small (3–15 person groups).

### Pattern 6: Unread Dot Tracking
**What:** Store `lastReadAt` per chat in AsyncStorage using a namespaced key. On entering a chat room, update `lastReadAt` to `new Date().toISOString()`. In chat list, compare each chat's `lastMessageAt` against stored `lastReadAt` to show or hide the dot.

**AsyncStorage key format:** `chat:last_read:${planId || dmChannelId}`

**When to use:** ChatListScreen (read) and ChatRoomScreen (write on mount/focus).

**Example:**
```typescript
// Write on room open
await AsyncStorage.setItem(`chat:last_read:${chatId}`, new Date().toISOString());

// Read in chat list
const lastRead = await AsyncStorage.getItem(`chat:last_read:${chatId}`);
const hasUnread = lastMessageAt > (lastRead ?? '1970-01-01');
```

**Why AsyncStorage over Supabase table:** No free-tier row cost, no network call, instant reads. Works fine for V1 since unread state is per-device. (V2 could sync to Supabase for multi-device support.)

### Pattern 7: DM Navigation from Friend Action Sheet
**What:** `FriendActionSheet.tsx` already has an `onStartDM` prop wired to a `TouchableOpacity`. The parent (`FriendsList.tsx`) passes the handler. Update the parent to:
1. Call `supabase.rpc('get_or_create_dm_channel', { other_user_id: friend.friend_id })`
2. Show loading on the "Start DM" row (server confirmation pattern from Phase 2/4)
3. On success: `router.push('/chat/room?dm_channel_id=X&friend_name=Y')`

**Route params for ChatRoomScreen:**
- Plan chat: `plan_id=<uuid>` (title fetched from `usePlanDetail`)
- DM: `dm_channel_id=<uuid>&friend_name=<string>` (friend_name for header, messages fetched by dm_channel_id)

### Pattern 8: Consecutive Message Grouping
**What:** When rendering each message bubble, check if the previous message (in chronological order — next index in the inverted array) has the same `sender_id`. If same sender, suppress avatar + name.

**Implementation:**
```typescript
// With inverted FlatList, index 0 is the newest message
// "previous message" in conversation = index+1 in the array
function isFirstInGroup(messages: Message[], index: number): boolean {
  if (index === messages.length - 1) return true; // oldest message always shows
  return messages[index + 1].sender_id !== messages[index].sender_id;
}
```

### Anti-Patterns to Avoid
- **Re-fetching all messages on each realtime event:** Phase 3 does this for statuses (acceptable — small data). For messages, append `payload.new` directly. Re-fetching would flash the list and waste bandwidth.
- **Using app-wide realtime subscription:** Subscribe only while ChatRoomScreen is mounted. Budget-conscious for Supabase free tier (200 concurrent connections).
- **Relying on Expo Router to auto-scroll FlatList:** Inverted FlatList does not auto-scroll to bottom when keyboard opens. `KeyboardAvoidingView` handles this, but the `keyboardVerticalOffset` must account for the Stack header height.
- **Passing full plan data as route params:** Route params are strings. Pass only IDs, fetch data inside the screen.
- **Forgetting `messages` table needs `REPLICA IDENTITY FULL`:** The schema already sets this on `statuses`. Check whether `messages` also needs it for realtime filtering. For `INSERT` events, `REPLICA IDENTITY DEFAULT` (the Supabase default) is sufficient — the new row is always included in the payload. Only `UPDATE`/`DELETE` events need FULL. Since chat is INSERT-only, this is not an issue.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard avoidance | Custom keyboard listener + manual padding calculations | `KeyboardAvoidingView` (built-in RN) | Handles iOS safe area, Android keyboard mode, header offset correctly |
| Relative timestamps | Custom date formatting ("2 min ago") | `Date` arithmetic with simple `formatRelativeTime()` helper | Simple enough to write inline — don't add `date-fns` or `moment` just for this |
| Message list scrolling | `ScrollView` with manual `scrollToEnd` | `FlatList inverted` | Inverted FlatList is the standard React Native chat pattern — handles large lists with virtualization |
| AsyncStorage namespacing | Custom serialization | Simple key-value with `chat:last_read:${id}` prefix | AsyncStorage is already in the project; no wrapper needed |
| Realtime reconnection | Custom WebSocket retry logic | Supabase JS client handles reconnection automatically | The client manages heartbeat and reconnect; don't intercept |
| RPC for DM channel | Custom INSERT + SELECT logic | `get_or_create_dm_channel` RPC (already in DB) | Race condition safe — uses canonical pair with unique index |

**Key insight:** This phase requires zero new library installs. Every tool is already present. The work is wiring existing patterns to new screens.

## Common Pitfalls

### Pitfall 1: `chat.tsx` to `chat/index.tsx` Migration
**What goes wrong:** Expo Router uses file-based routing. `(tabs)/chat.tsx` makes the Chat tab a single screen. Replacing it with `(tabs)/chat/` directory enables a Stack with child routes. If the directory exists but `_layout.tsx` is missing, Expo Router will not create a Stack and navigation will break.
**Why it happens:** Developers create the directory and child screens but forget the `_layout.tsx`.
**How to avoid:** Create `_layout.tsx` first (before `index.tsx` and `room.tsx`). Match the plans layout pattern exactly.
**Warning signs:** `router.push('/chat/room?...')` throws "route not found" error.

### Pitfall 2: Inverted FlatList + KeyboardAvoidingView Interaction
**What goes wrong:** On iOS, `KeyboardAvoidingView` with `behavior="padding"` adds bottom padding when keyboard opens. With an inverted FlatList, this can cause a jarring jump if `keyboardVerticalOffset` is wrong.
**Why it happens:** The Stack header height adds to the keyboard offset calculation. Without accounting for it, the send bar overshoots.
**How to avoid:** Use `useHeaderHeight()` from `@react-navigation/elements` for the `keyboardVerticalOffset` prop. `@react-navigation/elements` is already installed in the project.
**Warning signs:** Send bar jumps too high when keyboard opens on iOS.

### Pitfall 3: Realtime Payload Type — `payload.new` Shape
**What goes wrong:** `payload.new` from Supabase Realtime `postgres_changes` is typed as `Record<string, unknown>` in the JS client. Developers cast it directly to `Message` type without checking that all fields (especially `sender_id`, `created_at`) are present.
**Why it happens:** TypeScript inference doesn't validate the runtime payload.
**How to avoid:** Cast with runtime assertion: `const newMsg = payload.new as Message`. Verify sender profile (for display name/avatar) may NOT be in the payload — messages table only has `sender_id`, not joined profile data. Need to look up profile from local cache or fetch.
**Warning signs:** Messages appear with undefined sender name/avatar in the chat room.

**Solution for sender profile in realtime messages:** On initial fetch, load all member profiles into a `Map<sender_id, Profile>`. When a realtime message arrives, look up profile from the map. If not found (non-member sender is impossible per RLS), show `sender_id.slice(0,8)` as fallback.

### Pitfall 4: Duplicate Messages — Optimistic + Realtime
**What goes wrong:** User sends a message. It appears optimistically. The realtime subscription fires and appends the same message again. User sees the message twice.
**Why it happens:** Optimistic state is added immediately; realtime subscription also adds the same message on INSERT confirmation.
**How to avoid:** On realtime INSERT, check if the incoming message ID already exists in local state before appending. Since optimistic messages use a temp `uuid` (not the DB-assigned id), the real message will have a different ID — simply deduplicate by checking if `payload.new.id` is already in the messages array.
**Warning signs:** Messages appear twice after sending.

### Pitfall 5: Chat List Tab — `router.push` vs `router.navigate`
**What goes wrong:** After DM channel creation, `router.push('/(tabs)/chat')` navigates to the chat list, not the room. Using the wrong push path skips the room screen.
**Why it happens:** Phase 4's Open Chat button currently pushes to `/(tabs)/chat` (the tab itself, not a specific room). This needs updating to push to `/chat/room?plan_id=X`.
**How to avoid:** The plan dashboard Open Chat button must be updated from `router.push('/(tabs)/chat')` to `router.push({ pathname: '/chat/room', params: { plan_id: planId } })` — or the string equivalent `router.push('/chat/room?plan_id=' + planId)`.
**Warning signs:** Open Chat navigates to the chat list instead of the specific plan's chat room.

### Pitfall 6: `messages` Realtime — Only INSERT Events
**What goes wrong:** Subscribing to `event: '*'` to catch UPDATE/DELETE. In V1 there are no edits or deletes, so `*` vs `INSERT` makes no difference — but `INSERT` is more explicit and cheaper.
**Why it happens:** Copy-pasting Phase 3's `event: '*'` filter without thinking.
**How to avoid:** Use `event: 'INSERT'` for the messages subscription. Messages are append-only.

## Code Examples

Verified patterns from existing project code:

### Supabase Realtime Subscribe/Unsubscribe (from useHomeScreen.ts)
```typescript
// Source: src/hooks/useHomeScreen.ts — exact project pattern

const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

function subscribeRealtime(filter: string, channelName: string) {
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }
  channelRef.current = supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, (payload) => {
      setMessages((prev) => [...prev, payload.new as Message]);
    })
    .subscribe();
}

useEffect(() => {
  fetchMessages();
  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [planId, dmChannelId]);
```

### Supabase RPC Call (from Phase 2/4 server confirmation pattern)
```typescript
// Source: established project pattern (useFriends.ts, usePlanDetail.ts)
// DM channel creation with loading state

const [loadingDM, setLoadingDM] = useState(false);

async function handleStartDM(friendId: string, friendName: string) {
  setLoadingDM(true);
  const { data: channelId, error } = await supabase.rpc('get_or_create_dm_channel', {
    other_user_id: friendId,
  });
  setLoadingDM(false);
  if (error || !channelId) {
    Alert.alert('Error', "Couldn't open chat. Try again.");
    return;
  }
  router.push(`/chat/room?dm_channel_id=${channelId}&friend_name=${encodeURIComponent(friendName)}`);
}
```

### AsyncStorage Unread Tracking
```typescript
// Source: @react-native-async-storage/async-storage — already in project for supabase auth

import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_READ_KEY = (chatId: string) => `chat:last_read:${chatId}`;

async function markChatAsRead(chatId: string): Promise<void> {
  await AsyncStorage.setItem(LAST_READ_KEY(chatId), new Date().toISOString());
}

async function hasUnreadMessages(chatId: string, lastMessageAt: string): Promise<boolean> {
  const lastRead = await AsyncStorage.getItem(LAST_READ_KEY(chatId));
  if (!lastRead) return true; // never opened = unread
  return lastMessageAt > lastRead;
}
```

### Zustand Store Shape (following usePlansStore.ts pattern)
```typescript
// Source: src/stores/usePlansStore.ts pattern

interface ChatListItem {
  id: string;                // plan_id or dm_channel_id
  type: 'plan' | 'dm';
  title: string;             // plan title or friend name
  avatarUrl?: string | null; // for DMs
  lastMessage: string;       // truncated body
  lastMessageAt: string;     // ISO timestamp for sorting
  hasUnread: boolean;
}

interface ChatState {
  chatList: ChatListItem[];
  lastFetchedAt: number | null;
  setChatList: (items: ChatListItem[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chatList: [],
  lastFetchedAt: null,
  setChatList: (chatList) => set({ chatList, lastFetchedAt: Date.now() }),
}));
```

### useHeaderHeight for KeyboardAvoidingView
```typescript
// Source: @react-navigation/elements (already installed)
import { useHeaderHeight } from '@react-navigation/elements';

export function ChatRoomScreen() {
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      {/* FlatList inverted + SendBar */}
    </KeyboardAvoidingView>
  );
}
```

### Message Type
```typescript
// New type — add to src/types/chat.ts

export interface Message {
  id: string;
  plan_id: string | null;
  dm_channel_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
  // Enriched client-side:
  pending?: boolean;       // optimistic send in-flight
  tempId?: string;         // client-generated temp id for optimistic messages
}

export interface MessageWithProfile extends Message {
  sender_display_name: string;
  sender_avatar_url: string | null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for new messages | Supabase Realtime postgres_changes | Supabase 2.x | Zero-latency updates without polling |
| ScrollView for chat | FlatList with `inverted` prop | RN 0.60+ | Virtualized list — handles large histories without memory pressure |
| Global WebSocket subscription | Per-screen subscribe/unsubscribe | Free-tier awareness | Stays within 200-connection Supabase limit |
| `router.push('/(tabs)/chat')` | `router.push('/chat/room?plan_id=X')` | Phase 5 (this phase) | Open Chat button now goes directly to the room |

**Deprecated/outdated:**
- `src/app/(tabs)/chat.tsx` stub: replaced by `src/app/(tabs)/chat/` directory with Stack layout (delete the file, create the directory)

## Open Questions

1. **Profile data in realtime payload**
   - What we know: `payload.new` contains the raw `messages` row (id, plan_id, dm_channel_id, sender_id, body, created_at). No joined profile data.
   - What's unclear: For plan chats with many members, do we pre-load all member profiles at room open, or fetch on-demand per sender?
   - Recommendation: Pre-load all member profiles at chat room open (same query as the initial messages fetch). Store in a `Map<sender_id, {display_name, avatar_url}>` local to the hook. For DMs, the "other" user's profile can be passed as a route param (display name already known from friend card) or fetched once.

2. **Chat list — plans with no messages yet**
   - What we know: A plan chat "exists" the moment a plan exists (the plan_id column on messages). But if no messages have been sent, there's no `messages` row to sort by.
   - What's unclear: Should plans with zero messages appear in the chat list?
   - Recommendation: Only show plans that have at least one message. Zero-message plans don't appear until first message sent. This matches the "chat list shows active chats" requirement (CHAT-04).

3. **DM channels with no messages**
   - What we know: `get_or_create_dm_channel` creates the channel on first "Start DM" tap. After creation, user is navigated directly to the room (empty state shown). If user navigates away without sending, the DM channel exists but has no messages.
   - What's unclear: Should empty DM channels appear in the chat list?
   - Recommendation: Same policy as plans — only show in chat list if at least one message exists. The DM channel can be "invisible" in the list until first message sent.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in project |
| Config file | none — see Wave 0 |
| Quick run command | N/A — no test runner installed |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Message list renders sender avatar, name, body, timestamp | manual-only | N/A — no test framework | ❌ Wave 0 gap |
| CHAT-02 | Sending a message inserts to Supabase and appears in list | manual-only | N/A — no test framework | ❌ Wave 0 gap |
| CHAT-03 | Realtime updates arrive without refresh | manual-only | N/A — requires live Supabase | ❌ Wave 0 gap |
| CHAT-04 | Chat list shows plans + DMs sorted by last message | manual-only | N/A — no test framework | ❌ Wave 0 gap |
| CHAT-05 | Plan dashboard Open Chat navigates to room with plan_id | manual-only | N/A — no test framework | ❌ Wave 0 gap |
| CHAT-06 | DM from friend card creates channel and opens room | manual-only | N/A — no test framework | ❌ Wave 0 gap |
| CHAT-07 | Pinned plan banner shows in plan chat, not in DMs | manual-only | N/A — no test framework | ❌ Wave 0 gap |

### Sampling Rate
- **Per task commit:** Manual smoke test — open chat tab, send a message, verify it appears
- **Per wave merge:** Full manual walkthrough of all 7 success criteria
- **Phase gate:** All 7 success criteria TRUE before `/gsd:verify-work`

### Wave 0 Gaps
No test framework is installed in the project. All validation is manual (consistent with all prior phases). The project has no `jest.config.*`, no `vitest.config.*`, no test scripts in `package.json`. This is expected and consistent — do not install a test framework in this phase.

*(If the project adds automated testing in a future phase, CHAT-01 through CHAT-07 are all testable with React Native Testing Library + Supabase mocks.)*

## Sources

### Primary (HIGH confidence)
- `src/hooks/useHomeScreen.ts` — Realtime subscribe/unsubscribe pattern (direct template for chat)
- `supabase/migrations/0001_init.sql` — Complete schema: messages table, dm_channels, get_or_create_dm_channel RPC, all RLS policies
- `src/stores/usePlansStore.ts` — Zustand store shape pattern
- `src/app/plans/_layout.tsx` + `src/app/plans/[id].tsx` — Stack layout + route param pattern
- `src/components/friends/FriendActionSheet.tsx` — onStartDM hook point
- `src/screens/plans/PlanDashboardScreen.tsx` — Open Chat button location (line 254)
- `package.json` — All installed dependencies confirmed

### Secondary (MEDIUM confidence)
- React Native `FlatList` `inverted` prop — well-documented built-in behavior, confirmed in RN 0.83 docs
- `@react-navigation/elements` `useHeaderHeight` — confirmed installed via `@react-navigation/elements: ^2.8.1` in package.json
- AsyncStorage key-value pattern for unread tracking — standard community pattern, verified against installed 2.2.0

### Tertiary (LOW confidence)
- Chat list "two queries + client merge" strategy — derived from schema analysis; a dedicated RPC could be more efficient but is not required for V1 scale

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed, versions confirmed from package.json
- Architecture: HIGH — directly derived from existing project patterns in prior phases
- Pitfalls: HIGH — derived from reading actual codebase (e.g., Open Chat button currently pushes wrong route)
- Chat list query: MEDIUM — pattern is correct but the exact PostgREST syntax for "latest message per group" was not verified against Context7

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable stack — Supabase JS and Expo Router rarely introduce breaking changes in minor versions)
