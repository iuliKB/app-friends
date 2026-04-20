# Phase 13: Profile Rework + Friend Profile - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a cleaner Profile tab (status removed, notifications consolidated, edit paths separated, wish list top-level) and enrich the existing friend profile screen with freshness-aware status, birthday display, and wish list.

**In scope:** `src/app/(tabs)/profile.tsx` restructure, `src/app/profile/edit.tsx` split, new wish list management screen, `src/app/friends/[id].tsx` data enrichment.

**Out of scope:** Username editing (read-only in this phase), new notification types, friend profile social actions beyond what exists today.

</domain>

<decisions>
## Implementation Decisions

### Profile tab — status removal (PROF-01)
- **D-01:** Remove the "YOUR STATUS" section header and `MoodPicker` component entirely from `profile.tsx`. Status entry point is the home screen status pill only.

### Profile tab — notifications consolidation (PROF-02)
- **D-02:** Collapse the existing SETTINGS section (plan invites toggle, friend availability toggle) and MORNING PROMPT section into a single "NOTIFICATIONS" section header. All three toggles — plan invites, friend availability, morning prompt — live under this one header. The morning prompt time picker row and denied hint text remain directly below the morning prompt toggle row, within the same section.

### Profile tab — edit path split (PROF-03)
- **D-03:** Avatar tap on the profile tab triggers the photo picker directly (inline — no screen navigation). The pencil overlay remains on the avatar as the affordance. No `router.push` to any edit screen from the avatar tap.
- **D-04:** A separate "Edit Profile" tappable row (below the avatar/name/username block, before ACCOUNT section) navigates to a text-only detail editor screen.
- **D-05:** The detail editor screen contains: display name text field, @username displayed read-only (for context, not editable), birthday picker. No avatar, no wish list on this screen.
- **D-06:** Username is **read-only** in this phase. No uniqueness validation needed. Show @username as non-interactive text in the detail editor.

### Profile tab — wish list (new top-level entry point)
- **D-07:** Add a "My Wish List" tappable row to the profile tab (logical placement: after the Edit Profile row, before ACCOUNT). Navigates to a dedicated wish list management screen at a new route (e.g., `/profile/wish-list`).
- **D-08:** The wish list management screen contains the add/delete wish list item functionality currently in `profile/edit.tsx`. This code moves to the new dedicated screen.

### Friend profile screen — data enrichment (PROF-04, PROF-05)
- **D-09:** Switch status data source from `statuses` table to `effective_status` view. `effective_status` can return NULL when the friend's status has expired (DEAD state). Display NULL as no status indicator shown (omit the status row entirely or show "Status unavailable" — Claude's discretion on exact copy).
- **D-10:** Add birthday display below the username on the friend profile screen. Only render if birthday_month and birthday_day are non-null. Format: "🎂 Month Day" (e.g., "🎂 Aug 14") or equivalent. Year is not displayed.
- **D-11:** Add wish list section below the action buttons on the friend profile screen. Use `useFriendWishList` hook (already exists). Display using `WishListItem` component (read-only view — no claim/vote interactivity in this context, just viewing). If the friend has no items, show an empty state message.
- **D-12:** Back navigation from friend profile already works (`router.back()` is in place at the Expo Router Stack level). No changes needed — success criterion SC-5 is already satisfied by the existing route structure.

### Claude's Discretion
- Exact placement of "Edit Profile" and "My Wish List" rows within the profile tab section order (between avatar block and ACCOUNT section is the intent).
- Copy for null/expired status on friend profile ("Status unavailable", empty, or other — pick what reads most naturally).
- Whether the detail editor reuses `profile/edit.tsx` route (gutted to text-only) or becomes a new route like `/profile/edit-details`. Prefer reusing the existing route to avoid Expo Router rerouting work.
- Styling and section label for the friend profile wish list (match existing birthday screen pattern or simpler).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files being modified
- `src/app/(tabs)/profile.tsx` — current profile tab; restructuring sections, adding wish list row, splitting avatar tap from Edit Profile row
- `src/app/profile/edit.tsx` — current comprehensive editor; stripping to details-only (display name, @username read-only, birthday); moving wish list out
- `src/app/friends/[id].tsx` — current friend profile; switching status source, adding birthday + wish list

### Reusable hooks and components
- `src/hooks/useMyWishList.ts` — wish list CRUD for own items; moves to new wish list screen
- `src/hooks/useFriendWishList.ts` — read friend's wish list; use on friend profile
- `src/components/squad/WishListItem.tsx` — wish list item row component; reuse on friend profile
- `src/components/status/MoodPicker.tsx` — being removed from profile tab

### Status freshness pattern
- `src/hooks/useHomeScreen.ts` — see how `effective_status` view is queried with `from('effective_status').select(...)` — replicate this pattern on friend profile

### Project constraints
- `.planning/PROJECT.md` §Constraints — Expo Go managed workflow, no UI libraries, TypeScript strict, RLS is security, design tokens required

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AvatarCircle` (80px, onPress prop) — already used on profile; pass `onPress={handleChangeAvatar}` directly without navigating to edit screen
- `BirthdayPicker` component — stays on the stripped-down edit screen
- `WishListItem` + `useFriendWishList` — drop in on friend profile for wish list display
- `PrimaryButton`, `ScreenHeader`, `SectionHeader` — all reusable for new wish list screen
- `effective_status` view — query pattern already established in `useHomeScreen.ts`

### Established Patterns
- Profile tab sections: uppercase label via `sectionHeader` style, rows via `row` style (52px minHeight, border bottom, icon + label + trailing)
- `useFocusEffect` + `useCallback` for data refetch on tab focus (already in profile.tsx — carry forward)
- `router.back()` for back navigation — already in friend profile, no change needed
- New screens in profile group: add to `src/app/profile/` directory following existing `edit.tsx` pattern

### Integration Points
- Avatar photo upload stays in `profile.tsx` (move `handleChangeAvatar`, `uploadAvatar` logic from `edit.tsx` back into the tab screen, or keep inline in profile.tsx as a local handler)
- Wish list management screen route: `/profile/wish-list` — needs `src/app/profile/wish-list.tsx` + `_layout.tsx` already handles the profile group
- Friend profile birthday query: add `birthday_month, birthday_day` to the profiles SELECT in `friends/[id].tsx`

</code_context>

<specifics>
## Specific Ideas

- "Edit Profile" row on profile tab: use existing `row` + chevron pattern (same as QR Code row), label "Edit Profile", navigates to `/profile/edit`
- "My Wish List" row: same row pattern, label "My Wish List", navigates to `/profile/wish-list`
- Avatar tap on profile tab: `onPress={handleChangeAvatar}` directly on the TouchableOpacity wrapping the avatar — same `Alert.alert('Change Photo', ...)` pattern currently in `edit.tsx`
- Friend profile status: query `from('effective_status').select('effective_status, context_tag')` — NULL effective_status means expired, omit status row

</specifics>

<deferred>
## Deferred Ideas

- Username editing — PROF-03 lists username but user decided read-only for this phase. Potential Phase 15+ addition.
- Claim/vote interactivity on friend profile wish list — full claim/vote lives in birthday group chat context; friend profile shows read-only list only
- Status freshness badge (FADING/DEAD visual distinction) on friend profile — effective_status NULL is sufficient signal for now

</deferred>

---

*Phase: 13-profile-rework-friend-profile*
*Context gathered: 2026-04-20*
