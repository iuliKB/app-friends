# Roadmap: Campfire

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 UI/UX Design System** — Phases 7-9 (shipped 2026-03-25)
- ✅ **v1.2 Squad & Navigation** — Phases 10-12 (shipped 2026-04-04)
- ✅ **v1.3 Liveness & Notifications** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v1.3.5 Homescreen Redesign** — Phases 1-4 (shipped 2026-04-11)
- ✅ **v1.4 Squad Dashboard & Social Tools** — Phases 5-11 (shipped 2026-04-17)
- ✅ **v1.5 Chat & Profile** — Phases 12-17 (shipped 2026-04-22)
- ✅ **v1.6 Places, Themes & Memories** — Phases 18-23 (shipped 2026-05-04)
- ✅ **v1.7 Polish & Launch Ready** — Phases 24-28 (shipped 2026-05-05)
- 🔄 **v1.8 Deep UI Refinement & Screen Overhaul** — Phases 29-33 (in progress)

## Archived Milestones

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-24</summary>

- [x] Phase 1: Foundation + Auth (4/4 plans) — completed 2026-03-17
- [x] Phase 2: Friends + Status (3/3 plans) — completed 2026-03-17
- [x] Phase 3: Home Screen (2/2 plans) — completed 2026-03-18
- [x] Phase 4: Plans (3/3 plans) — completed 2026-03-18
- [x] Phase 5: Chat (2/2 plans) — completed 2026-03-18
- [x] Phase 6: Notifications + Polish (3/3 plans) — completed 2026-03-19

</details>

<details>
<summary>✅ v1.1 UI/UX Design System (Phases 7-9) — SHIPPED 2026-03-25</summary>

- [x] Phase 7: Design Tokens (2/2 plans) — completed 2026-03-24
- [x] Phase 8: Shared Components (3/3 plans) — completed 2026-03-24
- [x] Phase 9: Screen Consistency Sweep (6/6 plans) — completed 2026-03-25

</details>

<details>
<summary>✅ v1.2 Squad & Navigation (Phases 10-12) — SHIPPED 2026-04-04</summary>

- [x] Phase 10: Squad Tab (2/2 plans) — completed 2026-04-04
- [x] Phase 11: Navigation Restructure (2/2 plans) — completed 2026-04-04
- [x] Phase 12: Profile Simplification (1/1 plan) — completed 2026-04-04

</details>

<details>
<summary>✅ v1.3 Liveness & Notifications (Phases 1-5) — SHIPPED 2026-04-10</summary>

- [x] Phase 1: Push Infrastructure & DM Entry Point (10/10 plans) — completed 2026-04-07
- [x] Phase 2: Status Liveness & TTL (6/6 plans) — completed 2026-04-08
- [x] Phase 3: Friend Went Free Loop (8/8 plans) — completed 2026-04-09
- [x] Phase 4: Morning Prompt + Squad Goals Streak (6/6 plans) — completed 2026-04-10
- [x] Phase 5: Hardware Verification Gate (2/2 plans) — completed 2026-04-10

</details>

<details>
<summary>✅ v1.3.5 Homescreen Redesign (Phases 1-4) — SHIPPED 2026-04-11</summary>

- [x] Phase 1: Status Pill & Bottom Sheet (3/3 plans) — completed 2026-04-10
- [x] Phase 2: Radar View & View Toggle (4/4 plans) — completed 2026-04-11
- [x] Phase 3: Card Stack View (4/4 plans) — completed 2026-04-11
- [x] Phase 4: Upcoming Events Section (4/4 plans) — completed 2026-04-11

</details>

<details>
<summary>✅ v1.4 Squad Dashboard & Social Tools (Phases 5-11) — SHIPPED 2026-04-17</summary>

