# Phase 33: Friend Profile Redesign — Research

**Researched:** 2026-05-13
**Domain:** React Native (Expo SDK 55) — friend profile screen UX + TanStack Query Pattern 5 migration + Supabase profile column addition
**Confidence:** HIGH on all locked decisions; MEDIUM-HIGH on cache wiring; MEDIUM on shared-photos route recommendation (preference call, not technical blocker)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Header & Layout**
- **D-01:** Header scroll behavior — **Telegram-style**. Avatar starts ~140px and shrinks into the navigation title bar as the user scrolls. Library is Claude's discretion (UI-SPEC locks `useAnimatedScrollHandler` from Reanimated v4).
- **D-02:** Header backdrop — **blurred-avatar wash** (Telegram-style). Falls back to `surface.elevated` (theme token) when no avatar.
- **D-03:** Section layout — **Option A: Telegram grouped insets + Messenger-style colorful round leading icons**. Rounded rectangle per section, ~16px inset, ~12px row separator hairline, ~32px tinted circular leading icon per row.
- **D-04:** Primary action placement — **Telegram-style icon-button row under the header**. Row: Message / Mute / Photos / More.

**Information Shown**
- **D-05:** Add **`bio TEXT` column** to `profiles` via **Migration 0025** (nullable, ~160 char cap enforced client-side; DB CHECK constraint optional).
- **D-06:** Section content:
  - **INFO**: bio (when non-null), Friends since (`friendships.created_at`), Birthday, Timezone.
  - **MUTUAL**: Mutual plans count (tappable), Mutual friends count (tappable), Shared photos count (tappable), IOU balance (tappable).
- **D-07:** Status pill **directly under the display name** — reuses home-screen StatusPill family.
- **D-08:** IOU balance row in MUTUAL section, backed by `useExpensesWithFriend`; tap opens existing per-friend expenses screen.

**Quick Actions Row**
- **D-09:** All four quick-action buttons: **Message** (Phase 30 `openChat()`), **Mute** (toggles `chat_preferences.is_muted` for the DM channel), **Photos** (opens shared-photos grid filtered to mutual plans), **More** (⋯ overflow opens ActionSheet via `src/lib/action-sheet.ts`).
- **D-10:** **Block feature DEFERRED** entirely.
- **D-11:** Destructive Remove Friend lives ONLY in the More overflow ActionSheet. Screen ends after MUTUAL section.
- **D-12:** Tap big avatar → **full-screen avatar viewer modal**. Reuses Phase 16 image lightbox (research confirms: `ImageViewerModal`).

**Schema + Migration Debt**
- **D-13:** **Migrate this screen to TanStack Query**. Replace inline fetch at `src/app/friends/[id].tsx:50-87` with new `useFriendProfile(friendId)` hook. Follow Phase 31 Pattern 5.
- **D-14:** Bio editor lives in **existing `/profile/edit` screen** — text field with char counter.
- **D-15:** Realtime — **status-only**, via existing `subscribeHomeStatuses` from Phase 31-03. Shared cache key with `effective_status` slice.
- **D-16:** Loading / error — reuse `ErrorDisplay` with retry that calls `invalidateQueries({ queryKey: queryKeys.friends.profile(friendId) })`. Skeleton uses `SkeletonPulse`.

