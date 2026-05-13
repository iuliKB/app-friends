# Phase 33: Friend Profile Redesign - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the **friend profile screen** at `src/app/friends/[id].tsx` — the screen shown when tapping a friend (friends list, member list, message-author chip, home card, etc.). Three improvement axes locked:

1. **Visual polish** — Telegram-style scrollable header with blurred-avatar wash, big avatar that shrinks into the title on scroll, iOS-style grouped insets with Messenger-style colorful round leading icons on every row.
2. **More information shown** — bio (new column), Friends since, mutual plans count, mutual friends count, shared photos count, IOU balance, status pill — beyond today's name/avatar/birthday/status/wish-list.
3. **More actions available** — quick-action icon row under the header (Message / Mute / Photos / More), full-screen avatar viewer on tap, More overflow ActionSheet for Remove Friend.

**Out of scope (explicitly):**
- DM info screen (tapping a DM title to see chat info) — separate phase.
- Plan info screen (tapping a plan title to see plan info) — separate phase.
- Block feature (blocked_users table, RLS, RPC, Block UI) — future moderation/safety phase.
- Profile QR / share-contact.
- Editing on the Profile tab (bio editor lives in the existing `/profile/edit` modal screen only).

</domain>

<decisions>
## Implementation Decisions

### Header & Layout
- **D-01:** Header scroll behavior — **Telegram-style**. Avatar starts large (~140px) at the top of the screen and shrinks into the navigation title bar as the user scrolls. Concrete animation library is Claude's discretion (likely `useAnimatedScrollHandler` from Reanimated, which is already in the stack).
- **D-02:** Header backdrop — **blurred-avatar wash** (Telegram-style). The friend's avatar image, blurred and dimmed, fills the header area behind the avatar circle. Falls back to `surface.elevated` (theme token) when the friend has no avatar.
- **D-03:** Section layout — **Option A: Telegram grouped insets + Messenger-style colorful round leading icons**. Each section is a rounded rectangle (`surface.elevated` background, ~16px inset margin, ~12px row separator hairline). Every row gets a small colored circular leading icon (~32px) with the icon color matching the row's semantic meaning (green for shared photos, violet for mutual plans, etc. — exact palette derived during `/gsd-ui-phase`).
- **D-04:** Primary action placement — **Telegram-style icon-button row under the header**, NOT a `PrimaryButton` and NOT a sticky bottom bar. Row contains Message / Mute / Photos / More (see D-09).