- [x] Phase 5: Database Migrations (3/3 plans) — completed 2026-04-11
- [x] Phase 6: Birthday Profile Field (2/2 plans) — completed 2026-04-12
- [x] Phase 7: Birthday Calendar Feature (3/3 plans) — completed 2026-04-12
- [x] Phase 8: IOU Create & Detail (4/4 plans) — completed 2026-04-12
- [x] Phase 9: IOU List & Summary (3/3 plans) — completed 2026-04-16
- [x] Phase 10: Squad Dashboard (2/2 plans) — completed 2026-04-16
- [x] Phase 11: Birthday Feature (8/8 plans) — completed 2026-04-17

**Key deliverables:** IOU expense tracking, birthday profiles + wish lists + group gift coordination, birthday group chats, Squad Dashboard scrollable with feature cards, native DateTimePicker, chat attachment menu, group participant sheet, home screen IOU+Birthday widgets, plan cover image upload fix.

</details>

### Phase 30: Unify navigation source-of-truth and chat-entry handlers

**Goal:** Fix the bottom navigation bar showing on `ChatRoomScreen` when entered from non-canonical paths (e.g., Squad → Memories → PlanDashboard → "Open Chat" pill). Root cause: `CustomTabBar.tsx` keys visibility off navigator topology rather than current surface. Introduce `useNavigationStore` (zustand) as the single source of truth for bar visibility, refactor `CustomTabBar` to consume it, hoist `chat/room` to root Stack so it never mounts inside a tab's nested stack, consolidate the 12+ `/chat/room` callers (and four duplicate "create-DM-and-push" blocks) behind one helper, and remove related legacy/dead code (`FriendsList` legacy route, `RecentMemoriesSection`). Full scope and research findings: `.planning/phases/30-unify-navigation-source-of-truth-and-chat-entry-handlers/CONTEXT.md`.
**Requirements**: TBD (no formal REQ-IDs — must-haves derived from CONTEXT.md verification anchor)
**Depends on:** Phase 29
**Plans:** 7/7 plans complete

Plans:
- [x] 30-01-PLAN.md — Create `useNavigationStore` zustand slice (Wave 1)
- [x] 30-02-PLAN.md — Create `openChat` helper consolidating 13 callsites + 8 duplicate DM blocks (Wave 1)
- [x] 30-03-PLAN.md — Hoist `chat/room` to root Stack + register `<Stack.Screen name="chat" />` in root `_layout.tsx` (Wave 1)
- [x] 30-04-PLAN.md — Refactor `CustomTabBar` to consume `useNavigationStore` + add `useFocusEffect` writer in `ChatRoomScreen` (Wave 2, depends on 01 + 03)
- [x] 30-05-PLAN.md — Migrate all 10 callsite files (4 home DM duplicates, 4 routing handlers, 2 sheet handlers) to use `openChat` (Wave 2, depends on 02 + 03 + 07)
- [x] 30-06-PLAN.md — Delete dead-code `RecentMemoriesSection.tsx` (Wave 1)
- [x] 30-07-PLAN.md — Delete legacy `/friends` index route + `FriendsList.tsx` (Wave 1)

### Phase 31: Adopt TanStack Query for server-state caching and cross-screen reactivity

**Goal:** Replace the ~35 per-hook `useState + useFocusEffect + supabase` fetch pattern with TanStack Query for all server state. Establishes query-key conventions, optimistic-mutation conventions, and a Supabase Realtime → query-cache integration pattern. Enables cross-screen reactivity (editing data in one screen instantly reflects in others without manual refetch), eliminates wasteful refetch-on-focus, and unifies optimistic-update handling. Zustand remains the home for client/UI state only (auth, navigation surface, UI flags) — explicit boundary documented. Migration is incremental: pilot vertical first (likely habits), then batch by surface (chat, plans, friends, expenses, home aggregates, misc). Depends on Phase 30 shipping first so routing/layout is stable. Full scope and migration plan: `.planning/phases/31-adopt-tanstack-query-for-server-state-caching-and-cross-scre/CONTEXT.md`.
**Requirements**: TBD
**Depends on:** Phase 30
**Plans:** 2/8 plans complete (In Progress)

