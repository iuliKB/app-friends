---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Deep UI Refinement & Screen Overhaul
status: verifying
stopped_at: Completed 29.1-08-PLAN.md (Home widgets + ROADMAP D-21) — Phase 29.1 COMPLETE
last_updated: "2026-05-12T21:17:23.656Z"
last_activity: 2026-05-12
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 13
  completed_plans: 13
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** Phase 29.1 — habits-to-do-features

## Current Position

Phase: 30
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-05-12

## Phase Structure

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 29 | Home Screen Overhaul | HOME-05, HOME-06, HOME-07, HOME-08 | Not started |
| 30 | Squad Screen Overhaul | SQUAD-05, SQUAD-06, SQUAD-07, SQUAD-08 | Not started |
| 31 | Explore Screen Overhaul | EXPLORE-01, EXPLORE-02, EXPLORE-03, EXPLORE-04 | Not started |
| 32 | Auth Screen Redesign | AUTH-05, AUTH-06 | Not started |
| 33 | Welcome / Onboarding Flow | ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04 | Not started |

## Performance Metrics

Plans executed this milestone: 0
Phases completed: 0
Requirements covered: 0 / 18

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
- [v1.8 Phase 29]: OnboardingHintSheet stays in place through Phase 29 — removed only in Phase 33
- [v1.8 Phase 31]: All three map userInterfaceStyle: 'dark' instances fixed in Phase 31 together — ExploreMapView, PlanDashboardScreen, LocationPicker
- [v1.8 Phase 32]: LinearGradient always-dark bug at AuthScreen.tsx:410 is a required deliverable; gradient tokens extracted to src/theme/gradients.ts
- [v1.8 Phase 33]: react-native-pager-view@8.0.1 installed; AsyncStorage key @campfire/welcome_complete (NOT @campfire/onboarding_hint_shown); implemented as full-screen Modal overlay inside (tabs)/_layout.tsx (not a new Stack route); gestureEnabled: false to prevent iOS swipe-back conflict
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
- [Phase 29.1-08]: ROADMAP Phase 30 scope reduced to SQUAD-06 only (Friends list polish) per D-21 — Bento tile redesign originally assigned to SQUAD-05/07/08 was delivered by Phase 29.1's Activity-tab Bento grid (HabitsTile + TodosTile + rearranged 3x2 layout)

### Roadmap Evolution

- [v1.7]: Phase 24 (Polish Foundation) unblocked all subsequent polish phases
- [v1.7]: Phase 28 (Branding) placed last — EAS build verification deferred pending Apple Dev account
- [v1.8]: Auth and Welcome placed at end — designed after main screens to match established visual language
- [v1.8]: Phase 29 depends on Phase 28; Phases 30-33 depend on Phase 29 (sequential screen-by-screen rollout)
- Phase 29.1 inserted after Phase 29: Habits & To-Do Features (URGENT)

### Pending Todos

(none)

### Blockers/Concerns

- EAS build / Apple Dev account still pending for hardware smoke test (carried from v1.7)

## Session Continuity

Last session: 2026-05-12T03:18:29.845Z
Stopped at: Completed 29.1-08-PLAN.md (Home widgets + ROADMAP D-21) — Phase 29.1 COMPLETE
