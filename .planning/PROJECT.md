# Campfire

## What This Is

Campfire is a "friendship OS" — an all-in-one social coordination app for close friend groups of 3–15 people. It combines availability status, event planning, group chat, lightweight expense tracking, birthday coordination, and shared photo memories into a single React Native + Expo mobile app backed by Supabase. V1.6 adds a user-selectable light/dark theme, a map for plan locations with nearby discovery in Explore, and a per-plan photo gallery where each participant can contribute up to 10 photos.

## Core Value

The daily availability status ("Free / Busy / Maybe") drives daily active use and makes it effortless for friends to see who's around and spin up spontaneous plans. If nothing else works, this must.

## Current Milestone: v1.8 Deep UI Refinement & Screen Overhaul

**Goal:** Audit and overhaul every major screen — finish partially-built features (map, challenges), redesign Home/Squad/Explore/Auth UI from the ground up using /ui-ux-pro-max, and add a Welcome onboarding flow.

**Target features:**
- Home Screen overhaul (radar, cards, status — audit-first redesign)
- Squad Screen overhaul (birthdays, IOU, streak, friends — finish + polish)
- Explore Screen overhaul (map + challenges — partially built, needs completion)
- Auth Screen redesign (Login + Sign Up — visual refresh, better UX)
- Welcome / Onboarding screens (new 3-screen slide flow — brand new)

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
- ✓ IOU expense creation (even/custom split) and detail with settle — v1.4
- ✓ IOU list + net balance summary per friend — v1.4
- ✓ Birthday field (month/day/year) in profile, shared with friends — v1.4
- ✓ Upcoming birthdays dashboard card and birthday list screen — v1.4
- ✓ Birthday group chat with wish list panel + gift claiming/voting — v1.4
- ✓ Squad Dashboard with scrollable feature cards (StreakCard, BirthdayCard, IOUCard) — v1.4
- ✓ IOU + Birthday compact widgets on home screen — v1.4
- ✓ Native DateTimePicker for birthday input — v1.4
- ✓ Chat attachment menu (Poll, Split Expenses, To-Do) with group member pre-selection — v1.4
- ✓ Group chat participant sheet via tappable title — v1.4
- ✓ Plan cover image upload fix (ArrayBuffer pattern) — v1.4
- ✓ Message reactions (6-emoji tapback strip, live counts, add/remove toggle) — v1.5
- ✓ Media sharing in chat (photo library + camera, compressed inline bubbles, full-screen lightbox) — v1.5
- ✓ Reply threading (long-press context menu, quoted reply, scroll-to-original, soft-delete) — v1.5
- ✓ Polls in chat (creation via attachment menu, single-vote with change, live counts) — v1.5
- ✓ Profile rework: status removed, notifications consolidated, edit details decoupled from avatar — v1.5
- ✓ Friend profile page (/friends/[id]) with avatar, freshness-aware status, birthday, wish list — v1.5
- ✓ Light/Dark/System theme toggle persisted across restarts, all screens migrated to useTheme() — v1.6
- ✓ Plan location picker (map pin + reverse geocoding), map tile on plan dashboard, directions deep link — v1.6
- ✓ Explore tab map view with friend plan pins and 25km GPS filter — v1.6
- ✓ Per-plan photo gallery (10 photos/participant, private bucket, signed URLs, full-screen viewer) — v1.6
- ✓ Cross-plan Memories Gallery: home widget + /memories screen grouped by plan — v1.6
- ✓ App icon (branded Campfire icon replacing Expo placeholder, Android adaptiveIcon updated) — v1.7 Phase 28
- ✓ Branded splash screen (expo-splash-screen plugin, light #ff6b35 / dark #0E0F11 backgrounds, 400ms fade via SplashScreen.setOptions) — v1.7 Phase 28

### Active

- Home Screen overhaul — radar view, card stack, status pill, event cards — v1.8
- Squad Screen overhaul — birthdays, IOU, streak, friends list — v1.8
- Explore Screen overhaul — map discovery, challenges feature completion — v1.8
- Auth Screen redesign — login, sign up, form UX — v1.8
- Welcome / Onboarding — 3-screen slide flow, first-run experience — v1.8

### Out of Scope

- Interactive social map (live friend location tracking) — privacy concerns, V2
- Calendar sync — V2, requires native calendar APIs
- OCR receipt scanning — V2, needs camera + ML
- Venue booking / B2B integrations — V3
- AI social suggestions — V3
- Read receipts — V2, requires presence tracking
- Public profiles or discoverability — friends-only by design
- Web app / PWA — mobile only
- Group size pagination — unnecessary for 3–15 person groups
- Video in plan gallery — storage cost, V2
- Public plan discovery — friends-only by design
- Open emoji picker for reactions — V2 (curated 6-emoji set sufficient for small groups)
- Multi-choice polls — V2 (single-choice covers 95% of use cases)

## Context

Shipped v1.7 Polish & Launch Ready — 9 milestones complete (v1.0–v1.7). Total ~26,000 LOC TypeScript.
Tech stack: React Native + Expo (managed workflow), TypeScript strict, Supabase (Postgres + Auth + Realtime + Storage + Edge Functions), Zustand.

Navigation: 5-tab layout Home|Squad|Explore|Chats|Profile. Squad is the social hub (friend list, requests, add friend, Goals streak, IOUs, Birthdays). Profile is account-focused (@username, email, member since, settings, notification toggles, morning prompt config, wish list, birthday, APPEARANCE theme picker).
Design system: `src/theme/` (6 token files + ThemeProvider/useTheme context), `src/components/common/` (10+ shared components), ESLint `no-hardcoded-styles` at error severity. All components use useTheme() + useMemo([colors]) — zero static COLORS imports.
Supabase migrations: 0001–0021 (0020 lat/lng on plans; 0021 plan_photos table + private plan-gallery bucket + add_plan_photo SECURITY DEFINER RPC with 10-photo cap).
IOU write path: Squad '+' → create screen (currency input, friend selection, even/custom split) → `create_expense` RPC → detail screen (hero card, participant rows, creator-only settle with haptic).
Birthday write path: Profile edit → native DateTimePicker (month/day/year) → birthday list screen → tap → Friend Birthday Page → birthday group chat with collapsible wish list panel + gift claiming/voting.
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
| IOU amounts as INTEGER cents (v1.4) | Float arithmetic causes phantom debts that cannot be fixed after data is written | ✓ Good |
| create_expense() atomic RPC (v1.4) | Two chained client inserts risk orphan records on network failure between them | ✓ Good |
| Birthday as separate month/day/year smallint columns (v1.4) | TIMESTAMPTZ causes off-by-one-day errors in negative-UTC timezones | ✓ Good |
| Squad Dashboard FlatList with cards in ListFooterComponent (v1.4) | FlatList inside ScrollView breaks Android scroll silently | ✓ Good |
| Native DateTimePicker (display=spinner) replaces custom modal (v1.4) | Custom ScrollView picker is fragile; native picker handles locale, accessibility, and platform conventions | ✓ Good |
| fetch().arrayBuffer() for Supabase Storage uploads in RN (v1.4) | FormData + file:// URI fails — Supabase SDK polyfill cannot stream local URIs | ✓ Good |
| Group chat participants via tappable header title (v1.4) | More discoverable (Messenger pattern) than + menu; navigation.setOptions headerTitle activated only for group chats | ✓ Good |
| Wish list claims stored server-side with claimer_id (v1.4) | Client-side claim state would be lost on app restart and invisible to other group members | ✓ Good |
| Reactions via postgres_changes on message_reactions NOT JSONB broadcast (v1.5) | Free-tier Realtime budget: JSONB-on-row would exceed 2M msg/month at scale; per-row event is cheaper | ✓ Good |
| Friend profile route at root `/friends/[id]` not in tab folders (v1.5) | Tab-nested route breaks back navigation from multiple entry points | ✓ Good |
| expo-clipboard SDK-matched install (v1.5) | npx expo install ensures SDK 55 compatibility — not in package.json before v1.5 | ✓ Good |
| Math.random UUID template instead of crypto.randomUUID() (v1.5) | Hermes JS engine does not expose crypto.randomUUID(); Math.random template is a reliable polyfill | ✓ Good |
| contentType forced to image/jpeg in uploadChatMedia (v1.5) | Prevents executable files disguised as images from being uploaded | ✓ Good |
| poll_votes Realtime via existing postgres_changes channel (v1.5) | No new subscription per poll card — stays within free-tier Realtime connection budget | ✓ Good |
| plan-gallery bucket is private with signed URLs (1h TTL) (v1.6 Phase 21) | Gallery photos must be plan-member-only; signed URLs expire naturally so normal sessions never encounter expired links | ✓ Good |
| `{plan_id}/{user_id}/{photo_id}.jpg` storage path (v1.6 Phase 21) | User ID in path position [2] enables a path-only Storage DELETE policy with no join to plan_photos, avoiding RLS recursion | ✓ Good |
| add_plan_photo as SECURITY DEFINER RPC (v1.6 Phase 21) | Atomic membership check + cap enforcement + insert in one plpgsql block prevents race-window cap bypass from concurrent uploads | ✓ Good |
| FlatList sentinel data `[{ key:'photos' }]` in PlanDashboardScreen (v1.6 Phase 22) | Non-empty data array required for ListFooterComponent to render reliably on all RN versions — empty array suppresses footer | ✓ Good |
| GalleryViewerModal `useMemo([colors])` for StyleSheet (v1.6 Phase 22) | Theme-reactive styles recompute on dark/light switch; all existing image-viewer components use same pattern | ✓ Good |
| chunkPhotos pre-chunks into rows of 3 before SectionList (v1.6 Phase 23) | SectionList has no numColumns prop — pre-chunking into row arrays is the only way to achieve a grid layout | ✓ Good |
| MemoriesRedirect replaces Squad tab Memories stub (v1.6 Phase 23) | Eliminates duplicate gallery implementation; both Squad and Home entry points route to canonical /memories screen | ✓ Good |

---
*Last updated: 2026-05-06 — Milestone v1.8 started (Deep UI Refinement & Screen Overhaul)*