Plans:
- [x] 31-01-PLAN.md — Wave 1 Foundation: install deps, create queryClient/queryKeys/realtimeBridge/authBridge/useRefreshOnFocus/createTestQueryClient + 3 unit tests + mount QueryClientProvider in _layout.tsx
- [x] 31-02-PLAN.md — Wave 2 PILOT: migrate useHabits + useHabitDetail; cross-screen reactivity test (TSQ-01) + mutationShape regression gate (TSQ-08); blocking pilot smoke before Wave 3
- [x] 31-03-PLAN.md — Wave 3 Home aggregates + Todos: migrate useHomeScreen + useTodos + useUpcomingBirthdays + useUpcomingEvents + useInvitationCount + usePendingRequestsCount + useChatTodos; add subscribeHomeStatuses; strip useHomeStore.friends/lastFetchedAt
- [x] 31-04-PLAN.md — Wave 4 Plans: migrate usePlans (RSVP optimistic + createPlan no-optimistic exemption) + usePlanDetail + usePlanPhotos + useAllPlanPhotos; strip usePlansStore.plans
- [x] 31-05-PLAN.md — Wave 5 Friends + Expenses: migrate 9 hooks (useFriends + 3 wish-list + 4 expenses + useExpenseCreate); shared cache key with useHomeScreen
- [ ] 31-06-PLAN.md — Wave 6 Status (hybrid) + Polls + Invitations: migrate useStatus (preserve useStatusStore for outside-React reads) + usePoll (Realtime via subscribePollVotes) + useInvitations; extend authBridge to clear useStatusStore on SIGNED_OUT; useNetworkStatus + useViewPreference intentionally deferred
- [ ] 31-07-PLAN.md — Wave 7 Misc: migrate useSpotlight (preserving Phase 29.1 extension) + useStreakData; close out Edge Function audit from Wave 1
- [ ] 31-08-PLAN.md — Wave 8 Chat + Persistence + Boundary doc: migrate useChatList + useChatRoom + useChatMembers (subscribeChatRoom Hybrid INSERT/UPDATE/DELETE); strip useChatStore.chatList; install + enable PersistQueryClientProvider with selective shouldDehydrateQuery; write src/hooks/README.md boundary doc; final phase smoke gate

---

<details>
<summary>✅ v1.5 Chat & Profile (Phases 12-17) — SHIPPED 2026-04-22</summary>

- [x] Phase 12: Schema Foundation (2/2 plans) — completed 2026-04-20
- [x] Phase 13: Profile Rework + Friend Profile (3/3 plans) — completed 2026-04-20
- [x] Phase 14: Reply Threading (4/4 plans) — completed 2026-04-20
- [x] Phase 15: Message Reactions (4/4 plans) — completed 2026-04-21
- [x] Phase 16: Media Sharing (4/4 plans) — completed 2026-04-21
- [x] Phase 17: Polls (4/4 plans) — completed 2026-04-21

**Key deliverables:** Migration 0018+0019, profile rework + friend profile screen, reply threading with context menu, message reactions (6-emoji tapback, live counts), media sharing (camera + library, compressed inline bubbles, lightbox), polls (attachment menu, live vote counts).

</details>

<details>
<summary>✅ v1.6 Places, Themes & Memories (Phases 18-23) — SHIPPED 2026-05-04</summary>

- [x] Phase 18: Theme Foundation (3/3 plans) — completed 2026-04-28
- [x] Phase 19: Theme Migration (3/3 plans) — completed 2026-04-29
- [x] Phase 20: Map Feature (6/6 plans) — completed 2026-04-29
- [x] Phase 21: Gallery Foundation (3/3 plans) — completed 2026-04-30
- [x] Phase 22: Gallery UI (3/3 plans) — completed 2026-04-30
- [x] Phase 23: Memories Gallery (4/4 plans) — completed 2026-05-04

