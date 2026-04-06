# Campfire — Full Project Context

## What This Is

Campfire is a "friendship OS" — an all-in-one social coordination app for close friend. It combines availability status, event planning, group chat, and lightweight expense tracking into a single React Native + Expo mobile app backed by Supabase.

## Core Value

The daily availability status ("Free / Busy / Maybe") drives daily active use. Friends see who's around and spin up spontaneous plans. If nothing else works, this must.

## Tech Stack

- **Frontend:** React Native + Expo (managed workflow), TypeScript strict
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage) — no separate backend server
- **State:** Zustand (ephemeral UI state only)
- **Styling:** React Native StyleSheet only (no UI libraries), design tokens in `src/theme/`
- **Testing:** Playwright (visual regression via Expo Web), ESLint custom rule for style enforcement

## Current Bottom Navigation (v1.2.0)

5 tabs, in order:

| # | Tab | Icon | Badge | Purpose |
|---|-----|------|-------|---------|
| 1 | **Home** | home | — | "Who's Free" status feed |
| 2 | **Squad** | people | pending friend requests | Friends list + Goals (top tabs) |
| 3 | **Explore** | compass | plan invitations | Plans dashboard (formerly "Plans") |
| 4 | **Chats** | chatbubbles | — | Plan group chats + 1:1 DMs (formerly "Chat") |
| 5 | **Profile** | person | — | Self-focused: avatar, @username, QR, account, settings |

Squad tab uses a `SquadTabSwitcher` useState toggle (not a navigator) — Friends view mounted only on the "Friends" sub-tab so the Add-Friend FAB hides automatically when viewing "Goals".

## Screen Inventory — What's Actually on Each Screen

Top-to-bottom descriptions of what a user literally sees on each screen. "→" indicates navigation on tap.

### 1. Home tab (`src/screens/home/HomeScreen.tsx`)

Purpose: the daily landing surface — am I free, who else is free, start something.

**Layout (top to bottom):**
1. **Screen title** "Campfire"
2. **Status SegmentedControl** — the daily Free / Busy / Maybe toggle. Tapping saves optimistically, shows a saving spinner. This is the core action of the app.
3. **Error/empty states** — if friends fail to load, pull-to-refresh hint; if the user has zero friends, empty state "Nobody's free right now 🔥".
4. **Animated count heading** — "N friends free now" (scales 1.0→1.15→1.0 when count changes to draw the eye).
5. **Free friends grid** — 3-column grid of `HomeFriendCard`s showing only friends currently set to Free.
6. **"Everyone Else" section** — 3-column grid of remaining friends with a small status pill on each card (Busy / Maybe / offline).
7. **FAB "Start Plan"** — bottom-right, opens `/plan-create` (PlanCreateModal).
- Pull-to-refresh at the top reloads status + friends.

