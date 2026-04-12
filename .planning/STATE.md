---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Squad Dashboard & Social Tools — Active Phases
status: executing
stopped_at: "Checkpoint 08-04-PLAN.md Task 3: awaiting human visual verification"
last_updated: "2026-04-12T10:03:24.259Z"
last_activity: 2026-04-12
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 12
  completed_plans: 12
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must
**Current focus:** Phase 08 — IOU Create & Detail

## Current Position

Milestone: v1.4 Squad Dashboard & Social Tools
Phase: 08 (IOU Create & Detail) — EXECUTING
Plan: 4 of 4
Status: Ready to execute
Last activity: 2026-04-12

Progress: [░░░░░░░░░░] 0%

## Phase Structure

| Phase | Goal | Requirements |
|-------|------|--------------|
| 5. Database Migrations | Schema foundation for all v1.4 client work | IOU-01–05, BDAY-01–03 |
| 6. Birthday Profile Field | Birthday input in profile edit, save/load verified | BDAY-01 |
| 7. Birthday Calendar Feature | Upcoming birthdays list screen + dashboard card | BDAY-02, BDAY-03 |
| 8. IOU Create & Detail | Atomic expense creation, split, settle | IOU-01, IOU-02, IOU-04 |
| 9. IOU List & Summary | Net balance view, expense history, IOU card | IOU-03, IOU-05 |
| 10. Squad Dashboard | Scrollable dashboard replaces tab switcher | DASH-01–04 |

## Performance Metrics

Plans executed this milestone: 0
Phases completed: 0/6
Requirements covered: 12/12 mapped

## Accumulated Context

### Decisions