**Key deliverables:** Light/Dark/System theme toggle across all screens, plan location picker with map tile + Explore map view + native navigation deep links, per-plan photo gallery (10 photos/participant, private bucket, signed URLs), cross-plan Memories Gallery home widget + full-screen gallery grouped by plan.

</details>

<details>
<summary>✅ v1.7 Polish & Launch Ready (Phases 24-28) — SHIPPED 2026-05-05</summary>

- [x] Phase 24: Polish Foundation (2/2 plans) — completed 2026-05-05
- [x] Phase 25: Auth, Onboarding & Errors (5/5 plans) — completed 2026-05-05
- [x] Phase 26: Home & Chat Polish (6/6 plans) — completed 2026-05-05
- [x] Phase 27: Plans & Squad Polish (5/5 plans) — completed 2026-05-05
- [x] Phase 28: Branding (1/1 plan) — completed 2026-05-05

**Key deliverables:** SkeletonPulse shimmer + animation tokens, forgot-password flow, ToS/Privacy links, error state audit, OnboardingHintSheet first-run hint, Home/Chat press feedback + haptics + FADING pulse ring, Plans/Squad skeleton cards + RSVP spring + Squad stagger animation, app icon + branded splash screen.

</details>

## Phases

### v1.8 Deep UI Refinement & Screen Overhaul

- [x] **Phase 29: Home Screen Overhaul** - Ground-up visual redesign of radar bubbles, card stack, status display, and events section using /ui-ux-pro-max (completed 2026-05-06)

## Phase Details

### Phase 24: Polish Foundation
**Goal**: Shared UI primitives exist that every other polish phase builds on
**Depends on**: Nothing (foundation phase)
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04
**Success Criteria** (what must be TRUE):
  1. Any screen that fetches remote data shows shimmer skeleton placeholders while loading, not blank white space
  2. Animation durations and easing curves are imported from `src/theme/` tokens — no raw numbers in any component animation
  3. Any EmptyState component can be rendered with an optional CTA button that navigates or triggers an action
  4. Any PrimaryButton wired to an async operation disables itself and shows an inline spinner while the operation is in progress
**Plans**: 2 plans
Plans:
- [x] 24-01-PLAN.md — Animation tokens (src/theme/animation.ts) + barrel export + unit tests
- [x] 24-02-PLAN.md — SkeletonPulse component + POLISH-03/POLISH-04 verification
**UI hint**: yes

### Phase 25: Auth, Onboarding & Errors
**Goal**: App Store-blocking auth and error experience items are complete
**Depends on**: Phase 24
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can tap "Forgot password?" on the login screen, enter their email, and receive a reset link — without needing to contact support
  2. Sign-up screen displays visible, tappable Terms of Service and Privacy Policy links before account creation
  3. Every data-fetching screen shows an ErrorDisplay component with a retry action when the network or Supabase call fails — no silent blank screens
  4. A first-run user (zero friends, no status set) sees a one-time dismissible hint guiding them to set their status and add a friend
**Plans**: 5 plans
Plans:
- [x] 25-01-PLAN.md — AUTH-01 inline forgot-password toggle + AUTH-02 ToS/Privacy links in AuthScreen
- [x] 25-02-PLAN.md — AUTH-03 hook layer: add error + refetch to useHomeScreen, useFriends, useChatRoom
- [x] 25-03-PLAN.md — AUTH-03 screen batch 1: HomeScreen, FriendsList, FriendRequests, AddFriend, ChatListScreen, ChatRoomScreen
- [x] 25-04-PLAN.md — AUTH-03 screen batch 2: PlansListScreen, PlanDashboardScreen, squad.tsx, wish-list.tsx, birthday/[id].tsx, MemoriesTabContent
- [x] 25-05-PLAN.md — AUTH-04 OnboardingHintSheet component + HomeScreen first-run flag wiring
**UI hint**: yes