### Claude's Discretion
- Exact route / grid for shared-photos viewer (reuse `/memories?friendId=` vs new `/friends/[id]/photos`).
- Skeleton layout shape (use `SkeletonPulse`; arrangement Claude's call).
- Header collapse animation timing (use Phase 24 animation tokens).
- Ionicons names for row leading icons.
- Friend-not-found edge case copy.
- Bio textarea char-counter behavior (soft warning vs hard cap).
- AvatarCircle changes for ~140px + onPress.

### Deferred Ideas (OUT OF SCOPE)
- DM info screen.
- Plan info screen.
- Block feature (`blocked_users` table, RLS, RPC, Block menu item, Block UI).
- Profile QR / share-contact.
- Subscribe to friend's `profiles` UPDATE (bio/avatar Realtime).
- Bio rich text / link detection / mentions.
- Self-profile (Profile tab) redesign.
- Audio / video calls.
- New `realtimeBridge.subscribeFriendProfile` subscription.
- Friend-not-found illustrated empty state (generic ErrorDisplay sufficient).
- Analytics / observability events.
</user_constraints>

<phase_requirements>
## Phase Requirements

No formal REQ-IDs assigned. Must-haves derived from CONTEXT.md D-01..D-16 and the UI-SPEC component inventory:

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-FP-01 | Replace inline fetch in `src/app/friends/[id].tsx` with `useFriendProfile(friendId)` useQuery hook | §Technical Approach → useFriendProfile; §Phase-31 Cache Wiring Plan |
| REQ-FP-02 | Add `bio TEXT NULL` column to `profiles` via Migration `0027` (NOT 0025 — those numbers are taken) | §Code-level Confirmations → Migration number conflict |
| REQ-FP-03 | Add bio TextInput + char counter to `/profile/edit.tsx`; save via new `useUpdateMyBio` Pattern-5 mutation | §Technical Approach → Bio editor |
| REQ-FP-04 | Render Telegram-style header: 140pt avatar collapses to 32pt in nav title via Reanimated v4 `useAnimatedScrollHandler` | §Technical Approach → Header collapse |
| REQ-FP-05 | Render blurred-avatar wash backdrop using `expo-image` `blurRadius={40}` over a `LinearGradient` overlay | §Technical Approach → Blurred backdrop |
| REQ-FP-06 | Render QuickActionsRow with Message / Mute / Photos / More buttons; wire Message → `openChat(...)`, Mute → `chat_preferences.is_muted`, More → `showActionSheet` | §Technical Approach → Quick actions |
| REQ-FP-07 | Render INFO + MUTUAL grouped-inset sections with colorful leading icons per UI-SPEC palette | §Technical Approach → Sections |
| REQ-FP-08 | Mutual plans / mutual friends / shared photos / IOU balance backed by new hooks; counts tap into existing/new routes | §Technical Approach → Mutual hooks; §Recommendations → Shared-photos route |
| REQ-FP-09 | Tap big avatar → `ImageViewerModal` (Phase 16 lightbox confirmed) | §Code-level Confirmations → Lightbox |
| REQ-FP-10 | Status surfaced via `useFriendProfile` sharing the `queryKeys.home.friends(myUserId)` slice that `subscribeHomeStatuses` already invalidates | §Phase-31 Cache Wiring Plan → Status sharing |
| REQ-FP-11 | More → ActionSheet → Remove Friend → confirm Alert → optimistic remove from `queryKeys.friends.list(myUserId)` → `router.back()` | §Technical Approach → Remove Friend |
| REQ-FP-12 | Friend-not-found fallback (RLS returns empty rows) → ErrorDisplay with "Back to friends" CTA | §Recommendations → Friend-not-found fallback |
</phase_requirements>

---

## Summary

This phase is **scoped well**: every load-bearing pattern already exists in the codebase. The work is almost entirely *composition* — wiring proven primitives into a new visual shell. The only genuinely new artifacts are the seven new components from the UI-SPEC, three new hooks (`useFriendProfile`, `useFriendMutuals`, `useUpdateMyBio`), and one column migration.

Three things the planner needs to know up front, because they contradict text in the discussion log / CONTEXT / UI-SPEC:

1. **Migration number conflict.** CONTEXT.md and UI-SPEC say "Migration 0025." That number is already taken (`0025_fix_habits_select_invitee.sql`). The next free number is **`0027_add_profile_bio.sql`** (0026 is also taken). [VERIFIED: `ls supabase/migrations/`]

2. **`subscribeHomeStatuses` invalidates `queryKeys.home.friends(userId)`, not a per-friend status key.** The "shared cache slice" referenced in D-15 / UI-SPEC is a *list* of all friend statuses keyed by the current user. `useFriendProfile` should read its `effective_status` for the friend out of this same cache (already populated by `useHomeScreen` / `useFriends`), NOT issue its own `from('effective_status').single()` call when the home cache is fresh. The realtime invalidation will then surface in `useFriendProfile` via cache subscription. [VERIFIED: `src/lib/realtimeBridge.ts:344-378`, `src/hooks/useFriends.ts:117-132`]

3. **Profiles SELECT RLS is `USING (true)` — anyone authenticated can read any profile.** The "friend-not-found via RLS empty" framing in D-16 / UI-SPEC is incorrect: removing a friendship does NOT hide the profile. What disappears is the row in `friendships` (and therefore `friendships.created_at`). The fallback logic must key off "no `friendships` row" not "no `profiles` row." [VERIFIED: `supabase/migrations/0001_init.sql:CREATE POLICY profiles_select_authenticated`]

**Primary recommendation:** Treat the plan as five composable workstreams in this order — (1) Migration `0027` + bio editor on `/profile/edit`, (2) `useFriendProfile` + `useFriendMutuals` + `useUpdateMyBio` hooks with queryKeys taxonomy additions, (3) shared visual components (Header / BlurredWash / QuickActionsRow / GroupedInsetSection / ProfileInfoRow / BioRow), (4) `FriendProfileScreen` rewrite wiring everything together, (5) tests + mutationShape gate verification.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Profile read (display_name, username, avatar_url, birthday, timezone, bio) | API / Backend (Supabase) | — | `profiles` table is RLS-gated; SELECT is `USING (true)` for authenticated users — direct table read. |
| Effective status read for friend | Database (view) | API / Backend | `effective_status` view computes alive/expired in SQL; client reads the row. |
| Friendship `created_at` (Friends since) | API / Backend | — | `friendships.created_at` already returned by `get_friends()` RPC for the caller. |
| Mutual plans count | API / Backend | Database | Server-side intersection: caller's `plan_members` ∩ friend's `plan_members`. RLS already gates membership. |
| Mutual friends count | API / Backend | Database | Server-side: caller's `get_friends()` ∩ `get_friends_of(friendId)`. |
| Shared photos count | API / Backend | Database | Server-side: `plan_photos` filtered to mutual plan ids. |
| IOU balance row | API / Backend | — | Existing `useExpensesWithFriend` hook (already TanStack-Q'd) returns shared expense aggregate. |
| Bio write | API / Backend | — | `profiles_update_own` policy already allows owner update. Mutation lives on `/profile/edit`. |
| Header collapse animation | Client (Reanimated v4) | — | Scroll-driven `useAnimatedScrollHandler` + `useSharedValue` + `interpolate` — pure UI thread. |
| Blurred backdrop | Client (expo-image native blur) | — | `expo-image` `blurRadius={40}` runs native GPU blur — no JS thread tax. |
| Full-screen avatar viewer | Client (Modal) | — | Existing `ImageViewerModal` component owns its own state. |
| Mute toggle | API / Backend (upsert) | Client (optimistic) | `chat_preferences` upsert mirroring the existing ChatListScreen pattern. |
| Remove Friend | API / Backend (DELETE) | Client (optimistic + cache invalidation) | `friendships_delete_participant` policy permits either side. |
| Action sheet (More overflow) | Client | — | Top-level `showActionSheet()` helper — works outside React tree. |

---

## Validation Architecture

Phase 33 has automated and manual coverage. The mutationShape gate, queryKeys taxonomy, and hook unit tests are automated. Header animation, full-screen viewer, ActionSheet, and visual polish are **manual hardware smoke** (Reanimated 4 + native modal behavior is not reliable in jsdom tests, and the existing repo pattern is to manual-test these per Phase 29 SkeletonPulse + Phase 29.1 BentoCard precedent).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest 30.x + React Native Testing Library 13.x |
| Config file | `jest.config.js` (root) |
| Quick run command | `npm test -- --testPathPatterns=useFriendProfile` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-FP-01 | `useFriendProfile` returns profile + status; shares cache slice with home; refetches on invalidate | unit | `npm test -- --testPathPatterns=useFriendProfile` | ❌ Wave 0 |
| REQ-FP-02 | Migration 0027 applies cleanly; bio column nullable; profile rows still SELECT-able | manual (psql up/down on local supabase) | n/a | ❌ Wave 0 (manual gate) |
| REQ-FP-03 | `useUpdateMyBio` follows canonical Pattern 5; invalidates `queryKeys.friends.profile(myId)` and own profile cache | unit | `npm test -- --testPathPatterns=useUpdateMyBio` | ❌ Wave 0 |
| REQ-FP-04 | Header collapse interpolation values match spec at offsets 0, 80, 160 | manual hardware (animation flickers in mocked Reanimated) | n/a | ❌ Wave 0 |
| REQ-FP-05 | Blurred wash renders; fades in on `onLoad`; falls back to `surface.card` when avatar null | manual hardware | n/a | ❌ Wave 0 |
| REQ-FP-06 | Quick actions row: Message opens DM; Mute toggles `chat_preferences.is_muted`; Photos navigates; More opens ActionSheet | unit (handler-level) + manual (visual + haptics) | `npm test -- --testPathPatterns=FriendProfileScreen` | ❌ Wave 0 |
| REQ-FP-07 | INFO / MUTUAL grouped-inset sections render with correct row visibility (bio/birthday/timezone conditional; mutual rows always present with "None yet" when zero) | unit (RTL render assertions) | `npm test -- --testPathPatterns=FriendProfileScreen` | ❌ Wave 0 |
| REQ-FP-08 | `useFriendMutuals` returns correct counts; mutual rows tappable only when count > 0 | unit | `npm test -- --testPathPatterns=useFriendMutuals` | ❌ Wave 0 |
| REQ-FP-09 | Tap big avatar → `ImageViewerModal` opens with `imageUrl={profile.avatar_url}` | unit (state assertion) + manual (modal animation) | `npm test -- --testPathPatterns=FriendProfileScreen` | ❌ Wave 0 |
| REQ-FP-10 | Status pill reflects `effective_status` from the shared `queryKeys.home.friends(myId)` slice when present, falls back to dedicated read when home cache is empty | unit | `npm test -- --testPathPatterns=useFriendProfile.statusSharing` | ❌ Wave 0 |
| REQ-FP-11 | Remove Friend confirm Alert → optimistic remove from `friends.list(myId)` → `router.back()`; rollback on DELETE error | unit (handler-level) | `npm test -- --testPathPatterns=FriendProfileScreen.removeFriend` | ❌ Wave 0 |
| REQ-FP-12 | Friend-not-found: when `friendships` returns empty for the pair, screen renders ErrorDisplay with "Back to friends" CTA | unit | `npm test -- --testPathPatterns=FriendProfileScreen.friendNotFound` | ❌ Wave 0 |
| GATE-mutationShape | New `useUpdateMyBio` passes the regression gate (mutationFn + onMutate + onError + onSettled) | unit | `npx jest --testPathPatterns=mutationShape --no-coverage` | ✅ exists at `src/hooks/__tests__/mutationShape.test.ts` |
| GATE-queryKeys | New `friends.profile / mutualPlans / mutualFriends / sharedPhotos / iouBalance` keys are unique and follow taxonomy convention | unit | `npm test -- --testPathPatterns=queryKeys` (planner adds if not present) | ❓ check at plan time |

### Sampling Rate

- **Per task commit:** `npm test -- --testPathPatterns="<modified file>"`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green; manual hardware smoke pass for animation + modal flows recorded in PROGRESS.md before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/__tests__/useFriendProfile.test.ts` — covers REQ-FP-01, REQ-FP-10
- [ ] `src/hooks/__tests__/useFriendMutuals.test.ts` — covers REQ-FP-08
- [ ] `src/hooks/__tests__/useUpdateMyBio.test.ts` — covers REQ-FP-03 + mutationShape gate
- [ ] `src/app/friends/__tests__/[id].test.tsx` (or `src/screens/.../FriendProfileScreen.test.tsx`) — covers REQ-FP-06, REQ-FP-07, REQ-FP-09, REQ-FP-11, REQ-FP-12
- [ ] Mock additions in `src/__mocks__/reanimated.js` already include `useReducedMotion` per Phase 29.1-04 precedent — no new mock work required
- [ ] Mock additions in `src/__mocks__/theme.js` — already includes everything needed per Phase 30-04 (FONT_WEIGHT + RADII.pill); no further work

### Invariants

These must hold at the end of every wave:

1. **No raw `useState + useEffect + supabase.from('profiles').select()`** remains in `src/app/friends/[id].tsx` — replaced by `useFriendProfile` (REQ-FP-01).
2. **No inline `queryKey: [...]` arrays** — all new keys reached through `queryKeys.friends.*` factory.
3. **`useUpdateMyBio` passes mutationShape gate** OR carries `// @mutationShape: no-optimistic` with rationale.
4. **`profiles_select_authenticated` RLS unchanged** — bio reads work for any authenticated user (anyone in your `get_friends()` already can SELECT). No new RLS policy needed.
5. **Bio CHAR cap enforced** at one location only (client `maxLength={160}` on `/profile/edit` OR a DB CHECK constraint in 0027 — not both, see Recommendations).
6. **`queryKeys.friends.detail(friendId)` is NOT reused** — that key already exists at `src/lib/queryKeys.ts:51` and is currently unused. Planner can either reuse it for the new profile read or introduce `friends.profile(friendId)` as UI-SPEC suggests. Recommendation: reuse `friends.detail(friendId)` since it's already defined and `detail` is the conventional TanStack Query name for single-entity reads (plans, expenses, habits all use `detail`).

### Threats

| Threat | STRIDE | Mitigation |
|--------|--------|-----------|
| Bio user-input renders unescaped (XSS) | Tampering | React Native `<Text>` auto-escapes — no `dangerouslySetInnerHTML` equivalent. CHECK constraint or client-side `maxLength` mitigates DoS-by-massive-bio. |
| RLS bypass via `(supabase as any)` cast | Information Disclosure | RLS is the security boundary; the `(any)` cast is purely a TypeScript ergonomics workaround for un-codegen'd columns. Verified by §Code-level Confirmations → RLS for bio. |
| Remove Friend race (both parties delete simultaneously) | Tampering | DELETE policy permits either side; second delete is a no-op (no row matched). UI optimistic delete + `router.back()` masks the race. |

---

## Technical Approach

### Header collapse animation (D-01)

**Library:** Reanimated v4 (`4.2.1` installed). Pattern verified in production at `src/screens/welcome/WelcomeScreen.tsx:55-59,280-316` — that file uses the exact stack the UI-SPEC prescribes (`useSharedValue` + `useAnimatedScrollHandler` + `interpolate` + `Extrapolation.CLAMP` + `useReducedMotion`). [VERIFIED: filesystem grep]

**Implementation pattern:**
```tsx
const scrollY = useSharedValue(0);
const scrollHandler = useAnimatedScrollHandler({
  onScroll: (e) => { scrollY.value = e.contentOffset.y; },
});

const avatarStyle = useAnimatedStyle(() => ({
  transform: [
    { scale: interpolate(scrollY.value, [0, 160], [1, 0.2286], Extrapolation.CLAMP) },
    { translateY: interpolate(scrollY.value, [0, 160], [0, -100], Extrapolation.CLAMP) },
  ],
  opacity: interpolate(scrollY.value, [0, 120, 160], [1, 1, 0], Extrapolation.CLAMP),
}));
```

`useReducedMotion()` short-circuits — verified import path in `react-native-reanimated` is the documented one [CITED: docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion]. Other Campfire files (`WelcomeScreen.tsx`, `BentoCard.tsx`) use it; pattern is established.

**The Stack header cross-fade:** `<Stack.Screen options={{ headerTransparent: true, headerTitle: () => <AnimatedNavTitle scrollY={scrollY} displayName={profile.display_name} /> }} />` — expo-router supports `headerTitle` as a render prop. Wrap in `Animated.Text` from Reanimated with a `useAnimatedStyle` driven by the same `scrollY`. ⚠️ Pitfall: expo-router *clones* the render-prop function on each navigation event — keep `AnimatedNavTitle` as a top-level component (not an inline arrow) so its identity is stable and the shared value reference survives.

### Blurred-avatar wash (D-02)

**Verified API:** `expo-image` `~55.0.9` exposes the `blurRadius` prop on `<Image>`. Confirmed by the existing import pattern at `src/components/chat/ImageViewerModal.tsx:13` and `src/components/squad/MemoriesTabContent.tsx:13`. [VERIFIED: filesystem grep]

**Why NOT `expo-blur` BlurView:** `expo-blur` (`~55.0.14`) is for blurring whatever happens to be behind it at render time — designed for "frosted-glass over scroll content" use cases. Blurring a *known static image* is correctly done with the image's own `blurRadius` prop — single texture, no compositing tax, no double-buffer.

**Fallback when `avatar_url == null`:** Render a solid `colors.surface.card` rectangle. (Note: CONTEXT.md says `surface.elevated`, but that token doesn't exist in Campfire's theme — `colors.surface.{base, card, overlay}` are the three options per `src/theme/colors.ts`. UI-SPEC line 188 explicitly maps `surface.elevated` → `colors.surface.card` and that map is correct.)

**Gradient overlay over wash:** Use `expo-linear-gradient` (`~55.0.13`, already in stack) with two stops — verified import path `import { LinearGradient } from 'expo-linear-gradient'` at `src/components/squad/MemoriesTabContent.tsx:15` and others.

### Grouped-inset sections (D-03)

Pure JSX + StyleSheet — no animation library needed. Pattern is the same iOS-grouped-inset shape used by `/profile/edit` already (`src/app/profile/edit.tsx:118-123` shows the `colors.surface.card`-backed `RADII.lg` rounded rectangle pattern). New components from UI-SPEC: `GroupedInsetSection` + `ProfileInfoRow` + `BioRow` are straightforward composites.

The "Messenger colorful leading icons" are a 32pt `View` with `borderRadius: 16` (`size/2`) + `backgroundColor: tintColor` (15% opacity) + a centered Ionicon glyph. Palette is locked verbatim in UI-SPEC §Leading-Icon Palette — researcher does not re-litigate.

### Quick Actions row (D-09)

Four `ActionIconButton` instances in a horizontal `View` with `gap: SPACING.md`. Each:

- `Message`: `onPress={() => openChat(router, { kind: 'dmFriend', friendId, friendName: profile.display_name })}` — verified signature at `src/lib/openChat.ts` (used by current screen at `[id].tsx:91-96`). [VERIFIED: filesystem read]
- `Mute`: Reads + writes `chat_preferences` table by composite key `(user_id, chat_type, chat_id)`. The DM channel id is derived via `get_or_create_dm_channel` RPC — but `openChat` already handles this in the Message flow. For Mute, the planner needs to look up the DM channel id ahead of time (either via a second hook that resolves it, or by triggering "ensure DM exists" lazily on Mute press). [VERIFIED: pattern at `src/screens/chat/ChatListScreen.tsx:99-103, 120-123`]
  - **⚠️ Planner decision:** Mute might not be cheap to wire if the user has never sent a DM. Either (a) lazily create the DM channel on first Mute press (matches Message flow), or (b) eagerly resolve `dm_channel_id` when the screen mounts (adds a second query). Recommendation: **lazy on Mute press** — Mute pre-creation of a DM channel is acceptable since it doesn't insert any messages (the channel row alone is harmless).
- `Photos`: `router.push(...)` per recommendation below.
- `More`: `showActionSheet('More', [{ label: 'Remove Friend', destructive: true, onPress: () => confirmRemoveFriend() }])` — verified signature at `src/lib/action-sheet.ts:11`.

### Bio column + bio editor (D-05, D-14)

**Migration `0027_add_profile_bio.sql`** (NOT 0025 — see §Code-level Confirmations):

```sql
-- 0027 — Add profile bio column for Phase 33.
ALTER TABLE public.profiles ADD COLUMN bio text;
-- No CHECK constraint — see RESEARCH §Recommendations §Bio CHECK constraint stance.
-- No RLS change — existing profiles_select_authenticated covers SELECT and
-- profiles_update_own covers UPDATE.
```

`src/types/database.ts` regeneration deferred per established Phase 31/32 precedent — read/write sites use `(supabase as any)` cast. Pattern: `usePoll.ts:61`, `useChatList.ts:357`, Phase 29.1 hooks. [VERIFIED: STATE.md line 165-166]

**`/profile/edit.tsx` changes:**

1. Add `bio` to the existing `select(...)` at line 45.
2. Add `const [bio, setBio] = useState('')` and `const [originalBio, setOriginalBio] = useState('')` slots mirroring the existing display_name pattern.
3. Add a third row to the unified card (line 216-273) — after Birthday — with a `<TextInput multiline />` capped at 160 chars, plus the same inline char-counter pattern shown at line 222-224.
4. Refactor the `handleSave` Supabase update at line 79-88 to call **a new `useUpdateMyBio` hook** (per UI-SPEC §Reanimated Implementation Notes line 647) — but **note:** the rest of `handleSave` (display_name + birthday) is NOT using TanStack Query today; it does a raw `supabase.from('profiles').update(...)`. The Phase 31 boundary doc allows raw writes when there's no shared cache impact, but for this phase the cleanest path is to introduce a single `useUpdateMyProfile` mutation that handles all three fields in one Pattern-5 mutation. **Planner decision needed** — see §Open Questions for Planner.

The planner may decide to keep the existing display_name+birthday raw write as-is and **only** introduce a separate `useUpdateMyBio` for the new bio field (matches Phase 31's "no scope creep" approach). The UI-SPEC line 647 explicitly names `useUpdateMyBio` (singular field), supporting that approach.

### `useFriendProfile(friendId)` hook (D-13)

Single `useQuery` returning the merged shape `{ profile, friendsSince, status, contextTag, isLoading, error, refetch }`. The query function does two reads in parallel — `profiles` + `friendships` — and *optionally* a third (`effective_status`) only when the home cache is empty (see §Phase-31 Cache Wiring Plan → Status sharing).

Public shape:

```ts
export interface FriendProfileData {
  profile: { display_name: string; username: string; avatar_url: string | null; birthday_month: number | null; birthday_day: number | null; birthday_year: number | null; timezone: string | null; bio: string | null } | null;
  friendsSince: string | null; // ISO timestamp from friendships.created_at
  status: StatusValue | null;
  contextTag: string | null;
  statusExpiresAt: string | null;
  lastActiveAt: string | null;
}

export function useFriendProfile(friendId: string): {
  data: FriendProfileData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};
```

Query body sketch:

```ts
const myId = useAuthStore(s => s.session?.user?.id) ?? null;
const queryClient = useQueryClient();

const query = useQuery({
  queryKey: queryKeys.friends.detail(friendId), // OR friends.profile — see invariant 6
  queryFn: async () => {
    if (!myId) return null;

    // 1. Profile row (RLS: profiles_select_authenticated → always returns row if id exists)
    const profileResult = await (supabase as any)
      .from('profiles')
      .select('display_name, username, avatar_url, birthday_month, birthday_day, birthday_year, timezone, bio')
      .eq('id', friendId)
      .maybeSingle();

    // 2. Friendship row to extract friends_since (and confirm friendship still exists)
    const friendshipResult = await supabase
      .from('friendships')
      .select('created_at')
      .or(`and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`)
      .eq('status', 'accepted')
      .maybeSingle();

    // 3. Status — prefer the shared home slice; fall back to direct read
    const homeStatuses = queryClient.getQueryData<StatusRow[]>(queryKeys.home.friends(myId));
    let statusRow = homeStatuses?.find(s => s.user_id === friendId) ?? null;
    if (!statusRow) {
      const res = await supabase
        .from('effective_status')
        .select('user_id, effective_status, context_tag, status_expires_at, last_active_at')
        .eq('user_id', friendId)
        .maybeSingle();
      statusRow = res.data ?? null;
    }

    if (!friendshipResult.data) return { profile: profileResult.data, friendsSince: null, /* triggers friend-not-found */ ... };
    return { profile: profileResult.data, friendsSince: friendshipResult.data.created_at, status: statusRow?.effective_status ?? null, ... };
  },
  enabled: !!myId && !!friendId,
});
```

⚠️ The "shared home slice" read is *opportunistic* — it benefits the home → friend-profile navigation path (the cache is warm) but is not required for correctness. When the user opens the friend profile from a deep link / chat message tap, the home cache may be empty; the fallback `from('effective_status').single()` covers it.

### Mutual counts (`useFriendMutuals`)

Single hook returning `{ mutualPlansCount, mutualFriendsCount, sharedPhotosCount, sharedPlanIds, isLoading }`. The `sharedPlanIds` array is the key input for the shared-photos viewer route — having it computed here lets the Photos quick-action route pass it as a param (or look it up via cache key) instead of re-computing.

Three parallel reads inside the query function:

```ts
// (a) mutualPlansCount — caller's plan_members ∩ friend's plan_members
const [myPlans, friendPlans] = await Promise.all([
  supabase.from('plan_members').select('plan_id').eq('user_id', myId),
  supabase.from('plan_members').select('plan_id').eq('user_id', friendId),
]);
const myPlanSet = new Set((myPlans.data ?? []).map(r => r.plan_id));
const sharedPlanIds = (friendPlans.data ?? []).filter(r => myPlanSet.has(r.plan_id)).map(r => r.plan_id);
const mutualPlansCount = sharedPlanIds.length;

// (b) mutualFriendsCount — caller's get_friends() ∩ get_friends_of(friendId)
//     Both already cached: queryKeys.friends.list(myId) + queryKeys.friends.ofFriend(friendId).
//     Prefer reading from cache (warm path) to save a network round-trip.
const myFriends = queryClient.getQueryData<FriendRow[]>(queryKeys.friends.list(myId)) ?? <fallback fetch>;
const friendsOfFriend = queryClient.getQueryData<FriendOfFriend[]>(queryKeys.friends.ofFriend(friendId)) ?? <fallback fetch>;
const myFriendIds = new Set(myFriends.map(f => f.friend_id));
const mutualFriendsCount = friendsOfFriend.filter(f => myFriendIds.has(f.friend_id)).length;

// (c) sharedPhotosCount — plan_photos filtered to sharedPlanIds
if (sharedPlanIds.length === 0) {
  return { mutualPlansCount, mutualFriendsCount, sharedPhotosCount: 0, sharedPlanIds: [] };
}
const photos = await supabase.from('plan_photos').select('id', { count: 'exact', head: true }).in('plan_id', sharedPlanIds);
const sharedPhotosCount = photos.count ?? 0;
```

`{ count: 'exact', head: true }` is the supabase-js idiom for "count without payload" — cheap. [CITED: supabase-js docs — count modes]

**Single hook vs three:** Three separate hooks would each be wasteful — they need the same `sharedPlanIds` calculation. Lock as one hook returning the bundle.

### Full-screen avatar viewer (D-12)

Use existing `ImageViewerModal` (`src/components/chat/ImageViewerModal.tsx`). Confirmed component name + path + props:

```ts
interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}
```

Already supports tap-to-dismiss backdrop + pinch-to-zoom (via internal `ScrollView` with `maximumZoomScale={4}`) + save-to-library + close button. The UI-SPEC's "swipe-down to dismiss" claim — verified — is NOT a separate handler; the backdrop tap dismisses, and the close button (X) at top-right also dismisses. There is no pan-down gesture, but the existing UX is the project's established pattern for full-screen image previews. Acceptable for v1.

### Status pill

Reuse `src/components/friends/StatusPill.tsx` verbatim. Pass `status`, `status_expires_at`, `last_active_at`, `context_tag` — the heartbeat-aware path renders the same "Free · lunch break · until 2pm" format used on Home cards. [VERIFIED: `src/components/friends/StatusPill.tsx:27-91`]

### Remove Friend (D-11)

ActionSheet item presents the existing `Alert.alert` confirmation, verbatim copy preserved from current screen (`[id].tsx:100-126`). The delete logic moves into a small mutation that follows Pattern 5 — optimistic remove from `queryKeys.friends.list(myId)` cache + invalidate on settle:

```ts
const removeMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`);
    if (error) throw error;
  },
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: queryKeys.friends.list(myId) });
    const prev = queryClient.getQueryData<FriendRow[]>(queryKeys.friends.list(myId));
    queryClient.setQueryData<FriendRow[]>(queryKeys.friends.list(myId), (old) => old?.filter(f => f.friend_id !== friendId) ?? old);
    return { prev };
  },
  onError: (_e, _v, ctx) => {
    if (ctx?.prev) queryClient.setQueryData(queryKeys.friends.list(myId), ctx.prev);
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.friends.list(myId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home.friends(myId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home.pendingRequestCount(myId) });
  },
});
```

This is canonical Pattern 5 — mutationShape gate will pass without exemption marker. After mutation success, `router.back()` to the Friends list.

---

## Code-level Confirmations

### 1. Migration number CONFLICT

CONTEXT.md says "Migration 0025" and UI-SPEC repeats it. **The next free migration number is `0027`.** [VERIFIED]

```
0024_habits_todos_v1_8.sql
0025_fix_habits_select_invitee.sql    ← already taken
0026_chat_todos_multi_scope.sql       ← already taken
0027_add_profile_bio.sql              ← USE THIS
```

### 2. Phase 16 image lightbox component name + path

**Component:** `ImageViewerModal`
**Path:** `src/components/chat/ImageViewerModal.tsx`
**Props:** `{ visible: boolean; imageUrl: string | null; onClose: () => void }`
**Existing consumer:** `src/screens/chat/ChatRoomScreen.tsx:578`

⚠️ Do NOT use `GalleryViewerModal` (`src/components/plans/GalleryViewerModal.tsx`) — that's the multi-image gallery with swipe + delete. Wrong fit for a single avatar.

### 3. `subscribeHomeStatuses` signature + cache key

```ts
// src/lib/realtimeBridge.ts:344
export function subscribeHomeStatuses(
  queryClient: QueryClient,
  userId: string,
  friendIds: string[],
): Unsubscribe
```

**Cache slice it pushes into:** `queryKeys.home.friends(userId)` — invalidates the entire friends-with-status list on any `statuses` table event. [VERIFIED: line 365]

**Channel name:** `home-statuses-${userId}` — ref-counted; multiple consumers share one channel.

**Implication for `useFriendProfile`:** This hook does NOT need to subscribe to `subscribeHomeStatuses` itself. When `useHomeScreen` or `useFriends` is mounted anywhere in the tree, the home statuses are already being kept fresh. `useFriendProfile` reads the slice opportunistically via `queryClient.getQueryData()`. When neither `useHomeScreen` nor `useFriends` is mounted (e.g., deep-link entry directly to `/friends/[id]`), the fallback direct read covers it.

**⚠️ Side note:** The planner *could* additionally call `subscribeHomeStatuses(queryClient, myId, [friendId])` inside `useFriendProfile` to ensure realtime for the single friend on deep-link entry. This is sound (the ref-count helper supports it), but is incremental scope. Recommendation: defer to a future polish phase per D-15 explicit "no new subscription."

### 4. Current shape of `src/app/friends/[id].tsx:50-87` inline fetch

The current inline fetch does TWO parallel reads via `Promise.all`:

```ts
// lines 60-83
const [profileResult, statusResult] = await Promise.all([
  supabase
    .from('profiles')
    .select('display_name, username, avatar_url, birthday_month, birthday_day')
    .eq('id', id)
    .single(),
  supabase
    .from('effective_status')
    .select('effective_status, context_tag')
    .eq('user_id', id)
    .single(),
]);
```

[VERIFIED: `src/app/friends/[id].tsx:50-87`]

This is what `useFriendProfile` replaces. Note the current code does NOT read `birthday_year`, `timezone`, or `status_expires_at` / `last_active_at` — the new hook MUST add all of these for the redesigned UI (UI-SPEC requires Timezone row + heartbeat-aware StatusPill).

### 5. `useExpensesWithFriend` shape

`useExpensesWithFriend(friendId)` returns `{ expenses: ExpenseWithFriend[]; loading; error; refetch }`. [VERIFIED: `src/hooks/useExpensesWithFriend.ts:23-28`]

For the IOU balance row, the screen needs a *summary*, not the full list. The planner can either:
- (a) Sum totals on the screen (reuses existing hook — zero new query): `const total = expenses.reduce(...)` and compute direction. Simple; verified shape includes `totalCents`, `payerName`, `isFullySettled`.
- (b) Introduce a new `useFriendIouBalance(friendId)` hook that returns `{ balanceCents: number, direction: 'owe' | 'owed' | 'settled' }`.

**Recommendation:** (a) — the existing hook is already cached + reactive, no new key required. Aggregation is cheap and reactive falls out for free.

### 6. `useFriendsOfFriend` shape

Returns `{ friends: FriendOfFriend[]; loading; error; refetch }`. The `friends` array uses RPC `get_friends_of(p_target_user)` which excludes the caller from results [VERIFIED: `supabase/migrations/0017_birthday_social_v1_4.sql:344-360`]. To compute mutual friends, intersect this array with `useFriends().friends` or read the same key out of the cache. The hook needs NO modification — it's already correctly scoped.

### 7. `useAllPlanPhotos` shape

Returns `{ groups: PlanPhotoGroup[]; recentPhotos: PlanPhotoWithTitle[]; isLoading; error; refetch; deletePhoto }`. The hook fetches *all* plans the user is in. To compute the friend-filtered shared photos count, the new `useFriendMutuals` doesn't *need* to reuse this hook — a direct `plan_photos` count with `.in('plan_id', sharedPlanIds)` is cheaper than computing in memory.

**For the shared-photos *grid view*** (when Photos quick-action is tapped), the planner can either:
- Reuse `useAllPlanPhotos` + filter to `sharedPlanIds` in the consumer screen
- Introduce a new `useSharedPhotos(friendId)` that does the filtered read

See §Recommendations for the routing decision.

### 8. `AvatarCircle` current variants

```ts
// src/components/common/AvatarCircle.tsx:5-10
interface AvatarCircleProps {
  size?: number;          // default 80
  imageUri?: string | null;
  displayName: string;
  onPress?: () => void;
}
```

**`size`** already takes any number — 140 will render correctly (`borderRadius: size / 2 = 70`). **`onPress`** is already supported via the existing `TouchableOpacity` branch. **No `onLoad` callback exists.** [VERIFIED: `AvatarCircle.tsx:1-67`]

**Required changes (minimal):**
- (a) Optionally add an `onLoad?: () => void` prop pass-through to the inner `<Image>` so `FriendProfileHeader` can fade the blurred wash on avatar decode. This is non-breaking (existing callers don't pass it).
- (b) Verify the existing `borderRadius: size / 2` calculation works correctly at 140pt — should be trivial; same formula scales.

**Not needed:** No new size variant constant, no new prop for "large" mode. The `size={140}` invocation is fine.

### 9. Phase 31 queryKeys taxonomy — exact shape

```ts
// src/lib/queryKeys.ts:48-55
friends: {
  all: () => ['friends'] as const,
  list: (userId: string) => [...queryKeys.friends.all(), 'list', userId] as const,
  detail: (friendId: string) => [...queryKeys.friends.all(), 'detail', friendId] as const,
  ofFriend: (friendId: string) => [...queryKeys.friends.all(), 'ofFriend', friendId] as const,
  pendingRequests: (userId: string) => [...queryKeys.friends.all(), 'pendingRequests', userId] as const,
  wishList: (userId: string) => [...queryKeys.friends.all(), 'wishList', userId] as const,
},
```

[VERIFIED: filesystem read]

**Recommendation: REUSE `friends.detail(friendId)`** for `useFriendProfile`. It's already declared (line 51) but currently unused. `detail` is the established taxonomy convention (used identically for plans, expenses, habits) for single-entity reads. This avoids introducing a redundant `friends.profile(friendId)` key.

**New keys to add for this phase:**

```ts
friends: {
  // ... existing keys above ...
  mutuals: (friendId: string) => [...queryKeys.friends.all(), 'mutuals', friendId] as const,
  sharedPhotos: (friendId: string) => [...queryKeys.friends.all(), 'sharedPhotos', friendId] as const,
  // iouBalance NOT a new key — reuses queryKeys.expenses.withFriend(friendId) which already exists at line 61
},
```

That's TWO new keys, not five. Cleaner taxonomy.

### 10. `useAnimatedScrollHandler` is project-confirmed

Reanimated v4 primitives are used today at `src/screens/welcome/WelcomeScreen.tsx`. The full set — `useSharedValue`, `useAnimatedScrollHandler`, `useAnimatedStyle`, `interpolate`, `Extrapolation.CLAMP`, `useReducedMotion` — is established. [VERIFIED: grep across `src/`]

The reanimated jest mock at `src/__mocks__/reanimated.js` was extended with `useReducedMotion` in Phase 29.1-04 — no additional mock work required.

### 11. Action-sheet helper signature

```ts
// src/lib/action-sheet.ts:11
export function showActionSheet(title: string, items: ActionSheetItem[]): void

