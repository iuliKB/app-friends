# Campfire

## What This Is

Campfire is a "friendship OS" — an all-in-one social coordination app for close friend groups of 3–15 people. It combines availability status, event planning, group chat, and lightweight expense tracking into a single React Native + Expo mobile app backed by Supabase. V1.3 adds status liveness (heartbeat-based freshness with TTL windows), real push delivery with token lifecycle management, the "Friend went Free" notification loop, a daily morning status prompt, and Squad Goals streaks — making the app worth opening every day.

## Core Value

The daily availability status ("Free / Busy / Maybe") drives daily active use and makes it effortless for friends to see who's around and spin up spontaneous plans. If nothing else works, this must.

## Current Milestone: v1.4 Squad Dashboard & Social Tools

**Goal:** Transform Squad tab into a scrollable dashboard with friends list and feature cards, plus two new social features: group expense splitting (IOUs) and birthday calendar.

**Target features:**
- Squad Dashboard: friends list at top, feature cards below (Streaks, IOUs, Birthdays) replacing underline tab switcher
- IOU Expense Splitting: group bill splitting (even/custom amounts), per-person balances, manual settle
- Birthday Calendar: birthday field in profile (shared with friends), upcoming birthdays card, birthday list screen

## Requirements

### Validated

- ✓ Auth flow with email/password, Google OAuth, and Apple Sign-In — v1.0
- ✓ Profile creation (username, display name, avatar) — v1.0
- ✓ Session persistence across app restarts — v1.0
- ✓ Friend system (add by username, QR code, accept/reject requests) — v1.0
- ✓ Daily status toggle (Free/Busy/Maybe) with emoji context tags — v1.0
- ✓ "Who's Free" home screen with realtime updates — v1.0
- ✓ Quick Plan creation (title, time, location, invite friends) — v1.0
- ✓ Plan dashboard with RSVP, link dump, IOU notes — v1.0
- ✓ Chat system (plan group chats + DMs) with realtime messaging — v1.0
- ✓ Profile editing and settings — v1.0
- ✓ Push notifications for plan invites — v1.0
- ✓ Squad Goals "Coming soon" stub tab — v1.0
- ✓ Seed data for development — v1.0
- ✓ 5-tab navigation (Home, Plans, Chat, Squad, Profile) — v1.0
- ✓ Supabase RLS on every table — v1.0
- ✓ Empty states and loading indicators on all screens — v1.0
- ✓ Design system with color/spacing/typography/radii/shadow tokens — v1.1
- ✓ ESLint enforcement of design token usage (zero raw values) — v1.1
- ✓ Shared component library (FAB, ScreenHeader, SectionHeader, ErrorDisplay, FormField) — v1.1
- ✓ Pull-to-refresh standardized across all list views — v1.1
- ✓ Consistent screen title treatment via ScreenHeader — v1.1
- ✓ All screens migrated to design tokens — v1.1
- ✓ Playwright visual regression test suite — v1.1
- ✓ Squad tab with Friends/Goals top tabs (underline segmented control) — v1.2
- ✓ Friend list relocated from Profile to Squad → Friends tab — v1.2
- ✓ Add Friend FAB accessible from Squad → Friends tab — v1.2
- ✓ Friend Requests (conditional row → separate screen) in Squad → Friends tab — v1.2
- ✓ Goals tab with "Coming soon" placeholder — v1.2
- ✓ Bottom nav reordered: Home | Squad | Explore | Chats | Profile — v1.2
- ✓ Plans tab renamed to Explore with compass icon — v1.2
- ✓ Chat tab renamed to Chats with chatbubbles icon — v1.2
- ✓ Profile simplified: @username, ACCOUNT section (email + member since), app version — v1.2
- ✓ Pending request badge migrated from Profile to Squad tab — v1.2
- ✓ Push token lifecycle (register on launch, foreground re-register, invalidation) — v1.3
- ✓ Tappable HomeFriendCard DM entry point — v1.3
- ✓ Status Liveness: Mood + Context + Window composer with heartbeat freshness (ALIVE/FADING/DEAD) — v1.3
- ✓ effective_status view as source of truth for status freshness — v1.3
- ✓ ReEngagementBanner when own heartbeat is FADING — v1.3
- ✓ status_history audit table with SECURITY DEFINER trigger — v1.3
- ✓ Friend Went Free notification loop with outbox queue + Edge Function + 8-stage rate-limit gauntlet — v1.3
- ✓ Expiry warning push with Keep it / Heads down action buttons — v1.3
- ✓ Profile toggles for Plan invites, Friend availability notifications — v1.3
- ✓ On-device morning prompt scheduler with Free/Busy/Maybe action buttons — v1.3
- ✓ Configurable morning prompt time in Profile — v1.3
- ✓ Squad Goals streak with get_squad_streak SQL (sliding 4-week grace window) — v1.3
- ✓ StreakCard in Goals tab with pull-to-refresh — v1.3
- ✓ Positive-only streak copy, non-engineer reviewed — v1.3
- ✓ Status pill in header with bottom sheet picker (replaces inline MoodPicker) — v1.3.5
- ✓ Radar view: spatial bubble layout with heartbeat freshness indicators — v1.3.5
- ✓ Card stack view: swipeable cards with Nudge (DM) / Skip actions — v1.3.5
- ✓ Unified friends section with Radar/Cards view toggle — v1.3.5
- ✓ Upcoming events section with horizontal scroll event cards — v1.3.5
- ✓ Cover image support for plans (expo-image-picker + Supabase Storage) — v1.3.5

