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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits/Files | Phases | Plans | Timeline | Key Change |
|-----------|---------------|--------|-------|----------|------------|
| v1.0 | 145 commits | 6 | 17 | 7 days | Initial MVP — established all patterns |
| v1.1 | 33 commits | 3 | 11 | 1 day | Design system retrofit with ESLint enforcement |
| v1.2 | 6 commits | 3 | 5 | 1 day | Navigation restructure, smallest milestone |
| v1.3 | 142 files | 5 | 32 | 4 days | Largest milestone — push, liveness, notifications |

### Top Lessons (Verified Across Milestones)

1. RLS + SECURITY DEFINER is the recurring pattern for safe server-side logic (v1.0 plan_members, v1.3 status_history, get_squad_streak)
2. Enforce conventions via tooling not review (v1.1 ESLint, v1.3 copy review gate)
3. Context discussions before planning surface better designs than upfront requirements alone (v1.3 heartbeat replaced clock reset)
4. Small, focused phases with clear dependencies ship faster than large monolithic ones
