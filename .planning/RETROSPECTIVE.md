# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-24
**Phases:** 6 | **Plans:** 17 | **Commits:** 145

### What Was Built
- Full auth system (email/password, Google OAuth, Apple Sign-In) with session persistence
- Friend system with username search, QR code scanning, accept/reject flow
- Realtime "Who's Free" home screen with status toggle and emoji context tags
- Quick Plan creation (<10s) with RSVP, link dump, IOU notes, plan dashboard
- Chat system with plan group chats, 1:1 DMs, and Supabase Realtime
- Push notifications for plan invites with cold-start deep linking
- Profile editing, empty states, loading indicators, and UI consistency pass

### What Worked
- Supabase as single backend: Auth + Postgres + Realtime + Storage eliminated integration complexity
- Phase dependency chain (auth → friends → home → plans → chat → polish) meant each phase had a solid foundation
- Zustand stores with useFocusEffect refresh pattern worked consistently across all screens
- Server confirmation pattern for status updates prevented optimistic UI bugs
- Single Realtime channel with user_id filter stayed well within free-tier limits

### What Was Inefficient
- RLS policy debugging consumed significant time — recursive policies on plan_members needed SECURITY DEFINER workaround
- Profile joins on chat messages caused failures — had to split into separate queries
- Plan invitation flow required multiple iterations (RLS update recursion, broken profile joins, stale state)

### Patterns Established
- `router.push('...' as never)` for forward-reference routes in Expo Router
- `useFocusEffect` for data refresh on tab/screen focus
- Server confirmation (not optimistic) for writes that affect shared state
- EmptyState and LoadingIndicator shared components for consistent UX
- COLORS.status tokens for status-coloured elements across screens

### Key Lessons
1. RLS policies need careful testing for recursive table relationships — use SECURITY DEFINER helpers early
2. Separate queries beat joins when RLS is involved — avoids silent failures from policy-blocked joins
3. Realtime channel filters must be re-subscribed when the filter set changes (e.g., friend list updates)
4. Cold-start deep links need a small delay (150ms) for the navigation tree to mount

### Cost Observations
- Model mix: balanced profile (sonnet for planning/execution, opus for orchestration)
- Notable: 7-day MVP delivery for a full-featured social coordination app

---

## Milestone: v1.1 — UI/UX Design System

**Shipped:** 2026-03-25
**Phases:** 3 | **Plans:** 11 | **Commits:** 33

### What Was Built
- Design token system: 6 TypeScript `as const` files (colors, spacing, typography, radii, shadows)
- ESLint `no-hardcoded-styles` rule enforcing zero raw values codebase-wide
- Shared component library (FAB, ScreenHeader, SectionHeader, ErrorDisplay, FormField)
- Pull-to-refresh standardized across all list screens
- Full 51-file migration from legacy colors to design tokens

### What Worked
- Custom ESLint rule was the enforcement mechanism — no manual review needed
- Barrel export from src/theme/ made adoption frictionless
- 1-day delivery for a full design system retrofit

### What Was Inefficient
- 35 eslint-disable-next-line suppressions for edge cases with no exact token match

### Key Lessons
1. Enforce design systems via tooling (ESLint), not code review
2. `as const` + barrel export = great DX for TypeScript token systems

---

## Milestone: v1.2 — Squad & Navigation

**Shipped:** 2026-04-04
**Phases:** 3 | **Plans:** 5 | **Commits:** 6

### What Was Built
- Squad tab with Friends/Goals underline tab switcher
- Bottom nav reordered: Home|Squad|Explore|Chats|Profile
- Profile simplified to account-focused screen
- Playwright baselines regenerated for new layout

### What Worked
- Title-only tab rename (no file renames) preserved all deep routes
- Small scope (5 plans) shipped in 1 day

### Key Lessons
1. Expo Router `name` = filename, `title` = display label — rename titles, not files
2. Custom tab switcher avoids swipe/pull-to-refresh conflict from material-top-tabs

---

## Milestone: v1.3 — Liveness & Notifications

**Shipped:** 2026-04-10
**Phases:** 5 | **Plans:** 32 | **Files changed:** 142, +29K lines
**Timeline:** 4 days (2026-04-06 → 2026-04-10)

