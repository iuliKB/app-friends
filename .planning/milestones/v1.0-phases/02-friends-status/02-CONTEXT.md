# Phase 2: Friends + Status - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Friend system (search by username, send/accept/reject requests, friends list with status indicators, QR code add) and daily availability status (Free/Busy/Maybe segmented control with emoji context tags). No home screen feed, no plans, no chat — those are Phase 3+.

</domain>

<decisions>
## Implementation Decisions

### Friend Search
- Dedicated "Add Friend" screen opened from FAB button on friends list
- Add Friend screen has two tabs: **Search** and **QR**
- Search tab: type username, results show profile card (avatar, username, display name) with "Add Friend" button
- Empty search state: "Search by username to add friends" placeholder text
- After sending request: button changes to greyed-out "Pending" state
- Search uses existing `supabase.from('profiles').select()` pattern

### Friend Requests
- Separate requests screen accessible from **two paths**:
  1. Badge icon in friends list header with count
  2. "Friend Requests (N)" row on Profile tab
- Accept/reject: Claude's discretion on button style (two buttons, swipe, etc.)
- After accept: friend appears in friends list immediately

### Friends List
- Accessed from Profile tab: "My Friends (N)" row → opens full friends list screen
- Each friend card: AvatarCircle + display name + coloured status pill (Free/Busy/Maybe)
- Sorted: status first (Free → Busy → Maybe), then alphabetical within each group
- Tap friend card → bottom sheet with quick actions: View profile, Start DM, Remove friend
- FAB button (bottom-right) to open Add Friend screen
- Empty state: friendly illustration + "Add your first friend" with button to search/QR

### Status Toggle
- **Full segmented control** appears in two places:
  1. Top of Home screen (quick toggle — same full-size segmented control)
  2. Profile tab (full toggle with emoji picker)
- iOS-style segmented control with 3 segments: Free / Busy / Maybe
- Status text on coloured background pill (not dots — the segment fills with status colour)
- Status update: **wait for server confirmation** (show brief loading, not optimistic)

### Emoji Context Tags
- Claude's discretion on layout (e.g. horizontal row below the segmented control)
- 8 preset emojis: ☕️ 🎮 🏋️ 🍕 🎵 🎉 🎬 😴
- Tap to set, tap again to clear
- Emoji displays next to status on friend cards in later phases

### QR Code
- **My QR Code**: accessible from Profile tab ("My QR Code" button) → shows user's QR code prominently with scan option below
- **Scan QR**: on Add Friend screen's QR tab — live camera scanner with a hint note: "Ask your friend to show their QR code (found on their Profile tab)"
- QR encodes: user UUID only (scanning app looks up the profile)
- After scanning: show scanned user's profile card with "Add Friend" button — user confirms before request is sent
- QR generation: use `react-native-qrcode-svg` or similar Expo Go-compatible library
- QR scanning: use `expo-camera` with `onBarcodeScanned`

### Claude's Discretion
- Accept/reject button design on requests screen
- Emoji picker exact layout (row below toggle vs expandable)
- Bottom sheet styling for friend card actions
- QR code visual styling (colours, size, branding)
- Loading indicators during friend request operations
- Remove friend confirmation flow

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `.planning/PROJECT.md` — Core value, constraints, status colours
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: FRND-01–07, STAT-01–04
- `.planning/ROADMAP.md` — Phase 2 plans structure

### Phase 1 Context
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — Established patterns (FormField, AvatarCircle, etc.)

### Research
- `.planning/research/STACK.md` — expo-camera for QR scanning, library compatibility
- `.planning/research/PITFALLS.md` — Friendship table RLS recursion prevention (SECURITY DEFINER helper)
- `.planning/research/ARCHITECTURE.md` — Supabase RPC patterns for friend queries

### Schema
- `supabase/migrations/0001_init.sql` — friendships table, statuses table, RLS policies, is_friend_of() helper, get_friends() RPC, get_free_friends() RPC

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/common/AvatarCircle.tsx` — Avatar with initials fallback, supports onPress. Use for friend cards.
- `src/components/common/PrimaryButton.tsx` — Accent-coloured button. Use for "Add Friend", "Save" actions.
- `src/components/auth/FormField.tsx` — Text input with label/error/helper. Use for search input.
- `src/components/common/OfflineBanner.tsx` — Already wired in root layout.
- `src/lib/username.ts` — generateUsername utility.
- `src/stores/useAuthStore.ts` — Zustand store pattern (session, loading, setters). Follow same pattern for friends/status stores.
- `src/constants/colors.ts` — Status colours defined: `status.free` (#22c55e), `status.busy` (#ef4444), `status.maybe` (#eab308).

### Established Patterns
- Supabase queries via `supabase.from(table).select().eq()` pattern
- Non-blocking auth state callbacks (`.then()` instead of `await` in listeners)
- Expo Router file-based routing: `src/app/(tabs)/` for tabs, top-level for standalone screens
- React Native StyleSheet only — no UI libraries

### Integration Points
- Profile tab (`src/app/(tabs)/profile.tsx`) — add "My Friends", "Friend Requests", "My QR Code" rows
- Home tab (`src/app/(tabs)/index.tsx`) — add status toggle at top (currently a stub)
- Database: `friendships` table with RLS, `statuses` table, `is_friend_of()` SECURITY DEFINER helper
- RPC: `get_friends()` and `get_free_friends()` already defined in migration

</code_context>

<specifics>
## Specific Ideas

- Add Friend screen has Search + QR as tabs (not separate screens)
- QR scan tab should have a hint: "Ask your friend to show their QR code (found on their Profile tab)"
- Friends list FAB button for add friend — consistent with mobile conventions
- Two entry points to friend requests: badge on friends list + row on Profile tab
- Status toggle on Home screen is the same full segmented control as on Profile tab (not a compact version)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-friends-status*
*Context gathered: 2026-03-18*
