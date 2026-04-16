# Phase 10: Squad Dashboard - Research

**Researched:** 2026-04-14
**Domain:** React Native FlatList architecture, entrance animations, compact friend list UI
**Confidence:** HIGH

> NOTE: This file replaces the outdated v1.2 CONTEXT.md-era research. The old CONTEXT.md
> described a tab-switcher design (underline Friends/Goals tabs). That design was shipped
> in v1.2. Phase 10 in v1.4 is a new goal: replace that tab switcher with a single
> scrollable dashboard. See ROADMAP.md Phase 10 for the authoritative definition.

## Summary

Phase 10 converts the Squad screen from a two-tab (Friends/Goals) layout into a single scrollable
dashboard. The tab switcher is removed entirely. A compact friends section sits at the top;
the three pre-built feature cards (StreakCard, IOUCard, BirthdayCard) follow below.

All three feature cards already exist and are verified. The hooks (`useStreakData`,
`useIOUSummary`, `useUpcomingBirthdays`, `useFriends`) are already called in squad.tsx. The
structural work is: (1) replace the ScrollView + tab split with a single outer FlatList whose
`data` array drives the friends list, (2) move the feature cards into `ListFooterComponent`,
(3) wire entrance animations that fire only on first mount, and (4) decide where the Friend
Requests row and the ScreenHeader "+" button go.

The biggest technical constraint in this phase is the **nested-FlatList prohibition** (confirmed
locked decision in STATE.md): the compact friends section CANNOT embed another FlatList or
ScrollView. It must render friends as a flat sequence inside the outer FlatList's `data` prop.

**Primary recommendation:** Use the outer FlatList's `data` array for friend rows directly (with
a `ListHeaderComponent` section header and `ListFooterComponent` holding the three feature
cards). Entrance animations use `Animated.timing` (the existing app animation API) with a
staggered `useRef` flag to suppress replay on pull-to-refresh.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | User sees Squad tab as a scrollable dashboard with friends list at top and feature cards below | Single FlatList architecture — friends in `data`, cards in `ListFooterComponent` |
| DASH-02 | Each feature card shows a glanceable summary (e.g. "2 unsettled", "birthday in 3 days") | All three cards already implement this; no card changes needed beyond wiring |
| DASH-03 | Dashboard cards animate in with smooth entrance transitions on load | `Animated.timing` opacity+translateY stagger; `useRef` flag guards first-mount-only |
| DASH-04 | Existing Streaks card is preserved and displayed on the dashboard | StreakCard is unchanged; it already lives in squad.tsx; relocation only |
</phase_requirements>

---

## Standard Stack

### Core (already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native `Animated` | built-in | Entrance animations (opacity + translateY) | Already used in FAB, StatusPickerSheet, HomeScreen crossfade; `useNativeDriver: true` capable |
| expo-haptics | ~55.0.9 | Light haptic on interactive elements (optional) | Already used in SquadTabSwitcher; available |
| react-native `FlatList` | built-in | Single outer scroll + friends list | Project mandate: FlatList for all list views |
| `useFriends` hook | internal | Friend data for compact list section | Already called in squad.tsx; returns `FriendWithStatus[]` |
| `AvatarCircle` | internal | Friend avatars in compact row | Already used in BirthdayCard; size prop controls dimensions |
| `FriendActionSheet` | internal | Action sheet on compact friend row tap | Already used in FriendsList; self-contained with DM/remove/profile |

[VERIFIED: codebase] `react-native-reanimated` 4.2.1 is installed but the project does NOT use
it for UI transitions — all existing transitions use `Animated` from react-native. STATE.md
records that Reanimated v4 caused issues with @gorhom/bottom-sheet. Do not introduce Reanimated
for Phase 10 animations.

**Installation:** No new packages required. [VERIFIED: STATE.md — "Zero new npm dependencies required"]

---

## Architecture Patterns

### Recommended Project Structure

No new directories are needed. One new component file if compact friend rows have non-trivial
rendering logic:

```
src/
├── app/(tabs)/squad.tsx            # REPLACED — new dashboard layout
└── components/squad/
    ├── SquadTabSwitcher.tsx        # DELETE (no longer referenced anywhere)
    └── CompactFriendRow.tsx        # NEW (optional extract)
```

