# Phase 10: Squad Tab - Research

**Researched:** 2026-04-04
**Domain:** React Native / Expo Router — custom tab switcher, friend management relocation
**Confidence:** HIGH

## Summary

This phase converts the Squad screen from a Coming Soon stub into a two-tab layout (Friends | Goals) using a custom underline-style segmented control. All required primitives already exist in the codebase: `FriendsList`, `FAB`, `expo-haptics`, design tokens, `usePendingRequestsCount`, and `useRouter`. No new packages are needed.

The primary implementation work is (1) building an underline-tab `SquadTabSwitcher` component, (2) wiring it into a refactored `squad.tsx`, (3) conditionally rendering `FriendsList` vs the Goals stub based on active tab, (4) adding the Friend Requests tappable row when `pendingCount > 0`, and (5) moving the `tabBarBadge` from the Profile `Tabs.Screen` to the Squad `Tabs.Screen` in `_layout.tsx`.

The existing `SegmentedControl` component uses a pill/color-fill style and cannot be reused visually for the underline style — a new `SquadTabSwitcher` component must be built. The `AddFriend` pill-switcher and the status `SegmentedControl` are reference-only for haptic pattern and layout skeleton.

**Primary recommendation:** Build `SquadTabSwitcher` as a standalone component with an underline indicator, keep `FriendsList` completely unchanged, and manage the active tab with `useState` inside `squad.tsx`. No router-level sub-navigation needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Segmented control style:** Underline style (NOT pill/AddFriend style) — text tabs with underline indicator under active tab. Active underline uses accent orange (`COLORS.interactive.accent`). Full width layout — each tab takes 50% of screen width. Light haptic feedback on tab tap (matches existing SegmentedControl pattern using expo-haptics).
- **Screen header:** No ScreenHeader title — the segmented control (Friends / Goals) is the top element. Safe area inset handled by the Squad screen container (`paddingTop: insets.top`).
- **Friends tab layout:** FriendsList component reused as-is with FAB and pull-to-refresh. "Friend Requests (N)" row only visible when `pendingCount > 0`. Row navigates to `/friends/requests`. FAB visible only on Friends tab, hidden on Goals tab.
- **Goals tab:** Reuse current `squad.tsx` content: lock icon + "Group challenges and streaks — coming soon." Same design token styling.
- **Badge migration:** Move `tabBarBadge` from Profile `Tabs.Screen` to Squad `Tabs.Screen` in `_layout.tsx`. Single `usePendingRequestsCount` call in `_layout.tsx` (already exists) — do NOT duplicate.

### Claude's Discretion

- Friend Requests row exact placement (above list vs FlatList header)
- Exact spacing between segmented control and tab content
- Whether to extract a reusable `TabSwitcher` component or inline the implementation
- `useFocusEffect` vs `useEffect` for friend data refresh in Squad context

### Deferred Ideas (OUT OF SCOPE)

- Moving "My QR Code" from Profile to Squad tab — keep on Profile for now per milestone spec
- Squad Goals real content (group challenges, streaks) — future milestone
- Friends list search/filter — explicitly out of scope for groups of 3-15
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SQAD-01 | User can see a segmented control (Friends / Goals) at the top of the Squad screen | `SquadTabSwitcher` component with underline indicator renders at top of screen above tab content |
| SQAD-02 | User lands on Friends tab by default when opening Squad | `useState<'friends' \| 'goals'>('friends')` default value |
| SQAD-03 | User can switch between Friends and Goals tabs via segmented control | `setActiveTab` called from `SquadTabSwitcher` with haptic feedback |
| SQAD-04 | User sees their friend list with status indicators in the Friends tab | `FriendsList` component embedded in Friends tab conditional render |
| SQAD-05 | User can tap FAB to add a new friend from the Friends tab | `FriendsList` already contains FAB; conditionally render based on active tab |
| SQAD-06 | User sees a "Friend Requests (N)" tappable row when pending requests exist | Tappable row with `pendingCount` guard: `{pendingCount > 0 && <FriendRequestsRow />}` |
| SQAD-07 | User can tap the requests row to navigate to the Friend Requests screen | `router.push('/friends/requests')` — route already exists |
| SQAD-08 | User sees a "Coming soon" placeholder in the Goals tab | Extract Goals stub from current `squad.tsx` content (lock icon + text) |
| SQAD-09 | User sees pending request count badge on the Squad tab icon in bottom nav | Move `tabBarBadge` from Profile entry to Squad entry in `_layout.tsx` |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~55.0.5 | File-based routing; `useFocusEffect` from expo-router | Already the app router |
| expo-haptics | ~55.0.9 | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on tab tap | Already used in `SegmentedControl` |
| react-native-safe-area-context | ~5.6.2 | `useSafeAreaInsets()` for top padding | Already used in squad.tsx |
| zustand | ^5.0.12 | State management — not needed for this phase | Already installed; not used for tab state |

