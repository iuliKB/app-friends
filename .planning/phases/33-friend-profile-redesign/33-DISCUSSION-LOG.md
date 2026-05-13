# Phase 33: Friend Profile Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `33-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 33-friend-profile-redesign
**Areas discussed:** Header & layout style, What info to show, Quick actions row, Scope: schema + migration debt

---

## Pre-Discussion Scoping (before /gsd-discuss-phase 33)

Before formal gray-area discussion, the following were locked during the kickoff conversation:

| Question | Options | Selected |
|----------|---------|----------|
| Primary goal of the redesign | Visual polish / More info / More actions / Unify all three screens | Visual polish + More info + More actions |
| Scope (which screens) | All three / Friend profile only / Friend + DM info (skip Plan info) | Friend profile only |
| Reference / inspiration | iMessage / Telegram-WhatsApp / Whatever fits Campfire / TBD | Telegram-WhatsApp style |

**Outcome:** Phase 33 scope locked to the friend profile screen at `src/app/friends/[id].tsx`. DM info and Plan info screens explicitly deferred to separate phases.

---

## Header & Layout Style

### Q1 — Header scroll behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Telegram-style — big avatar shrinks into title | Avatar starts ~140px at top, shrinks into nav title as user scrolls | ✓ |
| WhatsApp-style — fixed compact header | Static avatar ~96px + name + status, no shrink animation | |
| Hybrid — avatar shrinks but name stays in header | Avatar collapses, name + status already in nav from start | |

**User's choice:** Telegram-style big-avatar-shrinks-into-title.

### Q2 — Header backdrop

| Option | Description | Selected |
|--------|-------------|----------|
| Plain surface color | `surface.base` behind avatar, clean and calm | |
| Soft gradient tinted by status color | Vertical gradient (free-green / busy-red / maybe-amber) fading to surface.base | |
| Blurred-avatar wash (Telegram-style) | Avatar image blurred + dimmed as backdrop | ✓ |

**User's choice:** Blurred-avatar wash. Fallback when no avatar: `surface.elevated` (Claude's discretion, captured in CONTEXT D-02).

### Q3 — Section layout style (after clarifying "combination of Telegram + Messenger")

Initial AskUserQuestion offered: iOS-style grouped insets / card stack with elevation / flat sections. User selected "Other → combination of Telegram and Messenger." Plain-text clarification follow-up offered four sub-options A/B/C/D with concrete ASCII previews for A/B/C.

| Option | Description | Selected |
|--------|-------------|----------|
| A — Telegram grouped insets + Messenger colorful leading icons | Rounded rectangle holds rows with separators; small colored round icon on each row | ✓ |
| B — Messenger card-per-setting | Each row is its own floating pill/card with shadow and whitespace | |
| C — Hybrid (top Telegram, bottom Messenger tiles) | Grouped insets for Info+Mutual, then colorful 2-up Messenger-style action tiles | |

**User's choice:** Option A. Confirmed via preview-based AskUserQuestion after seeing concrete ASCII mockups.

### Q4 — Primary action placement

| Option | Description | Selected |
|--------|-------------|----------|
| Telegram-style icon-button row under the avatar | Message + Mute + Photos + More as horizontal icon buttons | ✓ |
| Sticky pinned PrimaryButton at bottom | `Message {firstName}` pinned at screen bottom edge | |
| Top of first section as a row with leading icon | Inside grouped list as first row, iOS-Contacts-style | |

**User's choice:** Telegram-style icon-button row.

---

## What Info to Show

### Q1 — Bio / "about me" field

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add `bio` column via Migration 0025 | Nullable `bio TEXT`, ~160 char cap, edited on own Profile | ✓ |
| No — skip bio for now | Profile stays bio-less | |
| Yes — reuse existing `context_tag` (status-emoji line) | Cheaper, but conflates status with persistent bio | |

**User's choice:** Add bio column via Migration 0025.

### Q2 — Extra info rows (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Friends since (date) — from `friendships.created_at` | Already in DB | ✓ |
| Mutual plans count — tappable | New `useMutualPlans` hook (or similar) | ✓ |
| Mutual friends count — tappable | Built on existing `useFriendsOfFriend` with intersection logic | ✓ |
| Shared photos count — tappable | Cross-ref `useAllPlanPhotos` filtered to mutual plans | ✓ |

**User's choice:** All four.

### Q3 — Status visual emphasis

| Option | Description | Selected |
|--------|-------------|----------|
| Status pill under the name | Compact status-color tinted pill (● Free · lunch break) | ✓ |
| Dedicated banner row at top of INFO section | First INFO row with status-color leading dot | |
| Keep current minimal inline treatment | Small dot + text inline like today | |

**User's choice:** Status pill under the name.

### Q4 — IOU balance placement

| Option | Description | Selected |
|--------|-------------|----------|
| IOU row in MUTUAL section | Tappable, opens existing per-friend expenses view | ✓ |
| Dedicated section card (more prominent) | Big text + Settle button card above DANGER | |
| No — IOU stays on Squad only | Don't mix social with financial UI | |

