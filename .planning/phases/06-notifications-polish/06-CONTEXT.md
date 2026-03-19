# Phase 6: Notifications + Polish - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Push notifications for plan invites (full EAS build), profile editing (display name + avatar), viewing other users' profiles, and a full visual overhaul — shared empty state and loading components, status colour audit, spacing/typography consistency pass. This is the final phase — makes the app production-ready.

</domain>

<decisions>
## Implementation Decisions

### Push Notifications
- **Full push with EAS build** — expo-notifications fully configured, push token registration, Supabase Edge Function trigger
- **Supabase Edge Function** triggered by database webhook on `plan_members` INSERT — sends push via Expo Push API
- **New `push_tokens` table**: user_id + token + platform. Supports multiple devices per user.
- Notification content: **"[Name] invited you to [Plan Title]"** — personalized with inviter's display name and plan title
- Deep link on tap: **navigate to plan dashboard** (`/plans/[id]`), including cold-start from killed state
- Permission request: **on first plan interaction** (create or invited) — contextual, not on first launch
- **Simple on/off toggle** in Profile tab for notifications — one toggle, enables/disables all push
- No notification settings granularity in V1

### Profile Editing
- **Separate edit screen** — "Edit Profile" accessible from Profile tab
- Profile tab top section: **large avatar (80px) + display name + pencil edit icon**. Replaces current email-only header.
- Edit screen fields: **display name + avatar** only. Username is not editable (set at creation).
- Avatar picker: **gallery + camera** — action sheet with "Choose from Library" / "Take Photo". Uses expo-image-picker.
- Upload to Supabase Storage (same pattern as profile creation in Phase 1).
- Validation: **non-empty display name, max 50 chars** (same rules as Phase 1). Disable save button when empty. Show char count.
- Save with server confirmation pattern.

### View Other Profiles
- **Profile screen**: large avatar, display name, @username, current status with emoji tag, action buttons (Start DM, Remove Friend)
- **No mutual plans** — keep it simple for V1
- Access: **"View Profile" in FriendActionSheet** (existing bottom sheet). Also accessible from member lists in plan dashboard.
- Friend's display name as navigation header + back arrow.

### UI Consistency Audit (Full Visual Overhaul)
- **Full scope**: review spacing, typography, and visual consistency across ALL screens, not just missing items
- **Shared EmptyState component**: reusable with icon/emoji + heading + body + optional CTA button props. Replace all per-screen empty states.
- **Shared LoadingIndicator component**: consistent ActivityIndicator placement and styling. Replace inline ActivityIndicators across all screens.
- **Status colour audit**: verify Free=#22c55e, Busy=#ef4444, Maybe=#eab308 used consistently everywhere
- **Screens to audit**: Home, Plans list, Plan dashboard, Chat list, Chat room, Friends list, Friend requests, Profile tab, Add Friend, QR Code
- Fix any missing loading indicators on async operations
- Fix any screens that show blank instead of empty state

### Claude's Discretion
- Edge Function implementation details (Deno runtime, webhook configuration)
- Push token refresh strategy
- Cold-start deep link handling implementation
- Profile edit screen save/cancel button placement
- Exact audit checklist (which screens need what fixes)
- Shared component API design (EmptyState/LoadingIndicator props)
- Notification toggle storage mechanism (AsyncStorage vs Supabase column)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `.planning/PROJECT.md` — No onboarding tour, empty states explain features inline, status colours, seed data
- `.planning/REQUIREMENTS.md` — Phase 6 requirements: NOTF-01, NOTF-02, PROF-03, PROF-04, UIPOL-01, UIPOL-02, UIPOL-03, UIPOL-04
- `.planning/ROADMAP.md` — Phase 6 plans structure, success criteria

### Prior Phases
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — Profile creation flow (avatar upload pattern), validation rules (display name non-empty, max 50), Supabase Storage
- `.planning/phases/02-friends-status/02-CONTEXT.md` — FriendActionSheet with "View Profile" action, FriendCard bottom sheet pattern
- `.planning/phases/04-plans/04-CONTEXT.md` — Plan dashboard, RSVP, member list (where "View Profile" links from)
- `.planning/phases/05-chat/05-CONTEXT.md` — Chat patterns, DM navigation from friend card

### Schema
- `supabase/migrations/0001_init.sql` — profiles table, Supabase Storage for avatars, RLS policies
- New migration needed: `push_tokens` table

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/common/AvatarCircle.tsx` — Avatar component, supports size prop. Use at 80px for profile header.
- `src/components/common/PrimaryButton.tsx` — For save button on edit screen.
- `src/components/friends/FriendActionSheet.tsx` — Bottom sheet with actions. "View Profile" already present as a stub action.
- `src/app/(tabs)/profile.tsx` — Current profile tab with status toggle, friends section, QR code, logout. Needs header redesign.
- `src/hooks/useStatus.ts` — Status data for "View Profile" screen.
- `src/constants/colors.ts` — All status colours defined. Audit target.

### Established Patterns
- Avatar upload to Supabase Storage (Phase 1 profile creation)
- Server confirmation for mutations (Phase 2/4/5 pattern)
- Expo Router file-based routing with stack navigation
- FlatList for all lists
- React Native StyleSheet only

### Integration Points
- Profile tab — add avatar + name header, edit button, notification toggle
- FriendActionSheet — wire "View Profile" to new profile screen
- Plan dashboard member list — wire taps to profile screen
- All list screens — replace inline empty states with shared EmptyState
- All async screens — replace inline ActivityIndicators with shared LoadingIndicator
- Supabase Edge Functions — new for push notification trigger
- `push_tokens` table — new migration

</code_context>

<specifics>
## Specific Ideas

- Profile tab redesign with prominent avatar makes it feel more personal
- Gallery + camera for avatar gives flexibility without adding complexity
- Shared EmptyState/LoadingIndicator components enforce consistency going forward
- Permission request on first plan interaction is contextual and has higher acceptance rates
- Notification toggle in Profile keeps settings discoverable without a separate settings screen

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-notifications-polish*
*Context gathered: 2026-03-19*
