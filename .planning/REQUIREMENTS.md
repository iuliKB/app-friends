# Requirements: Campfire

**Defined:** 2026-03-17
**Core Value:** The daily availability status (Free/Busy/Maybe) drives daily active use and makes it effortless for friends to coordinate spontaneous plans.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can create account with email and password
- [ ] **AUTH-02**: User can log in with Google OAuth (browser-redirect for Expo Go)
- [ ] **AUTH-03**: User can log in with Apple Sign-In
- [ ] **AUTH-04**: User session persists across app restarts (reopens to home if session exists)
- [ ] **AUTH-05**: User can log out from settings

### Profiles

- [ ] **PROF-01**: User can create profile with username, display name, and avatar
- [ ] **PROF-02**: User can upload avatar image to Supabase Storage
- [ ] **PROF-03**: User can edit display name and change avatar
- [ ] **PROF-04**: User can view other users' profiles

### Friends

- [ ] **FRND-01**: User can search for other users by username
- [ ] **FRND-02**: User can send friend request to another user
- [ ] **FRND-03**: User can view pending friend requests
- [ ] **FRND-04**: User can accept or reject a friend request
- [ ] **FRND-05**: User can view list of all accepted friends with their status
- [ ] **FRND-06**: User can generate QR code for their own profile
- [ ] **FRND-07**: User can scan QR code to add a friend

### Status

- [ ] **STAT-01**: User can set availability to Free, Busy, or Maybe via 3 large tap targets
- [ ] **STAT-02**: User can set an emoji context tag from 8 presets (☕️ 🎮 🏋️ 🍕 🎵 🎉 🎬 😴)
- [ ] **STAT-03**: User can clear emoji context tag by tapping it again
- [ ] **STAT-04**: New users default to "Maybe" status

### Home Screen

- [ ] **HOME-01**: Home screen shows friends with status "free", sorted by most recently updated
- [ ] **HOME-02**: Header displays "X friends free now" count
- [ ] **HOME-03**: Each friend card shows avatar, display name, and context tag emoji
- [ ] **HOME-04**: Home screen updates in realtime via Supabase subscription on statuses table
- [ ] **HOME-05**: "Start Plan" CTA button is prominently placed

### Plans

- [ ] **PLAN-01**: User can create a Quick Plan with title (pre-filled "Tonight"), time picker, location, and friend selector
- [ ] **PLAN-02**: Friend selector pre-checks friends with status "free"
- [ ] **PLAN-03**: User can view list of active plans sorted by scheduled time
- [ ] **PLAN-04**: Plan dashboard shows event details (title, time, location) editable by creator
- [ ] **PLAN-05**: User can RSVP to a plan: Going, Maybe, or Out
- [ ] **PLAN-06**: Plan dashboard shows member list with RSVP status indicators
- [ ] **PLAN-07**: Plan dashboard has a Link Dump text field (saves on blur, last-write-wins)
- [ ] **PLAN-08**: Plan dashboard has IOU Notes text field (saves on blur, last-write-wins)
- [ ] **PLAN-09**: Plan dashboard has "Open Chat" button linking to plan's chat room

### Chat

- [ ] **CHAT-01**: User can view chat room with chronological messages (sender avatar, name, body, timestamp)
- [ ] **CHAT-02**: User can send text messages in a chat room
- [ ] **CHAT-03**: Chat room updates in realtime via Supabase subscription on messages
- [ ] **CHAT-04**: User can view chat list showing active plan chats and DMs sorted by last message
- [ ] **CHAT-05**: Plan chat is accessible from plan dashboard with plan_id on messages
- [ ] **CHAT-06**: DM chat opens from friend card, using get_or_create_dm_channel RPC
- [ ] **CHAT-07**: Plan dashboard pinned card appears at top of plan chat (title, time, RSVP summary)

### Notifications

- [ ] **NOTF-01**: User receives push notifications for plan invites via expo-notifications
- [ ] **NOTF-02**: Push notification setup uses expo-notifications (Expo Go compatible for local, EAS build for remote)

### Navigation

- [ ] **NAV-01**: Bottom tab navigator with 5 tabs: Home, Plans, Chat, Squad, Profile
- [ ] **NAV-02**: Squad Goals tab shows "Coming soon" card with lock icon and brief description

### Infrastructure

- [x] **INFR-01**: Supabase project created with all migration SQL applied
- [x] **INFR-02**: RLS enabled on every table with policies as specified
- [x] **INFR-03**: TypeScript types generated from Supabase schema
- [x] **INFR-04**: Seed data (test users, friendships, sample plans) in supabase/seed.sql
- [x] **INFR-05**: Environment variables configured (.env.local with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY)
- [x] **INFR-06**: Supabase RPC functions: get_free_friends(), get_friends(), get_or_create_dm_channel()

