# Phase 12: Profile Simplification - Research

**Researched:** 2026-04-04
**Domain:** React Native / Expo Router — UI restructure, Supabase profile query extension
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Remove entire "FRIENDS" section header, "My Friends" row, "Friend Requests" row
- Remove `useFriends` hook import and call (friends, fetchFriends)
- Remove `usePendingRequestsCount` hook import and call (pendingCount)
- Remove unused styles: countBadge, countBadgeText, countBadgeAlert, countBadgeAlertText
- Profile tab icon in _layout.tsx already has no badge (confirmed: no tabBarBadge on Profile tab)
- Show `@username` below display name — COLORS.text.secondary, FONT_SIZE.md, non-tappable
- Extend fetchProfile query from `'display_name, avatar_url'` to `'display_name, avatar_url, username'`
- Move "My QR Code" row out of FRIENDS section into its own section between YOUR STATUS and ACCOUNT
- Add ACCOUNT section: "ACCOUNT" header + email row (mail-outline icon, read-only) + member since row (calendar-outline icon, formatted "Member since Apr 2026")
- Extend fetchProfile query to include `created_at`
- Rename section header "NOTIFICATIONS" → "SETTINGS" (Plan invites toggle unchanged)
- App version text at bottom: `Constants.expoConfig?.version`, COLORS.text.secondary, FONT_SIZE.sm, centered, marginTop: SPACING.xxl
- expo-constants already installed — import Constants from 'expo-constants'

### Claude's Discretion
- Whether QR Code row needs a section header or just visual separation
- QR Code row style (lean toward keeping current row style for consistency)
- Exact spacing adjustments after FRIENDS section removal
- Whether to show email truncated if very long

### Deferred Ideas (OUT OF SCOPE)
- Bio / "About Me" field — requires new DB column
- Privacy settings — no private/public model exists
- Linked accounts (Spotify, etc.) — new backend
- Blocked users list — no block concept yet
- Active sessions / devices — misleading UX at this scale
- Language / theme toggle — no i18n or theming system
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROF-01 | Profile tab no longer shows friend list section | Remove FRIENDS section block (lines 141–203 in profile.tsx) and all associated hook/style references |
| PROF-02 | Profile tab no longer shows friend requests row | Friend Requests row is inside the FRIENDS block — removed together with PROF-01 |
| PROF-03 | Profile tab no longer shows pending request badge on tab icon | Confirmed: _layout.tsx Profile tab has no tabBarBadge — already done in Phase 10; no code change needed |
</phase_requirements>

---

## Summary

Phase 12 is a focused UI restructure of a single screen (`src/app/(tabs)/profile.tsx`). All changes are confined to one file plus a minor extension of its Supabase select query. No new libraries are required. No database schema changes are needed — `username` and `created_at` already exist on the `profiles` table.

The three formal requirements (PROF-01, PROF-02, PROF-03) are satisfied by removing lines 141–203 from profile.tsx and cleaning up two hook imports plus four style definitions. The remaining changes (add @username, QR Code relocation, ACCOUNT section, SETTINGS rename, app version) are product-polish additions layered on top of that removal.

The Profile tab's `tabBarBadge` was already removed in Phase 10 and confirmed during Phase 11 device verification — PROF-03 requires zero code changes.

**Primary recommendation:** Single-wave implementation. Remove the FRIENDS block and all dead code first, then add the new sections in layout order. Keep all styling in the existing `StyleSheet.create` block using existing tokens.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| expo-constants | ~55.0.7 | Access `expoConfig.version` | Already installed; used in usePushNotifications.ts |
| @supabase/supabase-js | ^2.99.2 | Profile query extension | Project's DB client |
| expo-router | ~55.0.5 | `useRouter`, `useFocusEffect` | Project navigation |
| @expo/vector-icons (Ionicons) | bundled with expo | Row icons | Established pattern |

### No new dependencies needed
All required capabilities are already available in the project. `expo-constants` is imported in `src/hooks/usePushNotifications.ts` as `import Constants from 'expo-constants'` — same import pattern applies to profile.tsx.

---

## Architecture Patterns

### Current Profile Screen Structure (before Phase 12)
```
ScrollView
├── ScreenHeader "Profile"
├── Avatar header (TouchableOpacity → /profile/edit)
│   └── AvatarCircle + pencil overlay + display name
├── YOUR STATUS section
│   ├── SegmentedControl
│   └── EmojiTagPicker
├── FRIENDS section header          ← REMOVE
│   ├── My Friends row              ← REMOVE
│   ├── Friend Requests row         ← REMOVE
│   └── My QR Code row              ← MOVE out
├── NOTIFICATIONS section header
│   └── Plan invites toggle
└── Log out button
```