### What Was Built
- Push infrastructure: token lifecycle (device_id, invalidation, foreground re-register)
- Status Liveness: Mood + Context + Window composer, heartbeat freshness (ALIVE/FADING/DEAD), effective_status view
- Friend Went Free loop: outbox queue + Edge Function with 8-stage rate-limit gauntlet
- On-device morning prompt scheduler with action buttons and 12h validity guard
- Squad Goals streak: get_squad_streak SQL (sliding 4-week grace window), StreakCard UI
- DM entry point via tappable HomeFriendCard
- Hardware verification gate consolidating all manual smoke tests

### What Worked
- Outbox queue pattern kept user writes <100ms while decoupling push fan-out
- Activity-based heartbeat was a better model than 5am clock reset — emerged during Phase 2 context discussion
- Hardware verification gate pattern: consolidating manual tests into one phase avoided blocking every feature phase on unavailable hardware
- Copy review gate (STREAK-08) caught the right moment — grep-verified strings against live code, zero drift
- Phase numbering reset (back to 1) with archived directories kept things clean

### What Was Inefficient
- Phase 2 VERIFICATION.md has 6 human_needed items that couldn't be tested without hardware — verification debt carried forward
- EAS build track fully deferred — 22 checks still pending Apple Dev account
- Some summary-extract one_liner fields were null or poorly formatted, making automated milestone summaries messy

### Patterns Established
- Outbox queue + Database Webhook for async fan-out (never pg_net inside triggers)
- SECURITY DEFINER + security_invoker=true view pattern for computed status
- On-device notification scheduling eliminates server timezone tracking
- Hardware verification gate as final milestone phase for solo devs without dev accounts
- Two-stage commit UI pattern (mood row → preset chip + window chip)

### Key Lessons
1. Heartbeat-based freshness > wall-clock resets — emerged from context discussion, not upfront requirements
2. Rate-limit tables beat profile column scalars — multi-dimensional throttling needs its own table
3. Anti-anxiety streak design (grace weeks, positive-only copy) is a product decision that should be locked early
4. Summary one-liner fields need consistent formatting — automate or template them
5. Deferred hardware gates need explicit tracking so verification debt doesn't get lost

---

## Milestone: v1.3.5 — Homescreen Redesign

**Shipped:** 2026-04-11
**Phases:** 4 | **Plans:** 15

### What Was Built
- Status pill in header with bottom sheet picker (replaces inline MoodPicker)
- Radar view: spatial bubble layout with heartbeat freshness indicators
- Card stack view: swipeable cards with Nudge (DM) / Skip actions
- Unified friends section with Radar/Cards toggle, upcoming events with horizontal scroll

### What Worked
- Custom bottom sheet implementation (no @gorhom dependency) — Reanimated v4 incompatibility discovered early, avoided a late-phase blocker
- Radar/Cards toggle pattern established a clean view-switching idiom reused later

### Key Lessons
1. @gorhom/bottom-sheet incompatible with Reanimated v4 — custom bottom sheet is the safe pattern for this stack
2. expo-image-manipulator compression is mandatory before any Supabase Storage upload — raw iPhone photos exhaust 1GB free tier in days

---

## Milestone: v1.4 — Squad Dashboard & Social Tools

**Shipped:** 2026-04-17
**Phases:** 6 (phases 5–11) | **Plans:** 23

### What Was Built
- IOU expense tracking: `create_expense` atomic RPC, even/custom split, settle flow, net balance summary per friend
- Birthday field (month/day/year as smallints) in profile with native DateTimePicker
- Birthday group chat with collapsible wish list panel + gift claiming/voting
- Squad Dashboard with scrollable FlatList+ListFooterComponent pattern
- Chat attachment menu (Poll/Split Expenses/To-Do) with group participant sheet via tappable header

### What Worked
- INTEGER cents for IOU amounts — float arithmetic would have caused phantom debt bugs
- Native DateTimePicker over custom ScrollView picker — locale, accessibility, no fragility
- fetch().arrayBuffer() upload pattern locked in — FormData + file:// URI fails in React Native

