# Project Research Summary

**Project:** Campfire
**Domain:** Social coordination mobile app — "friendship OS" for close groups (3–15 people)
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

Campfire is a serverless React Native mobile app built on Expo SDK 55 (managed workflow) and Supabase. The stack is non-negotiable per PROJECT.md; the research task was to find the right supporting libraries, architecture patterns, and implementation traps. All V1 features are testable in Expo Go — the one exception is remote push notifications on Android, which require a development build and are correctly deferred to Phase 6. The architecture is clean: Supabase handles all persistent state (Postgres + RLS + Realtime), Zustand manages ephemeral UI state only, and custom hooks form the data layer between the two. No backend server is required.

The product occupies an uncontested niche: no competitor combines daily habit formation (BeReal-style status), spontaneous plan creation (Partiful-style events), and lightweight expense notes in a friends-only, small-group context. The core retention loop — set your status, see who's free, make a plan — must complete in under 60 seconds. Every architectural and feature decision flows from this constraint. The friend system is the single critical-path dependency: every social feature blocks on it, so it must be built before anything else.

The highest-probability failure modes are not engineering complexity — they are silent security holes from disabled RLS, session loss on offline launch, realtime budget exhaustion, and OAuth misconfiguration in Expo Go. These are all well-documented and preventable with explicit conventions established at project start. Phase 1 must lock in RLS discipline and auth correctness before any social features are built on top of them.

## Key Findings

### Recommended Stack

The stack centers on Expo SDK 55 (React Native 0.83, React 19.2, Expo Router v7, TypeScript 5.8). All libraries must be Expo Go-compatible in the managed workflow — no `expo prebuild`, no custom native modules. Use `npx expo install` for all SDK packages to get SDK-pinned versions; never use plain `npm install` for Expo SDK packages.

Supabase 2.99.x handles the entire backend: auth (GoTrue with Google OAuth via `expo-auth-session`), Postgres with RLS, Realtime (statuses only in V1), and Storage (avatars). Session storage uses the AES-256 + SecureStore pattern to work within SecureStore's 2048-byte limit while keeping tokens encrypted. Zustand 5.0.12 handles ephemeral UI state — optimistic status toggles, modal visibility, draft text. DayJS replaces date-fns for a 3× bundle size reduction.

**Core technologies:**
- `expo ~55.0.0`: SDK runtime, Expo Go host — current stable with New Architecture only (Legacy Architecture dropped)
- `@supabase/supabase-js ^2.99.x`: DB, Auth, Realtime, Storage — pure JS, no native modules required
- `expo-router ~55.0.x`: File-based navigation with Stack.Protected for auth guarding
- `zustand ^5.0.12`: Ephemeral UI state only — 2.7KB, no boilerplate
- `expo-auth-session + expo-web-browser ~55.0.x`: Google OAuth via system browser (Expo Go-compatible; do NOT use `@react-native-google-signin`)
- `expo-camera ~55.0.x`: QR code scanning for friend-add flow (replaces deprecated `expo-barcode-scanner`)
- `expo-secure-store + aes-js`: Encrypted session token storage
- `dayjs ^1.11.x`: Date formatting — 6KB vs date-fns 18KB

**What to avoid:** `@react-native-google-signin` (native modules), `expo-barcode-scanner` (removed in SDK 53), `expo-av` (removed SDK 55), `react-native-maps` (native config), Redux, TanStack Query, any external UI component library.

### Expected Features

The core loop is: set availability status → see who's free → send nudge or create plan → plan dashboard with RSVP, link dump, and IOU notes. The friend system must exist before this loop is possible. Push notifications close the loop by delivering nudges and plan invites when the app is backgrounded.

**Must have (table stakes):**
- Auth (email + Google OAuth) — abandonment without social login is documented
- Profile (username, display name, avatar) — minimum viable identity
- Friend system (username add + QR code) — blocks every other social feature
- Event/plan creation with RSVP — Partiful has conditioned users to expect this
- Direct messaging (1:1 DMs) — expected baseline communication
- Push notifications — status updates and nudges are invisible without them

**Should have (differentiators):**
- Daily availability status (Free/Busy/Maybe + emoji tags) — the primary retention driver, must be under 3 taps
- "Who's Free" home screen with realtime updates — no competitor shows this as primary surface
- Nudge mechanic (pre-filled DM to a free friend) — lowers social activation energy
- Quick Plan creation (<10 seconds, free friends pre-selected) — converts status signal into action
- Lightweight IOU notes on plans — keeps users from leaving to Splitwise
- Squad Goals stub — named group identity, even as a placeholder