interface ActionSheetItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;  // automatically maps to iOS destructiveButtonIndex
}
```

[VERIFIED: filesystem read]

Top-level function — works outside React render tree. Suitable for the More overflow. The "Cancel" item is appended automatically by the helper, do NOT include it in the items array.

### 12. `chat_preferences` table for Mute

```ts
// canonical from src/screens/chat/ChatListScreen.tsx:99-103, 120-123
await supabase.from('chat_preferences').upsert(
  { user_id: userId, chat_type: 'dm' | 'plan' | 'group', chat_id: <channelId>, is_muted: boolean, updated_at: now },
  { onConflict: 'user_id,chat_type,chat_id' },
);
```

[VERIFIED: filesystem read]

For Mute on the friend profile: `chat_type` is `'dm'`, `chat_id` is the DM channel id (NOT the friendId). Resolving DM channel id from friendId requires `get_or_create_dm_channel(p_friend_id)` RPC (already used by `openChat`'s dmFriend variant). Planner must wire this — Mute is not a single-table write; it's a [resolve DM channel] → [upsert chat_preferences] flow.

### 13. ErrorDisplay actual API (UI-SPEC drift)

UI-SPEC line 451 suggests `<ErrorDisplay heading={...} body={...} cta={...} onRetry={...} />`. **The actual component has `{ message, technicalDetails?, mode?, onRetry? }`.** [VERIFIED: `src/components/common/ErrorDisplay.tsx:6-11`]

Mapping:
- `heading` + `body` collapse to a single `message` string.
- `cta` text is hardcoded as "Try Again" in screen mode (line 67). No prop to override.

**Planner action:** Either (a) update the screen copy to fit `ErrorDisplay`'s actual API ("Couldn't load profile — check your connection and try again"), or (b) extend `ErrorDisplay` to take optional `cta` + split `heading`/`body` props. Recommendation: (a) — out-of-scope to refactor ErrorDisplay for one phase.

For the friend-not-found case where the CTA is "Back to friends" (not retry), the planner needs a small custom inline error (~10 LOC) rather than `ErrorDisplay`. See §Recommendations.

### 14. RLS for new `bio` column

No new RLS policy needed. [VERIFIED]

- **SELECT:** `profiles_select_authenticated USING (true)` (`0001_init.sql`) — any authenticated user can read every profile column. The bio is therefore public among signed-in users (consistent with `display_name`, `username`, `avatar_url`).
- **UPDATE:** `profiles_update_own USING (id = auth.uid())` — only the owner can write their bio.
- **INSERT:** `profiles_insert_own` — owner-only; bio defaults to NULL.

No D-05 RLS change required.

---

## Recommendations

### Shared-photos viewer route (Claude's discretion in CONTEXT.md)

**Recommendation: New route at `/friends/[id]/photos`.**

**Rationale:**

1. **`/memories` is not a route — it's a tab.** `MemoriesTabContent` is rendered inside the Squad tab's tab switcher (`src/app/(tabs)/squad.tsx`); there is no `/memories` URL. Adding a `?friendId=` param would require either (a) creating a new top-level `/memories` route or (b) routing to the squad tab and persisting filter state via store. Both add architectural complexity that doesn't exist today. [VERIFIED: `find src/app -name "memories*"` returned nothing]

2. **The friend-scoped grid is a different visual shell.** The Squad Memories tab has a "Mine / Friends / All" filter toggle (`FilterKey = 'all' | 'mine' | 'friends'`) and per-plan section grouping. For the friend profile's Photos quick-action, the relevant slice is "photos from mutual plans, grouped by plan, no per-user filter." Different UI shape.

3. **A new screen is cheap.** `src/app/friends/[id]/photos.tsx` can mount `useAllPlanPhotos()` + filter to `sharedPlanIds` from `useFriendMutuals(friendId)` and reuse the existing `GalleryViewerModal` for full-screen view. ~80-120 LOC. The route is the natural place to hang it.

4. **It mirrors the Telegram/WhatsApp UX exactly.** Both apps put "Shared Media" at `/contacts/[id]/media` (conceptually) — the friend-scoped photo grid is its own screen, not a tab filter.

**Implementation suggestion for planner:** Add `src/app/friends/[id]/photos.tsx` as a new expo-router route. Mounts a thin wrapper around the existing photo grid pattern. The `_layout.tsx` for the `friends/` route stays untouched — file-based routing handles it.

### Bio CHECK constraint stance

**Recommendation: NO database CHECK constraint. Enforce `maxLength={160}` client-side via TextInput prop on `/profile/edit`.**

**Rationale:**

1. **Single source of truth.** A CHECK constraint AND a client cap creates two places where the limit is defined — drift risk. Pick one.
2. **160 is a UX choice, not a security boundary.** A 1000-char bio doesn't open any attack surface beyond a 160-char bio (it just looks bad). The cost-benefit of a CHECK constraint (extra migration code, error path on save, can't tweak the limit without re-migrating) doesn't justify the marginal safety.
3. **`TextInput maxLength` is the existing project pattern.** `display_name` uses `APP_CONFIG.displayNameMaxLength` client-side cap with no DB CHECK (`src/app/profile/edit.tsx:233`). Bio should match.
4. **If the cap needs adjusting later** — say to 280 chars — bumping `maxLength={160}` to `maxLength={280}` in one file is trivial. Bumping a CHECK constraint requires a migration.

**Implementation:**
```tsx
<TextInput
  value={bio}
  onChangeText={setBio}
  maxLength={160}
  multiline
  numberOfLines={3}
  placeholder="A short something about you"
  ...