### Target Profile Screen Structure (after Phase 12)
```
ScrollView
├── ScreenHeader "Profile"
├── Avatar header (TouchableOpacity → /profile/edit)
│   └── AvatarCircle + pencil overlay + display name + @username
├── YOUR STATUS section
│   ├── SegmentedControl
│   └── EmojiTagPicker
├── My QR Code row (standalone, no section header OR subtle separator)
├── ACCOUNT section header
│   ├── Email row (mail-outline, read-only, no chevron)
│   └── Member since row (calendar-outline, read-only, no chevron)
├── SETTINGS section header
│   └── Plan invites toggle
├── Log out button
└── App version text (centered, secondary, small)
```

### Pattern 1: Read-Only Row (no chevron, no TouchableOpacity)
**What:** Info display row — same visual as tappable row but renders as `View`, no `activeOpacity`, no chevron icon.
**When to use:** Email, member since — data the user sees but cannot change from this screen.
**Example:**
```typescript
// Pattern used in existing row style — same dimensions, just View not TouchableOpacity
<View style={styles.row}>
  <Ionicons
    name="mail-outline"
    size={FONT_SIZE.xl}
    color={COLORS.text.secondary}
    style={styles.rowIcon}
  />
  <Text style={styles.rowLabel}>{session?.user?.email ?? ''}</Text>
</View>
```

### Pattern 2: @username Display Under Name
**What:** Secondary text directly below display name in avatar header area.
**When to use:** Identity hierarchy — bold name + subtle handle.
**Example:**
```typescript
// Inside the avatarHeader TouchableOpacity, after displayName Text:
<Text style={styles.username}>@{profile?.username ?? ''}</Text>
```
New style entry:
```typescript
username: {
  fontSize: FONT_SIZE.md,
  fontWeight: FONT_WEIGHT.regular,
  color: COLORS.text.secondary,
  marginTop: SPACING.xs,
  textAlign: 'center',
},
```

### Pattern 3: App Version via expo-constants
**What:** Read `version` from Expo config at runtime.
**When to use:** Bottom-of-screen version display.
**Example:**
```typescript
// Source: usePushNotifications.ts uses Constants.easConfig and Constants.expoConfig already
import Constants from 'expo-constants';

// In JSX, after logout button:
<Text style={styles.versionText}>
  Campfire v{Constants.expoConfig?.version ?? ''}
</Text>
```
New style entry:
```typescript
versionText: {
  fontSize: FONT_SIZE.sm,
  color: COLORS.text.secondary,
  textAlign: 'center',
  marginTop: SPACING.xxl,
},
```

### Pattern 4: Date Formatting (no library needed)
**What:** Format `created_at` ISO string as "Member since Apr 2026".
**When to use:** Member since row.
**Example:**
```typescript
function formatMemberSince(isoDate: string): string {
  const date = new Date(isoDate);
  return `Member since ${date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
}
```
No external date library needed — standard `Date.toLocaleString` with `en-US` locale covers this exactly.

### Anti-Patterns to Avoid
- **Calling usePendingRequestsCount in profile.tsx:** The hook already runs in `_layout.tsx`. Keeping it in profile.tsx creates a second DB query on every profile focus — remove entirely.
- **Calling fetchFriends in useFocusEffect:** The callback `useCallback(... [fetchFriends])` will cause a TypeScript error once `fetchFriends` is removed. Remove both the hook destructure and its call from the dependency array.
- **Hardcoded font sizes or colors:** The existing codebase has an ESLint rule `campfire/no-hardcoded-styles`. Only `countBadgeText` (fontSize: 12) and `logoutRow` (marginTop: 48) use `// eslint-disable-next-line` exemptions — new code must use design tokens.
- **Leaving dead state:** After removing `useFriends`, `friends` and `fetchFriends` variables will be unreferenced. TypeScript will warn. Remove both hook destructuring and all uses.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| App version string | Parse package.json at runtime | `Constants.expoConfig?.version` | Already wired through Expo build config; package.json version propagates to expoConfig |
| Date formatting | Custom month name array + logic | `Date.toLocaleString('en-US', { month: 'short', year: 'numeric' })` | Standard JS API, correct output "Apr 2026" |
| Email from DB | Extra Supabase query | `session?.user?.email` from useAuthStore | Already in session, zero additional fetch |

---

## Common Pitfalls