**Defer to v2+:**
- Calendar sync (requires Expo prebuild, exits managed workflow)
- Full Splitwise-style expense accounting (complexity mismatch)
- Receipt scanning / OCR
- Public profiles or event discovery (IRL app: 95% fake users)
- AI social suggestions (no data to train on in V1)
- Read receipts and message reactions (iMessage comparison trap)
- Image sharing in chat (storage costs, moderation surface)

### Architecture Approach

Campfire is fully serverless. All business logic lives in Postgres (RLS policies + RPC functions) or Supabase Edge Functions (push delivery). The client follows a strict layering rule: Expo Router routes are thin shells that import from `src/screens/`; screens use custom hooks for data; hooks call Supabase directly (no React Query); Zustand stores hold only what cannot be derived from a Supabase query. The Supabase client is a singleton in `src/lib/supabase.ts` — never instantiated elsewhere.

**Major components:**
1. **Expo Router (src/app/)** — File-based navigation, `Stack.Protected` auth guards in root `_layout.tsx`; no per-screen redirect logic
2. **Custom hooks (src/hooks/)** — Data fetching, realtime subscription lifecycle, loading/error state; the substitute for React Query
3. **Zustand stores (src/stores/)** — Optimistic status toggle, auth session, modal/sheet UI state; never used as server cache
4. **Supabase Postgres + RLS** — All persistent data; `SECURITY DEFINER` friendship function prevents recursive policy infinite loops
5. **Supabase Realtime** — Statuses table only in V1, filtered to friend IDs; chat uses fetch-on-focus to preserve free-tier budget
6. **Supabase Edge Functions** — Push notification delivery via Expo Push API (external HTTP calls only)

Key patterns: `Stack.Protected` replaces per-screen `useEffect` redirect guards; optimistic Zustand toggle (`localStatus ?? serverStatus`) for instant status feel; RPC functions for atomic multi-table writes (friend requests, plan creation); `REPLICA IDENTITY FULL` on the statuses table for realtime filters; `(select auth.uid())` wrapper in all RLS policies for query plan caching.

### Critical Pitfalls

1. **RLS disabled on new tables (CVE-2025-48757)** — Convention: every `CREATE TABLE` migration must be immediately followed by `ENABLE ROW LEVEL SECURITY` and at least one policy. Never test RLS via the SQL Editor (runs as superuser, bypasses all policies).

2. **Infinite recursion on friendship RLS** — Use a `SECURITY DEFINER` function `are_friends(user_a, user_b)` for all cross-table friendship checks. Never query the `friendships` table from within a `friendships` policy.

3. **Google OAuth broken in Expo Go** — Use `supabase.auth.signInWithOAuth` + `expo-web-browser`, not `@react-native-google-signin`. Register `campfire://` as the URI scheme in `app.json`, Supabase Auth settings, and Google Cloud Console. Test on a physical device before merging.

4. **Session lost on offline app launch** — Gate `supabase.auth.startAutoRefresh()` on network availability (check `NetInfo.fetch()` first). Render from cached session immediately; treat failed refresh as non-fatal unless the token is actually expired.

5. **Realtime budget exhaustion** — Filter every Postgres Changes subscription to the narrowest scope: `user_id=in.(friend_id_list)` for statuses, `channel_id=eq.xxx` for chat. Set `private: true` on all channels touching user data. V1 realtime is statuses-only; chat uses fetch-on-focus.

6. **Duplicate realtime subscriptions** — Every `supabase.channel()` call in a `useEffect` must have a `return () => { supabase.removeChannel(channel); }` cleanup. Use named channels (`statuses-{userId}`) and watch Supabase Realtime Inspector for duplicates during development.

7. **OTA updates strip env vars** — Configure Supabase credentials via `app.config.ts` `extra` field and access via `Constants.expoConfig?.extra`. Add an assertion at client initialization that throws early if URL or key is undefined.

## Implications for Roadmap

Architecture research and feature dependency analysis both point to the same build order. Each layer must exist before the layer above it.