/>
```

Char counter pattern: `{bio.length}/160` with color flip when `bio.length > 144` per UI-SPEC line 515. Matches existing display-name counter UX.

### Friend-not-found fallback

**Recommendation: Custom 10-LOC inline empty state inside `FriendProfileScreen`, NOT `ErrorDisplay`.**

**Rationale:**

The `friend-not-found` state has a specific "Back to friends" CTA that doesn't match `ErrorDisplay`'s hard-coded "Try Again" button (line 65-67 in ErrorDisplay.tsx). Forcing it through `ErrorDisplay` would require either refactoring the component (out of scope) or showing a confusing "Try Again" button that retries an empty query (poor UX).

**Detection logic:**

```ts
if (!isLoading && data && data.friendsSince === null) {
  // friendships row missing → either user removed us or we removed them.
  // Still render a sensible screen.
}
```

Note this is keyed off `friendsSince === null` (which is the `friendships` query returning empty), NOT `profile === null` — since `profiles_select_authenticated` is `USING (true)`, the profile row is always readable. (Important correction to CONTEXT.md D-16 + UI-SPEC line 453-459.)

**Custom shape:**

```tsx
<View style={styles.notFound}>
  <Ionicons name="people-outline" size={48} color={colors.text.secondary} />
  <Text style={styles.notFoundHeading}>No longer friends</Text>
  <Text style={styles.notFoundBody}>This person isn't in your friends list anymore.</Text>
  <PrimaryButton title="Back to friends" onPress={() => router.back()} />