### Pattern 1: Single FlatList — Friends in data, Cards in Footer

**What:** The outer FlatList's `data` prop receives the friends array directly. Each friend
renders as a compact row via `renderItem`. The three feature cards live in
`ListFooterComponent`.

**When to use:** Always — this is the only safe scroll architecture in this project. FlatList
inside ScrollView is broken on Android (STATE.md locked decision).

**Why cards go in ListFooterComponent (not ListHeaderComponent):** `ListFooterComponent` renders
after all items, which is correct for "friends at top, cards below". `ListHeaderComponent` is
used for the section label row (e.g. "Friends" heading + optional Friend Requests row).

```typescript
// Source: verified from PlansListScreen.tsx and ChatListScreen.tsx patterns in codebase
<FlatList<FriendWithStatus>
  data={friends}
  keyExtractor={(item) => item.friend_id}
  renderItem={({ item }) => (
    <CompactFriendRow
      friend={item}
      onPress={() => { setSelectedFriend(item); setSheetVisible(true); }}
    />
  )}
  ItemSeparatorComponent={() => <View style={styles.separator} />}
  ListHeaderComponent={<FriendsHeader pendingCount={pendingCount} />}
  ListFooterComponent={
    <View style={styles.cardsSection}>
      <AnimatedCard anim={cardAnims[0]}><StreakCard streak={streak} /></AnimatedCard>
      <AnimatedCard anim={cardAnims[1]}><IOUCard summary={iouSummary} /></AnimatedCard>
      <AnimatedCard anim={cardAnims[2]}><BirthdayCard birthdays={birthdays} /></AnimatedCard>
      <View style={{ height: SPACING.xxl + insets.bottom }} />
    </View>
  }
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={COLORS.interactive.accent}
    />
  }
  contentContainerStyle={styles.listContent}
/>
```

[VERIFIED: codebase] PlansListScreen.tsx lines 130-170 and ChatListScreen.tsx lines 36-63
use this exact ListHeaderComponent + FlatList pattern.

### Pattern 2: Compact Friend Row

**What:** A lightweight row component that renders avatar + display name only (no username, no
StatusPill needed for dashboard density). Minimum height 56px for touch target compliance.

**Key data:** `FriendWithStatus` has `friend_id`, `display_name`, `avatar_url`.
`AvatarCircle` size={36} fits the compact row. Pressing opens `FriendActionSheet` (same as
FriendsList — reuse that pattern for DM/view profile/remove friend).

Do NOT reuse `FriendCard` directly — it renders username + StatusPill which is too verbose for
a compact dashboard list.

```typescript
// Source: pattern derived from FriendCard.tsx + AvatarCircle.tsx in codebase
function CompactFriendRow({
  friend,
  onPress,
}: {
  friend: FriendWithStatus;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.compactRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={friend.display_name}
    >
      <AvatarCircle
        size={36}
        imageUri={friend.avatar_url}
        displayName={friend.display_name}
      />
      <Text style={styles.compactName} numberOfLines={1}>
        {friend.display_name}
      </Text>
      <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
    </TouchableOpacity>
  );
}
// compactRow: minHeight 56, paddingHorizontal SPACING.lg, flexDirection row, alignItems center, gap SPACING.md
```

### Pattern 3: Entrance Animation — First-Mount-Only Stagger

**What:** Each feature card fades in and slides up from ~16px below its final position. Cards
stagger by 80ms each. The animation fires only on first mount; pull-to-refresh does NOT replay it.

**Guard mechanism:** `useRef<boolean>(false)` flag (`hasAnimated`) set to true after the first
`Animated.stagger` call. The `handleRefresh` path does NOT touch `hasAnimated`.

```typescript
// Source: pattern derived from HomeScreen.tsx Animated.parallel + FAB.tsx Animated.spring
// All use react-native Animated with useNativeDriver: true and isInteraction: false
const cardAnims = useRef([
  new Animated.Value(0), // StreakCard
  new Animated.Value(0), // IOUCard
  new Animated.Value(0), // BirthdayCard
]).current;

const hasAnimated = useRef(false);

useEffect(() => {
  if (hasAnimated.current) return;
  hasAnimated.current = true;

  Animated.stagger(
    80,
    cardAnims.map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        isInteraction: false, // per STATE.md D-04: avoids blocking JS thread
      })
    )
  ).start();
}, []); // eslint-disable-line react-hooks/exhaustive-deps — intentional empty deps, fires once
```

