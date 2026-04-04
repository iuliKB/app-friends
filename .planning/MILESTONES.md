# Milestones

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

