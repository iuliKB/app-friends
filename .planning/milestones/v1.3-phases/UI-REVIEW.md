# Full App -- UI Review

**Audited:** 2026-03-24
**Baseline:** Abstract 6-pillar standards (no UI-SPEC exists)
**Screenshots:** Not captured (React Native app -- no web dev server)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Context-aware copy throughout; one grammatical issue ("Who owes who" should be "whom") and a few repetitive error messages |
| 2. Visuals | 3/4 | Solid component hierarchy and reusable patterns; minor FAB inconsistency across screens |
| 3. Color | 2/4 | Good color constant system exists but 12+ hardcoded color literals bypass it, plus an undeclared blue (`#3b82f6`) for unread dots |
| 4. Typography | 3/4 | Tight scale of 11-24 for body text, but 13 distinct font sizes creates slight noise; one orphan size (15) |
| 5. Spacing | 3/4 | Consistent horizontal padding (16) and field gaps; some inconsistent section padding values |
| 6. Experience Design | 3/4 | Loading, empty, and error states present across all main screens; chat room empty state is minimal compared to others |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Hardcoded colors in MessageBubble and PlanCard** -- Users get inconsistent theming if colors change; maintenance burden across 12+ instances -- Replace all raw hex/rgba values in `MessageBubble.tsx`, `PlanCard.tsx`, `ChatListRow.tsx`, and `AvatarStack.tsx` with `COLORS.*` constants.