### Pitfall 1: useFocusEffect Dependency Array After Hook Removal
**What goes wrong:** `useFocusEffect(useCallback(() => { fetchFriends(); fetchProfile(); ... }, [fetchFriends]))` — removing `fetchFriends` call but leaving it in the dep array causes a lint error, or leaving the call causes a runtime crash on undefined.
**Why it happens:** The hook was added to the dep array when `fetchFriends` was in scope; after removing `useFriends`, the reference is gone.
**How to avoid:** After removing the `useFriends` import and destructure, also rewrite the `useFocusEffect` callback to only reference `fetchProfile` and `loadNotificationsEnabled`. Remove `fetchFriends` from the dep array. New form:
```typescript
useFocusEffect(
  useCallback(() => {
    fetchProfile();
    loadNotificationsEnabled();
  }, [])
);
```
**Warning signs:** TypeScript error "Cannot find name 'fetchFriends'" or ESLint "react-hooks/exhaustive-deps" warning.

### Pitfall 2: Profile State Type After Adding Fields
**What goes wrong:** `profile` state is typed as `{ display_name: string; avatar_url: string | null } | null` — adding `username` and `created_at` to the select without updating the type causes TypeScript errors.
**Why it happens:** The inline type annotation on `useState` is narrower than the new query result.
**How to avoid:** Extend the inline type to include the new fields before using them in JSX:
```typescript
const [profile, setProfile] = useState<{
  display_name: string;
  avatar_url: string | null;
  username: string | null;
  created_at: string | null;
} | null>(null);
```

### Pitfall 3: Dead Style Entries Causing Lint Warnings
**What goes wrong:** Leaving `countBadge`, `countBadgeText`, `countBadgeAlert`, `countBadgeAlertText` in `StyleSheet.create` after removing the JSX that references them.
**Why it happens:** StyleSheet entries are plain objects — TypeScript/ESLint may not flag them as unused depending on project config, but they represent dead code.
**How to avoid:** Delete all four style entries in the same edit that removes the FRIENDS section JSX.

### Pitfall 4: Email Truncation on Narrow Screens
**What goes wrong:** Long email addresses overflow the row on narrow devices (320px iPhone SE).
**Why it happens:** The `rowLabel` style has `flex: 1` which handles most cases, but Text without `numberOfLines` will wrap.
**How to avoid:** Add `numberOfLines={1}` and `ellipsizeMode="tail"` to the email Text (this is a discretion area per CONTEXT.md — recommended to add it).

### Pitfall 5: Constants.expoConfig?.version in Development
**What goes wrong:** In development builds, `Constants.expoConfig?.version` reads from `app.config.ts` — currently `"1.0.0"`. The CONTEXT.md specifies `"Campfire v1.2.0"`.
**Why it happens:** The version string in `app.config.ts` is `"1.0.0"`, not `"1.2.0"`. If the planner hardcodes `v1.2.0`, it diverges from the config.
**How to avoid:** Use `Constants.expoConfig?.version` dynamically — the displayed version will be whatever `app.config.ts` declares. If `v1.2.0` is desired, the executor should update `version` in `app.config.ts` as part of this phase, or document that the display reflects current config value. Either approach is valid; document the choice clearly.

---

## Code Examples

### Remove: FRIENDS block (lines 141–204 in profile.tsx)
Lines to delete:
- Line 141: `{/* Friends section */}`
- Lines 142–203: All JSX from `<Text style={styles.sectionHeader}>FRIENDS</Text>` through the closing `</TouchableOpacity>` of the QR Code row's current position

### Extend fetchProfile query
```typescript
// Before:
.select('display_name, avatar_url')

// After:
.select('display_name, avatar_url, username, created_at')
```

### Remove from useFocusEffect dep array
```typescript
// Before:
useFocusEffect(
  useCallback(() => {
    fetchFriends();
    fetchProfile();
    loadNotificationsEnabled();
  }, [fetchFriends])
);

// After:
useFocusEffect(
  useCallback(() => {
    fetchProfile();
    loadNotificationsEnabled();
  }, [])
);
```

### ACCOUNT section JSX
```typescript
{/* ACCOUNT section */}
<Text style={styles.sectionHeader}>ACCOUNT</Text>

<View style={styles.row}>
  <Ionicons
    name="mail-outline"
    size={FONT_SIZE.xl}
    color={COLORS.text.secondary}
    style={styles.rowIcon}
  />
  <Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">
    {session?.user?.email ?? ''}
  </Text>
</View>

<View style={styles.row}>
  <Ionicons
    name="calendar-outline"
    size={FONT_SIZE.xl}
    color={COLORS.text.secondary}
    style={styles.rowIcon}
  />
  <Text style={styles.rowLabel}>
    {profile?.created_at ? formatMemberSince(profile.created_at) : ''}
  </Text>
</View>
```