### UI Polish

- [ ] **UIPOL-01**: Consistent spacing and styling across all screens
- [ ] **UIPOL-02**: Loading states on all async operations
- [ ] **UIPOL-03**: Empty states for all list screens explaining the feature inline
- [ ] **UIPOL-04**: Status colours: Free=#22c55e, Busy=#ef4444, Maybe=#eab308 used consistently

## v2 Requirements

### Engagement

- **ENGV2-01**: Nudge mechanic — ping a free friend with a "👋 nudge" DM
- **ENGV2-02**: Daily status reminder push notification (user-controlled)

### Chat Enhancements

- **CHATV2-01**: Image sharing in chat
- **CHATV2-02**: Message reactions
- **CHATV2-03**: Read receipts
- **CHATV2-04**: Realtime push notifications for all chat messages

### Plans Enhancements

- **PLANV2-01**: Plan recurrence ("Same time next week?")
- **PLANV2-02**: Calendar export (ICS file)
- **PLANV2-03**: Expense settlement tracking (mark IOU as "settled")

### Squad Goals

- **SQADV2-01**: Group-level challenges and streaks
- **SQADV2-02**: Shared milestones and progress tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive social map | V2 — high complexity, needs location services |
| Calendar sync (Apple/Google/Outlook) | V2 — requires native calendar APIs and Expo prebuild |
| OCR receipt scanning | V2 — needs camera + ML pipeline |
| Venue booking / B2B integrations | V3 — enterprise complexity, partnership overhead |
| AI social suggestions | V3 — no data to train on in v1 |
| Full Splitwise-style expenses | Complexity mismatch — IOU notes cover 80% case |
| Web app / PWA | Mobile only — push notifications poor on web |
| Public profiles or discoverability | Friends-only by design — avoids IRL's fake user problem |
| Group size pagination | Unnecessary for 3–15 person target groups |
| Media/file sharing in chat | V2 — storage costs, moderation surface |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| PROF-01 | Phase 1 | Pending |
| PROF-02 | Phase 1 | Pending |
| PROF-03 | Phase 6 | Pending |
| PROF-04 | Phase 6 | Pending |
| FRND-01 | Phase 2 | Pending |
| FRND-02 | Phase 2 | Pending |
| FRND-03 | Phase 2 | Pending |
| FRND-04 | Phase 2 | Pending |
| FRND-05 | Phase 2 | Pending |
| FRND-06 | Phase 2 | Pending |
| FRND-07 | Phase 2 | Pending |
| STAT-01 | Phase 2 | Pending |
| STAT-02 | Phase 2 | Pending |
| STAT-03 | Phase 2 | Pending |
| STAT-04 | Phase 2 | Pending |
| HOME-01 | Phase 3 | Pending |
| HOME-02 | Phase 3 | Pending |
| HOME-03 | Phase 3 | Pending |
| HOME-04 | Phase 3 | Pending |
| HOME-05 | Phase 3 | Pending |
| PLAN-01 | Phase 4 | Pending |
| PLAN-02 | Phase 4 | Pending |
| PLAN-03 | Phase 4 | Pending |
| PLAN-04 | Phase 4 | Pending |
| PLAN-05 | Phase 4 | Pending |
| PLAN-06 | Phase 4 | Pending |
| PLAN-07 | Phase 4 | Pending |
| PLAN-08 | Phase 4 | Pending |
| PLAN-09 | Phase 4 | Pending |
| CHAT-01 | Phase 5 | Pending |
| CHAT-02 | Phase 5 | Pending |
| CHAT-03 | Phase 5 | Pending |
| CHAT-04 | Phase 5 | Pending |
| CHAT-05 | Phase 5 | Pending |
| CHAT-06 | Phase 5 | Pending |
| CHAT-07 | Phase 5 | Pending |
| NOTF-01 | Phase 6 | Pending |
| NOTF-02 | Phase 6 | Pending |
| NAV-01 | Phase 1 | Pending |
| NAV-02 | Phase 1 | Pending |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| INFR-05 | Phase 1 | Complete |
| INFR-06 | Phase 1 | Complete |
| UIPOL-01 | Phase 6 | Pending |
| UIPOL-02 | Phase 6 | Pending |
| UIPOL-03 | Phase 6 | Pending |
| UIPOL-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 55 total
- Mapped to phases: 55
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after roadmap creation — all 55 requirements mapped*