### Active

- [ ] Squad Dashboard with friends list + feature cards (replaces tab switcher)
- [ ] IOU group expense splitting with per-person balances and manual settlement
- [x] Birthday field in profile, shared with friends — Validated in Phase 6: Birthday Profile Field
- [x] Upcoming birthdays dashboard card and birthday list screen — Validated in Phase 7: Birthday Calendar Feature

### Out of Scope

- Interactive social map — V2 feature, high complexity
- Calendar sync — V2, requires native calendar APIs
- OCR receipt scanning — V2, needs camera + ML
- Venue booking / B2B integrations — V3
- AI social suggestions — V3
- Media/image sharing in chat — V2
- Read receipts, message reactions — V2
- Public profiles or discoverability — friends-only by design
- Web app / PWA — mobile only
- Group size pagination — unnecessary for 3–15 person groups
- Dark mode / theming — v1.4+ (semantic color naming positions for it)

## Context

Shipped v1.3 Liveness & Notifications with 20 phases total across 4 milestones (v1.0–v1.3), 44 v1.3 requirements delivered.
Tech stack: React Native + Expo (managed workflow), TypeScript strict, Supabase (Postgres + Auth + Realtime + Storage + Edge Functions), Zustand.

Navigation: 5-tab layout Home|Squad|Explore|Chats|Profile. Squad is the social hub (friend list, requests, add friend, Goals streak). Profile is account-focused (@username, email, member since, settings, notification toggles, morning prompt config).
Design system: `src/theme/` (6 token files), `src/components/common/` (10+ shared components), ESLint `no-hardcoded-styles` at error severity.
Supabase migrations: 0001–0016 (v1.3 added 0009–0011, v1.3.5 added 0012 nudges, 0013 cover_image_url, 0014 plan-covers storage bucket, v1.4 added 0015 IOU tables/RPCs + general_notes rename, 0016 birthday columns + get_upcoming_birthdays RPC).
Edge Functions: `notify-plan-invite`, `notify-friend-free` (rate-limited fan-out).

Known technical considerations:
- Apple Sign-In works in Expo Go but needs validation on EAS builds
- Supabase free-tier Realtime limited to 200 concurrent connections
- EAS dev build required for push action buttons and Android channels — deferred until Apple Dev account acquired
- TTL-08 retention rollup deferred (pg_cron not enabled on free tier)
- 35 `eslint-disable-next-line` suppressions for values with no exact token match

## Constraints

