# Phase 3: Home Screen - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

"Who's Free" home screen — the first screen users see. Shows free friends in a grid with realtime updates via Supabase Realtime, Zustand cache for instant render, and a Start Plan CTA. No plan creation (Phase 4), no DMs (Phase 5) — just the status feed and CTA stub.

</domain>

<decisions>
## Implementation Decisions

### Friend Card Design
- New `HomeFriendCard` component — separate from the friends list `FriendCard`
- **Vertical stack layout**: avatar centered on top, display name below
- **3-column grid** using `FlatList` with `numColumns={3}`
- Avatar size: 56px (larger than the 40px friends list cards)
- Display name: single line, truncate with ellipsis if too long
- No status pill on free friends (everyone in "Free Now" section is free)
- Emoji context tag: small badge overlaid on bottom-right corner of avatar circle (shown only if friend has a tag set)
- Card background: subtle `#2a2a2a` card with rounded corners
- Tapping a card does nothing in Phase 3 — interaction comes in later phases

### Two-Section Layout
- **"Free Now" section**: grid of free friends with the `HomeFriendCard` component
- **"Everyone Else" section**: same grid layout, same card component but with a `StatusPill` shown (so you can see Busy vs Maybe)
- Section headers: "X friends free now" (large bold heading) for the free section, "Everyone Else" (smaller section label) for the rest
- When no friends are free: header reads "No friends free right now", Everyone Else section still shows below
- Free friends sorted by most-recently-updated status
- Everyone Else sorted by status (Maybe → Busy), then alphabetical within each

### Empty State (No Friends)
- When user has zero friends: friendly onboarding message with campfire emoji
- "Add your first friends to see who's free!" with button to Add Friend screen
- Warm, cozy tone matching brand

### Header & Count
- "X friends free now" as large bold heading below the status toggle
- Subtle count transition animation when the number changes in realtime (brief scale pulse or fade)
- When zero free: "No friends free right now"

### Start Plan CTA
- Floating action button (FAB) in bottom-right corner
- Campfire orange (`#f97316`) circle/pill with "+" icon and "Start Plan" text label
- Tapping navigates to Plans tab (stub) — functional Quick Plan flow comes in Phase 4
- Consistent with Add Friend FAB pattern on friends list

### Caching & Refresh
- Zustand cache: render immediately from cache on app open, revalidate from Supabase in background
- Pull-to-refresh available via FlatList `refreshControl`
- Supabase Realtime subscription on `statuses` table filtered to friend IDs
- Subscription cleanup on unmount

### Claude's Discretion
- Exact card padding and spacing within the grid
- Pull-to-refresh indicator styling
- FAB elevation/shadow
- Count transition animation implementation (React Native Animated or LayoutAnimation)
- Section header typography sizing
- Realtime subscription filter strategy (channel per friend vs single filtered channel)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `.planning/PROJECT.md` — Core value ("Home screen is king"), constraints (FlatList, Zustand, no UI libs), status colours
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05
- `.planning/ROADMAP.md` — Phase 3 plans structure, success criteria

### Prior Phases
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — Established patterns (Supabase queries, Expo Router, Zustand store)
- `.planning/phases/02-friends-status/02-CONTEXT.md` — FriendCard, StatusPill, useFriends hook, status toggle decisions

### Schema
- `supabase/migrations/0001_init.sql` — `statuses` table, `get_free_friends()` RPC, `get_friends()` RPC, RLS policies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/common/AvatarCircle.tsx` — Avatar with initials fallback, supports `size` prop and `onPress`. Use for HomeFriendCard at 56px.
- `src/components/friends/StatusPill.tsx` — Coloured status pill (Free/Busy/Maybe). Use on "Everyone Else" cards.
- `src/components/status/SegmentedControl.tsx` — Status toggle already on Home screen top (Phase 2).
- `src/hooks/useFriends.ts` — `fetchFriends()` returns `FriendWithStatus[]` with status + context_tag. `get_friends()` RPC already exists.
- `src/hooks/useStatus.ts` — Status hook with loading/saving states.
- `src/constants/colors.ts` — Status colours (`COLORS.status.free/busy/maybe`), accent orange (`#f97316`), card background (`#2a2a2a`).
- `src/components/common/PrimaryButton.tsx` — For the "Add friends" button in the no-friends empty state.

### Established Patterns
- Supabase queries via `supabase.from(table).select().eq()` and `supabase.rpc()` patterns
- Zustand store pattern in `src/stores/useAuthStore.ts` — follow same pattern for home screen cache store
- React Native StyleSheet only — no UI libraries
- FlatList for all lists (project constraint)

### Integration Points
- Home tab (`src/app/(tabs)/index.tsx`) — currently has status toggle + placeholder. Replace placeholder with friend grid.
- `get_free_friends()` RPC — returns free friends, already defined in migration
- Supabase Realtime — subscribe to `statuses` table changes, filtered to friend IDs
- Plans tab (`src/app/(tabs)/plans.tsx`) — FAB navigates here (stub for now)

</code_context>

<specifics>
## Specific Ideas

- Two-section approach means the screen is never empty (unless no friends at all)
- Grid layout (3 columns) gives the home screen a distinct feel from the friends list (horizontal rows)
- Emoji tag on avatar corner is a subtle "what are they up to" signal without cluttering the card
- The "Everyone Else" section with StatusPill lets users see at a glance who might become free soon (Maybe status)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-home-screen*
*Context gathered: 2026-03-18*