### Phase 1: Foundation + Auth
**Rationale:** Nothing works without auth. Database schema and RLS discipline must be established before any social features touch it — retrofitting RLS is error-prone and creates the CVE-2025-48757 class of vulnerabilities.
**Delivers:** Working Expo project scaffold, Supabase project with full schema, RLS on all tables, email + Google OAuth, session persistence, Expo Router protected routes.
**Addresses:** Auth (table stakes), profile creation (prerequisite for friend system)
**Avoids:** RLS disabled tables, Google OAuth Expo Go misconfiguration, session lost offline, OTA env var stripping, service role key in client bundle

### Phase 2: Friend System
**Rationale:** The friend system is the critical-path dependency that blocks every social feature. Building it second (immediately after auth) unlocks all subsequent phases in parallel.
**Delivers:** Add friend by username, QR code generation and scanning, friend request accept/reject flow, friend list screen.
**Addresses:** Friend/contact management (table stakes)
**Avoids:** RLS infinite recursion (use `are_friends` SECURITY DEFINER function), symmetric friendship pair query bugs (`least()`/`greatest()` pattern), missing `WITH CHECK` on INSERT/UPDATE policies

### Phase 3: Availability Status + Home Screen
**Rationale:** The daily status is Campfire's primary retention driver and differentiator. It should be the first thing users experience after connecting with friends.
**Delivers:** Free/Busy/Maybe status toggle with emoji tags, "Who's Free" home screen with realtime updates, optimistic toggle UX.
**Addresses:** Daily availability status (differentiator), "Who's Free" home screen (differentiator)
**Avoids:** Unfiltered realtime subscription (filter to friend IDs), bare `auth.uid()` in RLS (use `(select auth.uid())`), N+1 status queries, duplicate subscriptions without cleanup, home screen blocking on fetch (render from Zustand cache first)

### Phase 4: Plans
**Rationale:** Plans close the core loop: see who's free, make a plan. Quick Plan creation must pre-fill free friends and complete in under 10 seconds.
**Delivers:** Quick Plan creation (<10 seconds), plan dashboard with RSVP, link dump text field, IOU notes text field.
**Addresses:** Event/plan creation (table stakes), RSVP tracking (table stakes), IOU notes (differentiator), nudge mechanic (shares infrastructure with DMs)
**Avoids:** Missing `WITH CHECK` on INSERT/UPDATE plan policies, full-form plan creation UX that abandons users

### Phase 5: Chat
**Rationale:** Chat is table stakes but is not the primary differentiator. It shares infrastructure with nudges. V1 chat uses fetch-on-focus, not realtime, to preserve the Supabase free-tier budget for statuses.
**Delivers:** 1:1 DMs, per-plan group chat, nudge action (pre-filled DM), ChatRoom with FlatList (inverted).
**Addresses:** Direct messaging (table stakes), group messaging (table stakes), nudge mechanic (differentiator)
**Avoids:** FlatList ScrollView anti-pattern (use `FlatList` with `keyExtractor`, `getItemLayout`, `useCallback`+`React.memo`), realtime on chat (budget reserved for statuses in V1), keyboard overlap (`KeyboardAvoidingView` behavior differs iOS/Android)

### Phase 6: Push Notifications + Polish
**Rationale:** Push notifications require an EAS development build (remote push on Android). This is the natural transition point from Expo Go development to production-ready builds.
**Delivers:** Push token registration, Edge Function for nudge delivery, cold-start notification tap handling, Squad Goals stub tab, seed data, empty states.
**Addresses:** Push notifications (table stakes), Squad Goals stub (differentiator placeholder)
**Avoids:** Cold-start notification tap not handled (`getLastNotificationResponseAsync()` on mount), push from killed app state unverified, empty states left as blank screens

### Phase Ordering Rationale

- Auth before everything — no social feature works without it
- Friends before statuses — statuses are meaningless without a friend list to display
- Statuses before plans — the "who's free" signal is what motivates creating a plan
- Chat after plans — shares infrastructure, completes the nudge mechanic, but is not the unique value
- Push last — requires a dev build (EAS), correct decision to defer until core loop is validated in Expo Go
- RLS discipline is established in Phase 1 and applied incrementally; retrofitting is the documented path to CVE-2025-48757

### Research Flags

Phases with well-documented patterns (no deep research needed during planning):
- **Phase 1:** Expo Router auth pattern is fully documented with code examples in ARCHITECTURE.md. Supabase session setup is from official docs.
- **Phase 2:** QR code scanning with `expo-camera` is straightforward. Friend request RPC pattern is documented.
- **Phase 3:** Realtime subscription pattern is fully specified in ARCHITECTURE.md with cleanup and filter examples.

