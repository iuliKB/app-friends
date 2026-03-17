# Roadmap: Campfire

## Overview

Six phases following the natural dependency chain of the app: foundation and auth first (nothing works without it), then the friend system (blocks every social feature), then the daily status + home screen (the core retention hook), then plans (converts the status signal into action), then chat (completes the communication layer), and finally notifications and polish (production-ready hardening). Every phase delivers a coherent, testable capability. The core loop — set status, see who's free, make a plan — is complete after Phase 4.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Auth** - Expo scaffold, Supabase schema + RLS, email/Google/Apple auth, session persistence, navigation shell
- [ ] **Phase 2: Friends + Status** - Friend system (username add, QR code, accept/reject), daily Free/Busy/Maybe status with emoji tags
- [ ] **Phase 3: Home Screen** - "Who's Free" screen with realtime Supabase subscription, friend cards, Start Plan CTA
- [ ] **Phase 4: Plans** - Quick Plan creation (<10 seconds), plan dashboard with RSVP, link dump, IOU notes, plan chat link
- [ ] **Phase 5: Chat** - Plan group chats, 1:1 DMs, realtime messaging, chat list
- [ ] **Phase 6: Notifications + Polish** - Push notifications for plan invites, profile editing, empty states, UI consistency, seed data

## Phase Details

### Phase 1: Foundation + Auth
**Goal**: Users can create accounts and log in; the project scaffold and database are production-ready with RLS on every table
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password, then log in on a fresh app install
  2. User can log in with Google OAuth via the system browser (Expo Go compatible)
  3. User can log in with Apple Sign-In on iOS
  4. App reopens to the home screen when a valid session exists; reopens to the login screen when it does not
  5. User can log out from the settings screen and is returned to the login screen
**Plans**: TBD

Plans:
- [ ] 01-01: Expo project scaffold, app.config.ts, folder structure, Supabase client singleton, env vars
- [ ] 01-02: Supabase schema migrations, RLS policies, RPC functions, seed.sql
- [ ] 01-03: Auth screens (email/password, Google OAuth, Apple Sign-In), session persistence, Expo Router protected routes, navigation shell (bottom tabs + Stack.Protected)

### Phase 2: Friends + Status
**Goal**: Users can find and connect with friends, and set their daily availability status
**Depends on**: Phase 1
**Requirements**: FRND-01, FRND-02, FRND-03, FRND-04, FRND-05, FRND-06, FRND-07, STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):
  1. User can search for another user by username and send them a friend request
  2. User can view pending incoming friend requests and accept or reject each one
  3. User can view their complete friends list with each friend's current status displayed
  4. User can generate a QR code for their own profile and share it
  5. User can scan another user's QR code to initiate a friend request
  6. User can set their availability to Free, Busy, or Maybe with one tap; new users default to Maybe
  7. User can attach and clear an emoji context tag from the 8 preset options
**Plans**: TBD

Plans:
- [ ] 02-01: Friend search, send/accept/reject request flow, friend list screen
- [ ] 02-02: QR code generation and scanning (expo-camera)
- [ ] 02-03: Status toggle UI (3 large tap targets), emoji tag picker, Zustand optimistic update, Supabase persistence

### Phase 3: Home Screen
**Goal**: The "Who's Free" home screen is the first thing users see — it loads instantly from cache, updates in realtime, and makes it obvious who to hang out with
**Depends on**: Phase 2
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05
**Success Criteria** (what must be TRUE):
  1. Home screen renders immediately from Zustand cache on app open, then revalidates in background
  2. Screen shows only friends with "Free" status, sorted by most-recently-updated
  3. Header shows the correct "X friends free now" count, updating as statuses change
  4. Each friend card shows avatar, display name, and context tag emoji
  5. Status changes from any friend appear on screen within seconds via Supabase Realtime (no manual refresh needed)
  6. "Start Plan" CTA button is prominently visible and tappable
**Plans**: TBD