</View>
```

~15 LOC. Drop directly into `FriendProfileScreen.tsx`. Don't create a reusable component for one consumer.

---

## Open Questions for Planner

1. **Migration number — confirm `0027`.** CONTEXT.md says 0025 (taken); 0026 also taken; 0027 is the next free slot. Planner should verify against the latest tip of main before submitting the migration. If a new migration lands between now and plan execution, bump accordingly.

2. **`useUpdateMyBio` vs `useUpdateMyProfile`.** Should the bio save reuse a single mutation that ALSO handles display_name + birthday (a wholesale refactor of `/profile/edit`'s save path), or be a separate bio-only mutation that coexists with the existing raw `supabase.from('profiles').update(...)` save flow? UI-SPEC line 647 names `useUpdateMyBio` (singular field) — that's the minimal-scope path. Planner picks.

3. **`queryKeys.friends.detail` vs new `queryKeys.friends.profile`.** Reuse the existing unused `detail` key (taxonomy-consistent — matches plans/expenses/habits "detail" convention) or add a parallel `profile` key (matches UI-SPEC's verbatim naming). Recommendation in §Code-level Confirmations #9: reuse `detail`.

4. **Eager vs lazy DM channel resolution for Mute.** Mute the DM requires knowing the `dm_channel_id`. Resolve eagerly on mount (extra query overhead but instant Mute response) or lazily on first Mute press (no overhead, but ~200ms delay first time). Recommendation: lazy.

5. **Hardware smoke gate.** Animation polish + ImageViewerModal + ActionSheet behavior need real hardware verification. Should the phase block on a smoke-test gate (per Phase 31 Pilot precedent) or rely on per-plan inspection? Recommendation: one consolidated smoke gate at end of phase, before `/gsd-verify-work`.

6. **`useReducedMotion` short-circuit details.** UI-SPEC says reduced-motion makes the avatar START collapsed — but does that mean the user can't see the friend's avatar at all on the friend profile screen? UI-SPEC implies yes (line 277: "Avatar STARTS collapsed (size = 32, opacity = 0)"). That seems aggressive. Recommendation: clarify whether reduced-motion should (a) start collapsed entirely (UI-SPEC literal) or (b) show the 140pt avatar but skip the scroll-driven scale animation. Defer to UI-SPEC literal reading unless feedback emerges.

7. **Bio mutation invalidation scope.** Bio is shown on the friend's profile screen — but I'm always editing MY OWN bio. The invalidation should hit `queryKeys.friends.detail(myId)` so that anyone viewing MY profile from THEIR friends list sees the update. But other clients won't see it without a Realtime subscription (deferred per D-15). For the editing user's own subsequent self-views (refresh on the friend profile screen) — they don't view themselves on `friends/[id]`. So the invalidation is primarily to keep the bio fresh if it's read elsewhere (none in this phase). Decision: invalidate `friends.detail(<myUserId>)` defensively; it's cheap.

---

## Risks & Pitfalls

### 1. Memoizing `scrollY` across nav-title render-prop clones

`Stack.Screen options.headerTitle={(props) => <AnimatedNavTitle scrollY={scrollY} ... />}` — expo-router *re-evaluates* the render-prop function each render. If `scrollY` is a `useSharedValue` declared in the screen body, this is fine — Reanimated shared values are stable refs. But if the planner accidentally passes a value derived from `useDerivedValue` or wraps it in another hook, identity may shift. **Mitigation:** Keep `scrollY = useSharedValue(0)` at the top of `FriendProfileScreen`, pass it directly. Don't transform it before passing.

### 2. `Animated.ScrollView` from Reanimated vs raw `ScrollView`

The screen MUST use `Animated.ScrollView` (from `react-native-reanimated`) with `onScroll={scrollHandler}` + `scrollEventThrottle={16}` for the scroll handler to fire on the UI thread. Using a raw `ScrollView` with the scroll handler attached will fire on the JS thread — animation will jank. **Mitigation:** Verify the import: `import Animated from 'react-native-reanimated'; <Animated.ScrollView ...>`. Pattern verified at `src/screens/welcome/WelcomeScreen.tsx`.

### 3. The "shared status slice" works only when the home cache is warm

`useFriendProfile`'s opportunistic read of `queryKeys.home.friends(myId)` only helps when the user navigated from Home → Friend profile. Deep-link entry / chat message tap → Friend profile starts with an empty home cache. The fallback `supabase.from('effective_status').single()` covers this — but means the friend's status will NOT auto-update via the existing `subscribeHomeStatuses` channel until the user visits Home. **Mitigation:** Acceptable for v1 per D-15. If the gap surfaces in feedback, future phase can add a per-friend status subscription.

### 4. Mute can leave orphan DM channels

If user taps Mute before ever sending a message in the DM, the `chat_preferences` row is upserted referencing a `dm_channel_id` that must exist. Either:
- (a) Lazy create: invoke `get_or_create_dm_channel(p_friend_id)` RPC at Mute-press time, then upsert chat_preferences. Creates an empty DM channel row. Harmless but adds DB clutter.
- (b) Eager create: same RPC fired on screen mount. Wastes a query for users who never tap Mute.

**Mitigation:** Option (a) — Mute is a rare action; only pay the cost when invoked. The empty DM channel row is bounded (one per friend pair max) and matches the existing `openChat()` pattern (Phase 30).

### 5. Mute toggle state must be initialized correctly

On screen mount, the Mute button label / icon should reflect whether the friend's DM is currently muted. The planner needs to either:
- (a) Read `chat_preferences` for `(myId, 'dm', dm_channel_id)` on screen mount (extra query)
- (b) Reuse the existing `useChatList` hook — which already aggregates `isMuted` per item (`src/hooks/useChatList.ts:347, 381-383`) — and look up `chat_id === dm_channel_id`

Option (b) is cleaner but couples the friend profile screen to the entire chat list cache. Option (a) is cheaper. **Recommendation: (a)** — single row read, scoped key like `queryKeys.chat.preferences(channelId)` per UI-SPEC line 388.

### 6. mutationShape regression gate covers ALL hooks under `src/hooks/`

The gate at `src/hooks/__tests__/mutationShape.test.ts:18` scans `path.resolve(__dirname, '..')` — the entire `src/hooks/` directory. Any new `useMutation` block in `useUpdateMyBio` or in `useFriendProfile` (if it has one — it shouldn't, it's read-only) must conform OR carry an exemption marker. Remove Friend mutation (if extracted into a hook) also applies.

**Mitigation:** Pattern 5 verbatim; no exemption needed for any new mutation this phase.

### 7. `expo-image` `onLoad` fires before image is decoded on some platforms

Per Expo docs, `onLoad` fires when the image source is loaded into memory, NOT when it's rasterized. The blurred wash will appear in the same frame as the avatar — possibly briefly black before the blur shader runs. **Mitigation:** Acceptable for v1. If observable, a `withTiming({ opacity }, { duration: ANIMATION.duration.normal })` from 0 → 1 wrap on the wash container masks the artifact. UI-SPEC §Blurred-Avatar Wash already prescribes this fade.

### 8. `effective_status` is a view — cannot be subscribed to directly

[VERIFIED: `0009_status_liveness_v1_3.sql` comment] Realtime subscriptions can only target *tables*, not views. The existing `subscribeHomeStatuses` correctly subscribes to `statuses` and invalidates the *read* of `effective_status`. The new hook reads from the view but never tries to subscribe to it directly — already handled.

### 9. Friend-not-found state — distinguishing "removed" from "never friends"

Both cases produce the same `friendships` row state (none). Without a friend-removal audit table, the screen can't distinguish "they removed you 5 minutes ago" from "you opened a deep link to a stranger's profile id." UI copy must therefore be neutral: "This person isn't in your friends list anymore" works for both cases. Don't say "they removed you" — false in the deep-link case.

### 10. Bio newline / whitespace handling

`maxLength={160}` doesn't prevent the user from pasting 160 newlines. Display will look terrible. **Mitigation:** Strip leading/trailing whitespace on save (`bio.trim()`); optionally collapse internal `\n{2,}` to `\n\n` (single blank line max). Out of scope to enforce; client-side trim on save is sufficient.

### 11. The avatar `Image.onLoad` doesn't bubble through `AvatarCircle`

`AvatarCircle` doesn't pass `onLoad` through to the inner `<Image>`. If the planner wants the blurred-wash to fade in on avatar decode, EITHER (a) add `onLoad?: () => void` prop to `AvatarCircle` and forward it, OR (b) the `FriendProfileBlurredWash` component renders its own `<Image>` (already does, per UI-SPEC) and hooks `onLoad` directly on THAT image — independent of the big avatar's own image load. (b) is the UI-SPEC approach and avoids modifying `AvatarCircle`.

---

## Phase-31 Cache Wiring Plan

### New query keys (additions to `src/lib/queryKeys.ts:48-55`)

```ts
friends: {
  all: () => ['friends'] as const,
  list: (userId: string) => [...queryKeys.friends.all(), 'list', userId] as const,
  detail: (friendId: string) => [...queryKeys.friends.all(), 'detail', friendId] as const,  // reused for useFriendProfile
  ofFriend: (friendId: string) => [...queryKeys.friends.all(), 'ofFriend', friendId] as const,
  pendingRequests: (userId: string) => [...queryKeys.friends.all(), 'pendingRequests', userId] as const,
  wishList: (userId: string) => [...queryKeys.friends.all(), 'wishList', userId] as const,
  mutuals: (friendId: string) => [...queryKeys.friends.all(), 'mutuals', friendId] as const,        // NEW
  sharedPhotos: (friendId: string) => [...queryKeys.friends.all(), 'sharedPhotos', friendId] as const,  // NEW
},

