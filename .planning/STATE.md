---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Deep UI Refinement & Screen Overhaul
status: executing
stopped_at: Completed 31-08-PLAN.md (Task 8 manual smoke PASS with deferred chat-list reactivity caveat)
last_updated: "2026-05-13T13:04:06.297Z"
last_activity: 2026-05-13 -- Phase 32 execution started
progress:
  total_phases: 10
  completed_phases: 4
  total_plans: 32
  completed_plans: 28
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** Phase 32 — chat-list-reactivity-widget-send-reliability-and-last-entry-

## Current Position

Phase: 32 (chat-list-reactivity-widget-send-reliability-and-last-entry-) — EXECUTING
Plan: 1 of 4
Status: Executing Phase 32
Last activity: 2026-05-13 -- Phase 32 execution started

## Phase Structure

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 24 | Polish Foundation | POLISH-01, POLISH-02, POLISH-03, POLISH-04 | Complete |
| 25 | Auth, Onboarding & Errors | AUTH-01, AUTH-02, AUTH-03, AUTH-04 | Complete |
| 26 | Home & Chat Polish | HOME-01, HOME-02, HOME-03, HOME-04, CHAT-01, CHAT-02, CHAT-03, CHAT-04 | Complete |
| 27 | Plans & Squad Polish | PLANS-01, PLANS-02, PLANS-03, PLANS-04, SQUAD-01, SQUAD-02, SQUAD-03, SQUAD-04 | Complete |
| 28 | Branding | BRAND-01, BRAND-02, BRAND-03 | Complete |
| 29 | Home Screen Overhaul | HOME-05, HOME-06, HOME-07, HOME-08 | Complete |
| 29.1 | Habits & To-Do Features | D-01..D-21 (inline) | Complete |
| 30 | Unify navigation source-of-truth and chat-entry handlers | TBD | Not planned |
| 31 | Adopt TanStack Query for server-state caching and cross-screen reactivity | TBD | Not planned |

## Performance Metrics

Plans executed this milestone: 13
Phases completed: 2 / 4 (Phases 30 + 31 added 2026-05-13, not yet planned)
Requirements covered: 4 / 4 (Phases 30 + 31 introduce architectural work; requirements TBD)

## Accumulated Context

### Decisions

