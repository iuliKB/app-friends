# Milestones

## v1.4 Squad Dashboard & Social Tools (Shipped: 2026-04-17)

**Phases completed:** 6 phases, 23 plans, 31 tasks

**Key accomplishments:**

- One-liner:
- Nullable birthday_month and birthday_day smallint columns on profiles with compound day-in-month CHECK constraint and SECURITY DEFINER RPC that returns accepted friends sorted by days until next birthday with full Feb 29 leap-year handling
- One-liner:
- Task 1 — database.ts birthday types:
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- Task 1 — database.ts additions:
- One-liner:
- useExpenseCreate (form state + create_expense RPC + payer auto-include guard) and useExpenseDetail (three-query fetch + composite-PK settle) — both TypeScript strict, haptics wired
- One-liner:
- get_iou_summary RPC type, useIOUSummary and useExpensesWithFriend hooks, BalanceRow and ExpenseHistoryRow presentational components — typed foundation for Plans 02–03
- IOUCard dashboard component + /squad/expenses balance index + /squad/expenses/friend/[id] history screen + Stack navigator registration
- IOUCard wired into squad.tsx Goals tab between StreakCard and BirthdayCard; complete IOU feature human-verified in Expo Go across all 15 acceptance steps
- Migration 0017 with wish lists, secret claims, group channels, and updated messages RLS — all Phase 11 DB objects in a single file with Playwright test stubs
- Migration 0017 (birthday_social_v1_4) applied to Supabase project zqmaauaopyolutfoizgq via MCP — all 11 schema sections live, Wave 3 client work unblocked
- Phase 11 TypeScript types, formatTurningAge utility, three-column BirthdayPicker, and BirthdayEntry.birthday_year — all Wave 4 UI plans unblocked
- groupChannelId branch added to useChatRoom; route and screen wired end-to-end — group chat navigation unblocked for Plan 06
- Three data hooks (useFriendWishList, useMyWishList, useFriendsOfFriend) and WishListItem component — Wave 4 screens unblocked for wish list and friend-of-friend UI
- Profile edit screen extended with three-column birthday picker (Month | Day | Year) and inline My Wish List section with add/delete item management
- Tappable birthday rows with "turning N" label, birthday/[id] route registration, and Friend Birthday Page with wish list viewing, friend picker, and birthday group chat creation
- Birthday feature verified end-to-end; native date picker, collapsible birthday chat panel, group participant sheet, attachment menu, and home screen IOU/Birthday widgets shipped

---

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
