# Milestones

## v1.3 Liveness & Notifications (Shipped: 2026-04-10)

**Phases completed:** 5 phases, 32 plans | 142 files changed, +29,089 lines
**Timeline:** 2026-04-06 → 2026-04-10 (4 days)

**Key accomplishments:**

- Push infrastructure with token lifecycle (device_id, invalidation, foreground re-register) and tappable HomeFriendCard DM entry point
- Status Liveness: Mood + Context + Window two-stage composer with heartbeat-based freshness (ALIVE/FADING/DEAD), effective_status view, ReEngagementBanner
- Friend Went Free notification loop: outbox queue + Edge Function with 8-stage rate-limit gauntlet (pairwise 15min, per-recipient 5min, daily cap ~3, quiet hours 22-08)
- On-device morning prompt scheduler with Free/Busy/Maybe action buttons, configurable time, 12h validity guard
- Squad Goals streak: `get_squad_streak` SQL with sliding 4-week grace window, StreakCard UI with pull-to-refresh, positive-only copy (non-engineer approved)
- Hardware verification gate: expo_go track passed (11 checks), eas_build track deferred until Apple Dev account

**Known gaps:**
- EAS build track (22 hardware checks) deferred — no Apple Developer account yet
- TTL-08 retention rollup deferred to v1.4 (pg_cron not enabled)
- FREE-11 monitoring doc authored but not operator-verified

---

## v1.2 Squad & Navigation (Shipped: 2026-04-04)

**Phases completed:** 3 phases, 5 plans | 6 feat commits | 13 files changed, 271 insertions
**Timeline:** 2026-04-04 (1 day)

**Key accomplishments:**

- Squad tab with Friends/Goals underline tab switcher (accent orange, haptic feedback), friend list with FAB, conditional requests row
- Bottom nav reordered to Home|Squad|Explore|Chats|Profile with compass and chatbubbles icons
- Pending request badge migrated from Profile to Squad tab
- Profile simplified: @username display, ACCOUNT section (email + member since), app version, SETTINGS section
- All 7 Playwright visual regression baselines regenerated for new tab layout
- Title-only tab rename approach (no file renames) preserved all deep route references

---

## v1.1 UI/UX Design System (Shipped: 2026-03-25)

**Phases completed:** 3 phases, 11 plans | 33 commits | 9,535 LOC TypeScript
**Timeline:** 2026-03-24 → 2026-03-25 (1 day)

**Key accomplishments:**

- Design token system: 6 TypeScript `as const` files in src/theme/ (colors, spacing, typography, radii, shadows) with barrel export
- ESLint `no-hardcoded-styles` rule enforcing zero raw hex/fontSize/padding values across entire codebase
- Shared component library: FAB (bounce animation), ScreenHeader, SectionHeader, ErrorDisplay, FormField
- Campfire-orange pull-to-refresh standardized across all 5 list screens
- Full 51-file migration from @/constants/colors to @/theme with old color file deleted
- Playwright visual regression test suite with baselines for all screens

---

## v1.0 MVP (Shipped: 2026-03-24)

**Phases completed:** 6 phases, 17 plans | 145 commits | 9,322 LOC TypeScript
**Timeline:** 2026-03-17 → 2026-03-24 (7 days)

**Key accomplishments:**

- Full auth system with email/password, Google OAuth, and Apple Sign-In
- Friend system with username search, QR code add, and accept/reject flow
- Realtime "Who's Free" home screen with status toggle and emoji context tags
- Quick Plan creation (<10s) with RSVP, link dump, and IOU notes dashboard
- Chat system with plan group chats, 1:1 DMs, and realtime messaging
- Push notifications, profile editing, and UI polish across all screens

---