### What Was Inefficient
- FlatList-inside-ScrollView for Squad Dashboard was caught early thanks to the established pattern prohibition
- Plan cover image upload needed a second fix (ArrayBuffer pattern wasn't applied first time)

### Key Lessons
1. Birthday as separate month/day/year smallint columns prevents off-by-one errors in negative-UTC timezones
2. create_expense as atomic RPC prevents orphan records from network failures between two client inserts
3. Squad Dashboard: single outer FlatList with cards in ListFooterComponent is the mandatory pattern for nested lists

---

## Milestone: v1.5 — Chat & Profile

**Shipped:** 2026-04-22
**Phases:** 6 (phases 12–17) | **Plans:** 21 | **Files changed:** 122 TS/TSX, +14,548 / -847 lines
**Timeline:** 5 days (2026-04-18 → 2026-04-22)

### What Was Built
- Schema foundation: Migration 0018+0019 with all additive columns, tables, RLS helpers, `is_channel_member()` SECURITY DEFINER helper, `create_poll()` atomic RPC, `chat-media` bucket, soft-delete
- Profile rework: status removed from profile tab, notifications consolidated, edit details decoupled from avatar; new `/friends/[id]` friend profile screen with freshness-aware status, birthday, wish list
- Reply threading: long-press context menu primitive, inline quoted reply in MessageBubble, scroll-to-original with highlight flash, soft-delete placeholder
- Message reactions: 6-emoji tapback strip extending context menu, `message_reactions` table, live counts via postgres_changes Realtime, optimistic add/remove toggle
- Media sharing: photo library + in-app camera, expo-image-manipulator compression (1280px max), ArrayBuffer upload to chat-media bucket, inline image bubbles, full-screen ImageViewerModal
- Polls: PollCreationSheet via attachment menu, `polls`/`poll_options`/`poll_votes` tables, single-vote with change-vote, live counts via Realtime (reusing existing channel via lastPollVoteEvent bridge)

### What Worked
- Schema foundation phase (Phase 12) first: all DB objects live before any UI phase — zero migration surprises during feature phases
- context menu primitive reused across reply, reactions — established once, reused 3× without modification
- `lastPollVoteEvent` bridge pattern: useChatRoom Realtime signals usePoll re-fetch without a duplicate subscription — elegant solution to the free-tier Realtime budget constraint
- `Math.random()` UUID template for Hermes: discovered once, documented, applied consistently for the rest of the milestone

### What Was Inefficient
- CHAT-01/02/03 (reactions) left unchecked in REQUIREMENTS.md through milestone — caught at close, not during execution
- Phase directories were cleared by new-milestone flow before milestone close, so accomplishments couldn't be auto-extracted — had to reconstruct from git log

### Patterns Established
- `SECURITY DEFINER` helper functions (is_channel_member) keep RLS policies readable and composable
- Friend profile route at root `/friends/[id]` — tab-nested routes break multi-entry-point back navigation
- lastPollVoteEvent bridge: reuse existing Realtime channel to signal dependent hooks without new subscriptions
- contentType: 'image/jpeg' forced on all uploads — prevents executable-disguised-as-image uploads

### Key Lessons
1. Mark requirements complete during execution, not at close — unchecked items are easy to miss at the summary stage
2. Close milestone BEFORE running new-milestone — clearing phase dirs prevents accomplishment auto-extraction
3. Math.random() UUID template is the Hermes-compatible polyfill; document it once, apply everywhere
4. `onAttachmentAction` must fire after `setMenuVisible(false)` on iOS — two simultaneous modals are not supported

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits/Files | Phases | Plans | Timeline | Key Change |
|-----------|---------------|--------|-------|----------|------------|
| v1.0 | 145 commits | 6 | 17 | 7 days | Initial MVP — established all patterns |
| v1.1 | 33 commits | 3 | 11 | 1 day | Design system retrofit with ESLint enforcement |
| v1.2 | 6 commits | 3 | 5 | 1 day | Navigation restructure, smallest milestone |
| v1.3 | 142 files | 5 | 32 | 4 days | Largest milestone — push, liveness, notifications |
| v1.3.5 | ~15 plans | 4 | 15 | 1 day | Homescreen redesign: radar, cards, status pill |
| v1.4 | ~23 plans | 6 | 23 | 6 days | IOU + Birthday + Squad Dashboard |
| v1.5 | 122 TS files +14.5K | 6 | 21 | 5 days | Full chat feature set + profile rework |

### Top Lessons (Verified Across Milestones)

1. RLS + SECURITY DEFINER is the recurring pattern for safe server-side logic (v1.0 plan_members, v1.3 status_history, v1.5 is_channel_member)
2. Enforce conventions via tooling not review (v1.1 ESLint, v1.3 copy review gate)
3. Context discussions before planning surface better designs than upfront requirements alone (v1.3 heartbeat replaced clock reset)
4. Small, focused phases with clear dependencies ship faster than large monolithic ones
5. Schema foundation phases first — all DB objects live before UI phases prevents mid-feature migration surprises (v1.5)
6. Close milestones before starting new ones — cleaning phase dirs before close breaks accomplishment extraction
7. Mark requirements complete during execution, not at milestone close — easier to miss at summary stage
