# Architecture Research

**Domain:** Social coordination mobile app (React Native + Expo + Supabase)
**Researched:** 2026-03-17
**Confidence:** HIGH (Expo Router auth patterns from official docs, Supabase patterns from official docs + verified examples)

---

## Standard Architecture

Campfire is a serverless mobile app. There is no backend server. All logic lives in Postgres (RLS + RPC functions) or Supabase Edge Functions for external integrations (push notifications). The client is a React Native Expo app using Expo Router for file-based navigation.

```
┌─────────────────────────────────────────────────────────────┐
│                     Campfire (Expo Go)                       │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  Expo Router │   │    Zustand   │   │  Supabase SDK   │  │
│  │  (navigation)│   │  (UI state)  │   │  (data layer)   │  │
│  └──────┬───────┘   └──────┬───────┘   └────────┬────────┘  │
│         │                  │                     │           │
│  ┌──────▼───────────────────────────────────────▼────────┐  │
│  │              Custom Hooks Layer                        │  │
│  │  useStatuses │ useFriends │ useChats │ usePlans │ ...  │  │
│  └──────────────────────────────┬─────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────┘
                                  │ HTTPS / WebSocket
┌─────────────────────────────────▼───────────────────────────┐
│                         Supabase                             │
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │    Auth    │  │   Postgres   │  │      Realtime        │ │
│  │ (GoTrue)   │  │  + RLS + RPC │  │  (statuses table     │ │
│  └────────────┘  └──────────────┘  │   V1 only)           │ │
│                                    └──────────────────────┘ │
│  ┌────────────┐  ┌──────────────┐                           │
│  │  Storage   │  │ Edge Functions│                          │
│  │ (avatars)  │  │ (push notifs) │                          │
│  └────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Expo Router | File-based navigation, protected route guards, tab/stack layout | React components, Zustand (auth state) |
| Zustand stores | Ephemeral UI state only: modals, loading flags, optimistic status toggle, draft text | Expo Router (auth guard), components |
| Custom hooks | Data fetching, subscription lifecycle, error handling, loading state | Supabase SDK, Zustand (write UI flags) |
| Supabase SDK | Auth sessions, database queries, realtime channels, storage URLs | Supabase backend |
| Supabase Auth (GoTrue) | JWT issuance, OAuth (Google), session refresh, `auth.uid()` in RLS | Supabase Postgres, Edge Functions |
| Supabase Postgres + RLS | All persistent data; policies enforce friend-only visibility | Supabase Auth |
| Supabase RPC functions | Complex atomic operations: send_friend_request, accept_request, create_plan | Postgres internals |
| Supabase Realtime | Push status change events to subscribed clients (statuses table, V1) | Postgres WAL |
| Supabase Storage | Avatar images (public read, owner write) | Supabase Auth for upload policy |
| Edge Functions (Deno) | Expo push notification delivery (requires external HTTP calls) | Expo Push API |

---

## Recommended Project Structure

Based on official Expo guidance (src directory, routes-only in app/, components outside):

```
campfire/
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── supabase/
│   ├── migrations/          # Postgres schema migrations
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   └── ...
│   ├── functions/           # Edge Functions (push notifs)
│   │   └── notify/
│   │       └── index.ts
│   └── seed.sql             # Dev seed data
├── src/
│   ├── app/                 # ROUTES ONLY — no components here
│   │   ├── _layout.tsx      # Root layout: SessionProvider, font loading
│   │   ├── (auth)/          # Route group: unauthenticated screens
│   │   │   ├── _layout.tsx  # Stack navigator, redirects if session exists
│   │   │   ├── sign-in.tsx
│   │   │   └── sign-up.tsx
│   │   └── (tabs)/          # Route group: authenticated screens
│   │       ├── _layout.tsx  # Tab navigator, redirects if no session
│   │       ├── index.tsx    # Home: "Who's Free" status feed
│   │       ├── plans.tsx    # Plans list
│   │       ├── chat.tsx     # Chat list (DMs + group chats)
│   │       ├── squad.tsx    # Squad Goals (stub)
│   │       └── profile.tsx  # Own profile + settings
│   ├── screens/             # Heavy screen components (routes import these)
│   │   ├── home/
│   │   │   ├── index.tsx    # StatusFeed component
│   │   │   └── StatusCard.tsx
│   │   ├── plans/
│   │   │   ├── PlanList.tsx
│   │   │   ├── PlanDetail.tsx
│   │   │   └── CreatePlan.tsx
│   │   ├── chat/
│   │   │   ├── ChatList.tsx
│   │   │   ├── ChatRoom.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── friends/
│   │   │   ├── FriendList.tsx
│   │   │   └── AddFriend.tsx
│   │   └── profile/
│   │       ├── ProfileView.tsx
│   │       └── EditProfile.tsx
│   ├── components/          # Reusable UI atoms/molecules
│   │   ├── StatusBadge.tsx  # Free/Busy/Maybe badge
│   │   ├── Avatar.tsx
│   │   ├── Button.tsx
│   │   └── EmptyState.tsx
│   ├── hooks/               # Data-fetching and realtime hooks
│   │   ├── useSession.ts    # Auth session from Supabase
│   │   ├── useStatuses.ts   # Friend statuses + realtime sub
│   │   ├── useFriends.ts    # Friend list, requests
│   │   ├── usePlans.ts      # Plans CRUD
│   │   ├── useChat.ts       # Messages (DM or group)
│   │   └── useProfile.ts    # Own profile read/write
│   ├── stores/              # Zustand stores — ephemeral UI state only
│   │   ├── useAuthStore.ts  # session object, loading flag
│   │   ├── useStatusStore.ts # optimistic status toggle, local cache
│   │   └── useUIStore.ts    # modal visibility, bottom sheet state
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client singleton
│   │   └── notifications.ts # Expo push token registration
│   ├── types/
│   │   ├── database.ts      # Generated Supabase types (supabase gen types)
│   │   └── app.ts           # App-level types (Status, Plan, Friend, etc.)
│   └── constants/
│       ├── colors.ts        # Status colors + brand palette
│       └── config.ts        # App-wide constants
└── assets/
    ├── fonts/
    └── images/
