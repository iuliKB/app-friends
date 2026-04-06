# Phase 12: Profile Simplification - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove friend-related sections from Profile tab (My Friends row, Friend Requests row, pending badge). Restructure Profile with new sections: @username display, QR Code in its own section, ACCOUNT section (email + member since), app version at bottom. Rename NOTIFICATIONS to SETTINGS.

</domain>

<decisions>
## Implementation Decisions

### Remove from Profile
- Remove entire "FRIENDS" section header
- Remove "My Friends" row (TouchableOpacity navigating to /friends)
- Remove "Friend Requests" row (TouchableOpacity navigating to /friends/requests)
- Remove `useFriends` hook import and call (friends, fetchFriends)
- Remove `usePendingRequestsCount` hook import and call (pendingCount)
- Remove unused styles: countBadge, countBadgeText, countBadgeAlert, countBadgeAlertText
- Profile tab icon in _layout.tsx already has no badge (moved in Phase 10)

### Add @username under display name
- Show `@username` below the display name in the avatar header area
- Text style: COLORS.text.secondary, FONT_SIZE.md
- Extend fetchProfile query from `'display_name, avatar_url'` to `'display_name, avatar_url, username'`
- Non-tappable, display only

### Relocate QR Code
- Move "My QR Code" row out of FRIENDS section into its own section
- Place between YOUR STATUS and ACCOUNT sections
- Keep existing row style (icon + label + chevron)
- No section header needed — single row stands alone, OR use a subtle separator

### Add ACCOUNT section
- New section header: "ACCOUNT"
- Email row: mail-outline icon + session.user.email, read-only (no chevron, no tap)
- Member since row: calendar-outline icon + formatted date from profiles.created_at
- Extend fetchProfile query to include `created_at`
- Date format: "Member since Apr 2026" (month + year)

### Rename NOTIFICATIONS → SETTINGS
- Section header changes from "NOTIFICATIONS" to "SETTINGS"
- Plan invites toggle stays as-is

### Add app version
- Small centered text at very bottom of ScrollView: "Campfire v1.2.0"
- Use expo-constants (already installed): Constants.expoConfig?.version
- Style: COLORS.text.secondary, FONT_SIZE.sm, centered, marginTop: SPACING.xxl

### Final Profile layout order
1. ScreenHeader "Profile"
2. Avatar + pencil overlay + display name + @username
3. YOUR STATUS section (segmented control + emoji picker)
4. My QR Code row
5. ACCOUNT section (email + member since)
6. SETTINGS section (plan invites toggle)
7. Log out button
8. App version text

### Claude's Discretion
- Whether QR Code row needs a section header or just visual separation
- QR Code row style (keep current row style vs smaller/subtle — lean toward keeping current row style for consistency)
- Exact spacing adjustments after FRIENDS section removal
- Whether to show email truncated if very long

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Profile screen (primary modification target)
- `src/app/(tabs)/profile.tsx` — Full profile screen; lines 141-204 are the FRIENDS section to remove
- `src/app/(tabs)/_layout.tsx` — Tab layout; confirm no badge on Profile tab

### Profile data
- `src/stores/useAuthStore.ts` — session.user.email available here
- `src/lib/supabase.ts` — Supabase client for profile query

### QR Code route
- `src/app/qr-code.tsx` or similar — QR Code screen (navigated to from profile)

### Hooks to clean up
- `src/hooks/useFriends.ts` — Remove import from profile.tsx
- `src/hooks/usePendingRequestsCount.ts` — Remove import from profile.tsx

### Design system
- `src/theme/` — All tokens
- `src/components/common/ScreenHeader.tsx` — Used on Profile

### Expo Constants
- `expo-constants` — Already installed, used in `src/hooks/usePushNotifications.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `session.user.email` — available from `useAuthStore` session, no new fetch needed
- `profiles.created_at` — already in DB, just add to fetchProfile select
- `profiles.username` — already in DB, add to fetchProfile select
- `Constants.expoConfig?.version` — from expo-constants, already a dependency
- Existing row style pattern in profile.tsx (icon + label + chevron/value)

### Established Patterns
- Section headers: uppercase text, FONT_SIZE.md, COLORS.text.secondary
- Row style: flexDirection row, 52px height, border-bottom, paddingHorizontal SPACING.lg
- Read-only rows: same style but no chevron, no activeOpacity
- Design tokens for all styling

### Integration Points
- `fetchProfile()` in profile.tsx — extend .select() to add username, created_at
- `useAuthStore` — already imported, session.user.email available
- `useFocusEffect` — already used for refetch on tab focus

</code_context>

<specifics>
## Specific Ideas

- @username shown in secondary color creates a clear identity hierarchy: bold display name + subtle @handle
- ACCOUNT section with email + member since gives the app a "real account" feel
- App version at bottom is a polish detail that signals a mature product

</specifics>

<deferred>
## Deferred Ideas

- Bio / "About Me" field — requires new DB column
- Privacy settings — no private/public model exists
- Linked accounts (Spotify, etc.) — new backend
- Blocked users list — no block concept yet
- Active sessions / devices — misleading UX at this scale
- Language / theme toggle — no i18n or theming system

</deferred>

---

*Phase: 12-profile-simplification*
*Context gathered: 2026-04-04*
