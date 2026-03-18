# Phase 4: Plans - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Quick Plan creation (<10 seconds), plan dashboard with RSVP, member list, Link Dump, IOU Notes, and Open Chat button. Plan list screen showing active plans. No chat (Phase 5), no push notifications (Phase 6) — just plan CRUD, RSVP, and text fields.

</domain>

<decisions>
## Implementation Decisions

### Quick Plan Creation Flow
- **Full-screen modal** — slides up from bottom, all fields visible at once
- Title: **smart pre-fill** — "Tonight" if before 6pm, "Tomorrow" if after 6pm. User can change it.
- Time: **native date/time picker** only (no chips). Default to **next round hour** (e.g., 3:37 PM → 4:00 PM)
- Location: **free text field** — "My place", "The park", "TBD". No location APIs.
- Friend selector: **checklist with free friends pre-checked** — FlatList of all friends with checkboxes, avatar + name + status pill. Friends with status "free" are pre-checked.
- Creator auto-added as plan member with RSVP **"going"**
- After creation: **navigate to the new plan's dashboard**
- **Home screen FAB updated**: "Start Plan" FAB opens Quick Plan creation modal directly (not Plans tab navigation)
- Plans list FAB: same orange FAB pattern as Home screen, opens Quick Plan modal

### Plan Dashboard Layout
- **Sections with headers** — 4 sections:
  1. **"Details"** — title, time, location (editable via edit button/mode, not inline)
  2. **"Who's Going"** — RSVP buttons + grouped member list
  3. **"Links"** — expandable Link Dump text area
  4. **"IOU Notes"** — expandable IOU Notes text area
- **Edit button/mode**: "Edit" button switches dashboard to edit mode where title/time/location fields become editable. **Any member can edit** (matches Phase 1 RLS decision: plans UPDATE open to any plan member)
- **"Open Chat" button**: prominent full-width button at the bottom of the dashboard. Navigates to Chat tab (stub) — functional chat comes in Phase 5
- Navigation header: plan title as header + back arrow (standard Expo Router stack)
- **Delete plan**: creator can delete from dashboard, confirmation alert "Delete this plan? This can't be undone." CASCADE deletes plan_members.