Plans:
- [ ] 03-01: Home screen UI (FlatList friend cards, header count, Start Plan CTA), Zustand cache layer
- [ ] 03-02: Supabase Realtime subscription on statuses table (filtered to friend IDs, cleanup on unmount)

### Phase 4: Plans
**Goal**: Users can create a plan in under 10 seconds and coordinate details on a shared plan dashboard
**Depends on**: Phase 3
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, PLAN-09
**Success Criteria** (what must be TRUE):
  1. User can create a Quick Plan from the home screen in under 10 seconds — title pre-filled, time pre-set, free friends pre-selected
  2. User can view all active plans sorted by scheduled time
  3. User can RSVP to a plan (Going / Maybe / Out) and see other members' RSVP statuses
  4. Plan creator can edit the title, time, and location directly on the plan dashboard
  5. Any member can type in the Link Dump field and the text persists (last-write-wins on blur)
  6. Any member can type in the IOU Notes field and the text persists (last-write-wins on blur)
  7. Plan dashboard has an "Open Chat" button that navigates to the plan's chat room
**Plans**: TBD

Plans:
- [ ] 04-01: Quick Plan creation flow (title pre-fill, time picker, location, friend selector pre-checking free friends)
- [ ] 04-02: Plans list screen and plan dashboard (details, RSVP, member list)
- [ ] 04-03: Link Dump and IOU Notes text fields (save on blur, last-write-wins), "Open Chat" button

### Phase 5: Chat
**Goal**: Users can message each other in plan group chats and 1:1 DMs; messaging is text-only and updates in realtime
**Depends on**: Phase 4
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07
**Success Criteria** (what must be TRUE):
  1. User can open a plan's chat room and read all messages in chronological order (sender avatar, name, body, timestamp)
  2. User can send a text message and it appears immediately in the chat room
  3. New messages from other participants appear in the chat room without a manual refresh
  4. User can open a 1:1 DM with any friend from their friend card
  5. Chat list tab shows all active plan chats and DMs sorted by last message time
  6. Plan chat room shows a pinned card at the top with the plan title, time, and RSVP summary
**Plans**: TBD

Plans:
- [ ] 05-01: Chat room screen (FlatList inverted, message row component, send bar, KeyboardAvoidingView)
- [ ] 05-02: Supabase Realtime subscription for chat messages, chat list screen, plan chat navigation from plan dashboard
- [ ] 05-03: DM channel (get_or_create_dm_channel RPC), DM navigation from friend card, pinned plan card in plan chat

### Phase 6: Notifications + Polish
**Goal**: The app is production-ready — push notifications alert users to plan invites, profiles are editable, every screen handles loading and empty states gracefully
**Depends on**: Phase 5
**Requirements**: NOTF-01, NOTF-02, PROF-03, PROF-04, UIPOL-01, UIPOL-02, UIPOL-03, UIPOL-04
**Success Criteria** (what must be TRUE):
  1. User receives a push notification when invited to a plan; tapping it navigates to the correct plan dashboard (including cold-start from killed state)
  2. User can edit their display name and change their avatar from the profile screen
  3. User can view any friend's profile from their friend card or the friends list
  4. Every list screen shows an informative empty state instead of a blank screen when there is no data
  5. Status colours (Free #22c55e, Busy #ef4444, Maybe #eab308) are applied consistently across all screens
  6. Every async operation shows a loading indicator; no screen blocks silently on a network call
**Plans**: TBD

Plans:
- [ ] 06-01: expo-notifications setup, push token registration, plan invite notification trigger (Edge Function), cold-start tap handling
- [ ] 06-02: Profile edit screen (display name, avatar upload to Supabase Storage), view other users' profiles
- [ ] 06-03: Empty states for all list screens, loading indicators on all async operations, status colour audit, UI consistency pass

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth | 0/3 | Not started | - |
| 2. Friends + Status | 0/3 | Not started | - |
| 3. Home Screen | 0/2 | Not started | - |
| 4. Plans | 0/3 | Not started | - |
| 5. Chat | 0/3 | Not started | - |
| 6. Notifications + Polish | 0/3 | Not started | - |