2. **Undeclared unread dot color (#3b82f6)** -- The blue unread indicator in ChatListRow is the only blue in the entire app and is not in the color system -- Add `unreadDot` to `COLORS` in `constants/colors.ts` or use `COLORS.accent` for brand consistency.

3. **FAB dimensions inconsistent across 3 screens** -- Home FAB is a pill with text, Plans FAB is icon-only with padding, Friends FAB is explicit 56x56 circle -- Standardize FAB as a shared component with consistent sizing.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- All CTA labels are specific and action-oriented: "Sign In", "Create Account", "Create Plan", "Accept Request", "Save Profile" -- no generic "Submit" or "OK" buttons found.
- Error messages are user-friendly with recovery hints: "Incorrect email or password. Try again." (`AuthScreen.tsx:42`), "Couldn't load friends. Pull down to try again." (`HomeScreen.tsx:80`).
- Empty states have personality and clear next steps: "Nobody's free right now / When friends set their status to Free, they'll show up here." (`HomeScreen.tsx:87-88`).
- Contextual labels on plan create: "Title", "When", "Where", "Who's coming?" (`PlanCreateModal.tsx:152-206`).

**Issues:**
- `IOUNotesField.tsx:70`: Placeholder "Who owes who?" should be "Who owes whom?" -- minor grammatical issue.
- `ChatRoomScreen.tsx:46`: Alert uses generic "OK" button text -- `Alert.alert('Error', 'Message failed to send.', [{ text: 'OK' }])` -- should be "Dismiss" or remove the button array to use default.
- Error fallback in `AuthScreen.tsx:47` and `:106` both use identical "Something went wrong. Check your connection and try again." -- acceptable but could differentiate network errors from server errors.
- `PlanCreateModal.tsx:104`: Error message interpolates raw error object: `Couldn't create plan. ${error?.message ?? 'Unknown error'}` -- may surface technical messages to users.

### Pillar 2: Visuals (3/4)

**Strengths:**
- Clear visual hierarchy: 24px headings for screen titles, 20px for section titles, 16px body, 14px secondary text -- consistent across screens.
- Reusable component library: `PrimaryButton`, `EmptyState`, `AvatarCircle`, `LoadingIndicator`, `FormField` used consistently.
- FABs have proper elevation and shadow for depth (`HomeScreen.tsx:196-200`, `PlansListScreen.tsx:251-255`).
- Tab bar uses filled/outline icon states for active/inactive (`_layout.tsx:33-34`).
- Haptic feedback on status toggle (`SegmentedControl.tsx:20`).

**Issues:**
- **FAB inconsistency across 3 screens:**
  - Home (`HomeScreen.tsx:133-141`): pill-shaped with icon + "Start Plan" text, `paddingHorizontal: 16, paddingVertical: 16`.
  - Plans (`PlansListScreen.tsx:179-186`): icon-only, same padding values but no explicit width/height -- appears as a rectangle not a circle.
  - Friends (`FriendsList.tsx:96-103`): explicit `width: 56, height: 56, borderRadius: 28` -- proper circle.
  - The Plans FAB should either match Friends' circular style or Home's pill style.
- `ChatRoomScreen.tsx:63`: Inline style `{ flex: 1, backgroundColor: COLORS.dominant }` instead of StyleSheet -- one-off pattern.
- `PlansListScreen.tsx:135`: Inline style `{ paddingTop: insets.top + 8 }` -- used in multiple screens but never extracted.
- `ProfileScreen` (`profile.tsx:105`): Inline style `{ position: 'relative' }` instead of StyleSheet.

### Pillar 3: Color (2/4)

**Strengths:**
- Well-defined color system in `constants/colors.ts` with semantic names: `accent`, `dominant`, `secondary`, `destructive`, `status.*`, `textPrimary`, `textSecondary`, `border`.
- Status colors (`free/busy/maybe`) are consistently used through the `COLORS.status.*` references in `SegmentedControl`, `RSVPButtons`, `StatusPill`.
- Dark theme is cohesive: `#1a1a1a` background, `#2a2a2a` cards, `#f5f5f5` text.

**Issues (12+ hardcoded color literals):**
- `MessageBubble.tsx:138`: `backgroundColor: '#f97316'` -- should be `COLORS.accent`.
- `MessageBubble.tsx:150`: `color: '#1a1a1a'` -- should be `COLORS.dominant`.
- `MessageBubble.tsx:155`: `color: 'rgba(245,245,245,0.5)'` -- should derive from `COLORS.textPrimary` with opacity.
- `MessageBubble.tsx:178`: `backgroundColor: '#2a2a2a'` -- should be `COLORS.secondary`.
- `MessageBubble.tsx:187`: `color: '#f5f5f5'` -- should be `COLORS.textPrimary`.
- `MessageBubble.tsx:192`: `color: '#9ca3af'` -- should be `COLORS.textSecondary`.
- `PlanCard.tsx:66`: `backgroundColor: '#2a2a2a'` -- should be `COLORS.secondary`.
- `AvatarStack.tsx:58`: `backgroundColor: '#2a2a2a'` -- should be `COLORS.secondary`.
- `ChatListRow.tsx:97`: `backgroundColor: '#3b82f6'` -- **undeclared blue** not in the color system at all. This is the only blue in the entire app, used for unread message dots.
- `QRCodeDisplay.tsx:70`: `backgroundColor: '#2a2a2a'` -- should be `COLORS.secondary`.
- `EmojiTagPicker.tsx:18-24`: `rgba(34,197,94,0.2)`, `rgba(239,68,68,0.2)`, `rgba(234,179,8,0.2)` -- derived from status colors but hardcoded rather than computed from `COLORS.status.*`.
- Shadow colors (`#000`) in `HomeScreen.tsx:197`, `PlansListScreen.tsx:252`, `FriendsList.tsx:140` -- acceptable for shadows but could be centralized.
- `profile.tsx:214`: `COLORS.accent + '40'` -- string concatenation for opacity is fragile; should use a utility or define `accentTranslucent` in constants.

### Pillar 4: Typography (3/4)

**Strengths:**
- Only 2 font weights used app-wide: `'400'` (regular) and `'600'` (semibold). This is tight discipline.
- Body text consistently 16px, secondary text 14px, screen headings 24px, section headings 20px.
- The EmptyState component enforces consistent empty-state typography (20px heading, 14px body).

**Issues:**
- **13 distinct font sizes** in use: 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 48, 64.
  - The core scale (12, 14, 16, 20, 24) covers 90% of usage and is clean.
  - `fontSize: 15` in `HomeScreen.tsx:205` (FAB label) -- orphan size, should be 14 or 16.
  - `fontSize: 13` in 4 places: `HomeFriendCard.tsx:62`, `MessageBubble.tsx:172`, `ChatListRow.tsx:89`, `PlansListScreen.tsx:357` -- ambiguous whether this should be 12 or 14.
  - `fontSize: 18` in `HomeScreen.tsx:180` and `PlansListScreen.tsx:330` -- used for sub-section headings but 20 is the standard section heading size.
  - `fontSize: 11` only in tab bar labels (`_layout.tsx:25`) -- acceptable for tab bar.
  - `fontSize: 28`, `fontSize: 32`, `fontSize: 48`, `fontSize: 64` are splash/emoji decorative sizes -- fine.
- **No shared typography constants.** Font sizes and weights are repeated as raw numbers in every StyleSheet. A `TYPOGRAPHY` or `FONTS` constant would reduce drift.

### Pillar 5: Spacing (3/4)

**Strengths:**
- Horizontal page padding is consistently `paddingHorizontal: 16` across all screens: Auth, Home, Plans, Chat, Friends, Profile.
- Field gaps are consistently `height: 16` (`AuthScreen.tsx:339`, `ProfileSetup.tsx:219`).
- Button spacing from form fields is consistently `marginTop: 24` (`AuthScreen.tsx:342`, `ProfileSetup.tsx:229`, `EditProfileScreen:264`).
- Card padding is consistently `padding: 16` (`PlanCard.tsx:68`, `inviteCard:311`).
- Section vertical rhythm uses `paddingTop: 24` in plan dashboard sections.

**Issues:**
- `scrollContent.paddingBottom` varies: 32 (Auth), 40 (PlanCreate), 100 (Home, Plans, PlanDashboard). The 100px values account for FABs and tab bars, but the inconsistency could be formalized.
- `AuthScreen.tsx:316`: `paddingTop: 64` for header, but `ProfileSetup.tsx:201`: `paddingTop: 48` for title -- different top padding on auth-flow screens.
- List separators vary: `height: 12` in PlansListScreen, `height: 1` with border color in ChatList and FriendsList -- intentional for different list densities but not documented.
- `FriendCard.tsx:33-34`: `paddingHorizontal: 16, paddingVertical: 16` vs `RequestCard.tsx:71-72`: `paddingHorizontal: 16, paddingVertical: 16` -- consistent but `FriendCard` also has `minHeight: 64` while `RequestCard` does not.
- **borderRadius values** span 10 distinct values: 2, 4, 5, 6, 8, 10, 12, 16, 18, 22, 28, 40. Primary radii are 8 (buttons/inputs) and 12 (cards/containers). The outliers:
  - `borderRadius: 5` in `MemberList.tsx:181` -- should be 4 or 6.
  - `borderRadius: 22` in `MemberList.tsx:104` -- unusual, likely for a specific circular element.
  - `borderRadius: 10` in `profile.tsx:298` (count badge) -- should be 8 or 12.

### Pillar 6: Experience Design (3/4)

**Strengths:**
- **Loading states present on all data-fetching screens:**
  - `ChatListScreen.tsx:30-31`: Shows `LoadingIndicator` while loading.
  - `PlanDashboardScreen.tsx:124-126`: Shows `LoadingIndicator` for initial load.
  - `EditProfileScreen:143-145`: Shows `LoadingIndicator` while fetching profile.
  - `ProfileScreen:120-122`: Shows `ActivityIndicator` for status loading.
- **Empty states present on all list screens:**
  - Home: "Nobody's free right now" with context (`HomeScreen.tsx:85-89`).
  - Plans: "No plans yet" with CTA hint (`PlansListScreen.tsx:160-164`).
  - Chat: "No conversations yet" with guidance (`ChatListScreen.tsx:48-52`).
  - Friends: "No friends yet" with "Add Friend" CTA button (`FriendsList.tsx:81-87`).
  - Friend Requests: "No pending requests" (`FriendRequests.tsx:75-80`).
- **Destructive action confirmations:**
  - Plan delete: `Alert.alert('Delete this plan?', "This can't be undone.", ...)` with "Keep Plan" / "Delete Plan" options (`PlanDashboardScreen.tsx:106-121`).
  - Friend remove: Two-step confirmation in action sheet with explicit "Remove" / "Keep Friend" buttons (`FriendActionSheet.tsx:64-75`).
- **Disabled states:** PrimaryButton properly handles `disabled` + `loading` states with 0.5 opacity (`PrimaryButton.tsx:20-21`).
- **Offline awareness:** `OfflineBanner` component with animated height transition (`OfflineBanner.tsx`).
- **Optimistic chat sending:** Messages show `pending` opacity while sending (`MessageBubble.tsx:88,144-146`).

**Issues:**
- `ChatRoomScreen.tsx:68-71`: Empty chat state is a plain `<Text>Start the conversation!</Text>` without the `EmptyState` component used everywhere else -- should use `EmptyState` for consistency.
- No error state in `ChatListScreen` -- if chat list fails to load, there is no error message shown (unlike Plans and Home which handle errors).
- `FriendRequests.tsx:73-74` and `FriendsList.tsx:80`: When `loading` is true, `ListEmptyComponent` returns `null` -- the user sees a blank screen with only the pull-to-refresh spinner. Should show a centered `LoadingIndicator` for the initial load.
- No confirmation before logout (`profile.tsx:78-82`): `handleLogout` immediately signs out without asking "Are you sure?" -- low risk but inconsistent with the confirmation pattern used for other destructive actions.
- Error alerts across the app use `Alert.alert('Error', ...)` with default button -- no retry mechanism. For example, `PlanDashboardScreen.tsx:89`: "Couldn't save changes. Try again." but the user must manually retry.

---

## Files Audited

**Constants:**
- `src/constants/colors.ts`
- `src/constants/config.ts`

**Common Components:**
- `src/components/common/PrimaryButton.tsx`
- `src/components/common/EmptyState.tsx`
- `src/components/common/LoadingIndicator.tsx`
- `src/components/common/AvatarCircle.tsx`
- `src/components/common/OfflineBanner.tsx`

**Auth Components:**
- `src/components/auth/FormField.tsx`
- `src/components/auth/AuthTabSwitcher.tsx`
- `src/components/auth/OAuthButton.tsx`

**Status Components:**
- `src/components/status/SegmentedControl.tsx`
- `src/components/status/EmojiTagPicker.tsx`

**Home Components:**
- `src/components/home/HomeFriendCard.tsx`

**Chat Components:**
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/SendBar.tsx`
- `src/components/chat/ChatListRow.tsx`
- `src/components/chat/PinnedPlanBanner.tsx`

**Plans Components:**
- `src/components/plans/PlanCard.tsx`
- `src/components/plans/RSVPButtons.tsx`
- `src/components/plans/LinkDumpField.tsx`
- `src/components/plans/IOUNotesField.tsx`
- `src/components/plans/AvatarStack.tsx`
- `src/components/plans/MemberList.tsx`

**Friends Components:**
- `src/components/friends/FriendCard.tsx`
- `src/components/friends/StatusPill.tsx`
- `src/components/friends/RequestCard.tsx`
- `src/components/friends/FriendActionSheet.tsx`
- `src/components/friends/SearchResultCard.tsx`
- `src/components/friends/QRCodeDisplay.tsx`
- `src/components/friends/QRScanView.tsx`

**Screens:**
- `src/screens/auth/AuthScreen.tsx`
- `src/screens/auth/ProfileSetup.tsx`
- `src/screens/home/HomeScreen.tsx`
- `src/screens/plans/PlansListScreen.tsx`
- `src/screens/plans/PlanDashboardScreen.tsx`
- `src/screens/plans/PlanCreateModal.tsx`
- `src/screens/chat/ChatListScreen.tsx`
- `src/screens/chat/ChatRoomScreen.tsx`
- `src/screens/friends/FriendsList.tsx`
- `src/screens/friends/AddFriend.tsx`
- `src/screens/friends/FriendRequests.tsx`

**Routes/Layouts:**
- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/profile.tsx`
- `src/app/(tabs)/squad.tsx`
- `src/app/profile/edit.tsx`