### Phase 26: Home & Chat Polish
**Goal**: Home screen and chat feel fast, tactile, and polished end-to-end
**Depends on**: Phase 24
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. Opening the Home screen shows shimmer skeletons for friend cards while status data loads, not a blank list
  2. A user with zero friends lands on an empty home screen with a card guiding them to add their first friend
  3. Friends whose status heartbeat is FADING show a visible animated pulse ring around their radar bubble
  4. All tappable home screen cards (status card, friend cards, widgets) compress slightly on press and spring back with 1.0→0.96 scale feedback
  5. Opening the chat list shows skeleton rows while conversations load; sending a message triggers a light haptic and the message appears immediately in the thread with a "sending" indicator
  6. Long-pressing a message bubble produces a subtle scale animation before the context menu opens; tapping a reaction triggers a selection haptic
**Plans**: 6 plans
Plans:
- [x] 26-01-PLAN.md — Wave 0 test scaffolds (fadingPulse + useChatRoom.send) + HOME-01 skeleton wiring (RadarView, CardStackView, HomeScreen)
- [x] 26-02-PLAN.md — HOME-03 FADING pulse ring: parameterize PulseRing with variant prop, export FADING_PULSE_COLOR
- [x] 26-03-PLAN.md — HOME-02 zero-friends empty state card + HOME-04 scale spring press feedback (HomeFriendCard, HomeWidgetRow, OwnStatusCard, EventCard)
- [x] 26-04-PLAN.md — CHAT-01 chat list skeleton rows + CHAT-02 send haptic in SendBar
- [x] 26-05-PLAN.md — CHAT-03 optimistic send: Message.failed type + useChatRoom failure path + MessageBubble pending/failed UI + reaction haptic (CHAT-02) + ChatRoomScreen retry wiring
- [x] 26-06-PLAN.md — CHAT-04 message bubble long-press scale animation
**UI hint**: yes

### Phase 27: Plans & Squad Polish
**Goal**: Plans, Explore, and Squad screens feel responsive and rewarding to interact with
**Depends on**: Phase 24
**Requirements**: PLANS-01, PLANS-02, PLANS-03, PLANS-04, SQUAD-01, SQUAD-02, SQUAD-03, SQUAD-04
**Success Criteria** (what must be TRUE):
  1. Opening the Explore/Plans list shows skeleton plan cards while data loads
  2. Tapping Yes/No/Maybe on a plan RSVP triggers a spring bounce animation and a haptic
  3. Successfully creating a plan triggers a `notificationAsync(Success)` haptic confirming the action
  4. The Explore map tab shows a friendly illustrated empty state when no friend plans are nearby, not a blank map
  5. Accepting a friend request triggers a success haptic; rejecting triggers a medium impact haptic; settling an IOU triggers a success haptic
  6. Squad Dashboard feature cards stagger-animate in on load with 80ms delay between cards; tapping a wish list claim item has spring scale press feedback
**Plans**: 5 plans
Plans:
- [x] 27-01-PLAN.md — Wave 0 test scaffolds (RSVPButtons, WishListItem, animation token)
- [x] 27-02-PLAN.md — staggerDelay token + PlanCardSkeleton component
- [x] 27-03-PLAN.md — Haptic wiring: SQUAD-01 friend requests, SQUAD-02 IOU settle, PLANS-03 plan creation
- [x] 27-04-PLAN.md — Skeleton in PlansListScreen (PLANS-01), map empty state (PLANS-04), squad.tsx token (SQUAD-03)
- [x] 27-05-PLAN.md — RSVP spring bounce (PLANS-02), WishListItem press feedback (SQUAD-04)
**UI hint**: yes

### Phase 28: Branding
**Goal**: App has final branded identity visible from the OS home screen through launch
**Depends on**: Phase 24
**Requirements**: BRAND-01, BRAND-02, BRAND-03
**Success Criteria** (what must be TRUE):
  1. App icon on the device home screen shows the final 1024×1024 Campfire branded icon — no Expo placeholder
  2. Launching the app shows a branded splash screen with a smooth fade transition into the first screen
  3. Splash screen uses the correct background treatment for both light and dark OS mode — no jarring contrast mismatch on launch