chat: {
  // ... existing keys ...
  preferences: (channelId: string) => [...queryKeys.chat.all(), 'preferences', channelId] as const,  // NEW for Mute lookup
},
```

The `chat.preferences` key is new and supports the Mute initialization query (Risk #5).

### Per-hook QueryKey shape

| Hook | QueryKey | When it fires | Slice content |
|------|---------|---------------|---------------|
| `useFriendProfile(friendId)` | `queryKeys.friends.detail(friendId)` | Always when screen mounts | `{ profile, friendsSince, status?, contextTag?, statusExpiresAt?, lastActiveAt? }` |
| `useFriendMutuals(friendId)` | `queryKeys.friends.mutuals(friendId)` | Always when screen mounts | `{ mutualPlansCount, mutualFriendsCount, sharedPhotosCount, sharedPlanIds }` |
| `useExpensesWithFriend(friendId)` (existing) | `queryKeys.expenses.withFriend(friendId)` | Always when screen mounts (used to derive IOU balance row) | `ExpenseWithFriend[]` — screen aggregates |
| `useFriendWishList(friendId)` (existing) | `queryKeys.friends.wishList(friendId)` | Always when screen mounts | `WishListItemWithClaim[]` |
| `useChatDmPreferences(friendDmChannelId)` (new) | `queryKeys.chat.preferences(channelId)` | Lazy — fires on Mute button mount after DM channel resolved | `{ isMuted: boolean, isHidden: boolean }` |
| `useUpdateMyBio()` (new, on `/profile/edit`) | — (mutation) | On bio save | Invalidates `queryKeys.friends.detail(myId)` on settle |

### Realtime hooks

**No new subscriptions in this phase** per D-15.

`subscribeHomeStatuses(queryClient, myId, friendIds)` — already invoked by `useHomeScreen` and `useFriends` — invalidates `queryKeys.home.friends(myId)`. `useFriendProfile` reads opportunistically from that slice (via `queryClient.getQueryData`), so when the home cache is warm, friend-profile status stays fresh automatically. When the home cache is cold (deep-link entry), `useFriendProfile`'s direct fallback read covers the initial load — but won't auto-update without a screen refresh. Acceptable per D-15.

### Invalidation map

| Event | Invalidates |
|-------|-------------|
| Bio save (`useUpdateMyBio.onSettled`) | `queryKeys.friends.detail(myId)` |
| Mute toggle save | `queryKeys.chat.preferences(channelId)`, `queryKeys.chat.list(myId)` (so chat list icon reflects mute state) |
| Remove Friend | `queryKeys.friends.list(myId)`, `queryKeys.home.friends(myId)`, `queryKeys.home.pendingRequestCount(myId)` |
| `useFriendProfile.refetch` (retry after error) | `queryKeys.friends.detail(friendId)` only — `useFriendMutuals` has its own retry path |

### Cache hygiene

`useFriendProfile` should set `staleTime: 60_000` (matches Phase 31 default) — bio + birthday + timezone change rarely; status freshness comes from the shared home slice not from this query's stale time. The mutuals query can also use the default. No special `gcTime` override needed.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-image` `blurRadius={40}` is the right blur strength on iPhone 15 / SE | §Technical Approach → Blurred backdrop | LOW — UI-SPEC locks a 32–48 range; tweakable at impl |
| A2 | Lazy DM channel resolution for Mute is preferable to eager | §Recommendations | LOW — both work; this is preference |
| A3 | The `expo-image` `onLoad` event fires reliably across iOS + Android | §Risks #7 | LOW — documented API; existing code in `MemoriesTabContent` relies on it |
| A4 | Reusing `queryKeys.friends.detail` (vs new `friends.profile`) is taxonomy-consistent | §Code-level Confirmations #9 | LOW — naming choice; either works |
| A5 | The friend-not-found state should be detected from `friendships` row absence, NOT `profiles` row absence | §Recommendations | MEDIUM — getting this wrong renders "no longer friends" for anyone using a deep link to a stranger's profile |
| A6 | 160-char bio limit is the correct ceiling | §Recommendations | LOW — UX call, easily adjusted |
| A7 | The user will hardware-smoke-test animations / modals before `/gsd-verify-work` | §Validation Architecture | MEDIUM — animation regressions are hard to catch in jest |