### Information Shown
- **D-05:** Add **`bio TEXT` column** to `profiles` table via **Migration 0025** (nullable, ~160 char cap enforced client-side initially — DB CHECK constraint optional, planner's call). User edits their own bio.
- **D-06:** Section content:
  - **INFO** section rows: bio (if non-null), Friends since (from `friendships.created_at`), Birthday (existing `birthday_month/day/year`), Timezone (existing `timezone` column).
  - **MUTUAL** section rows: Mutual plans count (tappable → list), Mutual friends count (tappable → list), Shared photos count (tappable → grid), IOU balance (tappable → existing per-friend expenses view).
- **D-07:** Status pill placed **directly under the display name** — compact status-color tinted pill (e.g. `● Free · lunch break`). Reuses the home-screen status pill component family.
- **D-08:** IOU balance row in MUTUAL section, backed by existing `useExpensesWithFriend`. Tap navigates to the existing per-friend expenses screen — no new IOU UI in this phase.

### Quick Actions Row
- **D-09:** All four quick-action icon buttons shown under the header — **Message** (uses Phase 30 `openChat()` helper), **Mute** (toggles `chat_settings.is_muted` for the DM channel; reuses Phase 1 chat-settings shape), **Photos** (opens shared-photos grid filtered to mutual plans with this friend), **More** (⋯ overflow opens ActionSheet via existing `src/lib/action-sheet.ts`).
- **D-10:** **Block feature DEFERRED** entirely — no `blocked_users` table, no Block menu item in this phase. Future moderation/safety phase will own this.
- **D-11:** Destructive actions (Remove Friend) live **only in the More (⋯) overflow ActionSheet** — no DANGER grouped inset section. Screen layout ends after the MUTUAL section.
- **D-12:** Tap the big header avatar → **full-screen avatar viewer modal**, swipe-down to dismiss. Reuses Phase 16 image lightbox component (`MediaLightbox` or equivalent — research to confirm name).

### Scope: Schema + Migration Debt
- **D-13:** **Migrate this screen to TanStack Query** as part of this phase. Replace the `useState + useEffect + supabase.from('profiles').select(...)` block at `src/app/friends/[id].tsx:50-87` with a new `useFriendProfile(friendId)` hook backed by `useQuery`. Follows Phase 31 Pattern 5 (queryKey: `queryKeys.friends.profile(friendId)`). Cross-screen reactivity falls out for free via shared cache keys.
- **D-14:** Bio editor lives in the **existing `/profile/edit` screen** (`src/app/profile/edit.tsx`) — single text field with char counter, written via the same RPC/update path the screen already uses for `display_name`. No new edit route.
- **D-15:** Realtime updates — **status-only**, via the existing `subscribeHomeStatuses` from Phase 31-03. The new `useFriendProfile` query shares the `effective_status` slice via a shared cache key strategy. **No new `realtimeBridge.subscribeFriendProfile`** subscription in this phase.
- **D-16:** Loading / error states — reuse existing `ErrorDisplay` component (Phase 25 AUTH-03 pattern) with retry that calls `queryClient.invalidateQueries({ queryKey: queryKeys.friends.profile(friendId) })`. Skeleton loading uses `SkeletonPulse` (Phase 24).

### Claude's Discretion
- Exact route / grid for the shared-photos viewer (could reuse `/memories` with a `?friendId=` filter, or a new `/friends/[id]/photos` route — researcher recommends).
- Skeleton layout shape (use `SkeletonPulse`; arrangement is Claude's call).
- Header collapse animation timing — use Phase 24 animation tokens (`ANIMATION.timing.normal` etc.); exact curve is Claude's call.
- Ionicons names for the Messenger-style leading icons on each row (Ionicons is the project default per Phase 32 precedent).
- Friend-not-found edge case (RLS returns empty for removed friend) — Claude picks a sensible fallback (route back / show "no longer your friend" inside ErrorDisplay).
- Bio textarea char-counter behavior on `/profile/edit` (counter, soft warning, hard cap — small UX call).
- AvatarCircle changes if any are needed to support the new ~140px header size + blurred-wash backdrop.

### Folded Todos
None — no pending todos matched this phase's scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Target file
- `src/app/friends/[id].tsx` — the screen being redesigned (current shape: ScrollView with avatar/name/birthday/status/Message button/Remove Friend link/wish list section).

### Hooks & data sources
- `src/hooks/useFriendWishList.ts` — already TanStack-queried; stays on this screen.
- `src/hooks/useExpensesWithFriend.ts` — source for the IOU balance row.
- `src/hooks/useFriendsOfFriend.ts` — source for mutual-friends count (needs intersection with own friends list).
- `src/hooks/useAllPlanPhotos.ts` — source for shared-photos count (needs friend-filter helper).
- `src/hooks/useStatus.ts` — Phase 31-06 hybrid pattern, gives current status for the freshness pill.

### Phase-31 cache & realtime conventions
- `src/lib/queryClient.ts` — `createQueryClient` factory (Phase 31-01).
- `src/lib/queryKeys.ts` — extend with `friends.profile(friendId)`, `friends.mutualPlans(friendId)`, `friends.mutualFriends(friendId)`, `friends.sharedPhotos(friendId)`, `friends.iouBalance(friendId)`. Whether to namespace under `friends.*` or split is the planner's call.
- `src/lib/realtimeBridge.ts` — `subscribeHomeStatuses` is the existing channel that surfaces status freshness; no new subscriptions added.
- `src/hooks/README.md` — Phase 31 / 32 boundary doc, mutationShape conventions.

### Routing & chat-entry
- `src/lib/openChat.ts` — Phase 30 helper. The Message quick action calls `openChat(router, { kind: 'dmFriend', friendId, friendName })` — exact shape already used in the current `handleStartDM` on this screen.
- `src/lib/action-sheet.ts` — used for the More (⋯) overflow.

### Shared components
- `src/components/common/AvatarCircle.tsx` — header avatar (will need a `~140px` size variant + tap handler).
- `src/components/common/ErrorDisplay.tsx` — Phase 25 standardized error UI.
- `src/components/common/PrimaryButton.tsx` — kept for the bio textarea CTA on `/profile/edit`.
- `src/components/common/SkeletonPulse.tsx` — Phase 24 loading skeleton.
- `src/components/squad/WishListItem.tsx` — already used; stays.

### Theme & tokens
- `src/theme/index.ts` (and friends — `colors`, `SPACING`, `FONT_SIZE`, `FONT_FAMILY`, `RADII`, animation tokens). All styling MUST be tokenized (v1.6 `useTheme()` + `useMemo([colors])` pattern).

### Prior-phase context
- `.planning/phases/13-profile-rework-friend-profile/` — original friend profile delivery in v1.5 (predates the redesign).
- `.planning/phases/29-home-screen-overhaul/29-UI-SPEC.md` — v1.8 visual-design pattern (skeleton, pulse, animation tokens, colorful accent palette).
- `.planning/phases/29.1-habits-to-do-features/29.1-CONTEXT.md` — Bento tile colorful-accent precedent the row icons should match.
- `.planning/phases/30-unify-navigation-source-of-truth-and-chat-entry-handlers/CONTEXT.md` — `openChat()` contract.
- `.planning/phases/31-adopt-tanstack-query-for-server-state-caching-and-cross-scre/CONTEXT.md` — TSQ Pattern 5, queryKeys taxonomy, realtimeBridge shape.
- `.planning/phases/32-chat-list-reactivity-widget-send-reliability-and-last-entry-/CONTEXT.md` — Ionicons precedent + sender-attribution patterns.

### Schema migrations
- `supabase/migrations/` — new `0025_add_profile_bio.sql` to be authored by the planner (single column `bio TEXT NULL`, no RLS change needed since profile rows are already SELECT-able by friends).
- `src/types/database.ts` — regeneration deferred per Phase 31 precedent (use `(supabase as any)` cast at the bio read/write sites until next codegen run).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AvatarCircle** — supports `size`, `imageUri`, `displayName` fallback. Will need a `~140px` size variant + an optional `onPress` for the full-screen viewer. Possibly an `onLoad` callback so the blurred-wash backdrop can fade in once the image is decoded.
- **ErrorDisplay** (Phase 25) — standardized retry UX; consumed by all data-fetching screens since AUTH-03.
- **SkeletonPulse** (Phase 24) — drop-in shimmer; use for the avatar circle + name + section rows during initial load.
- **WishListItem** — read-only mode already supported; no changes needed.
- **openChat()** (Phase 30) — `kind: 'dmFriend'` variant handles get-or-create-DM and push; current screen already uses it. Stays.
- **action-sheet.ts** — top-level helper (not a hook), works outside the React tree. Suitable for the More (⋯) overflow.
- **Phase 16 image lightbox** — used for chat-media full-screen view; reuse for full-screen avatar.
- **Phase 31 realtimeBridge** — `subscribeHomeStatuses` already pushes status updates into the `effective_status` query slice; the new `useFriendProfile` shares that slice via shared cache key.

### Established Patterns
- **`useTheme()` + `StyleSheet.create` inside `useMemo([colors])`** (v1.6) — required for any new component.
- **TanStack Query Pattern 5** (Phase 31) — `useQuery` for reads, `useMutation` with `onMutate` snapshot + `onError` rollback + `onSettled` invalidate for writes. Bio-edit mutation lives on `/profile/edit`, NOT on the friend profile screen.
- **`mutationShape` regression gate** (Phase 31 `src/hooks/__tests__/mutationShape.test.ts`) — any new `useMutation` block this phase introduces (bio edit) must follow the canonical shape or carry an `// @mutationShape: no-optimistic` exemption marker with rationale.
- **`(supabase as any)` cast** at read/write sites that reference yet-to-be-codegen'd columns (e.g., `bio`) — precedent in Phase 32-01 (polls table) + Phase 29.1 hooks.
- **Ionicons** for icon buttons + leading row icons (Phase 32 precedent: `image-outline`, `stats-chart-outline`, `checkbox-outline`).
- **Stack screen header** rendered by expo-router `<Stack.Screen options={{ title }} />` — current screen pattern stays, but the title should be empty / a faded version of the name when the big avatar is visible, and the full name when the user has scrolled past the avatar (collapse animation).

### Integration Points
- **`src/app/friends/[id].tsx`** — primary target file.
- **`src/app/profile/edit.tsx`** — add bio text field + counter.
- **`supabase/migrations/0025_*.sql`** — new bio column migration.
- **`src/lib/queryKeys.ts`** — extend `friends.*` taxonomy (concrete keys are the planner's call).
- **`src/hooks/useFriendProfile.ts`** — NEW hook (useQuery). Replaces inline fetch.
- **`src/hooks/useFriendMutuals.ts`** — NEW hook for mutual plans + mutual friends counts (or two separate hooks — planner picks).
- **`src/hooks/useSharedPhotos.ts`** — NEW hook OR extension of `useAllPlanPhotos` with friend-filter param.
- **`src/components/friends/`** — new components for header chrome, action-icon-button, grouped-inset section, info row. Folder may need to be created.
- **`src/types/database.ts`** — regen deferred; `(supabase as any)` cast in the meantime.

</code_context>

<specifics>
## Specific Ideas

- **Visual reference**: Telegram contact profile (large avatar with blurred wash → collapses into title) + WhatsApp contact profile (sectioned info rows with grouped insets) + Messenger thread settings (colorful round leading icons per row). The blend is Option A from the layout previews captured in `33-DISCUSSION-LOG.md`.
- **Icon colors should track Campfire's existing accent palette** — neon-green (`rgba(185,255,59,...)`) for "friends since" / shared-photos, violet for mutual plans (matches To-Dos tile accent precedent from Phase 29.1), status colors for the status pill, destructive red for Remove Friend in the More menu.
- **Status pill component** should be visually consistent with the home-screen status pill (Phase 1 v1.3.5) — same color tokens, same compact shape, same emoji-context-tag pattern.
- **Bio displays under the status pill** (or under the display name if no status set) — limited to ~3 lines visible, tappable to expand if longer.
- **No analytics / observability work** added in this phase — visual + scope only.

</specifics>

<deferred>
## Deferred Ideas

Tracked here so they don't get lost in future planning sessions:

- **DM info screen** (tap DM title to see chat info) — its own phase, scoped after this lands.
- **Plan info screen** (tap plan title to see plan info) — its own phase, scoped after this lands.
- **Block feature** — full schema (`blocked_users` table) + RLS (filter out blocked users from friends list, chat, search, Squad surfaces) + RPC + Block menu item. Belongs in a moderation/safety phase. Probably required before App Store submission.
- **Profile QR code / share contact** — Telegram-style "Share contact" / "Add by QR" — defer to a sharing phase.
- **Friend-not-found illustrated empty state** — custom copy + illustration when the friendship was removed by the other party. Generic `ErrorDisplay` handles the case acceptably for now (D-16).
- **Subscribe to friend's `profiles` UPDATE** (bio / avatar change reactivity) — current decision is status-only realtime (D-15). Future polish phase can add `subscribeFriendProfile(friendId)` if avatar/bio churn becomes a noticed gap.
- **Bio rich text / link detection** — first version is plain text. Linkifying URLs / mentions is a follow-up.
- **Self-profile redesign** to match the friend-profile redesign — out of scope; this phase only changes `/profile/edit` to add the bio field. The Profile tab itself stays as-is.
- **Audio / video calls** — not a Campfire feature direction.

### Reviewed Todos (not folded)

None — no pending todos surfaced during cross-reference.

</deferred>

---

*Phase: 33-friend-profile-redesign*
*Context gathered: 2026-05-13*