**User actions:** change own status, tap a friend card (opens friend's detail/DM), tap FAB to create a plan.

### 2. Squad tab (`src/app/(tabs)/squad.tsx`)

Purpose: everything about the friend graph — list them, add them, handle requests. Future home for group challenges.

**Layout:**
1. **`SquadTabSwitcher`** segmented control at top: `Friends` | `Goals`
2. **If "Friends" is active:**
   - If pending requests > 0: a **"Friend Requests (N)"** tappable row → `/friends/requests`
   - `FriendsList` (FlatList of `FriendCard`, with current status pill on each)
   - **FAB "Add friend"** (bottom-right) → `/friends/add`
3. **If "Goals" is active:**
   - Centered lock icon + "Group challenges and streaks — coming soon." (stub)
   - No FAB (hidden automatically because `FriendsList` is unmounted)

**User actions:** switch sub-tab, tap friend card (opens action sheet: View Profile / Start DM / Remove Friend), tap requests row, tap FAB to add friend.

### 3. Explore tab (`src/screens/plans/PlansListScreen.tsx`)

Purpose: see your upcoming plans, respond to invites, start new ones. Named "Explore" but currently *is* the plans dashboard — the rename in v1.2 conceptually opens the door to broader discovery features here.

**Layout:**
1. **Screen title** "Your Plans"
2. **Invite banner** (only if pending invitations > 0): "You have N invitation(s)" row → opens an **Invitations modal** (slide-up pageSheet) with rich invite cards (creator avatar + "X invited you", plan title, time, location, also-invited avatar stack, Accept/Decline buttons)
3. **FlatList of `PlanCard`s** — your upcoming plans (title, time, location, member avatars)
   - Empty state: 📅 "No plans yet" / "Tap + to create a quick plan and invite your free friends."
4. **FAB "+"** → `/plan-create`
- Pull-to-refresh reloads plans.

**User actions:** tap invite banner → modal → Accept/Decline, tap a plan card → `PlanDashboardScreen`, tap FAB → `PlanCreateModal`.

### 4. Chats tab (`src/screens/chat/ChatListScreen.tsx`)

Purpose: unified inbox — one list combining plan group chats and 1:1 DMs.

**Layout:**
1. **Screen title** "Chats"
2. **FlatList of `ChatListRow`s** — each row: avatar (friend or plan icon), title, last message preview, timestamp. Plan chats and DMs both appear here, sorted by last-activity.
3. **Empty state:** 💬 "No conversations yet" / "Start a DM from a friend's card, or create a plan to get a group chat going."
- Pull-to-refresh reloads.

**User actions:** tap row → `ChatRoomScreen` (with `plan_id` or `dm_channel_id` param).

### 5. Profile tab (`src/app/(tabs)/profile.tsx`)

Purpose: self-view only — who you are, your status controls, settings. **All friend management lives in Squad now** (as of v1.2 Phase 12).

**Layout:**
1. **Screen title** "Profile"
2. **Avatar header** (centered, tappable → `/profile/edit`): 80px avatar with pencil overlay, display name, `@username`
3. **"YOUR STATUS" section header**
   - `SegmentedControl` (Free / Busy / Maybe) — same toggle as Home, synced
   - `EmojiTagPicker` — pick a context emoji (what you're up to)
4. **QR Code row** (`qr-code-outline` icon) → `/qr-code`
5. **"ACCOUNT" section header**
   - Email row (read-only, from session)
   - "Member since {Month Year}" row
6. **"SETTINGS" section header**
   - "Plan invites" row with a Switch (push notification toggle)
7. **Logout row** (destructive red text, full-width, 52px) → `supabase.auth.signOut()`
8. **App version footer** — `Campfire v{Constants.expoConfig?.version}` (currently v1.2.0)

**User actions:** edit profile, toggle status, change emoji tag, open QR, toggle notifications, log out.

### Key sub-screens (not in bottom nav but important for context)

| Screen | Path | What it is |
|---|---|---|
| **Auth** | `/(auth)/index.tsx` | Email/password + Google OAuth + Apple Sign-In |
| **Profile Setup** | `/profile-setup.tsx` | First-run: username + display name + avatar |
| **Plan Create Modal** | `/plan-create.tsx` | Quick-plan form: title (defaults to "Tonight"/"Tomorrow" based on hour), time picker (next round hour), location text, friend multi-select list with status pills. <10 second creation target |
| **Plan Dashboard** | `/plans/[id].tsx` | Plan detail: title, time, location, member list with RSVP, `LinkDumpField` (drop any URL), `IOUNotesField` (lightweight expense notes), edit mode (creator-only), delete (creator-only trash in header) |
| **Chat Room** | `/(tabs)/chat/room.tsx?plan_id=… OR dm_channel_id=…` | Inverted FlatList of `MessageBubble`s, grouped by sender, time separators; `PinnedPlanBanner` if plan chat; `SendBar` at bottom with optimistic send + 5s dedup |
| **Friend Requests** | `/friends/requests.tsx` | Accept/reject incoming requests |
| **Add Friend** | `/friends/add.tsx` | Search by username OR scan QR code |
| **Friend Detail** | `/friends/[id].tsx` | View friend's profile (reached from FriendsList action sheet) |
| **QR Code** | `/qr-code.tsx` | Display your own QR code for friends to scan |
| **Profile Edit** | `/profile/edit.tsx` | Edit display name and avatar |

### Cross-cutting flows worth knowing

- **"Start a DM"** — only entry point is: Squad tab → tap friend → action sheet → "Start DM". This calls `get_or_create_dm_channel` RPC and navigates to `/chat/room?dm_channel_id=…`. There is **no** "new message" button in the Chats tab.
- **"Create a plan"** — two entry points: Home FAB or Explore FAB. Both open the same `PlanCreateModal`. Creating a plan auto-creates a group chat that shows up in Chats tab.
- **Status propagation** — the Home SegmentedControl and the Profile "YOUR STATUS" SegmentedControl both write through the same `useStatus` hook. A change on one screen reflects on the other (and on your friends' Home screens via Supabase Realtime).
- **Invitation badges** — Squad tab badge = pending friend requests. Explore tab badge = pending plan invitations. Both driven by dedicated hooks (`usePendingRequestsCount`, `useInvitationCount`) called once in `(tabs)/_layout.tsx`.

## What's Built (v1.0 + v1.1 + v1.2)

### v1.0 MVP (shipped 2026-03-24) — 6 phases, 9,322 LOC

**Auth:**
- Email/password, Google OAuth, Apple Sign-In
- Profile creation (username, display name, avatar)
- Session persistence across app restarts

**Friends:**
- Add by username search or QR code scan
- Accept/reject friend requests
- Friend list with realtime status display

**Status:**
- Daily toggle: Free / Busy / Maybe (defaults to "Maybe")
- Emoji context tags (what you're up to)
- "Who's Free" home screen with realtime updates

**Plans:**
- Quick Plan creation (<10 seconds: title, time, location, invite friends)
- Plan dashboard with RSVP, link dump, IOU notes
- Plan group chats auto-created

**Chat:**
- Plan group chats + 1:1 DMs
- Realtime messaging with optimistic send + 5s dedup
- Text-only (no images, reactions, read receipts)

**Other:**
- Push notifications for plan invites
- Profile editing and settings
- 5-tab navigation (original order: Home, Plans, Chat, Squad, Profile — reordered in v1.2)
- Squad Goals "Coming soon" stub tab
- Supabase RLS on every table
- Empty states and loading indicators everywhere
- Seed data for development

### v1.1 UI/UX Design System (shipped 2026-03-25) — 3 phases, 33 commits

**Design Tokens (`src/theme/`):**
- `colors.ts` — Semantic nested groups (text, surface, interactive, feedback, status, splash)
- `spacing.ts` — xs(4), sm(8), md(12), lg(16), xl(24), xxl(32)
- `typography.ts` — FONT_SIZE (sm/md/lg/xl/xxl) + FONT_WEIGHT (regular/semibold)
- `radii.ts` — xs through full
- `shadows.ts` — card, fab, none presets
- `index.ts` — barrel export: `import { COLORS, SPACING, ... } from '@/theme'`

**Shared Components (`src/components/common/`):**
- FAB (flexible props, scale bounce animation, fixed bottom-right)
- ScreenHeader (title + subtitle + right action slot)
- SectionHeader (in-screen section titles)
- ErrorDisplay (inline + screen-level)
- FormField (token-migrated from auth)
- Plus existing: AvatarCircle, EmptyState, LoadingIndicator, OfflineBanner, PrimaryButton

**Enforcement:**
- ESLint `campfire/no-hardcoded-styles` rule at error severity
- Zero raw hex colors, fontSize, padding, margin, gap values allowed
- 35 `eslint-disable` suppressions for values with no exact token match

**Testing:**
- Playwright visual regression baselines for all 7 screens (auth login, auth signup, home, plans, chat, friends, profile)
- UI/UX Pro Max Claude Code skill installed

### v1.2 Squad & Navigation (shipped 2026-04-04) — 3 phases, app v1.2.0

**Phase 10 — Squad Tab:**
- Squad tab restructured to host Friends + Goals as top sub-tabs (`SquadTabSwitcher` useState toggle, not navigator)
- Friend list moved from Profile into Squad → Friends
- Pending friend-request count badge moved from Profile tab onto the Squad tab icon
- "Friend Requests (N)" tappable row surfaces when pending > 0 → navigates to `/friends/requests`
- Goals sub-tab shows "coming soon" lock placeholder
- Add-Friend FAB only visible on Friends sub-tab (hides on Goals)

**Phase 11 — Navigation Restructure:**
- Bottom nav reordered and renamed: **Home | Squad | Explore | Chats | Profile**
  - "Plans" tab → renamed **Explore** (compass icon); functionality unchanged
  - "Chat" tab → renamed **Chats** (chatbubbles icon); functionality unchanged
  - Squad promoted from position 4 to position 2 (right after Home)
- Title-only rename: no file/route renames — route segments stay `plans` and `chat` under the hood, so every `router.push('/plans/...')` / `router.push('/chat/...')` call site kept working zero-touch
- Plan-invitation count badge added to Explore tab

**Phase 12 — Profile Simplification:**
- Profile screen reduced to self-focused view: avatar, display name, @username, QR Code row, ACCOUNT section (email + member-since), SETTINGS section, app version footer
- All friend-management removed from Profile (delegated to Squad tab)
- App version read from `Constants.expoConfig?.version`, single-sourced in `app.config.ts` (currently `1.2.0`)

## Architecture

```
src/
├── app/               # Expo Router file-based routing
│   ├── (tabs)/        # Tab navigator: Home | Squad | Explore | Chats | Profile
│   │                  #   index.tsx (Home), squad.tsx, plans.tsx (labeled "Explore"),
│   │                  #   chat/ (labeled "Chats"), profile.tsx
│   ├── friends/       # Friend-related routes (requests, add, detail)
│   ├── plans/         # Plan-related routes (create, detail)
│   ├── profile/       # Profile edit routes
│   └── qr-code.tsx    # QR code display
├── components/
│   ├── auth/          # Auth-specific components
│   ├── chat/          # Chat components (ChatListRow, MessageBubble, SendBar, etc.)
│   ├── common/        # 10 shared components (FAB, ScreenHeader, etc.)
│   ├── friends/       # Friend components (FriendCard, QRCodeDisplay, etc.)
│   ├── home/          # HomeFriendCard
│   ├── plans/         # Plan components (PlanCard, RSVPButtons, etc.)
│   ├── squad/         # SquadTabSwitcher (Friends/Goals top tabs)
│   └── status/        # EmojiTagPicker, SegmentedControl
├── constants/         # App config only (colors moved to theme/)
├── hooks/             # Custom hooks (useAuth, useChatList, useFriends, usePendingRequestsCount, useInvitationCount, etc.)
├── lib/               # Supabase client
├── screens/           # Screen components (auth, chat, friends, home, plans)
├── stores/            # Zustand stores
├── theme/             # Design tokens (6 files + barrel)
└── types/             # TypeScript types
```

**Routing note:** Phase 11's tab rename is title-only. Under the hood the route segments are still `plans` and `chat`, so every `router.push('/plans/...')` and `router.push('/chat/...')` call site is untouched. Only the visible label and tab order changed.

## Key Constraints

- Expo Go compatible (no custom native modules)
- No UI component libraries — StyleSheet only
- No backend server — all logic via Supabase RPC/Postgres
- All styling via `@/theme` tokens (ESLint enforced)
- FlatList for all lists (no ScrollView + map)
- Free tier budget: 500MB DB, 1GB Storage, 50K MAU
- Chat is text-only (no images, files, reactions, read receipts)
- Groups are 3-15 people (no pagination needed)

## Key Decisions

| Decision | Why |
|----------|-----|
| Supabase over Firebase | Single SDK, free tier, Postgres |
| Zustand over Redux | Lightweight, no boilerplate |
| Status defaults to "Maybe" | Prevents false "free" signals |
| Symmetric relationship keys (least/greatest) | No duplicate friend/DM pairs |
| Single Realtime channel with user_id filter | Stays within 200 connection limit |
| Optimistic send + 5s dedup for chat | Instant UX, no duplicates |
| src/theme/ with barrel export | Single import, TypeScript autocomplete |
| Semantic COLORS groups | Positions for dark mode without requiring it |
| Custom ESLint rule over library | Zero dependencies, exact enforcement |
| Playwright + Expo Web | CLI-friendly visual regression, no simulators |

## What's NOT Built Yet (Ideas for Future)

**Near-term candidates:**
- Squad Goals real implementation (group challenges, streaks — stub sub-tab exists inside Squad)
- Dark mode (semantic tokens already position for it; `userInterfaceStyle: 'dark'` is already set in app.config.ts)
- Media/image sharing in chat
- Read receipts and message reactions
- Explore tab content expansion (currently just hosts plans — the "Explore" framing invites new discovery features)

**Medium-term:**
- Calendar sync (native calendar APIs)
- OCR receipt scanning (camera + ML)
- Interactive social map

**Long-term:**
- Venue booking / B2B integrations
- AI social suggestions

## Stats

- **Total LOC:** ~9,614 TypeScript
- **Files:** ~101 source files
- **Milestones:** 3 shipped (v1.0 + v1.1 + v1.2)
- **Phases:** 12 total (6 + 3 + 3)
- **Plans:** 33 total (17 + 11 + 5)
- **Commits:** ~240 total
- **App version:** 1.2.0
- **Timeline:** v1.0 in 7 days, v1.1 in 1 day, v1.2 in ~10 days