- **Tech stack:** React Native + Expo (managed workflow), TypeScript strict, Supabase, Zustand — non-negotiable
- **Expo Go:** Every library must work in Expo Go managed workflow without custom native modules
- **No backend server:** All server logic via Supabase RPC functions (Postgres)
- **No UI libraries:** React Native StyleSheet only
- **No Redux, React Query:** Zustand for state. Direct Supabase queries in hooks
- **TypeScript strict:** `"strict": true`, `"noUncheckedIndexedAccess": true`. No `any`
- **RLS is security:** Never rely on client-side filtering
- **UUIDs everywhere:** No sequential integer IDs exposed
- **Free tier budget:** 500MB DB, 1GB Storage, 50K MAU, 2M Realtime messages/month
- **Chat text-only in V1:** No images, files, reactions, read receipts
- **FlatList for all lists:** No ScrollView + map
- **Design tokens:** All styling via `@/theme` tokens. ESLint enforces — no raw hex/fontSize/padding values.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Firebase | Single SDK for Postgres, Auth, Realtime, Storage. Free tier generous. | ✓ Good |
| Zustand over Redux | Lightweight, no boilerplate. Only for ephemeral UI state. | ✓ Good |
| Expo managed workflow | Expo Go testing without dev accounts. Platform-agnostic. | ✓ Good |
| Email + Google + Apple OAuth from Phase 1 | All auth methods available from day one | ✓ Good |
| Status defaults to "Maybe" | Prevents false "free" signals, prompts curiosity | ✓ Good |
| least()/greatest() for symmetric relationships | Prevents duplicate friendship/DM pairs | ✓ Good |
| Seed data in seed.sql | Pre-loaded test users for faster dev iteration | ✓ Good |
| Stack.Protected session guards | Clean route-level auth without manual redirects | ✓ Good |
| Server confirmation for status updates | Wait for Supabase response before updating local state | ✓ Good |
| Single Realtime channel with user_id filter | Stays within 200 connection limit vs. per-friend channels | ✓ Good |
| Optimistic send with 5s dedup for chat | Instant UX while preventing duplicate messages | ✓ Good |
| AsyncStorage notification toggle | Per-device preference, default enabled | ✓ Good |
| src/theme/ with barrel export for tokens | Single import path, TypeScript autocomplete, `as const` pattern | ✓ Good |
| Semantic COLORS groups (text/surface/interactive/feedback) | Positions for dark mode without requiring it now | ✓ Good |
| ESLint custom rule over external library | Zero dependencies, exactly the enforcement needed | ✓ Good |
| ScreenHeader/SectionHeader as separate components | Two-tier title hierarchy, screens handle safe area | ✓ Good |
| FAB with Animated.spring scale bounce | Polished press feedback, fixed bottom-right positioning | ✓ Good |
| Playwright + Expo Web for visual regression | CLI-friendly, no simulators needed, close approximation for StyleSheet-only app | ✓ Good |
| Custom underline tab switcher over material-top-tabs | Zero dependencies, matches app patterns, avoids swipe/pull-to-refresh conflict | ✓ Good |
| Title-only tab rename (no file renames) | Expo Router `name` = file, `title` = label. Preserves all deep routes. | ✓ Good |
| Squad as social hub, Profile as account screen | Clear information architecture — people vs. settings | ✓ Good |
| Activity-based heartbeat replaces 5am clock reset (v1.3 Phase 2) | Wall-clock resets clobber intentional Busy windows; heartbeat (4h FADING / 8h DEAD) tracks real liveness | ✓ Good |
| Mood + Context + Window composer (v1.3 Phase 2) | Two-stage commit (mood row → preset chip + window chip) with 15 preset context tags; every status has non-null expires_at | ✓ Good |
| `effective_status` view with `security_invoker=true` (v1.3 Phase 2) | View-computed freshness: NULL when expired OR last_active_at >8h stale; friends never see stale data | ✓ Good |
| TTL-08 retention rollup deferred to v1.4 | pg_cron not enabled; at v1.3 scale (~120 rows/user/month) status_history doesn't need active management | ✓ Good |
| Outbox queue for Friend-Went-Free fan-out (v1.3 Phase 3) | Never call pg_net inside a business trigger; outbox + Database Webhook keeps user writes <100ms | ✓ Good |
| Pairwise rate-limit table over profile scalars (v1.3 Phase 3) | Dedicated `free_notifications_sent` table enables multi-dimensional throttling (pairwise 15min, per-recipient 5min, daily ~3, quiet hours) | ✓ Good |
| On-device morning prompt via scheduleNotificationAsync (v1.3 Phase 4) | Eliminates profiles.timezone column and server cron; works offline | ✓ Good |
| Anti-Snapchat streak mechanics (v1.3 Phase 4) | Grace week per 4-week window, breaks on 2 consecutive misses, positive-only copy — avoids streak anxiety | ✓ Good |
| Hardware verification gate as final phase (v1.3 Phase 5) | Solo dev without Apple Dev account; consolidates all manual smoke tests into one session when account acquired | ✓ Good |

---
*Last updated: 2026-04-12 after Phase 7 (Birthday Calendar Feature) complete — upcoming birthdays dashboard card and birthday list screen*