**Plans**: 1 plan
Plans:
- [x] 28-01-PLAN.md — BRAND-01/02/03: android adaptiveIcon + expo-splash-screen plugin (light/dark) + SplashScreen.setOptions fade
**UI hint**: yes

### Phase 29: Home Screen Overhaul
**Goal**: Home screen has a ground-up visual redesign — radar bubbles clearly communicate freshness, the view-mode preference persists, and the events section has a polished, consistent layout
**Depends on**: Phase 28
**Requirements**: HOME-05, HOME-06, HOME-07, HOME-08
**Success Criteria** (what must be TRUE):
  1. At a glance, ALIVE radar bubbles look distinct from FADING (dimmed) and DEAD (visually distinct treatment) friends — no tap required to understand who is available
  2. Switching between Radar and Cards view and restarting the app restores the last-used mode — preference survives an app kill
  3. A user with zero friends sees a prominent "Invite friends" CTA that navigates to the Add Friend flow, not just a generic empty state
  4. Upcoming events cards have consistent date/time prominence, participant avatars, and visual hierarchy that feels native to the Campfire design system
**Plans**: 5 plans
Plans:
- [x] 29-01-PLAN.md — Wave 1: Test scaffolds for HOME-05, HOME-06, HOME-08
- [x] 29-02-PLAN.md — Wave 1: RadarBubble DEAD treatment (opacity 0.38, greyscale overlay, no Pressable)
- [x] 29-03-PLAN.md — Wave 1: HomeScreen EmptyState CTA update + OnboardingHintSheet removal
- [x] 29-04-PLAN.md — Wave 1: EventCard resize 240×160, date pill, AvatarStack size=28 maxVisible=5
- [x] 29-05-PLAN.md — Wave 2: UpcomingEventsSection skeleton + CARD_WIDTH/FlatList height sync

### Phase 29.1: Habits & To-Do Features (INSERTED)

**Goal:** Two new social features (Habits + To-Dos) integrated end-to-end across schema → Bento tiles in Squad → Activity → full-screen list/detail routes → chat attachment with two-step picker → system message roundtrip → home widgets. Wires up the existing chat "To-Do List" attachment stub and adds idempotent group-habit check-ins with per-user Realtime fan-out.
**Requirements**: Uses inline decisions D-01..D-21 (see 29.1-CONTEXT.md) — no REQ-IDs
**Depends on:** Phase 29
**Plans:** 8/8 plans complete

Plans:
- [x] 29.1-01-PLAN.md — Migration 0024 (6 tables + 2 helpers + 8 RPCs + RLS) + [BLOCKING] supabase db push
- [x] 29.1-02-PLAN.md — TypeScript types (habits.ts, todos.ts) + MessageType extension ('system' + 'todo')
- [x] 29.1-03-PLAN.md — Hooks: useHabits + useHabitDetail + useTodos + useChatTodos + useSpotlight extension + dateLocal util
- [x] 29.1-04-PLAN.md — Bento tiles: HabitsTile + TodosTile + grid ROWS=4 + tileAccents extension + SpotlightTile icon/accent map
- [x] 29.1-05-PLAN.md — Habits feature surfaces: /squad/habits/* routes + 5 components (HabitRow, HabitCadencePicker, HabitMemberStrip, HabitCheckinHistory, HabitInvitationRow)
- [x] 29.1-06-PLAN.md — To-Dos feature surfaces: /squad/todos/* routes + 3 components (TodoRow, ChatTodoListRow, TodoQuickAdd)
- [x] 29.1-07-PLAN.md — Chat integration: ChatTodoPickerSheet + ChatTodoBubble + SystemMessageRow + MessageBubble render branches + ChatRoomScreen wire-up