### QR Code row (relocated, standalone)
```typescript
{/* QR Code — standalone row between YOUR STATUS and ACCOUNT */}
<TouchableOpacity
  style={styles.row}
  onPress={() => router.push('/qr-code' as never)}
  activeOpacity={0.7}
>
  <Ionicons
    name="qr-code-outline"
    size={FONT_SIZE.xl}
    color={COLORS.text.secondary}
    style={styles.rowIcon}
  />
  <Text style={styles.rowLabel}>My QR Code</Text>
  <View style={styles.rowRight}>
    <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
  </View>
</TouchableOpacity>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Friends management from Profile tab | Friends in Squad tab (Phase 10) | Profile is now purely self-focused |
| NOTIFICATIONS section | SETTINGS section | More extensible name for future settings additions |

**Confirmed not changed:**
- `_layout.tsx` Profile tab: no `tabBarBadge` — already done in Phase 10. PROF-03 is satisfied with zero code changes.

---

## Open Questions

1. **App version string vs. config version**
   - What we know: `app.config.ts` currently has `version: '1.0.0'`; CONTEXT.md mentions `v1.2.0`
   - What's unclear: Should this phase bump the version in `app.config.ts` to `1.2.0`?
   - Recommendation: Update `app.config.ts` version to `'1.2.0'` in this phase since it's the v1.2 milestone capstone — makes the version text accurate. Include it as a task step.

2. **QR Code row visual separation**
   - What we know: CONTEXT.md says "No section header needed — single row stands alone, OR use a subtle separator"
   - What's unclear: Whether the existing `sectionHeader` marginTop (SPACING.xl) on the row above provides enough visual separation
   - Recommendation: Keep current row style with existing top margin from adjacent section — no new separator needed. The `marginTop: SPACING.xl` on the sectionHeader above naturally creates separation.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npx playwright test --grep "profile screen"` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | Profile tab no longer shows friend list section | visual regression | `npx playwright test --grep "profile screen" --update-snapshots` | ✅ `tests/visual/design-system.spec.ts` |
| PROF-02 | Profile tab no longer shows friend requests row | visual regression | `npx playwright test --grep "profile screen" --update-snapshots` | ✅ same spec |
| PROF-03 | Profile tab no longer shows pending badge on tab icon | visual regression | `npx playwright test --grep "profile screen" --update-snapshots` | ✅ same spec — tab bar visible in screenshot |

**Note on PROF-03:** The profile-screen snapshot captures the full screen including the tab bar at the bottom. A badge on the Profile tab icon would appear in the snapshot. Since no badge was added in `_layout.tsx`, the existing baseline already has no badge — regenerating after this phase will confirm.

### Sampling Rate
- **Per task commit:** `npx playwright test --grep "profile screen"` (single test, ~15s)
- **Per wave merge:** `npx playwright test` (all 7 tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. The profile screen test at line 76–82 of `design-system.spec.ts` navigates to Profile and takes a full-screen snapshot. After implementation, run with `--update-snapshots` to regenerate the baseline.

---

## Sources

### Primary (HIGH confidence)
- Direct read of `src/app/(tabs)/profile.tsx` — full current implementation, lines 1–336
- Direct read of `src/app/(tabs)/_layout.tsx` — confirmed Profile tab has no tabBarBadge
- Direct read of `src/stores/useAuthStore.ts` — confirmed `session.user.email` available
- Direct read of `src/hooks/usePushNotifications.ts` — confirmed `import Constants from 'expo-constants'` pattern
- Direct read of `src/theme/colors.ts`, `spacing.ts`, `typography.ts` — all token values
- Direct read of `app.config.ts` — confirmed version is `"1.0.0"`
- Direct read of `tests/visual/design-system.spec.ts` — confirmed profile screen test exists
- Direct read of `.planning/config.json` — nyquist_validation: true

### Secondary (MEDIUM confidence)
- `expo-constants` API for `Constants.expoConfig?.version` — inferred from existing usage in `usePushNotifications.ts` where `Constants.expoConfig` is already accessed; pattern is consistent with Expo SDK 55 documentation patterns

### Tertiary (LOW confidence — not needed for this phase)
None. All research grounded in direct file inspection.

---

## Metadata

**Confidence breakdown:**
- Removal scope: HIGH — exact line ranges identified from direct file read
- New sections (ACCOUNT, @username, version): HIGH — all data sources confirmed in-project, no new libraries
- QR Code relocation: HIGH — existing row JSX confirmed, just moves position
- PROF-03 (badge): HIGH — _layout.tsx confirmed to have no tabBarBadge on Profile tab
- Playwright test coverage: HIGH — test file read directly, profile screen test confirmed

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable stack, no fast-moving dependencies)