### RSVP Interaction
- **3 separate buttons** in a row: Going / Maybe / Out
- Colors: **reuse status colors** — Going = green (#22c55e), Maybe = yellow (#eab308), Out = red (#ef4444)
- **Server confirmation** (not optimistic) — wait for Supabase response, brief loading state on button
- Member list **grouped by RSVP**: "Going (3)", "Maybe (1)", "Invited (2)", "Not Going (1)" sections
- "Not Going" members shown at bottom, **dimmed** but visible
- **Creator badge**: small "Creator" label next to creator's name in member list

### Plans List Screen
- **Card per plan**: title, time (smart label + relative), location, RSVP summary ("3 going, 1 maybe"), **stacked avatar row** (overlapping circles, max 5 + "+N")
- Sorted by scheduled time (ascending — nearest plan first)
- **Only active/upcoming plans** — plans with `scheduled_for` in the past are hidden
- Empty state: **minimal** — "No active plans" text only
- FAB: orange "+" button, same pattern as Home screen, opens Quick Plan creation modal
- **Plans tab badge**: shows count of new invitations (plans where user's RSVP is "invited")

### Time Display
- Plan cards: **relative + absolute** — "In 2 hours • 7:00 PM"
- **Smart date labels**: "Today 7 PM", "Tomorrow 2 PM", "Sat, Mar 21" for further dates
- Dashboard: full date/time display

### Link Dump Behavior
- **Auto-detect URLs and make tappable** — parse URLs in text and render as tappable links
- Plain text input (TextInput multiline), save on blur, last-write-wins per PROJECT.md constraint
- Expandable section — collapsed by default, tap header to expand

### Loading & Error States
- **Standard pattern**: ActivityIndicator for loading, error text with retry button for errors
- Same patterns as Phase 2/3 — no skeleton screens in V1

### Invite Flow
- Selected friends inserted as plan_members with RSVP "invited"
- **Plans tab badge** shows count of new invitations — friends see it on next app open
- No push notification in Phase 4 (comes in Phase 6)

### Claude's Discretion
- Exact modal animation and presentation style
- Edit mode toggle UI (button placement, save/cancel flow)
- Expandable section animation
- Avatar stack overlap amount and "+N" badge styling
- Exact card spacing and typography
- URL detection regex/library choice
- Plan creation form validation (empty title handling, past time prevention)
- Delete button placement within dashboard

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `.planning/PROJECT.md` — Quick Plan <10 seconds, link dump/IOU notes plain text last-write-wins, no UI libraries
- `.planning/REQUIREMENTS.md` — Phase 4 requirements: PLAN-01 through PLAN-09
- `.planning/ROADMAP.md` — Phase 4 plans structure, success criteria

### Prior Phases
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — Auth patterns, Zustand store, Supabase queries
- `.planning/phases/02-friends-status/02-CONTEXT.md` — FriendCard, StatusPill, useFriends hook, server confirmation pattern
- `.planning/phases/03-home-screen/03-CONTEXT.md` — FAB pattern, HomeFriendCard, Zustand cache, two-section layout

### Schema
- `supabase/migrations/0001_init.sql` — `plans` table, `plan_members` table, `rsvp_status` enum (invited/going/maybe/out), RLS policies (plans_select_member, plans_insert_own, plans_update_member, plan_members_insert_creator, plan_members_update_own_rsvp)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/common/AvatarCircle.tsx` — Avatar with initials fallback, `size` prop. Use for member list and stacked avatar row.
- `src/components/common/PrimaryButton.tsx` — Accent-coloured button. Use for "Create Plan", "Open Chat", "Edit", etc.
- `src/components/friends/StatusPill.tsx` — Coloured pill. Reuse for RSVP status display in member list.
- `src/components/friends/FriendCard.tsx` — Friend card with avatar + name + status. Reuse pattern for friend selector checklist.
- `src/hooks/useFriends.ts` — `fetchFriends()` returns `FriendWithStatus[]`. Use for friend selector (pre-check free friends).
- `src/hooks/useHomeScreen.ts` — Pattern for Supabase data fetching + Zustand caching.
- `src/stores/useHomeStore.ts` — Zustand store pattern to follow for plans store.
- `src/constants/colors.ts` — Status colours reusable for RSVP (Going=green, Maybe=yellow, Out=red).
- `src/screens/home/HomeScreen.tsx` — FAB implementation pattern (absolute positioning, accent orange, icon + label).

### Established Patterns
- Supabase queries via `supabase.from(table).select().eq()` and `supabase.rpc()` patterns
- Server confirmation for mutations (Phase 2 status updates, Phase 2 friend requests)
- Zustand store for caching (useHomeStore pattern)
- FlatList for all lists (project constraint)
- React Native StyleSheet only — no UI libraries
- Expo Router file-based routing

### Integration Points
- Plans tab (`src/app/(tabs)/plans.tsx`) — currently a stub, replace with plans list
- Home screen FAB (`src/screens/home/HomeScreen.tsx`) — update to open Quick Plan modal directly
- Tab bar badge — add invitation count to Plans tab icon
- `plans` table + `plan_members` table — already in Supabase schema with RLS
- `rsvp_status` enum — `invited`, `going`, `maybe`, `out`

</code_context>

<specifics>
## Specific Ideas

- Smart title pre-fill ("Tonight" / "Tomorrow") matches the "spontaneous plans" vision
- RSVP colors matching status colors creates a consistent mental model across the app
- Grouped member list by RSVP makes it instantly clear who's committed
- Stacked avatar row on plan cards gives a social, warm feel
- Plans tab badge for invitations provides discoverability without push notifications
- Auto-detect URLs in Link Dump adds real utility for sharing restaurant links, addresses, etc.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-plans*
*Context gathered: 2026-03-18*