**User's choice:** IOU row in MUTUAL section.

---

## Quick Actions Row

### Q1 — Icon-button row contents (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Message | Opens DM via openChat(); always shown | ✓ |
| Mute | Toggles `chat_settings.is_muted` for the DM channel | ✓ |
| Photos / Shared media | Jumps to shared-photos grid filtered to mutual plans | ✓ |
| More (overflow menu) | Three-dots ActionSheet for secondary actions | ✓ |

**User's choice:** All four.

### Q2 — Block feature in this phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — full block (schema + RLS + RPC + UI) | Significant scope but App Store baseline | |
| Yes, UI-only — schema work in follow-up | Stub Block button as local-only hide | |
| No — defer Block entirely | Visual + info only this phase | ✓ |

**User's choice:** Defer Block entirely. Captured under Deferred Ideas.

### Q3 — Destructive-actions placement

| Option | Description | Selected |
|--------|-------------|----------|
| DANGER grouped inset at screen bottom | Familiar iOS pattern, hard to mis-tap | |
| Hidden behind More (⋯) overflow | Cleaner main screen, extra tap | ✓ |
| Both — DANGER + duplicated in More | Belt-and-braces | |

**User's choice:** More overflow only. Consequence: the DANGER grouped inset from the layout preview is dropped — screen ends after the MUTUAL section.

### Q4 — Avatar tap behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen avatar viewer | Telegram/WhatsApp behavior, reuses Phase 16 lightbox | ✓ |
| Avatar not interactive | Simpler, less polished | |

**User's choice:** Full-screen avatar viewer.

---

## Scope: Schema + Migration Debt

### Q1 — Migrate this screen to TanStack Query?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — migrate as part of this phase | `useFriendProfile` hook with useQuery, ~30 LOC plumbing | ✓ |
| No — keep legacy fetch pattern | Visual redesign only | |

**User's choice:** Migrate. Brings the screen in line with Phase 31 Pattern 5; enables cross-screen reactivity via shared cache key with `subscribeHomeStatuses`.

### Q2 — Bio editing location

| Option | Description | Selected |
|--------|-------------|----------|
| Existing `/profile/edit` screen | Single round-trip with display_name updates | ✓ |
| Dedicated bio edit screen | New route, char counter screen | |
| Inline edit on Profile tab | Pencil icon on Profile tab | |

**User's choice:** Existing `/profile/edit` screen.

### Q3 — Realtime updates in scope

| Option | Description | Selected |
|--------|-------------|----------|
| Status only — no new subscriptions | Phase 31-03 subscribeHomeStatuses already covers it via shared cache key | ✓ |
| Status + bio + avatar | New `subscribeFriendProfile(userId)` Realtime channel | |
| No realtime — staleTime: 60s | Cheapest | |

**User's choice:** Status only — reuse Phase 31-03 plumbing.

### Q4 — Empty / error state

| Option | Description | Selected |
|--------|-------------|----------|
| Generic ErrorDisplay with retry | Phase 25 AUTH-03 pattern, consistent app-wide | ✓ |
| Custom 'friend not found' illustrated empty state | Specific copy + Add Friend CTA | |
| Both — specific copy for friendship-removed, generic ErrorDisplay otherwise | Detect RLS-empty + branch | |

**User's choice:** Generic ErrorDisplay with retry. Custom 'friend not found' empty state moved to Deferred Ideas.

---

## Claude's Discretion

Items where the user said "you decide" or where the decision was deferred to research/planning:

- Exact route / grid layout for the shared-photos viewer (reuse `/memories?friendId=` vs new `/friends/[id]/photos` route).
- Skeleton layout shape during initial load (use Phase 24 `SkeletonPulse`; arrangement is Claude's call).
- Header collapse animation timing (use Phase 24 animation tokens; exact curve is Claude's call).
- Ionicons names for Messenger-style leading icons on each row.
- Friend-not-found edge case copy (RLS returns empty for removed friend).
- Bio textarea char-counter behavior on `/profile/edit` (soft warning vs hard cap).
- AvatarCircle changes needed to support ~140px header size + blurred-wash backdrop + onPress.

---

## Deferred Ideas

Items mentioned during discussion that belong to future phases:

- DM info screen (tap DM title to see chat info) — separate phase.
- Plan info screen (tap plan title to see plan info) — separate phase.
- Block feature (full schema + UI) — future moderation/safety phase, App Store baseline.
- Profile QR code / share contact — future sharing phase.
- Friend-not-found illustrated empty state — future polish.
- Subscribe to friend's bio/avatar `profiles` UPDATE Realtime channel — future polish.
- Bio rich text / link detection (linkify URLs, mentions) — future polish.
- Self-profile (Profile tab) full redesign matching friend-profile redesign — out of scope this phase.
- Audio / video calls — not a Campfire feature direction.