Phases that may need targeted research during planning:
- **Phase 6 (Push Notifications):** EAS build setup and Expo Push API / Edge Function integration have more moving parts. The cold-start tap handling edge case is documented in PITFALLS.md but the specific EAS configuration for development builds may need a `research-phase` pass.
- **Phase 5 (Chat at scale):** FlatList optimization for 500+ messages and the specific `getItemLayout` / `removeClippedSubviews` configuration warrants a focused research pass when chat is being planned in detail.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version numbers verified against official Expo and Supabase changelogs as of March 2026. Expo Go compatibility flags explicitly researched and cross-referenced. |
| Features | MEDIUM-HIGH | Core patterns (auth, friend system, status, plans, chat) are well-validated. Competitor specifics based on primary app pages and secondary press coverage — directionally correct but individual feature details may have changed. |
| Architecture | HIGH | Patterns sourced directly from official Expo Router docs, Supabase docs, and verified code examples. `Stack.Protected`, singleton client, and realtime cleanup patterns are explicitly from official sources. |
| Pitfalls | HIGH | Multiple authoritative sources including official CVE documentation, verified GitHub issues, and official Supabase security advisories. RLS recursion, session offline loss, and realtime budget pitfalls are all backed by community-confirmed incidents. |

**Overall confidence:** HIGH

### Gaps to Address

- **Apple Sign-In requirement:** FEATURES.md notes that Apple Sign-In is required on iOS if any OAuth is offered (App Store policy). This is not in STACK.md and has not been researched for Expo Go compatibility. It should be validated during Phase 1 planning — likely requires `expo-apple-authentication` which is an Expo SDK package.

- **Supabase free-tier realtime connection limit (200 concurrent):** The 200-connection limit is noted in ARCHITECTURE.md. At launch this is safe, but the monitoring strategy during development (Supabase dashboard alerts) should be explicitly included in Phase 3 implementation steps.

- **Friendship symmetric pair storage:** ARCHITECTURE.md and PITFALLS.md both flag the `least()`/`greatest()` canonical pair pattern but do not specify whether the `friendships` table stores pairs canonically (one row per pair) or directionally (two rows per pair). This schema decision has downstream implications for all friendship queries and should be resolved explicitly in Phase 1 schema design.

- **Chat V1 polling interval:** ARCHITECTURE.md specifies fetch-on-focus for chat (not realtime), but does not specify whether this includes a background polling interval or only fires on screen focus. This should be decided during Phase 5 planning to set user expectations for message delivery latency.

## Sources

### Primary (HIGH confidence)
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55) — version numbers, New Architecture, legacy architecture drop
- [Expo Router Authentication Docs](https://docs.expo.dev/router/advanced/authentication/) — Stack.Protected pattern
- [Expo using-supabase Guide](https://docs.expo.dev/guides/using-supabase/) — client setup, SecureStore adapter
- [Supabase Expo Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — official RN integration
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy patterns, auth.uid() optimization
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) — 2M message/month, 200 connections
- [Supabase Security Flaw CVE-2025-48757](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — RLS disabled default risk
- [Expo Google Authentication Guide](https://docs.expo.dev/guides/google-authentication/) — expo-auth-session OAuth approach
- [expo-camera Docs](https://docs.expo.dev/versions/latest/sdk/camera/) — QR scanning, barcode-scanner deprecation
- [expo-notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/) — Expo Go remote push limitation
- [Infinite Recursion in RLS Policy — Supabase Discussion #3328](https://github.com/orgs/supabase/discussions/3328) — SECURITY DEFINER fix
- [Session Lost When Starting App Offline — Supabase Discussion #36906](https://github.com/orgs/supabase/discussions/36906) — offline session pattern

### Secondary (MEDIUM confidence)
- [Partiful on TIME100 Most Influential Companies 2025](https://time.com/collections/time100-companies-2025/7289589/partiful/) — competitor feature context
- [BeReal Statistics 2026 — Charle](https://www.charle.co.uk/articles/bereal-statistics/) — daily habit retention data
- [Social app IRL shutting down — Quartz](https://qz.com/social-app-irl-is-shutting-down-because-most-of-its-use-1850580325) — public discovery anti-pattern
- [Mobile App Retention Benchmarks 2025 — UXCam](https://uxcam.com/blog/mobile-app-retention-benchmarks/) — push notification retention stat
- [Expo App Folder Structure Best Practices](https://expo.dev/blog/expo-app-folder-structure-best-practices) — project structure guidance

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