---

## Environment Availability

Skipped — this phase has no new external tools, services, or runtimes. All dependencies (Reanimated 4, expo-image, expo-blur, expo-linear-gradient, expo-haptics, @tanstack/react-query, @expo/vector-icons, expo-router) are already installed and verified at the versions listed in package.json. [VERIFIED: `cat package.json | grep ...`]

| Dependency | Required By | Version |
|------------|-------------|---------|
| `react-native-reanimated` | Header collapse animation | `4.2.1` |
| `expo-image` | Blurred wash + avatars | `~55.0.9` |
| `expo-blur` | Not needed (researcher overrides D-02 hint) | `~55.0.14` (installed but unused this phase) |
| `expo-linear-gradient` | Wash gradient overlay | `~55.0.13` |
| `expo-haptics` | Quick-action button feedback | `~55.0.14` |
| `@expo/vector-icons` (Ionicons) | All row leading icons + action icons | (transitive) |
| `@tanstack/react-query` | All hooks | (per Phase 31) |
| `expo-router` | Routing + Stack.Screen + headerTitle | `~55.0.13` |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/realtimeBridge.ts:344-378` — `subscribeHomeStatuses` signature and invalidated key
- `src/lib/queryKeys.ts:48-55` — friends taxonomy (with the unused `detail` key)
- `src/hooks/useHomeScreen.ts:71-109` — pattern for queryKey sharing across hooks
- `src/hooks/useFriends.ts:104-132` — second consumer of the shared home statuses slice
- `src/hooks/useStatus.ts:118-148` — Pattern 5 reference + shared cache mirror
- `src/hooks/useAllPlanPhotos.ts:165-224` — Pattern 5 with optimistic + rollback + invalidate triple
- `src/components/chat/ImageViewerModal.tsx` — full component verified
- `src/components/common/AvatarCircle.tsx` — full component verified
- `src/components/friends/StatusPill.tsx` — heartbeat-aware path verified
- `src/lib/action-sheet.ts` — full helper verified
- `src/screens/chat/ChatListScreen.tsx:99-123` — canonical `chat_preferences` upsert pattern
- `src/screens/welcome/WelcomeScreen.tsx:5-9, 55-59, 280-316` — Reanimated v4 primitives in production
- `supabase/migrations/0001_init.sql:29-72, 503-532` — profiles + friendships + `get_friends` shape
- `supabase/migrations/0009_status_liveness_v1_3.sql` — `effective_status` view + REPLICA semantics
- `supabase/migrations/0017_birthday_social_v1_4.sql:335-360` — `get_friends_of` RPC
- `supabase/migrations/0026_chat_todos_multi_scope.sql` — last existing migration (confirms 0027 is free)
- `package.json` — all dependency versions
- `src/hooks/README.md` — Phase 31 boundary doc (mutationShape gate + onSettled tiered policy)

### Secondary (MEDIUM confidence)
- `src/hooks/__tests__/mutationShape.test.ts:1-80` — regression gate logic (verified by reading)
- `src/app/profile/edit.tsx` — current edit screen shape (drives the bio-field placement decision)

### Tertiary (LOW confidence)
- UI-SPEC `[UPM]` provenance tags — accepted as locked design decisions per the gsd-ui-checker sign-off (UI-SPEC §Checker Sign-Off line 696)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library, every version, every existing pattern verified by direct filesystem read
- Architecture: HIGH — Phase 31 boundary doc + existing hook patterns nail every cache-wiring decision
- Pitfalls: HIGH — Reanimated 4 gotchas verified in WelcomeScreen.tsx production use
- Migration number: HIGH — `ls` confirmed 0025 and 0026 are taken
- Shared-photos route: MEDIUM — design preference call, both options viable
- Reduced-motion handling: MEDIUM — UI-SPEC's literal reading is aggressive; may need refinement at impl

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (30 days — codebase is stable; no upstream version churn expected)

## RESEARCH COMPLETE