Each card is wrapped in an `Animated.View`:
```typescript
function AnimatedCard({ anim, children }: { anim: Animated.Value; children: React.ReactNode }) {
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
```

[VERIFIED: codebase] HomeScreen.tsx uses `Animated.parallel` with `useNativeDriver: true`,
`isInteraction: false`. FAB.tsx uses `useRef(new Animated.Value(1)).current` — same stable
reference pattern. STATE.md decision: "Animated.loop requires isInteraction: false to avoid
blocking JS thread (D-04)".

### Pattern 4: Pull-to-Refresh — Multi-Hook Coordination

**What:** The outer FlatList's `refreshControl` triggers a refresh on all four data hooks
simultaneously.

**Current problem:** The current Goals tab ScrollView only passes `streak.loading` and
`streak.refetch` to RefreshControl — this is incomplete. Phase 10 must fan out to all hooks.

```typescript
// Source: synthesized from existing hook return shapes (all verified in codebase)
const [refreshing, setRefreshing] = useState(false);

async function handleRefresh() {
  setRefreshing(true);
  await Promise.all([
    streak.refetch(),
    iouSummary.refetch(),
    birthdays.refetch(),
    fetchFriends(),
  ]);
  setRefreshing(false);
  // CRITICAL: hasAnimated.current is NOT reset here — animations never replay on refresh
}
```

[VERIFIED: codebase] `useFriends` returns `fetchFriends()`; `useStreakData`, `useIOUSummary`,
and `useUpcomingBirthdays` all return `refetch()` methods.

### Pattern 5: ScreenHeader and "+" Button

**Current state:** squad.tsx renders `<ScreenHeader title="" rightAction={createExpenseButton} />`.
The empty title produces a text node that wastes layout space.

**Recommended disposition — Option A (Keep, add title):**
Keep ScreenHeader with `title="Squad"` and the "+" rightAction for create expense. The title
gives context now that the tab switcher (which named the screen) is gone. This matches
PlansListScreen and ChatListScreen which both use ScreenHeader as the primary wayfinding element.

STATE.md confirms the "+" button is a D-10 approved pattern: "ScreenHeader rightAction used for
Squad tab '+' button — D-10 approved pattern for tab screens with no Stack header."

[VERIFIED: codebase — squad.tsx lines 29-41; STATE.md D-10 note]

### Pattern 6: Friend Requests Row Placement

**Recommended:** Inside `ListHeaderComponent`, conditionally rendered when `pendingCount > 0`.
This mirrors the PlansListScreen invite-banner pattern.

```typescript
// Source: PlansListScreen.tsx lines 136-157 pattern
function FriendsHeader({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  return (
    <View>
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
    </View>
  );
}
// Existing requestsRow styles from squad.tsx can be reused verbatim
```

### Anti-Patterns to Avoid

- **Nested FlatList:** Never put a FlatList (or ScrollView with scroll enabled) inside another
  FlatList. Breaks Android scroll silently. [VERIFIED: STATE.md locked decision]
- **Reanimated for these animations:** Reanimated v4 has known issues in this project. Use
  `Animated` from react-native only. [VERIFIED: STATE.md, package.json]
- **ScrollView + map for friends:** Project mandate is FlatList for all list views.
  [VERIFIED: STATE.md code_context]
- **Replaying animation on refresh:** Setting `hasAnimated.current = false` in `handleRefresh`
  violates DASH-03. The flag must be write-once.
- **Embedding FriendsList component:** `FriendsList` has its own internal FlatList and FAB.
  Embedding it creates a nested FlatList AND duplicates the FAB. It must not be used in
  Phase 10. [VERIFIED: FriendsList.tsx lines 71-103]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar display | Custom image component | `AvatarCircle` (existing) | Handles null imageUri, initials fallback, configurable size |
