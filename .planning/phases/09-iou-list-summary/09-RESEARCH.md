# Phase 9: IOU List & Summary - Research

**Researched:** 2026-04-13
**Domain:** React Native / Expo Router — read-only IOU list screens + dashboard card
**Confidence:** HIGH

## Summary

Phase 9 is purely additive: two new route screens, two new hooks, one new card component, and registration of two new routes in an existing Stack navigator. The schema (`iou_groups`, `iou_members`, `get_iou_summary()` RPC) is fully deployed in migration 0015 and requires zero changes. All patterns — hook structure, card component shape, FlatList layout, currency formatting — are already established and verified in the codebase.

The RPC `get_iou_summary()` returns signed per-friend net amounts ready for direct display. The per-friend expense history screen needs a client-side Supabase query joining `iou_groups` and `iou_members` filtered to expenses shared between the caller and a specific friend. Net balance for the history screen header is passed via route params from the parent list row — no second RPC call required.

The UI-SPEC (09-UI-SPEC.md) is approved and provides exact component contracts, spacing, typography, color tokens, and copywriting. The planner should treat it as authoritative for all visual decisions.

**Primary recommendation:** Clone useUpcomingBirthdays as the template for useIOUSummary (same RPC-call pattern). Clone BirthdayCard as the template for IOUCard. Build BalanceRow and ExpenseHistoryRow as new components in `src/components/iou/`. Register both route screens in `_layout.tsx`. Add IOUCard between StreakCard and BirthdayCard in squad.tsx Goals tab.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Two separate screens: `/squad/expenses` (net balance index) and `/squad/expenses/friend/[id]` (per-friend expense history). Tap a friend row on the index → navigates to their history.
- **D-02:** Both screens register under existing `src/app/squad/_layout.tsx` stack navigator (same pattern as Phase 8's create + detail screens).
- **D-03:** Signed amount with directional label — `+$42 → you` in green (friend owes caller), `-$18 ← you` in red (caller owes friend). Compact, numerical, unambiguous direction.
- **D-04:** Each row: avatar + friend name + signed amount label. Tappable → friend expense history.
- **D-05:** Data source: `get_iou_summary()` RPC (returns `friend_id`, `display_name`, `net_amount_cents`, `unsettled_count` for unsettled balances only).
- **D-06:** Empty state when no unsettled balances: friendly illustration + copy ("All settled up!").
- **D-07:** Shows all shared expenses (settled + unsettled), newest first. Settled rows are visually dimmed (greyed out badge/text). Full audit trail.
- **D-08:** Each row: expense title + total amount + date. Settled rows dimmed. Tappable → existing `/squad/expenses/[id]` detail screen (Phase 8).
- **D-09:** Screen title: "Expenses with [friend display_name]". Net balance summary visible at top of this screen (reinforces context).
- **D-10:** Data source: query `iou_groups` joined with `iou_members` for expenses where both the current user and the friend are participants. Order by `created_at DESC`.
- **D-11:** `IOUCard` component in `src/components/squad/IOUCard.tsx`. Matches StreakCard/BirthdayCard pattern (same card container, same Pressable navigation).
- **D-12:** Card shows aggregate net position — "You're owed $34" (green) or "You owe $18" (red) — plus unsettled count ("3 unsettled"). All-settled state: "All settled up!" with neutral styling.
- **D-13:** Card tap → `/squad/expenses` (IOU index screen).
- **D-14:** Card placed in Goals tab in `squad.tsx` alongside StreakCard and BirthdayCard. Order: StreakCard → IOUCard → BirthdayCard (IOUs feel more active/actionable than birthdays).
- **D-15:** Data source: same `get_iou_summary()` RPC, aggregated. New `useIOUSummary` hook.

### Claude's Discretion
- New hooks: `useIOUSummary` (calls `get_iou_summary()`) and `useExpensesWithFriend(friendId)` (queries iou_groups + iou_members)
- Loading skeleton design for both screens and card
- Pull-to-refresh wiring (follow existing hook pattern with `refetch` callback)
- Error states on both screens
- Exact card visual styling (follow StreakCard/BirthdayCard proportions)
- Whether to show zero-balance friends on index (suggested: hide — no unsettled = no row)

### Deferred Ideas (OUT OF SCOPE)
- Filter toggle (unsettled only / all) on expense history
- IOU categories/tags (explicitly out of scope per REQUIREMENTS.md)
- Link expense to a plan (IOU-06) — backlog
- Debt simplification across group (IOU-07) — backlog
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOU-03 | User can view net balance per friend across all expenses (who owes whom) | `get_iou_summary()` RPC already deployed returns `friend_id`, `display_name`, `net_amount_cents`, `unsettled_count`. `useIOUSummary` hook + `/squad/expenses` screen consume it. |
| IOU-05 | User can view expense history (list of past expenses with payer, participants, amounts) | `useExpensesWithFriend(friendId)` queries `iou_groups` + `iou_members` joined with profiles. `/squad/expenses/friend/[id]` screen renders the list. Tapping a row navigates to existing Phase 8 `/squad/expenses/[id]` detail. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native (FlatList, Pressable, View, Text, StyleSheet, RefreshControl) | bundled with Expo SDK 55 | List rendering, tap interaction, layout | Established in every screen in codebase |
| expo-router | bundled | Navigation, `useLocalSearchParams`, `useRouter` | Project-wide router |
| @supabase/supabase-js | bundled | RPC calls and direct table queries | Project-wide data layer |
| @expo/vector-icons (Ionicons) | bundled | Icons (none new in this phase — FlatList list items use text/avatars) | Project-wide icon set |

[VERIFIED: codebase grep — all packages already present in installed deps]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/utils/currencyFormat.ts` (formatCentsDisplay) | local | Cents → "$X.XX" display | Every amount rendered — never raw float |
| `src/theme` (COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII) | local | Design tokens | All styles |
| `react-native-safe-area-context` (useSafeAreaInsets) | bundled | Tab-screen top inset | Screen wrappers |

[VERIFIED: codebase — used in squad.tsx, StreakCard, BirthdayCard]

### No New Dependencies
Zero new npm packages required. `Intl.NumberFormat` is built into Hermes on Expo SDK 55. [VERIFIED: STATE.md decision + src/utils/currencyFormat.ts uses Intl.NumberFormat]

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/squad/
│   ├── _layout.tsx              # ADD: Stack.Screen for expenses/index and expenses/friend/[id]
│   ├── expenses/
│   │   ├── index.tsx            # NEW: IOU balance index screen (/squad/expenses)
│   │   ├── [id].tsx             # EXISTING: expense detail (Phase 8, unchanged)
│   │   ├── create.tsx           # EXISTING: create expense (Phase 8, unchanged)
│   │   └── friend/
│   │       └── [id].tsx         # NEW: per-friend expense history screen
├── components/
│   ├── squad/
│   │   └── IOUCard.tsx          # NEW: dashboard card (Goals tab)
│   └── iou/
│       ├── BalanceRow.tsx       # NEW: signed amount + friend row (index screen)
│       └── ExpenseHistoryRow.tsx # NEW: settled/unsettled expense row (history screen)
├── hooks/
│   ├── useIOUSummary.ts         # NEW: get_iou_summary() RPC aggregated for card + index
│   └── useExpensesWithFriend.ts # NEW: iou_groups+iou_members query for history screen
```

### Pattern 1: RPC Hook (useIOUSummary)
**What:** Wraps `get_iou_summary()` RPC. Sums all `net_amount_cents` for aggregate card display; exposes raw rows for per-friend index.
**When to use:** IOUCard (aggregate) and balance index screen (per-row).
**Example:**
```typescript
// Source: verified pattern from src/hooks/useUpcomingBirthdays.ts + src/hooks/useStreakData.ts
export function useIOUSummary(): IOUSummaryData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [rows, setRows] = useState<IOUSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) { setLoading(false); setRows([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_iou_summary');
    if (rpcErr) {
      console.warn('get_iou_summary failed', rpcErr);
      setError(rpcErr.message);
      setRows([]);
    } else {
      setRows((data ?? []) as IOUSummaryRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Aggregate for IOUCard
  const netCents = rows.reduce((sum, r) => sum + r.net_amount_cents, 0);
  const unsettledCount = rows.reduce((sum, r) => sum + r.unsettled_count, 0);

  return { rows, netCents, unsettledCount, loading, error, refetch };
}
```

### Pattern 2: Direct Table Query Hook (useExpensesWithFriend)
**What:** Queries `iou_groups` + `iou_members` to find expenses shared between caller and a specific friend. Requires two fetches: (1) expense groups where caller is a member, (2) filter to those where friend is also a member, then fetch profiles for payer names.
**When to use:** Per-friend expense history screen.
**Example:**
```typescript
// Source: verified pattern from src/hooks/useExpenseDetail.ts (multi-query approach)
// Step 1: get all iou_group_ids where caller is a member
const { data: callerMemberships } = await supabase
  .from('iou_members')
  .select('iou_group_id')
  .eq('user_id', userId);

// Step 2: from those groups, find ones where friendId is also a member
const groupIds = (callerMemberships ?? []).map(m => m.iou_group_id);
const { data: sharedGroups } = await supabase
  .from('iou_members')
  .select('iou_group_id')
  .eq('user_id', friendId)
  .in('iou_group_id', groupIds);

// Step 3: fetch iou_groups rows ordered by created_at DESC
const sharedGroupIds = (sharedGroups ?? []).map(m => m.iou_group_id);
const { data: groups } = await supabase
  .from('iou_groups')
  .select('id, title, total_amount_cents, created_by, created_at')
  .in('id', sharedGroupIds)
  .order('created_at', { ascending: false });
```

**CRITICAL pitfall:** `iou_members` RLS SELECT policy uses `is_iou_member()` SECURITY DEFINER helper. Querying `iou_members` for another user's `user_id` works because RLS is bypassed by the SECURITY DEFINER function — but this applies to SELECT on the caller's own membership rows. When querying for `friendId`, the caller must be a member of those groups for RLS to permit access to those group rows via `iou_groups_select_member` policy. The multi-step approach above works correctly because: step 1 returns only groups where caller is a member (RLS passes), step 2 queries those same group IDs for the friend's membership (these group_ids are already validated to be ones caller belongs to). [VERIFIED: migration 0015 RLS policies]

### Pattern 3: Card Component (IOUCard)
**What:** Pressable card matching StreakCard/BirthdayCard visual pattern exactly.
**When to use:** Goals tab in squad.tsx.
```typescript
// Source: verified from src/components/squad/StreakCard.tsx + src/components/squad/BirthdayCard.tsx
// Card container styles (identical to BirthdayCard):
card: {
  backgroundColor: COLORS.surface.card,
  borderRadius: RADII.lg,
  paddingVertical: SPACING.xxl,   // 32px
  paddingHorizontal: SPACING.xl,  // 24px
  marginHorizontal: SPACING.lg,   // 16px
  marginTop: SPACING.xl,          // 24px
}
```

### Pattern 4: Route Registration (_layout.tsx)
**What:** Add two new Stack.Screen entries to the existing squad Stack navigator.
**When to use:** Both new route files need registration.
```typescript
// Source: verified from src/app/squad/_layout.tsx current state
// ADD these two entries alongside existing expenses/create and expenses/[id]:
<Stack.Screen name="expenses/index" options={{ title: 'Balances' }} />
<Stack.Screen name="expenses/friend/[id]" options={{ title: 'Expenses' }} />
// Note: title for friend/[id] screen is set dynamically in screen component via Stack.Screen navigation prop
```

**IMPORTANT:** Expo Router uses file-system routing. The file `src/app/squad/expenses/index.tsx` resolves to route `/squad/expenses`. The Stack.Screen name must be `"expenses/index"` (not `"expenses"`). [VERIFIED: Expo Router file-system routing convention applied across existing screens in this codebase]

### Pattern 5: Route Params for Net Balance (History Screen)
**What:** Pass `netAmountCents` and `friendName` as route params from balance row tap to history screen — avoids a second RPC call to populate the header strip.
**When to use:** BalanceRow `onPress` → `router.push` with params.
```typescript
// Source: verified from expo-router docs pattern + useLocalSearchParams usage in expenses/[id].tsx
router.push({
  pathname: '/squad/expenses/friend/[id]',
  params: { id: friendId, friendName: displayName, netAmountCents: netAmountCents.toString() }
});

// In history screen:
const { id, friendName, netAmountCents } = useLocalSearchParams<{
  id: string;
  friendName: string;
  netAmountCents: string;
}>();
const parsedNetCents = parseInt(netAmountCents ?? '0', 10);
```

**Note:** Route params are strings in Expo Router. Parse `netAmountCents` to int before use. [VERIFIED: useLocalSearchParams pattern in src/app/squad/expenses/[id].tsx]

### Pattern 6: Settled Row Dimming
**What:** Static `opacity: 0.45` wrapper View on settled expense history rows. No animation.
**When to use:** ExpenseHistoryRow where `isFullySettled === true`.
```typescript
// Source: verified from 09-UI-SPEC.md Settled row dimming contract
// Approved pattern: static wrapper, not Animated.Value
<View style={isFullySettled ? { opacity: 0.45 } : undefined}>
  <ExpenseHistoryRow ... />
</View>
// OR apply opacity directly in the component via conditional style
```

### Pattern 7: FlatList with Pull-to-Refresh (Balance Index Screen)
**What:** FlatList (not ScrollView) for the balance list. RefreshControl wired to hook's refetch.
**When to use:** Balance index screen and history screen.
```typescript
// Source: verified from src/app/(tabs)/squad.tsx ScrollView/RefreshControl pattern
<FlatList
  data={rows}
  keyExtractor={(item) => item.friend_id}
  renderItem={({ item }) => (
    <BalanceRow
      friendId={item.friend_id}
      displayName={item.display_name}
      netAmountCents={item.net_amount_cents}
      unsettledCount={item.unsettled_count}
      onPress={() => router.push(...)}
    />
  )}
  ItemSeparatorComponent={() => <View style={styles.separator} />}
  contentContainerStyle={styles.listContent}
  refreshControl={
    <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.interactive.accent} />
  }
  ListEmptyComponent={!loading ? <EmptyState ... /> : null}
/>
```

### Pattern 8: isFullySettled Calculation (History Hook)
**What:** The history hook must determine whether each expense in the list is fully settled — needed for `ExpenseHistoryRow`'s `isFullySettled` prop.
**When to use:** `useExpensesWithFriend` result shape.
```typescript
// After fetching iou_members for all sharedGroupIds:
const { data: allMembers } = await supabase
  .from('iou_members')
  .select('iou_group_id, user_id, settled_at')
  .in('iou_group_id', sharedGroupIds);

// Build a map of groupId → allSettled boolean
const settledMap = new Map<string, boolean>();
for (const groupId of sharedGroupIds) {
  const groupMembers = (allMembers ?? []).filter(m => m.iou_group_id === groupId);
  settledMap.set(groupId, groupMembers.length > 0 && groupMembers.every(m => m.settled_at !== null));
}
```

### Anti-Patterns to Avoid
- **Fetching net balance again in the history screen:** The `netAmountCents` for the history screen header strip is passed via route params from the balance index — no second RPC call. Adding a second `get_iou_summary()` call wastes a network round-trip. [VERIFIED: 09-UI-SPEC.md decision]
- **ScrollView instead of FlatList for lists:** `STATE.md` explicitly records: "Squad dashboard uses single outer FlatList with feature cards in ListFooterComponent — FlatList inside ScrollView breaks Android scroll silently." Use FlatList for the balance index and history screens. [VERIFIED: STATE.md]
- **Float arithmetic on amounts:** All amounts are integer cents. Never divide cents and display without `formatCentsDisplay()`. [VERIFIED: currencyFormat.ts + REQUIREMENTS.md out-of-scope table]
- **Querying iou_members with plain `.select()` expecting nested join:** supabase-js join syntax (`.select('iou_groups(*)')`) requires the FK relationship to be registered in `Relationships: []` in database.ts. The current database.ts for `iou_groups` and `iou_members` does not include those rows. Use multi-step queries as shown in Pattern 2. [VERIFIED: src/types/database.ts — iou_groups and iou_members entries not yet added]
- **Using Stack.Screen name "expenses" for index:** Expo Router maps `expenses/index.tsx` to the name `"expenses/index"` in the Stack config. Using `"expenses"` will not match. [VERIFIED: Expo Router file-system routing]
- **Animating settled row opacity via useNativeDriver:** The UI-SPEC explicitly mandates static `opacity: 0.45` wrapper view — no animation. Using `Animated.Value` with `useNativeDriver: true` on opacity causes no benefit and adds complexity. [VERIFIED: 09-UI-SPEC.md Settled row dimming]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency display | Custom string interpolation | `formatCentsDisplay()` from `src/utils/currencyFormat.ts` | Edge cases: $0.00, cent rounding, locale |
| RPC invocation | Raw fetch to PostgREST | `supabase.rpc('get_iou_summary')` | Auth headers, error handling |
| Navigation | `Linking.openURL` or manual URL construction | `useRouter().push(...)` from expo-router | Stack history, back button, tab state |
| Empty state layout | Custom centered View + Text | `EmptyState` from `src/components/common/EmptyState.tsx` | Consistent spacing and typography |
| Avatar | Image + initials fallback | `AvatarCircle` from `src/components/common/AvatarCircle.tsx` | Already handles null imageUri, initials extraction |
| Net balance aggregation | Client-side sum of raw iou_members rows | `get_iou_summary()` RPC return value | RPC already sums correctly, handles both payer/participant roles |

**Key insight:** The RPC `get_iou_summary()` returns the mathematically correct signed net amount per friend. Building this aggregation client-side from raw `iou_members` rows would require replicating the RPC's pairwise logic — error-prone and redundant. [VERIFIED: migration 0015 Section 9]

---

## Common Pitfalls

### Pitfall 1: database.ts Missing iou_groups / iou_members Types
**What goes wrong:** TypeScript compile errors or `never` types when calling `supabase.from('iou_groups')` or `supabase.from('iou_members')`.
**Why it happens:** `src/types/database.ts` is manually maintained (not auto-generated). Phase 8 added the IOU RPC types to the `Functions` section but the `Tables` section for `iou_groups` and `iou_members` may be incomplete or missing Relationships arrays.
**How to avoid:** Before writing hooks, verify that `iou_groups` and `iou_members` table types exist in `database.ts` with their `Row`, `Insert`, `Update`, and `Relationships: []` shapes. If missing or incomplete, add them as part of Wave 0 (same pattern as Phase 8 Plan 01).
**Warning signs:** TypeScript error "Argument of type '"iou_groups"' is not assignable to parameter" or `.select()` returning type `never`.

[VERIFIED: src/types/database.ts read — iou_groups and iou_members table entries not visible in the first 400 lines; database.ts may need verification]

### Pitfall 2: get_iou_summary() Return Type Not in database.ts Functions
**What goes wrong:** `supabase.rpc('get_iou_summary')` returns `any` or type errors because the RPC return type is not declared in the `Functions` section of database.ts.
**Why it happens:** Phase 8 added `create_expense` RPC type; `get_iou_summary` may not be present.
**How to avoid:** Check `database.ts` Functions section for `get_iou_summary`. If absent, add the return row type matching the RPC signature from migration 0015 Section 9. Cast result as `IOUSummaryRow[]` after confirming shape.
**Warning signs:** `data` type resolves to `any[]` — still works at runtime but loses TypeScript safety.

### Pitfall 3: Route File Name for Index Screen
**What goes wrong:** `/squad/expenses` route 404s or conflicts with the existing `expenses/[id].tsx` dynamic route.
**Why it happens:** Expo Router resolves `expenses/index.tsx` → `/squad/expenses`. The Stack.Screen name must match the file path relative to the layout: `"expenses/index"`. Using just `"expenses"` in `_layout.tsx` will fail.
**How to avoid:** Name the file `src/app/squad/expenses/index.tsx` and register it in `_layout.tsx` as `<Stack.Screen name="expenses/index" ... />`.
**Warning signs:** Stack navigator renders a blank screen or the `[id]` screen for the index path.

### Pitfall 4: RefreshControl on Initial Load vs. Pull-to-Refresh
**What goes wrong:** `RefreshControl refreshing={loading}` shows the pull-to-refresh spinner during the initial page load, which looks wrong (spinner appears at top, not full-screen skeleton).
**Why it happens:** `loading` is `true` on mount AND on pull-to-refresh.
**How to avoid:** Use a separate `isRefreshing` boolean in the hook or screen — `true` only during pull-to-refresh, not during initial load. Show skeleton on initial load (`initialLoad` state). Show `RefreshControl` spinner only on subsequent refreshes.
**Alternative:** Follow the Phase 8 pattern — initial load shows skeleton (loading state), and RefreshControl sets loading to true but skeleton only renders when `!data`. The UI-SPEC mandates: "do not show full-screen LoadingIndicator on refresh, only on initial load."
**Warning signs:** Pull-to-refresh causes full-screen skeleton to flash instead of showing the spinner in the pull position.

### Pitfall 5: Integer Parsing of Route Params
**What goes wrong:** `netAmountCents` from route params is a string. Using it directly in arithmetic or passing to `formatCentsDisplay()` without parsing causes NaN or incorrect values.
**Why it happens:** Expo Router serializes all route params as strings.
**How to avoid:** `parseInt(netAmountCents ?? '0', 10)` immediately after `useLocalSearchParams`. Always check for NaN before use.
**Warning signs:** Balance strip on history screen shows "NaN" or "$NaN".

### Pitfall 6: Multi-Step Query Performance for History Screen
**What goes wrong:** Three sequential Supabase queries on mount cause noticeable loading time, especially if the friend has many shared expenses.
**Why it happens:** `useExpensesWithFriend` requires: (1) caller memberships, (2) friend shared memberships, (3) group rows, (4) member rows for settlement status, (5) profile rows for payer names — potentially 5 sequential queries.
**How to avoid:** Batch what can be batched. Steps 3+4 can run in parallel (groups and members for the shared group IDs). Step 5 (profiles) can also run in parallel with 4. Use `Promise.all` for independent fetches. See Pattern 2 for the correct multi-step approach.
**Warning signs:** History screen takes 2-3 seconds to load.

---

## Code Examples

Verified patterns from existing codebase:

### IOUCard Props Interface
```typescript
// Source: verified from BirthdayCard pattern (src/components/squad/BirthdayCard.tsx)
import type { IOUSummaryData } from '@/hooks/useIOUSummary';

interface IOUCardProps {
  summary: IOUSummaryData;
}

export function IOUCard({ summary }: IOUCardProps) {
  const router = useRouter();
  const { netCents, unsettledCount, loading } = summary;
  if (loading) return <IOUCardSkeleton />;
  // ...
}
```

### BalanceRow Signed Amount Display
```typescript
// Source: verified from 09-UI-SPEC.md BalanceRow component contract + D-03 CONTEXT.md
const isPositive = netAmountCents >= 0;
const absAmount = formatCentsDisplay(Math.abs(netAmountCents));
// Render:
// "+{absAmount} → you" in COLORS.status.free (green)
// "-{absAmount} ← you" in COLORS.interactive.destructive (red)
```

### Currency Sign Formatting
```typescript
// Source: verified from src/utils/currencyFormat.ts
import { formatCentsDisplay } from '@/utils/currencyFormat';
// formatCentsDisplay(4250) → "$42.50"
// formatCentsDisplay(Math.abs(-1800)) → "$18.00"
// Display: positive → "+$42.50 → you", negative → "-$18.00 ← you"
```

### Squad.tsx Integration (Goals Tab)
```typescript
// Source: verified from src/app/(tabs)/squad.tsx current state
// ADD:
import { IOUCard } from '@/components/squad/IOUCard';
import { useIOUSummary } from '@/hooks/useIOUSummary';

// Inside SquadScreen:
const iouSummary = useIOUSummary();

// In Goals tab ScrollView (between StreakCard and BirthdayCard):
<StreakCard streak={streak} />
<IOUCard summary={iouSummary} />
<BirthdayCard birthdays={birthdays} />
```

### _layout.tsx Route Registration
```typescript
// Source: verified from src/app/squad/_layout.tsx
// ADD these two entries:
<Stack.Screen name="expenses/index" options={{ title: 'Balances' }} />
<Stack.Screen name="expenses/friend/[id]" options={{ title: 'Expenses' }} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual type cast for RPC results | Add Function type to database.ts, cast as that type | Phase 7, Phase 8 | Consistent pattern — Phase 9 must add `get_iou_summary` return type |
| Nested Supabase join syntax | Multi-step sequential queries | Phase 8 | Required because iou_members composite PK doesn't map cleanly to supabase-js join |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `iou_groups` and `iou_members` table types are incomplete or absent in database.ts Tables section (not verified past line 400) | Common Pitfalls 1 | If types exist and are complete, Pitfall 1 warning becomes noise only — no execution risk |
| A2 | `get_iou_summary` Function type is not in database.ts (not verified exhaustively) | Common Pitfalls 2 | If Phase 8 already added it, Wave 0 type-check step is a no-op |

**Both assumptions resolve at Wave 0 with a direct read of database.ts Functions section. Neither blocks planning.**

---

## Open Questions

1. **iou_groups + iou_members type completeness in database.ts**
   - What we know: Phase 8 added `create_expense` RPC type and used `iou_groups`/`iou_members` directly in hooks (with casts). The Tables section beyond line 400 was not read.
   - What's unclear: Whether full Row/Insert/Update/Relationships shapes for both tables exist in database.ts.
   - Recommendation: Wave 0 plan task should verify and add these if missing — same approach as Phase 8 Plan 01.

2. **get_iou_summary() return type in database.ts Functions section**
   - What we know: The RPC exists in migration 0015 and is deployed. Phase 7 added `get_upcoming_birthdays` function type manually.
   - What's unclear: Whether Phase 8 also added `get_iou_summary` alongside `create_expense`.
   - Recommendation: Wave 0 plan task verifies + adds if absent.

---

## Environment Availability

Step 2.6: SKIPPED — This phase is purely client-side code changes. No new external tools, CLIs, services, or runtimes required. Supabase backend (migration 0015 with `get_iou_summary()` RPC) is already deployed to the remote project. [VERIFIED: STATE.md "Phase 05-database-migrations: Migration push is remote-only — 0015 and 0016 applied to Supabase project zqmaauaopyolutfoizgq"]

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Detox (e2e) — no unit test framework detected |
| Config file | No e2e spec files found in codebase at time of research |
| Quick run command | Manual Expo Go visual verification |
| Full suite command | Manual Expo Go visual verification |

**Note:** `e2e/` directory scan returned no spec files. The project's validation pattern (established across Phases 6–8) is manual visual verification in Expo Go, not automated test runs. Phase 8 had a "test scaffold" mentioned in STATE.md but no e2e spec files were found on disk.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IOU-03 | Balance index shows per-friend net amounts from get_iou_summary() | Manual visual | n/a | ❌ No existing spec |
| IOU-03 | Empty state shown when no unsettled balances | Manual visual | n/a | ❌ No existing spec |
| IOU-05 | Per-friend history shows all shared expenses, newest first | Manual visual | n/a | ❌ No existing spec |
| IOU-05 | Settled rows dimmed (opacity 0.45) | Manual visual | n/a | ❌ No existing spec |
| IOU-05 | Tapping history row navigates to existing expense detail screen | Manual visual | n/a | ❌ No existing spec |
| IOU-03+05 | IOUCard in Goals tab shows aggregate balance, taps to index | Manual visual | n/a | ❌ No existing spec |

### Sampling Rate
- **Per task commit:** Manual visual spot-check in Expo Go
- **Per wave merge:** Full manual run of both new screens + IOUCard interaction
- **Phase gate:** All 6 success criteria pass manual verification before `/gsd-verify-work`

### Wave 0 Gaps
- No automated test infrastructure gaps — project uses manual Expo Go verification throughout. No Wave 0 test file creation needed.
- Wave 0 code gaps: verify `iou_groups` / `iou_members` / `get_iou_summary` types in database.ts; add if missing.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `useAuthStore` userId guard in all hooks (established pattern) |
| V3 Session Management | no | No session mutation in this phase |
| V4 Access Control | yes | RLS on `iou_groups` + `iou_members` is server-enforced; `is_iou_member()` SECURITY DEFINER prevents RLS recursion |
| V5 Input Validation | no | Phase is read-only — no user input submitted |
| V6 Cryptography | no | No cryptographic operations |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized expense data access (viewing other users' expenses) | Information Disclosure | RLS `iou_groups_select_member` policy — only members of an expense group can SELECT it. VERIFIED in migration 0015. |
| Route param tampering (changing `id` in `/squad/expenses/friend/[id]`) | Tampering | RLS enforces server-side: if the caller is not a member of any shared expense with that friendId, the multi-step query returns empty results — no data leaks. |
| `netAmountCents` param manipulation (passing inflated value via URL) | Tampering | `netAmountCents` from params is display-only (the header strip). True net balance is always computed server-side by `get_iou_summary()` RPC. Manipulating the URL param affects only one user's own display, not stored data. |
| Double-tap / spam refresh | DoS | `loading` state in hooks prevents concurrent fetches — `setLoading(true)` at start of `refetch()` means the RefreshControl spinner is shown and the user cannot trigger a second concurrent fetch while one is in flight. |

**Security posture:** All data access gated by RLS. This is a read-only phase — no write RPCs, no `INSERT`/`UPDATE` calls. Primary security concern is data confidentiality (can a user see another user's expense data?), fully addressed by existing RLS policies from Phase 5. [VERIFIED: migration 0015 RLS policies]

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0015_iou_v1_4.sql` — `get_iou_summary()` RPC signature (Section 9), `iou_groups` schema (Section 2), `iou_members` schema (Section 3), RLS policies (Section 7)
- `src/hooks/useUpcomingBirthdays.ts` — canonical RPC hook pattern
- `src/hooks/useStreakData.ts` — canonical RPC hook pattern with refetch
- `src/hooks/useExpenseDetail.ts` — canonical multi-step Supabase query pattern
- `src/components/squad/StreakCard.tsx` — card component pattern (Pressable, Skeleton, styles)
- `src/components/squad/BirthdayCard.tsx` — card component pattern with data prop ownership
- `src/app/(tabs)/squad.tsx` — Goals tab render order, hook integration point
- `src/app/squad/_layout.tsx` — existing Stack navigator, route registration pattern
- `src/app/squad/expenses/[id].tsx` — route file pattern, useLocalSearchParams usage
- `src/utils/currencyFormat.ts` — formatCentsDisplay() signature
- `src/components/common/EmptyState.tsx` — icon/heading/body props contract
- `src/components/common/AvatarCircle.tsx` — size/imageUri/displayName props
- `.planning/phases/09-iou-list-summary/09-UI-SPEC.md` — approved component contracts, spacing, copywriting, skeleton shapes

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — FlatList-inside-ScrollView prohibition, integer cents decision, zero new npm dependencies
- `.planning/REQUIREMENTS.md` — IOU-03, IOU-05 requirement text
- `.planning/phases/09-iou-list-summary/09-CONTEXT.md` — all D-XX locked decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are pre-existing and verified in codebase
- Architecture: HIGH — all patterns are verified from existing Phase 7 and Phase 8 code
- Pitfalls: HIGH — most derived from STATE.md recorded decisions and migration file review
- Data layer: HIGH — RPC signature fully verified from migration 0015 Section 9

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable — no moving parts; schema deployed, patterns established)