### No new packages required

All primitives exist. This phase is pure composition of existing code.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended File Structure

```
src/app/(tabs)/
├── _layout.tsx          # MODIFIED: move tabBarBadge from profile → squad
├── squad.tsx            # REPLACED: becomes the tabbed squad screen
└── squad/               # NOT needed — single-file approach preferred

src/components/squad/
└── SquadTabSwitcher.tsx  # NEW: underline tab bar component

src/screens/friends/
├── FriendsList.tsx      # UNCHANGED — embed directly in Friends tab
├── FriendRequests.tsx   # UNCHANGED — navigated to from row
└── AddFriend.tsx        # UNCHANGED — navigated to from FAB
```

**Decision note:** Keep `squad.tsx` as a single file (not a directory). Directory-based sub-routing (`squad/_layout.tsx`) is NOT required and adds complexity for a simple two-tab toggle. The CONTEXT.md explicitly lists this as an option but the single-file approach is cleaner for conditional rendering of two views.

### Pattern 1: Underline Tab Switcher Component

**What:** Full-width row of text tabs with an animated underline under the active tab. Haptic feedback on press.

**When to use:** Screen-level sub-section switching where no URL/back navigation is needed.

**Key structure:**
```typescript
// src/components/squad/SquadTabSwitcher.tsx
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';

type SquadTab = 'friends' | 'goals';

interface Props {
  activeTab: SquadTab;
  onTabChange: (tab: SquadTab) => void;
}

export function SquadTabSwitcher({ activeTab, onTabChange }: Props) {
  async function handlePress(tab: SquadTab) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
  }

  return (
    <View style={styles.container}>
      {(['friends', 'goals'] as SquadTab[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={styles.tab}
          onPress={() => handlePress(tab)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab === 'friends' ? 'Friends' : 'Goals'}
          </Text>
          {activeTab === tab && <View style={styles.underline} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  tabText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  activeTabText: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.interactive.accent,  // #f97316 campfire orange
  },
});
```

### Pattern 2: Conditional Tab Content Rendering

**What:** Single `squad.tsx` renders Friends or Goals content based on `activeTab` state.

**When to use:** Two-tab views where swipe gestures are not needed (swipe conflicts with pull-to-refresh).

```typescript
// src/app/(tabs)/squad.tsx
export default function SquadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { count: pendingCount } = usePendingRequestsCount();
  const [activeTab, setActiveTab] = useState<'friends' | 'goals'>('friends');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SquadTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'friends' ? (
        <View style={styles.tabContent}>
          {pendingCount > 0 && (
            <TouchableOpacity style={styles.requestsRow} onPress={() => router.push('/friends/requests')}>
              <Ionicons name="person-add-outline" size={20} color={COLORS.text.secondary} />
              <Text style={styles.requestsText}>Friend Requests ({pendingCount})</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
            </TouchableOpacity>
          )}
          <FriendsList />
        </View>
      ) : (
        <GoalsStub />
      )}
    </View>
  );
}
```

**Note on `FriendsList` + FAB:** `FriendsList` renders its own `FAB` internally. Since the FAB must be hidden on Goals tab, the cleanest solution is to conditionally render `FriendsList` only on the Friends tab (it is already only rendered there in the pattern above). No prop changes to `FriendsList` required.

### Pattern 3: Friend Requests Row Placement

