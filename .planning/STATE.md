---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Deep UI Refinement & Screen Overhaul
status: executing
stopped_at: Phase 29.1 UI-SPEC approved
last_updated: "2026-05-12T01:53:23.228Z"
last_activity: 2026-05-12 -- Phase 29.1 execution started
progress:
  total_phases: 11
  completed_phases: 1
  total_plans: 13
  completed_plans: 5
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** Phase 29.1 — habits-to-do-features

## Current Position

Phase: 29.1 (habits-to-do-features) — EXECUTING
Plan: 1 of 8
Status: Executing Phase 29.1
Last activity: 2026-05-12 -- Phase 29.1 execution started

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

Last session: 2026-05-12T01:06:44.860Z
Stopped at: Phase 29.1 UI-SPEC approved