```

### Key Structural Rules

- `src/app/` contains only route files (`_layout.tsx`, page files). No component logic.
- `src/screens/` holds the actual component trees that route files import. This keeps routes thin.
- `src/hooks/` are the data layer: each hook manages loading state, error state, and calls Supabase directly (no React Query).
- `src/stores/` hold only what cannot be derived from a Supabase query: UI toggles, optimistic updates, draft state.
- `src/lib/supabase.ts` exports a single Supabase client instance — never instantiate it elsewhere.
- `supabase/` lives at the project root alongside `src/`, not inside it.

---

## Architectural Patterns

### Pattern 1: Expo Router Protected Routes with Supabase Session

The root `_layout.tsx` bootstraps the session and gates the two route groups:

```tsx
// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const { session, setSession } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Stack>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
```

When `session` changes (login/logout), Expo Router automatically navigates to the correct group. No manual `router.push()` needed.

### Pattern 2: Data-Fetching Hook (no React Query)

Each hook owns its loading state, executes on mount, and exposes a refetch function. This pattern is the substitute for React Query in this codebase:

```tsx
// src/hooks/useStatuses.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { FriendStatus } from '@/types/app';

export function useStatuses(userId: string) {
  const [statuses, setStatuses] = useState<FriendStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('statuses')
      .select('user_id, status, emoji_tag, updated_at, profiles(username, avatar_url)')
      .in('user_id', [userId, ...friendIds]);  // friendIds from RLS-filtered query

    if (error) setError(new Error(error.message));
    else setStatuses(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { statuses, loading, error, refetch: fetch };
}
```

### Pattern 3: Realtime Subscription with Cleanup

Only the home screen subscribes to realtime in V1. The channel filters to friend IDs to respect the free-tier 2M message budget.

```tsx
// src/hooks/useStatuses.ts (realtime addition)
useEffect(() => {
  if (friendIds.length === 0) return;

  const channel = supabase
    .channel('friend-statuses')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'statuses',
        filter: `user_id=in.(${friendIds.join(',')})`,
      },
      (payload) => {
        setStatuses((prev) =>
          prev.map((s) =>
            s.user_id === payload.new.user_id ? { ...s, ...payload.new } : s
          )
        );
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [friendIds]);
```

Important: The `in` filter accepts up to 100 values. For Campfire's 3–15 person groups, this is safe.

Note: The filter column (`user_id`) must exist in the table's replica identity for filters to work. Use `ALTER TABLE statuses REPLICA IDENTITY FULL;` during migration.

### Pattern 4: Optimistic Status Toggle with Zustand

The status toggle must feel instant (home screen is king). Write to Zustand immediately; let the Supabase write confirm asynchronously. Realtime will reconcile if it fails.

```tsx
// src/stores/useStatusStore.ts
import { create } from 'zustand';
import type { Status } from '@/types/app';

interface StatusStore {
  localStatus: Status | null;
  setLocalStatus: (s: Status) => void;
  clearLocalStatus: () => void;
}

export const useStatusStore = create<StatusStore>((set) => ({
  localStatus: null,
  setLocalStatus: (s) => set({ localStatus: s }),
  clearLocalStatus: () => set({ localStatus: null }),
}));
```

Component reads: `localStatus ?? serverStatus` — local override wins until cleared on confirmed write or error rollback.

### Pattern 5: Supabase RPC for Atomic Operations

Use Postgres functions (RPC) for multi-table writes that must be atomic. Friend requests touch both `friend_requests` and potentially `friendships`:

```tsx
// src/hooks/useFriends.ts
async function sendFriendRequest(targetUsername: string) {
  const { error } = await supabase.rpc('send_friend_request', {
    target_username: targetUsername,
  });
  if (error) throw new Error(error.message);
}
```

The Postgres function handles: lookup by username, duplicate check, insert into friend_requests, all within a single transaction.

### Pattern 6: RLS Friend-Visibility Pattern

Every table that contains friend-scoped data uses a policy that checks the friendships table:

```sql
-- Allow users to read their friends' statuses
create policy "read_friend_statuses"
on statuses for select
to authenticated
using (
  user_id = (select auth.uid())
  or user_id in (
    select case
      when user_a = (select auth.uid()) then user_b
      else user_a
    end
    from friendships
    where user_a = (select auth.uid()) or user_b = (select auth.uid())
      and status = 'accepted'
  )
);
```

The `(select auth.uid())` wrapping is a Supabase performance recommendation — it caches per-statement rather than calling the function on every row.

### Pattern 7: Supabase Client Singleton

```tsx
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@/types/database';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

`expo-secure-store` is the correct storage adapter for Expo managed workflow. It works in Expo Go without native modules.

---

## Data Flow

### Auth Flow

```
App launch
  → RootLayout mounts
  → supabase.auth.getSession() (async)
  → setSession() in useAuthStore
  → Expo Router Stack.Protected evaluates guard
  → Routes to (tabs) if session, (auth) if null
  → onAuthStateChange subscription keeps session live for token refresh
```

### Status Update Flow (Home Screen)

```
User taps status toggle
  → setLocalStatus(newStatus) in useStatusStore [immediate, renders instantly]
  → supabase.from('statuses').upsert({...}) [background write]
  → On success: clearLocalStatus() [server state now canonical]
  → On error: rollback localStatus, show toast

Friends see update:
  → Supabase WAL detects UPDATE on statuses
  → Realtime broadcasts to channel 'friend-statuses'
  → Each subscribed friend's useStatuses hook receives payload
  → setStatuses() with merged update
  → FlatList re-renders StatusCard
```

### Chat Message Flow

```
User sends message
  → supabase.from('messages').insert({chat_id, sender_id, content})
  → RLS verifies sender is chat participant
  → Other participants: useChat hook polls OR (Phase 6) realtime sub
  → FlatList appends message at bottom

V1 note: Chat does NOT use realtime (realtime budget reserved for statuses).
         Users see new messages on screen focus or manual pull-to-refresh.
```

### Friend Request Flow

```
User enters username → taps Add
  → supabase.rpc('send_friend_request', { target_username })
  → Postgres function: looks up user, checks no existing request/friendship, inserts
  → RLS on friend_requests: both parties can read their own requests
  → Target user: sees pending request in FriendList on next load
  → Accept: supabase.rpc('accept_friend_request', { request_id })
  → Postgres function: inserts into friendships, deletes from friend_requests
```

### State Management Summary

| Data type | Where it lives | Rationale |
|-----------|---------------|-----------|
| Auth session (JWT) | Zustand + SecureStore | Must persist across restarts; Supabase SDK manages refresh |
| Friend statuses | React component state (from useStatuses hook) | Server-sourced; Zustand only for optimistic override |
| Chat messages | React component state (from useChat hook) | Server-sourced, no client cache needed |
| Plans list | React component state (from usePlans hook) | Server-sourced |
| Own status (optimistic) | Zustand (useStatusStore) | Instant UI feedback before server confirms |
| Modal / sheet visibility | Zustand (useUIStore) | Pure UI, no server data |
| Unsent message draft | Zustand or local useState | Ephemeral; lost on navigation is acceptable |

---

## Scaling Considerations

| Concern | At launch (3–15 users/group) | At 1K groups | At 10K groups |
|---------|------------------------------|--------------|---------------|
| Realtime connections | 1 channel per active user. Supabase free tier: 200 concurrent connections. Fine. | Approach free tier limit. Add `filter: in.(...)` to narrow broadcasts. | Migrate statuses realtime to Broadcast (lower overhead than postgres_changes) |
| Realtime message volume | Each status update = 1 message/group × ~10 friends. Well within 2M/month free tier. | Monitor in Supabase dashboard. Set budget alerts. | Switch to Broadcast + server-side fan-out via Edge Function |
| Database reads | `SELECT *` avoided by design. Indexed by user_id, friend pairs. | Add read replicas if needed (Supabase Pro). | Partition statuses by created_at if table grows large |
| RLS policy cost | Friend lookup subquery on every read. For small friend lists this is negligible. | Index friendships(user_a, user_b) covers the subquery. | Consider materializing friend_ids in a denormalized column for hot tables |
| Storage | Avatars: 1 upload per user. 1GB free tier easily covers thousands of users. | Implement image resize via Edge Function on upload. | Storage Pro tier |
| Push notifications | Edge Function calls Expo Push API synchronously on nudge. Fine. | Queue notifications (pg_cron or Supabase Queues) to avoid Edge Function timeouts. | Background worker |

---

## Anti-Patterns

### Anti-Pattern 1: Zustand as a Server Cache

**What goes wrong:** Storing fetched Supabase data in Zustand (e.g., `useStatusStore.statuses = [...]`) and updating it manually.
**Why bad:** Two sources of truth. Race conditions between optimistic updates and realtime events. Cache invalidation becomes a full-time job.
**Instead:** Keep server data in React component state via custom hooks. Zustand holds only: the optimistic delta (localStatus), UI flags (modalOpen), and the auth session.

### Anti-Pattern 2: Multiple Supabase Client Instances

**What goes wrong:** Calling `createClient()` inside a component or hook renders multiple instances with separate connection pools and auth state.
**Why bad:** Multiple WebSocket connections, session desync, duplicate realtime events.
**Instead:** Single singleton in `src/lib/supabase.ts`, imported everywhere.

### Anti-Pattern 3: Client-Side Friendship Filtering

**What goes wrong:** Fetching all statuses and filtering in JavaScript to only show friends.
**Why bad:** Exposes all users' data to the client. Violates the RLS-as-security principle.
**Instead:** RLS policies enforce friend-only visibility at the database layer. The client never sees data it shouldn't.

### Anti-Pattern 4: Realtime on Every Table

**What goes wrong:** Adding Supabase Realtime subscriptions to messages, plans, and statuses from day one.
**Why bad:** Exhausts free-tier 2M message budget. Complex subscription lifecycle management. Premature optimization.
**Instead:** V1 realtime only on statuses. Chat uses fetch-on-focus. Plans use pull-to-refresh. Add realtime per table only when UX explicitly requires it.

### Anti-Pattern 5: ScrollView + .map() for Lists

**What goes wrong:** Using `<ScrollView>{items.map(...)}</ScrollView>` for any list that could grow.
**Why bad:** All items render immediately, no virtualization, memory bloat on long chat histories.
**Instead:** FlatList with `keyExtractor`, `getItemLayout` (when item height is fixed), and `removeClippedSubviews`.

### Anti-Pattern 6: Business Logic in Components

**What goes wrong:** RPC calls, permission checks, and data transformations embedded in component JSX.
**Why bad:** Untestable, duplicated across screens, hard to change.
**Instead:** Custom hooks own data-fetching logic. RPC calls via named functions in hooks. Components receive data and call handlers.

### Anti-Pattern 7: Raw `SELECT *` Queries

**What goes wrong:** `supabase.from('profiles').select('*')` fetches all columns.
**Why bad:** Over-fetches on free-tier bandwidth. Reveals schema to client. Slow on wide tables.
**Instead:** Always specify column names: `.select('id, username, avatar_url, status')`.

### Anti-Pattern 8: Sequential Auth State Check + Router Push

**What goes wrong:** Checking `if (!session) router.push('/sign-in')` in every protected screen's `useEffect`.
**Why bad:** Flash of unprotected content, duplicated logic, navigation state pollution.
**Instead:** Single `Stack.Protected` guard in the root layout handles all routing. No per-screen redirect logic needed.

---

## Integration Points

### Internal Boundaries

```
src/app/         → imports from src/screens/ (route files are thin shells)
src/screens/     → imports from src/hooks/, src/components/, src/stores/
src/hooks/       → imports from src/lib/supabase.ts, src/types/, src/stores/
src/stores/      → imports from src/types/ only (no circular dependencies)
src/lib/         → imports from src/types/ only
```

No component should import from another component's screen folder. Shared UI goes to `src/components/`.

### External Services

| Service | Integration Point | Auth Method | Notes |
|---------|------------------|-------------|-------|
| Supabase Auth | `src/lib/supabase.ts`, `useSession` hook | Anon key + JWT | Google OAuth requires Supabase OAuth config + Expo AuthSession |
| Supabase DB | All data hooks via Supabase SDK | JWT (auto from session) | RLS policies enforce all access |
| Supabase Realtime | `useStatuses` hook, statuses table only (V1) | JWT (auto) | Channel: `friend-statuses`, filter: `user_id=in.(...)` |
| Supabase Storage | `useProfile` hook (avatar upload/read) | JWT for upload, public URL for read | Bucket: `avatars`, public read |
| Supabase Edge Functions | `src/lib/notifications.ts` | Service role key (server-side only) | Expo Push API call for nudges |
| Expo Push API | Via Supabase Edge Function | Expo push token (stored in profiles table) | Edge Function: `supabase/functions/notify/` |
| Google OAuth | Via Expo AuthSession + Supabase OAuth | OAuth2 flow | Redirect URI must be configured in both Supabase and Google Cloud Console |

### Supabase RPC vs Edge Function Decision Rule

| Logic type | Use |
|------------|-----|
| Multi-table atomic write (friend request, plan create with invites) | RPC (Postgres function) |
| Data transformation on read (aggregates, joins) | RPC |
| External HTTP call (Expo Push API, email) | Edge Function |
| Background/scheduled job | Edge Function + pg_cron |
| Simple CRUD | Direct SDK query from hook |

---

## Suggested Build Order

Dependencies drive this order. Each layer must exist before the layer above it can be built.

```
1. Foundation
   ├── Supabase project creation + env vars
   ├── supabase client singleton (src/lib/supabase.ts)
   └── TypeScript types generation (supabase gen types typescript)

2. Database Schema + RLS
   ├── profiles, friendships, friend_requests tables
   ├── statuses table (with realtime enabled)
   ├── plans, plan_invites, messages, chats tables
   └── All RLS policies (friend visibility pattern)

3. Auth Layer
   ├── Root _layout.tsx with session bootstrapping
   ├── (auth) route group: sign-in, sign-up screens
   ├── useAuthStore (Zustand: session, loading)
   └── Google OAuth configuration

4. Profile + Friends
   ├── useProfile hook (read/update own profile)
   ├── useFriends hook (list, add, accept, reject)
   ├── Avatar upload to Supabase Storage
   └── QR code generation for friend add

5. Statuses (Core Feature)
   ├── useStatuses hook (fetch + realtime subscription)
   ├── useStatusStore (optimistic toggle)
   ├── Home screen StatusFeed with FlatList
   └── StatusBadge component (Free/Busy/Maybe colors)

6. Plans
   ├── usePlans hook (CRUD + RSVP)
   ├── create_plan RPC (atomic plan + invites)
   └── Plan detail: link dump, IOU notes (last-write-wins upsert)

7. Chat
   ├── useChat hook (DMs + group chats)
   ├── ChatRoom screen with FlatList (inverted)
   └── Nudge action (triggers Edge Function → Expo Push)

8. Polish
   ├── Push notification token registration
   ├── Edge Function: notify
   ├── Seed data (supabase/seed.sql)
   └── Squad Goals stub tab
```

---

## Sources

- [Expo Router Authentication Docs](https://docs.expo.dev/router/advanced/authentication/) — Protected routes pattern, Stack.Protected guard
- [Expo App Folder Structure Best Practices](https://expo.dev/blog/expo-app-folder-structure-best-practices) — Official Expo blog on directory organization
- [Expo Router Core Concepts](https://docs.expo.dev/router/basics/core-concepts/) — File-based routing, route groups, layouts
- [Supabase Realtime: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) — Filter syntax (eq, in), replica identity, channel cleanup
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — Policy patterns, auth.uid() optimization
- [Supabase with Expo React Native (Official Quickstart)](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — Client setup, SecureStore adapter
- [Supabase Edge Functions vs RPC](https://www.closefuture.io/blogs/supabase-database-vs-edge-functions) — Decision guide for server logic placement
- [FlatList Optimization Guide](https://www.obytes.com/blog/a-guide-to-optimizing-flatlists-in-react-native) — keyExtractor, getItemLayout, removeClippedSubviews
- [Zustand in React Native](https://blog.peslostudios.com/blog/zustand-state-management-in-react-native/) — Store slices, ephemeral state patterns