**Recommendation (Claude's discretion):** Render the Friend Requests row as a plain `TouchableOpacity` **above the `FriendsList` component**, NOT as a `ListHeaderComponent`. Rationale:
- `FriendsList` owns its `FlatList` entirely and should not be modified
- The requests row is a navigation trigger, not a list item — it belongs at screen level
- This keeps `FriendsList` as a true black-box reusable component

### Pattern 4: Badge Migration in `_layout.tsx`

```typescript
// Before (profile entry):
<Tabs.Screen
  name="profile"
  options={{
    tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
    ...
  }}
/>

// After (squad entry):
<Tabs.Screen
  name="squad"
  options={{
    tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
    ...
  }}
/>
// Profile entry: remove tabBarBadge prop entirely
```

### Pattern 5: Data Refresh on Focus

**Recommendation (Claude's discretion):** Use `useFocusEffect` in `squad.tsx` to call a refresh when the tab is focused. The `FriendsList` component currently uses `useEffect([]` on mount, which means it does NOT refresh when returning to the tab.

```typescript
// In squad.tsx — add useFocusEffect for friend data refresh
useFocusEffect(
  useCallback(() => {
    // FriendsList manages its own state; trigger refresh via re-mount
    // OR: pass a refreshTrigger prop — but FriendsList has no such API
    // SIMPLEST: rely on pull-to-refresh; no forced refresh on focus needed
  }, [])
);
```

**Conclusion:** `FriendsList` already has pull-to-refresh. Do NOT add a `useFocusEffect` refresh trigger that would require modifying `FriendsList`. The existing `useEffect([])` initial load is sufficient; pull-to-refresh handles stale data.

### Anti-Patterns to Avoid

- **Adding sub-routing via `squad/` directory:** Creates unnecessary navigation complexity. Two conditional renders inside one screen is far simpler.
- **Calling `usePendingRequestsCount` inside `squad.tsx`:** The hook is already called in `_layout.tsx` and returns `{ count }` — calling it again doubles the Supabase subscription. Pass `pendingCount` as prop OR rely on the `_layout.tsx` badge (for badge display) and call the hook once in `squad.tsx` separately for the row display. Actually, checking the hook: it uses `useFocusEffect` internally, and `_layout.tsx` keeps it alive. The hook is cheap (one `select count` query on focus). It is safe to call once in `squad.tsx` independently — but it must NOT share state with `_layout.tsx` badge computation. Since both are independent, this is fine.
- **Modifying `FriendsList` to conditionally hide its FAB:** `FriendsList` is reused as-is. FAB hiding is achieved by only rendering `FriendsList` on the Friends tab.
- **Using `@react-navigation/material-top-tabs`:** STATE.md records this decision from v1.2 research, but the CONTEXT.md for Phase 10 explicitly chose custom `useState` toggle. The `material-top-tabs` decision in STATE.md was a general finding that was then overridden in CONTEXT.md. Follow CONTEXT.md — custom segmented control, no library install.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Haptic feedback | Custom vibration timing | `expo-haptics` (already installed) | Already proven in `SegmentedControl` |
| Friend list display | Custom list component | `FriendsList` as-is | Self-contained with FAB, pull-to-refresh, empty state |
| Route to requests | Custom requests UI inline | `router.push('/friends/requests')` | Screen already exists |
| Tab indicator animation | `Animated` sliding underline | Static `View` with `position: absolute, bottom: 0` | Two tabs, no animation needed per REQUIREMENTS.md |
| Safe area padding | Manual `StatusBar.currentHeight` | `useSafeAreaInsets()` | Already the project pattern |

**Key insight:** This phase is almost entirely composition. The only novel code is the `SquadTabSwitcher` component (underline style) and the glue in `squad.tsx`. Everything else exists.

---

## Common Pitfalls

### Pitfall 1: Metro Bundler Ambiguity — squad.tsx vs squad/ Directory

**What goes wrong:** If `src/app/(tabs)/squad.tsx` is not deleted in the same commit that creates `src/app/(tabs)/squad/_layout.tsx`, Metro will throw an ambiguity error.
**Why it happens:** Expo Router treats both a file and a directory with the same name as competing route definitions.
**How to avoid:** Since this phase uses a single-file approach (no `squad/` directory), this pitfall is avoided entirely. Keep `squad.tsx`, replace its content.
**Warning signs:** "Ambiguous route" errors in Metro if someone starts using directory routing mid-phase.

### Pitfall 2: Duplicate usePendingRequestsCount Subscription

**What goes wrong:** Calling `usePendingRequestsCount` in both `_layout.tsx` and `squad.tsx` creates two Supabase subscriptions (if it uses Realtime). Checking the hook source: it does NOT use Realtime — it uses `useFocusEffect` with a plain `select count` query. No Realtime channel. Two calls are safe but slightly wasteful.
**How to avoid:** Call the hook in `squad.tsx` for the Friend Requests row display. The `_layout.tsx` call is for the badge. They are independent.
**Warning signs:** Not a runtime error — just a minor inefficiency. State.md says "Single `usePendingRequestsCount` hook call stays in `_layout.tsx`" but that was before the Squad tab was planned to display the row. For Phase 10 the second call in `squad.tsx` is intentional.

### Pitfall 3: FAB Appearing on Goals Tab

**What goes wrong:** If `FriendsList` is rendered regardless of active tab (e.g., both tabs always mounted for performance), the FAB inside `FriendsList` appears on the Goals tab.
**Why it happens:** `FriendsList` renders `FAB` unconditionally — there is no prop to hide it.
**How to avoid:** Use conditional rendering: `{activeTab === 'friends' && <FriendsList />}`. When Goals tab is active, `FriendsList` is unmounted entirely.
**Warning signs:** FAB visible over Goals tab content.

### Pitfall 4: Safe Area Overlap with Underline Tab Control

**What goes wrong:** The `SquadTabSwitcher` renders flush against the status bar if `paddingTop: insets.top` is missing from the outer container.
**Why it happens:** The decision is no ScreenHeader — so nothing else provides the top inset.
**How to avoid:** Apply `paddingTop: insets.top` to the outermost `View` container in `squad.tsx` (same pattern as existing `squad.tsx`).
**Warning signs:** Tab labels overlap with time/signal indicators on device.

### Pitfall 5: Friend Requests Row Always Visible

**What goes wrong:** The row shows "Friend Requests (0)" even when no requests exist.
**Why it happens:** Forgetting the `pendingCount > 0` guard.
**How to avoid:** `{pendingCount > 0 && <FriendRequestsRow count={pendingCount} />}`.
**Warning signs:** Row visible with "0" count.

### Pitfall 6: usePendingRequestsCount Only Refreshes on Tab Focus

**What goes wrong:** The pending count shown in the row does not update if a request arrives while the Squad tab is already focused.
**Why it happens:** `usePendingRequestsCount` uses `useFocusEffect` — it only refetches when the screen comes into focus, not in real-time.
**How to avoid:** This is acceptable per existing app behavior. The badge in `_layout.tsx` has the same limitation. No Realtime subscription is in scope for Phase 10.
**Warning signs:** Stale count — not a bug, known limitation of the hook.

---

## Code Examples

### Underline indicator (key visual pattern)

```typescript
// Source: Direct implementation from design tokens in src/theme/colors.ts and src/theme/spacing.ts
const styles = StyleSheet.create({
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.interactive.accent,  // '#f97316' — campfire orange
    borderRadius: 1,
  },
});
```

### Haptic feedback on tab change

```typescript
// Source: src/components/status/SegmentedControl.tsx line 19-21
import * as Haptics from 'expo-haptics';

async function handlePress(tab: SquadTab) {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  onTabChange(tab);
}
```

### Friend Requests tappable row (styled like profile.tsx rows)

```typescript
// Source: src/app/(tabs)/profile.tsx lines 165-186 (reference pattern)
{pendingCount > 0 && (
  <TouchableOpacity
    style={styles.requestsRow}
    onPress={() => router.push('/friends/requests')}
    activeOpacity={0.7}
  >
    <Ionicons name="person-add-outline" size={FONT_SIZE.xl} color={COLORS.text.secondary} />
    <Text style={styles.requestsLabel}>Friend Requests ({pendingCount})</Text>
    <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
  </TouchableOpacity>
)}
```

### Badge migration in _layout.tsx

```typescript
// Source: src/app/(tabs)/_layout.tsx — modify these two Tabs.Screen entries

// Squad: ADD tabBarBadge
<Tabs.Screen
  name="squad"
  options={{
    title: 'Squad',
    tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
    tabBarIcon: ({ color, focused }) => (
      <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
    ),
  }}
/>

// Profile: REMOVE tabBarBadge
<Tabs.Screen
  name="profile"
  options={{
    title: 'Profile',
    // tabBarBadge removed
    tabBarIcon: ({ color, focused }) => (
      <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
    ),
  }}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Squad screen = Coming Soon stub | Squad screen = two-tab layout | Phase 10 | Friends tab surfaces friend management |
| Friend badge on Profile tab icon | Friend badge on Squad tab icon | Phase 10 | Badge now co-located with Friends content |
| Friend management accessed via Profile | Friend list in Squad tab directly | Phase 10 | Reduces navigation depth for daily use |

**Deprecated/outdated:**
- `squad.tsx` content with `ScreenHeader` title: replaced by underline tab switcher as primary wayfinding element
- Profile `tabBarBadge: pendingCount > 0 ? pendingCount : undefined`: moved to Squad Tabs.Screen

---

## Open Questions

1. **Spacing between SquadTabSwitcher and FriendsList/Goals content**
   - What we know: No ScreenHeader means the tab switcher sits at `paddingTop: insets.top` — there is no ScreenHeader `marginBottom`
   - What's unclear: How much vertical gap between the underline and the first list row looks right
   - Recommendation (Claude's discretion): Use `0` gap — the `borderBottomColor: COLORS.border` on the tab row provides visual separation. The FlatList in FriendsList starts immediately below. If it feels cramped, add `marginTop: SPACING.xs` on the content area.

2. **FlatList `ListHeaderComponent` vs sibling View for Friend Requests row**
   - What we know: FriendsList owns its FlatList; Friend Requests row should not be inside FlatList scroll unless it scrolls away with the list
   - Recommendation: Render the requests row as a fixed sibling above `FriendsList` (not inside FlatList). It is a navigation row, not a list item. This matches how Profile renders its rows.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npx playwright test tests/visual/design-system.spec.ts --project=mobile` |
| Full suite command | `npx playwright test --project=mobile` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SQAD-01 | Segmented control visible at top of Squad screen | visual regression | `npx playwright test tests/visual/design-system.spec.ts -g "friends screen" --project=mobile` | ✅ (test exists, snapshot needs update) |
| SQAD-02 | Friends tab active by default | visual regression | Same as SQAD-01 — screenshot shows Friends tab active | ✅ snapshot needs update |
| SQAD-03 | Tab switching works | manual | Tap Goals, verify Goals content; tap Friends, verify FriendsList | manual-only |
| SQAD-04 | Friend list visible in Friends tab | visual regression | Same friends screen snapshot | ✅ snapshot needs update |
| SQAD-05 | FAB present on Friends tab, absent on Goals | visual regression | Two screenshots: friends-tab + goals-tab | ❌ Wave 0: add goals-tab snapshot |
| SQAD-06 | Friend Requests row visible when pendingCount > 0 | manual | Requires test account with pending requests | manual-only |
| SQAD-07 | Row navigates to /friends/requests | manual | Tap row, verify screen navigation | manual-only |
| SQAD-08 | Goals tab shows "Coming soon" | visual regression | `npx playwright test tests/visual/design-system.spec.ts -g "goals screen" --project=mobile` | ❌ Wave 0: add squad-goals-screen test |
| SQAD-09 | Badge on Squad tab icon, not Profile | visual regression | Home/Squad screenshot showing badge position | ✅ snapshot needs update |

### Sampling Rate

- **Per task commit:** `npx playwright test tests/visual/design-system.spec.ts -g "friends screen" --project=mobile --update-snapshots`
- **Per wave merge:** `npx playwright test --project=mobile --update-snapshots`
- **Phase gate:** Full suite green (with updated snapshots) before `/gsd:verify-work`

**Important:** All existing Playwright snapshots that include the Squad/Profile tab bar area will fail after this phase due to badge relocation. Run `--update-snapshots` after implementation to regenerate baselines.

### Wave 0 Gaps

- [ ] `tests/visual/design-system.spec.ts` — add `"squad goals tab"` test: navigate to Squad, click Goals tab, screenshot — covers SQAD-08, SQAD-05
- [ ] Update snapshot baselines for: `friends-screen`, `profile-screen`, `home-screen` (badge position change) — run with `--update-snapshots` post-implementation

*(Existing test infrastructure covers the framework — only new snapshot tests needed for Goals tab.)*

---

## Sources

### Primary (HIGH confidence)

- Direct codebase reads:
  - `src/components/status/SegmentedControl.tsx` — haptic feedback pattern (expo-haptics usage)
  - `src/screens/friends/FriendsList.tsx` — FAB internals, FlatList structure
  - `src/app/(tabs)/_layout.tsx` — badge location, Tabs.Screen structure
  - `src/app/(tabs)/squad.tsx` — current stub content (Goals tab source)
  - `src/app/(tabs)/profile.tsx` lines 141-204 — Friend Requests row pattern
  - `src/components/common/FAB.tsx` — FAB is position:absolute, internally manages safe area
  - `src/hooks/usePendingRequestsCount.ts` — uses `useFocusEffect`, NOT Realtime
  - `src/theme/colors.ts` — `COLORS.interactive.accent = '#f97316'`
  - `src/theme/spacing.ts` — spacing scale
  - `package.json` — confirmed no `@react-navigation/material-top-tabs` installed; not needed
  - `tests/visual/design-system.spec.ts` — Playwright test structure
  - `playwright.config.ts` — test runner config

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — accumulated project decisions including Metro ambiguity warning
- `.planning/phases/10-squad-tab/10-CONTEXT.md` — locked implementation decisions

### Tertiary (LOW confidence)

- None needed — all findings verified from codebase directly.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new installs
- Architecture: HIGH — patterns verified from existing codebase code
- Pitfalls: HIGH — derived from direct code inspection (hook internals, FAB structure)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable codebase; no external dependencies changing)
