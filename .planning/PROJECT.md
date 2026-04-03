# Campfire

## What This Is

Campfire is a "friendship OS" — an all-in-one social coordination app for close friend groups of 3–15 people. It combines availability status, event planning, group chat, and lightweight expense tracking into a single React Native + Expo mobile app backed by Supabase. V1.1 shipped with a full design system, shared component library, and consistent UI across all screens.

## Core Value

The daily availability status ("Free / Busy / Maybe") drives daily active use and makes it effortless for friends to see who's around and spin up spontaneous plans. If nothing else works, this must.

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

### Active

<!-- v1.2 Squad & Navigation -->

- [ ] Squad tab with top tabs (Friends / Goals)
- [ ] Friend list relocated from Profile to Squad → Friends tab
- [ ] Add Friend relocated from Profile to Squad → Friends tab
- [ ] Friend Requests (tappable row → separate screen) in Squad → Friends tab
- [ ] Goals tab with "Coming soon" placeholder
- [ ] Bottom nav reordered: Home | Squad | Explore | Chats | Profile
- [ ] Plans tab renamed to Explore (same functionality)
- [ ] Chat tab renamed to Chats
- [ ] Profile tab simplified (friend-related features removed)

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
- Dark mode / theming — v1.2+ (semantic color naming positions for it)

## Context

Shipped v1.1 UI/UX Design System with 9,535 LOC TypeScript across 9 phases total (6 v1.0 + 3 v1.1).
Tech stack: React Native + Expo (managed workflow), TypeScript strict, Supabase (Postgres + Auth + Realtime + Storage), Zustand.
All 73 requirements delivered (55 v1.0 + 18 v1.1). 178 commits, 94 files modified in v1.1.

Design system: `src/theme/` (6 token files), `src/components/common/` (10 shared components), ESLint `no-hardcoded-styles` at error severity.
Playwright visual regression baselines for all 7 screens (auth login, auth signup, home, plans, chat, friends, profile).

Known technical considerations:
- Apple Sign-In works in Expo Go but needs validation on EAS builds
- Supabase free-tier Realtime limited to 200 concurrent connections
- Push notifications require EAS development build for remote push on Android
- Nudge mechanic deferred to v2 (DM infrastructure covers the use case)
- 35 `eslint-disable-next-line` suppressions for values with no exact token match (e.g., fontSize: 48 emoji, paddingVertical: 14)

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

---
## Current Milestone: v1.2 Squad & Navigation

**Goal:** Relocate friend management into the Squad tab and reorganize bottom navigation for better information architecture.

**Target features:**
- Squad screen with top tabs (Friends / Goals)
- Friend list, add friend, friend requests moved from Profile to Squad
- Bottom nav reorder and rename (Plans→Explore, Chat→Chats)
- Profile tab simplified

---
*Last updated: 2026-04-04 after v1.2 milestone start*