| Animation stagger | Custom setTimeout delays | `Animated.stagger` (built-in) | Integrates with `useNativeDriver: true`; no extra packages |
| Pull-to-refresh | Custom gesture detection | `RefreshControl` on outer FlatList | Standard RN pattern; used on every list screen |
| Friend action sheet | Custom modal | `FriendActionSheet` (existing) | Self-contained, already wired to DM/remove/profile navigation |
| Section label | Custom Text+View styling | `SectionHeader` component (existing) | `src/components/common/SectionHeader.tsx` — design token styled |

**Key insight:** All the hard work (cards, hooks, action sheet, avatars, refresh) is already
built and verified across Phases 7-9. Phase 10 is a layout assembly and animation phase, not a
new-feature phase.

---

## Common Pitfalls

### Pitfall 1: ListFooterComponent Not Visible When data is Empty

**What goes wrong:** When the user has zero friends, FlatList renders `ListEmptyComponent` and
`ListFooterComponent` may not be visible or may render in an unexpected position.

**Why it happens:** React Native FlatList's rendering of `ListFooterComponent` when `data` is
empty can produce an empty container that looks broken, especially with an `EmptyState` message
also present.

**How to avoid:** For the dashboard context, do NOT use `ListEmptyComponent`. When friends list
is empty, show an inline prompt inside `ListHeaderComponent` (e.g. "Add friends to see their
status"). Cards always render regardless of friend count — they have their own empty states.

[ASSUMED — specific ListFooterComponent/ListEmptyComponent interaction; verify in Expo Go]

### Pitfall 2: Bottom Padding Missing — Last Card Hidden Behind Tab Bar

**What goes wrong:** BirthdayCard is flush with the bottom edge, hidden behind the tab bar.

**Why it happens:** The tab bar height is `56 + insets.bottom`. ListFooterComponent doesn't
automatically get bottom padding.

**How to avoid:** Add a spacer `<View style={{ height: SPACING.xxl + insets.bottom }} />` at
the bottom of `ListFooterComponent`. [VERIFIED: current squad.tsx already uses
`goalsScrollContent: { paddingBottom: SPACING.xxl }` — same pattern, must be extended by
`insets.bottom`]

### Pitfall 3: Animated.stagger with Array of Animated.Values

**What goes wrong:** If `cardAnims` is declared as a plain `const` inside the component body
(not via `useRef`), the array is recreated on every render, causing the animation to restart
on every re-render.

**Why it happens:** React re-renders the component on state changes (e.g. friends data loading).

**How to avoid:** Always use `useRef([...]).current` to create a stable array of
`Animated.Value` instances. The `.current` extraction makes them stable references that survive
re-renders. [VERIFIED: FAB.tsx uses `const scale = useRef(new Animated.Value(1)).current`]

### Pitfall 4: Multi-Hook RefreshControl refreshing State

**What goes wrong:** `refreshControl refreshing={streak.loading}` (current implementation) only
reflects streak loading state. If birthdays or IOUs finish first, the spinner still shows.

**Why it happens:** The current squad.tsx passes only `streak.loading` as the refreshing prop.

**How to avoid:** Use a local `const [refreshing, setRefreshing] = useState(false)` that is set
true at start of `handleRefresh` and false only after all four `Promise.all` calls resolve.

### Pitfall 5: Add-Friend FAB Disappears

**What goes wrong:** The Friends tab previously embedded `<FriendsList />` which includes a
fixed-position FAB for "Add friend". The new dashboard does not use FriendsList, so this FAB
is gone.

**How to avoid:** The ScreenHeader "+" button is for create expense. Add-friend is still
reachable via Profile > QR Code or direct navigation to `/friends/add`. The regression is
intentional for v1.4 (dashboard is for viewing squad, not managing friends). Document this
trade-off in the plan for user awareness.

[VERIFIED: FriendsList.tsx lines 99-103 — FAB navigates to /friends/add]

---

## Deletion Checklist

These items are confirmed safe to delete as part of Phase 10:

| Item | Location | Confirmed Safe |
|------|----------|----------------|
| `SquadTabSwitcher` component | `src/components/squad/SquadTabSwitcher.tsx` | Only imported in squad.tsx [VERIFIED: grep] |
| `activeTab` useState | squad.tsx line 22 | Tab state no longer needed |
| `tabContent` / `goalsScrollContent` styles | squad.tsx styles | Replaced by FlatList |
| `ScrollView` import | squad.tsx | No longer needed |
| `SquadTabSwitcher` import | squad.tsx line 8 | Component deleted |

---

## Code Examples

### Full Squad Screen Skeleton

```typescript
// Source: synthesized from squad.tsx (current), PlansListScreen.tsx, ChatListScreen.tsx
export default function SquadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { count: pendingCount } = usePendingRequestsCount();
  const { friends, fetchFriends } = useFriends();
  const [selectedFriend, setSelectedFriend] = useState<FriendWithStatus | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loadingDM, setLoadingDM] = useState(false);
  const streak = useStreakData();
  const birthdays = useUpcomingBirthdays();
  const iouSummary = useIOUSummary();

  // Entrance animation — first mount only
  const cardAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    Animated.stagger(80, cardAnims.map((anim) =>
      Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true, isInteraction: false })
    )).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([streak.refetch(), iouSummary.refetch(), birthdays.refetch(), fetchFriends()]);
    setRefreshing(false);
    // hasAnimated.current intentionally NOT reset
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Squad"
        rightAction={
          <TouchableOpacity onPress={() => router.push('/squad/expenses/create' as never)}
            accessibilityLabel="Create expense" activeOpacity={0.7}>
            <Ionicons name="add" size={FONT_SIZE.xxl} color={COLORS.interactive.accent} />
          </TouchableOpacity>
        }
      />
      <FlatList<FriendWithStatus>
        data={friends}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item }) => (
          <CompactFriendRow friend={item} onPress={() => { setSelectedFriend(item); setSheetVisible(true); }} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          pendingCount > 0 ? (
            <TouchableOpacity style={styles.requestsRow}
              onPress={() => router.push('/friends/requests')} activeOpacity={0.7}>
              <Ionicons name="person-add-outline" size={FONT_SIZE.xl} color={COLORS.text.secondary} />
              <Text style={styles.requestsLabel}>Friend Requests ({pendingCount})</Text>
              <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
            </TouchableOpacity>
          ) : null
        }
        ListFooterComponent={
          <View>
            <AnimatedCard anim={cardAnims[0]}><StreakCard streak={streak} /></AnimatedCard>
            <AnimatedCard anim={cardAnims[1]}><IOUCard summary={iouSummary} /></AnimatedCard>
            <AnimatedCard anim={cardAnims[2]}><BirthdayCard birthdays={birthdays} /></AnimatedCard>
            <View style={{ height: SPACING.xxl + insets.bottom }} />
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={COLORS.interactive.accent} />
        }
        contentContainerStyle={styles.listContent}
      />
      <FriendActionSheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); setSelectedFriend(null); }}
        friend={selectedFriend}
        onViewProfile={() => {
          if (selectedFriend) router.push(`/friends/${selectedFriend.friend_id}` as never);
          setSheetVisible(false);
        }}
        onStartDM={/* same pattern as FriendsList.tsx handleStartDM */}
        onRemoveFriend={/* same pattern as FriendsList.tsx handleRemoveFriend */}
        loadingDM={loadingDM}
      />
    </View>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tab switcher (Friends/Goals) | Single scrollable dashboard | Phase 10 (now) | Removes state management overhead; single scroll context |
| Goals tab ScrollView | Outer FlatList | Phase 10 (now) | Fixes Android nested-scroll; enables virtualization for large friend lists |
| FriendsList component embedded | Compact friend rows via renderItem | Phase 10 (now) | Eliminates nested FlatList; FAB must be handled separately |
| Only streak refresh on pull | All four hooks refreshed in parallel | Phase 10 (now) | Correct multi-data refresh behavior |

**Deprecated/outdated after Phase 10:**
- `SquadTabSwitcher` component: safe to delete, no other consumers. [VERIFIED: grep]
- `activeTab` state, `tabContent` style, `goalsScrollContent` style: all dead code post-refactor.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ListFooterComponent renders even when data is empty | Common Pitfalls #1 | Cards hidden when user has no friends; mitigated by not using ListEmptyComponent |
| A2 | Expo Router tab screens stay mounted during tab switches (hasAnimated ref persists) | Architecture Patterns #3 | Animations replay on tab switch; cosmetic only |

**If this table is empty:** All other claims were verified against the codebase or STATE.md.

---

## Open Questions

1. **Add-friend FAB replacement**
   - What we know: FriendsList's internal FAB is lost when FriendsList is not embedded
   - What's unclear: Should Phase 10 add any affordance to reach /friends/add?
   - Recommendation: Accept the regression for v1.4. The ScreenHeader "+" is already claimed
     by create-expense. Profile > QR Code path remains. Flag in plan notes.

2. **Empty friends list state**
   - What we know: Without ListEmptyComponent, an empty friends array renders nothing above
     the feature cards
   - What's unclear: Should there be a visual prompt to "Add friends" when list is empty?
   - Recommendation: Add inline empty state inside ListHeaderComponent when
     `friends.length === 0`. Keeps cards visible regardless.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. Phase 10 is a layout refactor using existing
packages only. Zero new npm dependencies confirmed by STATE.md.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test squad-dashboard.spec.ts --project=mobile` |
| Full suite command | `npx playwright test --project=mobile` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Squad tab renders single scroll: friends at top, cards below | visual/smoke | `npx playwright test squad-dashboard.spec.ts` | No — Wave 0 |
| DASH-02 | Feature cards show glanceable summaries | visual | screenshot comparison | No — Wave 0 |
| DASH-03 | Cards animate in on first load (screenshot shows non-zero opacity state) | visual | screenshot after 500ms delay | No — Wave 0 |
| DASH-04 | StreakCard present and shows streak count | visual/smoke | `npx playwright test squad-dashboard.spec.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx playwright test squad-dashboard.spec.ts --project=mobile`
- **Per wave merge:** `npx playwright test --project=mobile`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/visual/squad-dashboard.spec.ts` — covers DASH-01 through DASH-04
  (login + navigate to `/squad` + screenshot; same pattern as `iou-create-detail.spec.ts`)

---

## Security Domain

This phase has no security-relevant surface changes. It is a layout refactor:
- No new authentication flows
- No new data access beyond what existing hooks already expose
- No user input accepted (read-only dashboard)
- `FriendActionSheet` (existing, verified) handles the only interactive element

ASVS categories V2, V3, V4, V6 do not apply. V5 (input validation) not applicable — no new
user input on the dashboard screen.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/app/(tabs)/squad.tsx` — current screen implementation read directly
- Codebase: `src/components/squad/SquadTabSwitcher.tsx` — component to be deleted
- Codebase: `src/screens/friends/FriendsList.tsx` — confirms nested FlatList risk; FAB pattern
- Codebase: `src/screens/plans/PlansListScreen.tsx` — ListHeaderComponent + FlatList pattern
- Codebase: `src/screens/chat/ChatListScreen.tsx` — ListHeaderComponent + FlatList pattern
- Codebase: `src/screens/home/HomeScreen.tsx` — Animated.timing, isInteraction: false pattern
- Codebase: `src/components/common/FAB.tsx` — `useRef(Animated.Value).current` stable ref pattern
- Codebase: `src/components/squad/StreakCard.tsx`, `IOUCard.tsx`, `BirthdayCard.tsx` — props interfaces verified
- Codebase: `src/components/friends/FriendCard.tsx`, `AvatarCircle.tsx` — compact row pattern
- Codebase: `src/hooks/useFriends.ts`, `useStreakData.ts`, `useIOUSummary.ts` — refetch() interfaces
- `.planning/STATE.md` — locked decisions: nested FlatList prohibition, zero new deps, isInteraction: false (D-04), ScreenHeader rightAction D-10
- `.planning/REQUIREMENTS.md` — DASH-01 through DASH-04

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` Phase 10 — authoritative goal and success criteria

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase; no new packages
- Architecture: HIGH — FlatList patterns verified from PlansListScreen and ChatListScreen
- Animation patterns: HIGH — Animated.timing patterns verified from HomeScreen and FAB
- Pitfalls: MEDIUM — A1 and A2 are assumed (empirical verification needed); others verified

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable patterns, no external dependencies)