- [v1.3.5]: Status setting consolidated to one location — bottom sheet via header status pill (MoodPicker and ReEngagementBanner removed from HomeScreen)
- [v1.3.5]: Bottom sheet must be custom implementation — @gorhom/bottom-sheet is broken on Reanimated v4; use Modal + Animated.timing following FriendActionSheet pattern (D-01)
- [v1.3.5]: Nudge = DM shortcut (opens existing DM conversation); lightweight ping notification deferred to v1.4
- [v1.3.5]: Radar view caps at 6 bubbles; overflow in horizontal scroll row below radar
- [v1.3.5]: Bubble positions from onLayout dimensions, not Dimensions.get — required for all screen size support
- [v1.3.5]: Card stack: verify rn-swiper-list works in Expo Go first; fall back to custom Gesture.Pan if not
- [v1.3.5]: Animated.loop requires isInteraction: false to avoid blocking JS thread (D-04)
- [v1.3.5]: MoodPicker removal + ReEngagementBanner rewiring must be a single atomic change (Phase 1 delivers both together, in 01-03)
- [v1.3.5]: Stat strip (STAT-01) deferred to v1.4
- [v1.3.5]: Lightweight nudge ping (NUDGE-01, NUDGE-02) deferred to v1.4
- [v1.3.5]: display_name sourced from session.user.user_metadata.display_name (no extra DB fetch needed for pill empty state)
- [v1.3.5]: Session count module-level flag (sessionIncrementedThisLaunch) guards against double-increment on tab switch remount
- [Phase 01-status-pill-bottom-sheet]: StatusPickerSheet translateY starts at 600 (not 300) to guarantee off-screen initial position for taller MoodPicker content
- [Phase 01-status-pill-bottom-sheet]: sessionCount comes from parent props (HomeScreen reads AsyncStorage, passes down) — keeps OwnStatusPill pure and testable
- [Phase 01-status-pill-bottom-sheet]: display_name from session.user.user_metadata avoids extra Supabase query at OwnStatusPill render time
- [Phase 01-status-pill-bottom-sheet]: MoodPicker + ReEngagementBanner removal is atomic in HomeScreen refactor (D-11)
- [Phase 01.1-own-status-card]: OwnStatusCard replaces OwnStatusPill in HomeScreen — full-width card in ScrollView with always-active pulse, no session count gate
- [Phase 01.1-own-status-card]: FONT_WEIGHT.bold missing from theme tokens — used hardcoded 700 with eslint-disable per project convention
- [Phase 02-01]: COLORS.surface.overlay ('#ffffff14') confirmed in theme — no hardcoded fallback needed for RadarViewToggle active background
- [Phase 02-01]: RadarViewToggle active label uses COLORS.text.primary (not COLORS.surface.base) — overlay toggle pattern differs from status segment pattern
- [Phase 02-radar-view-view-toggle]: RadarBubble PulseRing uses useNativeDriver: true (scale transform) while resize uses useNativeDriver: false (width/height)
- [Phase 02-radar-view-view-toggle]: showGradient === isAlive ensures FADING friends get no gradient without extra branching
- [Phase 02-03]: Scatter clamp guard: if minX >= maxX fall back to cell center to handle degenerate tiny cells
- [Phase 03-card-stack-view]: GestureHandlerRootView replaces root View in _layout.tsx — transparent wrapper, identical style prop, unblocks Gesture.Pan() in FriendSwipeCard
- [Phase 03-card-stack-view]: Card stack test scaffold uses same login/screenshot pattern as design-system.spec.ts; tests intentionally fail until CardStackView implemented in Plans 02-03
- [Phase 03-02]: FADING opacity applied via static wrapper View (not useSharedValue) to avoid useNativeDriver conflict with animated transforms
- [Phase 03-02]: nudgeLoading state disables Nudge button during async RPC call to prevent double-tap spam (T-03-04 DoS mitigation)
- [Phase 03-card-stack-view]: FriendSwipeCard wrapped in View for zIndex — SwipeCardProps has no style prop; plan anticipated this pattern
- [Phase 03-card-stack-view]: STACK_CONFIGS rendered in reverse order (lowest zIndex first) so front card paints on top in absolute stack
- [Phase 03-card-stack-view]: FONT_SIZE, FONT_WEIGHT, RADII removed from HomeScreen theme import after placeholder styles deleted
- [Phase 04-upcoming-events-section]: cover_image_url nullable text column — nullable so existing plans are unaffected until images are uploaded
- [Phase 04-upcoming-events-section]: useUpcomingEvents filters client-side from Zustand store — avoids extra Supabase query, acceptable given store already populated by usePlans
- [Phase 04-upcoming-events-section]: expo-image used for cover images (caching + graceful URI fallback); height:140 on FlatList style prevents ScrollView height-collapse; ItemSeparatorComponent for card gaps
- [Phase 04-upcoming-events-section]: usePlans() added to HomeScreen body to populate Zustand store for UpcomingEventsSection before it mounts
- [Phase 04-upcoming-events-section]: NSPhotoLibraryUsageDescription added to app.config.ts ios.infoPlist — required for expo-image-picker on iOS (RESEARCH.md Pitfall 2)
- [Phase 04]: Upload-after-create chosen for cover images: create plan first to get planId (required for storage path), then upload, then update cover_image_url — acceptable UX gap
- [Phase 04]: noUncheckedIndexedAccess guard: assets?.[0] optional chain + null check required for TypeScript strict compliance with expo-image-picker results
- [v1.4 Roadmap]: IOU amounts stored as INTEGER cents — float arithmetic causes phantom debts, cannot be fixed after data is written
- [v1.4 Roadmap]: create_expense() RPC is atomic — two chained supabase.from().insert() calls are not; network failure between them creates orphan records
- [v1.4 Roadmap]: Only expense creator can mark shares settled — RLS UPDATE policy on iou_members restricts to created_by, not the participant
- [v1.4 Roadmap]: Birthday stored as separate birthday_month + birthday_day smallint columns — TIMESTAMPTZ causes off-by-one-day errors in negative-UTC timezones
- [v1.4 Roadmap]: Squad dashboard uses single outer FlatList with feature cards in ListFooterComponent — FlatList inside ScrollView breaks Android scroll silently
- [v1.4 Roadmap]: Dashboard assembled last (Phase 10) from pre-built, independently verified cards — minimizes integration blast radius
- [v1.4 Roadmap]: Zero new npm dependencies required — datetimepicker already installed, Intl.NumberFormat built into Hermes on Expo SDK 55
- [Phase 05-01]: iou_groups and iou_members use SECURITY DEFINER helpers to prevent RLS self-recursion on iou_members SELECT policy
- [Phase 05-01]: Relationships: [] required in TypeScript table types — omitting collapses all supabase-js Insert/Update types to never
- [Phase 05-01]: plans.iou_notes renamed to general_notes atomically with client code update to prevent silent data loss
- [Phase 05-02]: Birthday columns nullable (no NOT NULL, no DEFAULT) — birthday is optional; existing profile rows require no backfill
- [Phase 05-02]: get_upcoming_birthdays() uses LANGUAGE sql STABLE SECURITY DEFINER; Feb 29 leap-year guard applied in both this-year and next-year branches of days_until calculation
- [Phase 05-database-migrations]: Migration push is remote-only — 0015 and 0016 applied to Supabase project zqmaauaopyolutfoizgq; seed.sql was last iou_notes holdout, updated to general_notes with IOU and birthday test data
- [Phase 06-01]: BirthdayPicker uses FriendActionSheet Modal+Animated.timing pattern; getDaysInMonth returns 29 for Feb with normalization deferred to handleSave in Plan 02; day resets to null on invalid month change
- [Phase 06-birthday-profile-field]: BirthdayPicker wired into edit.tsx with isDirty tracking, Feb 29 normalization at save time, and partial birthday guard saving null/null when only one field set
- [Phase 07-01]: get_upcoming_birthdays RPC type added manually to database.ts — auto-generated types not used; migration 0016 already deployed
- [Phase 07-01]: Intl.DateTimeFormat anchor year 2000 used for formatBirthdayDate — year irrelevant for display, avoids leap-year display edge cases
- [Phase 07-02]: BirthdayCard receives UpcomingBirthdaysData prop from parent (data-ownership pattern matching StreakCard)
- [Phase 07-02]: BirthdaysScreen fetches its own useUpcomingBirthdays instance — no route params carry birthday data (T-07-06 mitigated)
- [Phase 07-birthday-calendar-feature]: BirthdayCard wired into squad.tsx goals tab via data-ownership pattern — hook in parent, prop to child; human visual verification approved
- [Phase 08]: create_expense RPC typed in Functions section matching migration 0015 signature; IouGroup/IouMember follow Tables<T> alias pattern; test scaffold intentionally fails (RED state until Wave 2 screens built)
- [Phase 08-02]: Intl.NumberFormat currency formatter avoids external library (zero new dependencies)
- [Phase 08-02]: ParticipantRow settle button guard: isCreator && !isPayerRow && !isSettled — UI convenience only; RLS is authoritative enforcement
- [Phase 08-02]: RemainingIndicator returns null at zero remaining (per UI-SPEC copywriting table)
- [Phase 08-iou-create-detail]: canSubmit includes !submitting for double-tap DoS guard (T-08-P03-04); settle() calls refetch() for accurate server-truth allSettled

### Roadmap Evolution

- v1.3.5 Phase 4 added: Upcoming Events Section
- v1.4 roadmap created: 6 phases (5-10), 12 requirements, 100% coverage

### Pending Todos

- Verify rn-swiper-list compatibility with Expo Go before committing to it in Phase 3 planning
- Decide disposition of plans.iou_notes field before writing migration 0015 (rename to general_notes per PITFALLS.md recommendation)
- Write explicit IOU settlement UX copy before Phase 8 (manual settle, no money moves — copy must set correct expectation)

### Blockers/Concerns

(active)

- Swipe-down undo non-functional: ScrollView RefreshControl intercepts vertical pan before FriendSwipeCard onEnd. Deferred to gap closure.

## Session Continuity

Last session: 2026-04-12T10:03:24.254Z
Stopped at: Checkpoint 08-04-PLAN.md Task 3: awaiting human visual verification