- [v1.3.5]: Bottom sheet must be custom implementation — @gorhom/bottom-sheet broken on Reanimated v4
- [v1.4]: fetch().arrayBuffer() for Supabase Storage uploads (FormData + file:// URI fails)
- [v1.4]: Squad Dashboard: single outer FlatList with feature cards in ListFooterComponent
- [v1.5]: expo-image-manipulator compression is mandatory before upload (not optional) — raw iPhone photos exhaust 1GB storage in days
- [v1.5]: contentType forced to image/jpeg in upload — client cannot upload executable disguised as image
- [v1.5]: crypto.randomUUID() unavailable in Hermes — use Math.random UUID template for all optimistic IDs
- [v1.6]: useTheme() context pattern chosen over per-screen COLORS import — StyleSheet.create must be inside component body wrapped in useMemo([colors]) for themed styles
- [v1.6]: react-native-maps iOS must use Apple Maps (PROVIDER_DEFAULT) — Google Maps iOS config plugin broken in SDK 55; no API key needed for dev
- [v1.6]: plan-gallery Storage bucket is PRIVATE (signed URLs) — plan covers are public, gallery photos are not
- [v1.6]: add_plan_photo SECURITY DEFINER RPC enforces 10-photo cap server-side — client-side check is UI only
- [v1.7]: /ui-ux-pro-max plugin used for all UI/UX design work — audit-first approach per screen
- [v1.8]: One phase per screen — audit → user feedback + references → /ui-ux-pro-max design → execute
- [v1.8]: Phase order: Home → Squad → Explore → Auth → Welcome (main screens first, entry flows last)
- [v1.8 Phase 29, historical]: OnboardingHintSheet stayed in place through Phase 29; planned future removal in Phase 33 was dropped when Phase 33 was removed on 2026-05-13
- [v1.8 removed Phase 31, historical]: Phase 31 was planned to unify all three map userInterfaceStyle: 'dark' instances (ExploreMapView, PlanDashboardScreen, LocationPicker); Phase 31 was removed on 2026-05-13 before any work landed
- [v1.8 removed Phase 32, historical]: Phase 32 had identified the LinearGradient always-dark bug at AuthScreen.tsx:410 as a required deliverable and planned to extract gradient tokens to src/theme/gradients.ts; Phase 32 was removed on 2026-05-13 before any work landed
- [v1.8 removed Phase 33, historical]: Phase 33 had pre-installed react-native-pager-view@8.0.1 and decided on AsyncStorage key @campfire/welcome_complete (NOT @campfire/onboarding_hint_shown), implemented as a full-screen Modal overlay inside (tabs)/_layout.tsx (not a new Stack route) with gestureEnabled: false to prevent iOS swipe-back conflict; Phase 33 was removed on 2026-05-13 before any work landed
- [Phase 29-home-screen-overhaul]: UNSAFE_queryAllByType(Pressable) used over queryAllByRole('button') in test scaffolds — RTNU 13.x queryAllByRole does not work with string-element RN mocks
- [Phase 29-home-screen-overhaul]: SHADOWS added to src/__mocks__/theme.js — EventCard imports SHADOWS.card which was missing from the stub (only SHADOW singular was present)
- [Phase 29]: borderRadius: targetSize/2 (static) on DEAD overlay — Animated.Value not valid for borderRadius without useNativeDriver: false
- [Phase 29]: EmptyState CTA navigates to /friends/add (root-level route) not /(tabs)/squad — directly opens the Add Friend form per D-06/D-07
- [Phase 29-home-screen-overhaul]: Date pill placed as Animated.View direct child (sibling of styles.content) not inside flex-end content View — absolute positioning requires sibling placement for correct top-left anchoring
- [Phase 29]: Skeleton fade uses Animated.timing (useNativeDriver: true) with skeletonOpacity.setValue(1) reset for repeated loading cycles
- [Phase 29.1-01]: Migration 0024 widens messages.message_type CHECK to include 'system' and 'todo' while preserving 'deleted' from migration 0019; full set is ('text','image','poll','deleted','system','todo')
- [Phase 29.1-01]: messages INSERT RLS policy WITH CHECK whitelists only ('text','image','poll'); 'system'/'todo' rows are RPC-only via SECURITY DEFINER bypass (mitigates T-29.1-03 spoofing)
- [Phase 29.1-01]: Todos read RPC split into get_my_todos + get_chat_todos for cleaner per-section row shapes (vs unified kind discriminator)
- [Phase 29.1-01]: is_habit_member helper filters accepted_at IS NOT NULL so pending invitees cannot read other members' check-ins (T-29.1-12)
- [Phase 29.1-02]: Type contracts mirror live migration 0024 RPC return rows verbatim (snake_case fields, no remapping); MyTodoRow is a standalone interface (not Todo intersection) and ChatTodoRow tracks next_due_date + is_overdue/is_due_today instead of plan's draft chat_name/earliest_due_date — type must reflect runtime payload
- [Phase 29.1-02]: MessageType union widening produced net-zero new tsc errors (122 → 122) — existing consumers fall through on unknown types; system/todo render branches arrive in Plan 03 hooks + Plan 07 MessageBubble
- [Phase 29.1-03]: Snapshot capture uses ref-mirrored state (habitsRef/mineRef) not setState-updater pattern — React 18 deferred setState callbacks make the plan-draft pattern unreliable; ref-based reads are synchronous
- [Phase 29.1-03]: Auth-store import path is @/stores/useAuthStore (project actual), not plan-draft @/store/auth — all new hooks and test mocks use the real path
- [Phase 29.1-03]: useHabits Realtime filter is user_id=eq.${userId} (caller only) — HabitOverviewRow does not expose member_ids; co-member updates surface via manual refetch on screen focus
- [Phase 29.1-04]: HabitsTile hero rendered as two adjacent Text nodes ({done} + /{total}) — numerator flips accent-colored, denominator stays text.secondary per UI-SPEC §Color
- [Phase 29.1-04]: TodosTile accent flips on overdueCount > 0 only (not total > 0) — violet stays for due-today-only state; destructive only when truly overdue
- [Phase 29.1-04]: reanimated jest mock extended with useReducedMotion + default.View host strings (Rule 3 deviation) — required for any Bento-component test rendering through BentoCard
- [Phase 29.1-04]: BentoGrid row arrangement: Row 1=IOU+Habits, Row 2=Birthdays+ToDos, Row 3=Streak+Goals (Squad Challenges placeholder D-15 preserved) — matches UI-SPEC §Component Inventory exactly
- [Phase 29.1-05]: Habit detail screen calls supabase.rpc('toggle_habit_today_checkin') directly instead of mounting useHabits() — avoids re-fetching the whole habit list per toggle; useHabitDetail.refetch() already covers the local data needs
- [Phase 29.1-05]: Pending habit invitations rendered as FlatList ListHeaderComponent (not SectionList) — different row shapes (HabitInvitationRow card vs HabitRow row) and asymmetric empty states don't fit SectionList; ListHeaderComponent drops cleanly when no invites
- [Phase 29.1-05]: (supabase as any) cast applied at 3 RPC + 2 table-query sites for create_habit/toggle_habit_today_checkin/habits/habit_members — same untyped-RPC pattern as useChatRoom.ts:612 + useHabitDetail.ts; database.ts regeneration deferred until migration 0024 deploys remotely (still local-only per Plan 01 SUMMARY)
- [Phase 29.1-06]: ChatTodoListRow uses controlled-prop expansion exclusively (W9) — parent owns expanded state; items.length is the sole truth, no internal useState; LayoutAnimation.configureNext called BEFORE onExpand so the parent's setState-driven re-render gets the easeInEaseOut transition
- [Phase 29.1-06]: /squad/todos/[id] disambiguates Mine vs chat-origin via two table lookups (todos first, then chat_todo_items with chat_todo_lists+group_channels join) — avoids a discriminator URL param; RLS gates both reads; cleaner deep-link surface
- [Phase 29.1-06]: Chat-origin Mark done is one-way in v1 — complete_chat_todo is idempotent server-side but client UI explicitly disables Mark done for already-completed chat items; Mine items can flip freely via direct UPDATE on completed_at
- [Phase 29.1-06]: src/__mocks__/react-native.js extended with LayoutAnimation + UIManager (Rule 3 deviation, scoped to mock file) — required for any test that exercises ChatTodoListRow's expand-tap path; matches Plan 04 reanimated mock extension precedent
- [Phase 29.1-07]: ChatTodoBubble owns internal expand state (leaf in FlatList) while ChatTodoListRow uses controlled-prop (Plan 06) — different placements warrant different patterns
- [Phase 29.1-07]: Lazy-fetch of chat_todo_list + items lives in ChatRoomScreen (per-message cache + in-flight Set) — keeps useChatRoom untouched and Plan 03's setState-snapshot latent bug isolated
- [Phase 29.1-07]: MessageBubble render-branch order: isSystem -> isTodo -> isPoll -> own/others; long-press bails on isSystem and isTodo before any scale animation fires (Pitfall 9 + 10)
- [Phase 29.1-08]: TileShell + EyebrowPill factored from YourZoneSection.tsx into HomeTilePrimitives.tsx as shared neon-green Home primitives — both YourZoneSection and the new Habits/To-Dos home widgets consume the same primitives (Pitfall 7 mitigation, no copy-paste drift)
- [Phase 29.1-08]: Home widgets use neon-green accent only — Add chip on HomeTodosTile uses the same rgba(185,255,59,...) palette as EyebrowPill, NOT TILE_ACCENTS.todos violet (Pitfall 7 visual-language separation enforced via grep-absence acceptance criteria)
- [Phase 29.1-08, historical]: ROADMAP Phase 30 scope had been reduced to SQUAD-06 only (Friends list polish) per D-21 — the Bento tile redesign originally assigned to SQUAD-05/07/08 was delivered by Phase 29.1's Activity-tab Bento grid (HabitsTile + TodosTile + rearranged 3x2 layout); Phase 30 was then removed entirely on 2026-05-13
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-01: useNavigationStore uses create<T>((set)=>...) non-curried form with zero middleware — matches all 5 existing stores; surface NOT persisted, defaults to 'tabs' on every cold launch
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-01: NavigationSurface union order locked to ('tabs' | 'chat' | 'plan' | 'modal' | 'auth') — required by Plan 04 CustomTabBar refactor for surface-equality checks
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-02: openChat helper accepts router as first arg (not via useRouter hook) — required by notification-dispatcher callsite in _layout.tsx which runs outside the React render tree; matches src/lib/action-sheet.ts top-level-function convention
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-02: Alert.alert('Error', "Couldn't open chat. Try again.") inlined as a literal (not via constants) — required by plan AC7's exact-string grep gate; verbatim copy already used by 7 of 8 existing inline DM blocks so migration is visually a no-op
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-02: create_birthday_group RPC stays at callsite (squad/birthday/[id].tsx) — openChat only owns the post-creation push because group-creation has a side-effect requirement (invalidateChatList) that does not belong in a generic chat-entry helper
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-03: Hoist /chat/room route from src/app/(tabs)/chat/room.tsx to src/app/chat/room.tsx — eliminates dual-mount risk by putting ChatRoomScreen at root Stack level structurally; URL /chat/room?... resolves identically so zero callsite changes needed
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-03: src/app/chat/_layout.tsx leaves default headerShown intact (no headerShown:false) so chat/room.tsx navigation.setOptions({title}) renders the per-route title via the Stack header chrome; mirrors plans/_layout.tsx exactly except component name
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-03: Root-level <Stack.Screen name="chat" options={{ headerShown: false }} /> placed inside <Stack.Protected guard={!!session && !needsProfileSetup}> alongside plans — chat needs auth + complete profile; no presentation:'modal' because chat is a regular push
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-07: Cleaned up stale FriendsList.tsx JSDoc reference in src/lib/openChat.ts as part of deletion plan — Rule 3 auto-fix preserved the plan's grep-zero acceptance criterion downstream
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-07: src/app/friends/_layout.tsx left untouched — expo-router file-based routing infers Stack.Screen entries from filesystem, so deleting index.tsx leaves layout valid (URL /friends becomes 404, acceptable per CONTEXT.md scope item 5)
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-04: CustomTabBar reads currentSurface via selector form useNavigationStore((s) => s.currentSurface) and returns null when surface !== 'tabs' — future-proofs new full-screen surfaces (plan/modal/auth) without further bar edits
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-04: ChatRoomScreen useFocusEffect writer uses bare useCallback (named import) — React.useCallback form is forbidden per plan's locked import-style rule to match the file's existing hook-import convention
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-04: setSurface selector returns only the stable setter (not currentSurface) — pulling both in the same selector would re-render the heavy chat screen on every other surface push; setSurface in dep array satisfies exhaustive-deps without triggering re-runs
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-04: src/__mocks__/theme.js extended with FONT_WEIGHT + RADII.pill (Rule 3 — required to render ChatRoomScreen in jest); scoped to mock file, zero production-code impact, matches Phase 29.1 Plan 04/06 mock-extension precedent
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-05: 10 callsites migrated to openChat — 4 home, 4 routing-handler, 2 sheet/group; 8 duplicate get_or_create_dm_channel blocks collapsed; originating-bug pill (PlanDashboardScreen line 1023) consolidated
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-05: ChatListItem.birthdayPersonId (string|null|undefined) coerced to (string|undefined) via ?? undefined when passing to openChat group variant — preserves prior URLSearchParams truthy-only behavior; Rule 1 auto-fix for new TS error
- [Phase 30-unify-navigation-source-of-truth-and-chat-entry-handlers]: Phase 30-05: squad.tsx handleStartDM locked ordering — try { await openChat(... onLoadingChange: setLoadingDM) } finally { handleCloseSheet() } — preserves in-sheet spinner visibility during the get-or-create-DM RPC
- [Phase 31]: Phase 31-01: staleTime 60_000 set as global QueryClient default (A6 locked); per-query overrides allowed
- [Phase 31]: Phase 31-01: Hybrid Realtime strategy locked (A7) — UPDATE → invalidateQueries (avoids missed-field bug), INSERT/DELETE → setQueryData; aggregation RPCs like get_habits_overview always invalidate
- [Phase 31]: Phase 31-01: QueryClient is a factory not a singleton — _layout.tsx uses useState(() => createQueryClient()) so cache lifetime ties to RootLayout, HMR-safe
- [Phase 31]: Phase 31-01: authBridge calls removeQueries() (not invalidateQueries) on SIGNED_OUT to avoid 401-refetch storm with expired session
- [Phase 31]: Phase 31-01: REPLICA IDENTITY FULL audit found 2 tables (messages, statuses) — Waves 6 + 7 can opt into setQueryData on UPDATE; all other tables stay on invalidate-on-UPDATE default
- [Phase 31]: Phase 31-01: Edge Functions audit found 0 supabase.functions.invoke callsites — no edge-function mutations to model in Waves 3-7
- [Phase 31]: Phase 31-01: Jest mock vars must be prefixed with mock* to satisfy babel hoisting (Rule 1 auto-fix in realtimeBridge.test.ts + authBridge.test.ts) — convention adopted for all future Phase 31 hook tests
- [Phase 31]: Phase 31-02: useHabits migrated to useQuery+useMutation+realtimeBridge — canonical Pattern 5 shape (onMutate snapshot + onError rollback + onSettled invalidate); 152 → 99 LOC
- [Phase 31]: Phase 31-02: useHabitDetail migrated to single useQuery with parallel-read queryFn; public shape preserved (zero callsite edits); 128 → 112 LOC (profile-join branch irreducible)
- [Phase 31]: Phase 31-02: TSQ-01 cross-screen reactivity proven by useHabits.crossScreen.test.tsx — two renderHook calls share one QueryClient; toggle in mount-A surfaces in mount-B in the same React tick
- [Phase 31]: Phase 31-02: TSQ-08 mutationShape regression gate locked in src/hooks/__tests__/mutationShape.test.ts — static fs-based brace-depth walk; canonical shape enforced for Waves 3-7; exemption marker '// @mutationShape: no-optimistic' for create-with-side-effects mutations
- [Phase 31]: Phase 31-02: PILOT GATE Task 6 PASS recorded 2026-05-13 (tester iuliKB) — cross-screen numerator update verified on dev client; sign-out → different-account showed no prior-user cache leakage; Wave 3 (31-03) unblocked
- [Phase 31]: Phase 31-03: useHomeScreen migrated to two composed useQuery sharing queryKeys.friends.list with future useFriends; subscribeHomeStatuses added to realtimeBridge; useHomeStore.friends+lastFetchedAt stripped while lastActiveAt preserved
- [Phase 31]: Phase 31-03: useTodos public shape preserved verbatim ({mine, fromChats, completeTodo, completeChatTodo}) — plan's phantom {todos, addTodo, toggleTodo, deleteTodo} shape and RPCs add/toggle/delete_my_todo did not exist; canonical Pattern 5 mutations applied to the REAL contract
- [Phase 31]: Phase 31-03: useSpotlight + useStreakData deferred to Wave 7; useUpcomingEvents NOT migrated (pure client-side filter on usePlansStore, will benefit transitively from Wave 4 usePlans migration)
- [Phase 31]: Phase 31-03: useChatTodos uses '@mutationShape: no-optimistic' exemption markers on both useMutation calls (RPC-atomic, no per-list cache key to splice); mutationShape gate now covers 5 blocks across 3 files (useHabits + useTodos + useChatTodos)
- [Phase 31]: Phase 31-04: usePlans gains a new rsvp() mutator (canonical Pattern 5; updates list+detail caches, invalidates home.upcomingEvents) — additive to public shape, mitigates T-31-14 cross-member-write threat
- [Phase 31]: Phase 31-04: usePlans.createPlan preserves real 2-insert flow (plans row + plan_members rows) — plan template referenced phantom supabase.rpc('create_plan') that does not exist; @mutationShape: no-optimistic marker applies because server-generated plan.id is unknown until first insert returns
- [Phase 31]: Phase 31-04: usePlanDetail mutators stay plain async (NOT useMutation) — invalidate plans.detail+plans.list+home.upcomingEvents on success; keeps public shape verbatim without adding ~120 LOC of net-equivalent Pattern 5 boilerplate
- [Phase 31]: Phase 31-04: usePlansStore stripped fully (plans + lastFetchedAt + setPlans + removePlan); kept as empty _placeholder?: never scaffold; PlanDashboardScreen.removePlan + PlanCreateModal.setPlans both migrated to queryClient.invalidateQueries
- [Phase 31]: Phase 31-04: useUpcomingEvents migrated transitively — reads usePlans().plans (TanStack Query cache) instead of usePlansStore.plans; no separate useQuery (pure client-side filter on creator-or-going + future + capped at 5)
- [Phase 31]: Phase 31-04: useAllPlanPhotos.deletePhoto showcases Pattern-5-across-cache-family — optimistically splices both plans.allPhotos(userId) AND plans.photos(planId); rolls back both on error; invalidates the triple (allPhotos+photos+home.all) so Memories+per-plan grid+Home tile stay in sync
- [Phase 31]: Phase 31-04: mutationShape gate now covers 6 files / 10 mutation blocks (was 3/5); 4 exemption markers in use (useChatTodos x2 + usePlans.createPlan + usePlanPhotos.uploadPhoto) — exemption pattern proven across 3 distinct rationales (side-effect-heavy creates, async file IO, RPC-atomic with no per-list cache key)
- [Phase 31]: Phase 31-05: useFriends + useHomeScreen now share queryKeys.friends.list(userId) — adding a friend on Friends screen instantly reflects on home Bento; mutations carry @mutationShape: no-optimistic markers (pre-migration was non-optimistic write+refetch); invalidation map fans out to friends.list + friends.pendingRequests + home.pendingRequestCount + home.all
- [Phase 31]: Phase 31-05: useExpenseCreate form state stays as local useState in the hook (consumer screen reads form fields off hook result); pulling form state out would require a full consumer refactor that the plan explicitly defers — the migration scope is the friends-picker useQuery + submit useMutation
- [Phase 31]: Phase 31-05: useWishListVotes cache shape uses myVoteItemIds[] (array) not Set<string> — Sets aren't structured-clone-friendly inside React Query's cache; hook reconstructs Set<string> at the return site. Hook signature additively extended with optional birthdayPersonId for per-person wish-list invalidation
- [Phase 31]: Phase 31-05: useExpenseDetail.settle uses canonical Pattern 5 — optimistic flip of isSettled + derived allSettled; drops the per-row settleLoading state mutation (the optimistic isSettled flip drives the visual); settleLoading field stays in return type as false for consumer compat
- [Phase 31]: Phase 31-05: useFriendWishList.toggleClaim stays plain async (NOT useMutation) — invalidate-on-success drives the cache without ~30 LOC of Pattern 5 boilerplate; same precedent as usePlanDetail mutators (Wave 4); claim toggles are rare and RLS enforces single-claim-per-item
- [Phase 31]: Phase 31-05: mutationShape gate now covers 11 files / 14 mutation blocks (was 6/10 at end of Wave 4); 8 exemption markers in use across 6 distinct rationales (side-effect-heavy creates, async file IO, RPC-atomic with no per-list cache key, pre-migration non-optimistic mutations)
- [Phase 31]: Phase 31-06: useStatus migrated to HYBRID useQuery + useMutation + useStatusStore mirror — fetching moves into cache, store kept alive for _layout.tsx:106-111 notification dispatcher's outside-React read path (load-bearing per research Open Q #3); setMutation onMutate writes BOTH setQueryData AND useStatusStore.getState().setCurrentStatus to keep cache + store in sync during optimistic window
- [Phase 31]: Phase 31-06: authBridge.attachAuthBridge extended to also clear useStatusStore on SIGNED_OUT — order: queryClient.removeQueries() first, useStatusStore.getState().clear() second; mitigates T-31-19 + covers TSQ-10 expansion; notification-side cleanup (cancelExpiryNotification + cancelMorningPrompt) stays in useStatus.ts as a domain-specific side effect
- [Phase 31]: Phase 31-06: realtimeBridge gains subscribePollVotes (poll-votes-${pollId} channel; invalidates polls.poll on any event) — replaces pre-migration prop-drilled lastPollVoteEvent; usePoll vote mutation is EXACT analog of useWishListVotes.toggleVote (Wave 5 flip-flag + bump-counter pattern)
- [Phase 31]: Phase 31-06: useNetworkStatus + useViewPreference intentionally NOT migrated — useNetworkStatus is a 6-LOC NetInfo wrapper that onlineManager covers transparently; useViewPreference is an AsyncStorage-only UI preference (not server state). Both will be documented in the Wave 8 boundary doc as canonical examples of zustand-not-cache
- [Phase 31]: Phase 31-07: useSpotlight uses a dual-export pattern (selectSpotlight selector preserved verbatim + new useSpotlight() hook added alongside) — BentoGrid callsite needs zero edits while future consumers can adopt the hook directly
- [Phase 31]: Phase 31-07: useSpotlight() hook derives synchronously via useMemo + mirrors into queryKeys.home.spotlight(userId) cache slot via useEffect + setQueryData; useQuery wraps with initialData: derived + staleTime: 0 so the derivation participates in the cache taxonomy without an async fetch
- [Phase 31]: Phase 31-07: useStreakData cache key in habits namespace (queryKeys.habits.streak) NOT a separate streak namespace — prefix invalidation under queryKeys.habits.all() reaches both overview and streak; Wave 2 useHabits.toggleToday invalidation intentionally NOT broadened (server batches streak end-of-day)
- [Phase 31]: Phase 31-07: Edge Function audit closed out as Case A (Wave 1 found 0 supabase.functions.invoke callsites; the phase's edge functions are server-side trigger-driven via outbox pattern, not client-invoked)
- [Phase 31]: Plan 31-08 closes Phase 31: chat hooks migrated, useChatStore stripped, PersistQueryClientProvider with selective shouldDehydrateQuery, boundary doc written. Manual smoke gate (Task 8) pending dev-client verification.
- [Phase 31]: shouldDehydrateQuery destructures [root, sub] to exclude 'chat' root + ('plans','photos') + ('plans','allPhotos') only — the whole plans namespace stays persisted (Plan list is needed on cold start).

### Roadmap Evolution

- [v1.7]: Phase 24 (Polish Foundation) unblocked all subsequent polish phases
- [v1.7]: Phase 28 (Branding) placed last — EAS build verification deferred pending Apple Dev account
- [v1.8]: Auth and Welcome placed at end — designed after main screens to match established visual language
- [v1.8]: Phase 29 depended on Phase 28; Phases 30–33 had been scoped to depend on Phase 29 (sequential screen-by-screen rollout) but were removed on 2026-05-13 before any work landed
- Phase 29.1 inserted after Phase 29: Habits & To-Do Features (URGENT)
- Phase 30 added 2026-05-13: Unify navigation source-of-truth and chat-entry handlers — fixes bottom-nav-bar visibility leak on `ChatRoomScreen` reached from non-canonical entry points (e.g., Squad → Memories → PlanDashboard → "Open Chat" pill); introduces `useNavigationStore` (zustand), consolidates 12+ `/chat/room` callers behind a single helper, removes legacy `FriendsList` route + dead `RecentMemoriesSection`. Full context in `.planning/phases/30-unify-navigation-source-of-truth-and-chat-entry-handlers/CONTEXT.md`. Origin: two parallel Opus 4.7 research agents confirmed assumption #2 (inconsistent source of truth) and partially confirmed assumption #1 (related duplication exists but not on the chat path).
- Phase 31 added 2026-05-13: Adopt TanStack Query for server-state caching and cross-screen reactivity — replaces ~35 per-hook `useState + useFocusEffect + supabase` fetch pattern with `useQuery`/`useMutation`; enables cross-screen reactivity, unifies optimistic-update + cache-invalidation patterns. Zustand stays for client/UI state only (auth, navigation surface, UI flags). Incremental migration with habits as pilot vertical. Depends on Phase 30 shipping first (stable routing layer for verification). Full context in `.planning/phases/31-adopt-tanstack-query-for-server-state-caching-and-cross-scre/CONTEXT.md`.
- Phase 32 added 2026-05-13: Chat list reactivity, widget send reliability, and last-entry previews — fixes three chat-surface gaps left after Phase 31 Wave 8: (1) chat list goes stale after sending any entry until pull-to-refresh; (2) widget bubbles (image/poll/todo) stick in pending state when Realtime echo is missed (most common: image 70% opacity overlay); (3) chat list preview is blank for non-text entries because the query omits `message_type`/`image_url`/`poll_id` and the row has no per-kind formatter. Also adds `realtimeBridge.subscribeChatList(userId, queryClient)` for incoming-message reactivity and amends the Phase-31 empty-`onSettled` contract into a tiered policy (text: invalidate chat.list only; widgets: invalidate both chat.messages + chat.list). Uses Ionicons (`image-outline`, `stats-chart-outline`, `checkbox-outline`) and sender attribution (`"You: "` / `"<FirstName>: "`) across all chat scopes. Out of scope: new `expense` message_type, RPC signature changes for todos, i18n. Origin: three parallel Opus 4.7 research agents confirmed root causes; user-confirmed design decisions captured in `.planning/phases/32-chat-list-reactivity-widget-send-reliability-and-last-entry-/CONTEXT.md`.

### Pending Todos

(none)

### Blockers/Concerns

- EAS build / Apple Dev account still pending for hardware smoke test (carried from v1.7)
- [Phase 31 follow-up — deferred] Chat-list message-preview reactivity regressed since Wave 8 (`31-08`): after sending a message in any chat and returning to the chats/all tab, the chat list row does NOT update its latest-message-preview text. Likely root cause: `useChatRoom` `sendMessage`/`sendImage` Pattern 5 mutations have an intentionally empty `onSettled` (Realtime INSERT reconciles `chat.messages(channelId)` only), and there is no list-level invalidation or subscription that touches `queryKeys.chat.list(userId)` on cross-room INSERTs. User scoped this to a separate follow-up phase, bundled with pre-existing in-chat widget reactivity gaps (polls, todo lists, wishlist, image attachments — all known issues from before Phase 31). Do NOT fix in Phase 31. See `.planning/phases/31-adopt-tanstack-query-for-server-state-caching-and-cross-scre/31-08-SUMMARY.md` `## Known Caveats` for full hypothesis + likely fix sketches.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260513-5as | Add useTabBarSpacing hook for consistent bottom-nav clearance across tab screens | 2026-05-13 | 6bc55d8 | Verified | [260513-5as-add-usetabbarspacing-hook-for-consistent](./quick/260513-5as-add-usetabbarspacing-hook-for-consistent/) |
| Phase 31 P01 | 17min | 9 tasks | 12 files |
| Phase 31 P02 | 6min | 5 tasks | 5 files |
| Phase 31 P03 | 8min | 5 tasks | 12 files |
| Phase 31 P04 | 7min | 4 tasks | 11 files |
| Phase 31 P05 | 9min | 6 tasks | 16 files |
| Phase 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre P06 | 8 min | 5 tasks | 10 files |
| Phase 31-adopt-tanstack-query-for-server-state-caching-and-cross-scre P07 | 5 min | 3 tasks | 5 files |
| Phase 31 P08 | 18min | 8 tasks | 17 files |

## Session Continuity

Last session: 2026-05-13T10:28:21.863Z
Stopped at: Completed 31-08-PLAN.md (Task 8 manual smoke PASS with deferred chat-list reactivity caveat)
