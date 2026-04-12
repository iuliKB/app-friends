# Phase 8: IOU Create & Detail - Research

**Researched:** 2026-04-12
**Domain:** React Native / Expo Router — expense creation form, currency input, split logic, Supabase RPC integration, settle action
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Currency-formatted amount input with live formatting as user types (e.g. "$42.50"), decimal enforcement. Converted to integer cents on submit.
- **D-02:** Inline "Remaining: $X.XX" validation for custom splits — updates live as user edits per-person amounts. Submit disabled until remaining is $0.00. Red when mismatch.
- **D-03:** Card-based layout — title + amount in a hero card at top, participant rows below with avatar + name + share amount + settled badge. Settle button per row.
- **D-04:** Color-coded badges for settled/unsettled status — green "Settled" badge or red/neutral "Unsettled" badge next to each participant's share amount.
- **D-05:** Detail screen shows payer name, creation date, total amount, and split type (even/custom) prominently.
- **D-06:** All-settled banner — when every participant is settled, show a green "All settled!" banner at the top. All badges green, no action buttons.
- **D-07:** Haptic feedback on two key moments: successful expense creation (submit) and settle confirmation.
- **D-08:** Skeleton loading on detail screen. Submit button shows spinner and is disabled during RPC call. Form state preserved on error for retry.
- **D-09:** Routes under `/squad/expenses/*` — create at `/squad/expenses/create`, detail at `/squad/expenses/[id]`. Uses existing `squad/_layout.tsx` stack.
- **D-10:** Temporary '+' button in Squad screen header bar as interim entry point for expense creation.
- **D-11:** Final entry point is a button inside the IOU dashboard card (Phase 9/10 scope).

### Claude's Discretion

- Expense creation screen structure (single screen vs two-step)
- Friend picker approach (inline checkboxes vs separate picker screen)
- Split mode toggle UI (segmented control vs toggle switch)
- Custom amount editing approach (inline fields vs modal)
- Submit behavior (navigate to detail vs navigate back)
- Settle action gesture (tap button vs swipe vs long press)
- Debtor view experience (same view without settle button vs simplified)
- Error handling approach for RPC failures
- Per-person amount field formatting in custom split mode

### Deferred Ideas (OUT OF SCOPE)

- IOU dashboard card on Squad tab — Phase 9/10
- Net balance per friend — Phase 9 (IOU List & Summary)
- Expense history list — Phase 9
- Linking expense to a plan — IOU-06, backlog

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOU-01 | User can create an expense with title, amount, and select friends to split with | `create_expense()` RPC verified in 0015 migration; friend picker pattern from PlanCreateModal |
| IOU-02 | User can split an expense evenly or set custom amounts per person | Even/custom split mode in RPC + largest-remainder already implemented server-side; client needs split-mode toggle + custom fields |
| IOU-04 | User can mark a debt as settled (manual "mark as paid") | `iou_members` UPDATE RLS restricts to creator; settle call is `.update({settled_at, settled_by})` on iou_members |

</phase_requirements>

---

## Summary

Phase 8 builds on a complete database foundation (migration 0015) — all three RPCs and RLS policies are already live in the Supabase project. The client work is purely screen/hook construction. Two screens are needed: an expense creation screen and an expense detail screen. Both register inside the already-existing `squad/_layout.tsx` Stack navigator at new file paths (`src/app/squad/expenses/create.tsx` and `src/app/squad/expenses/[id].tsx`).

The codebase has established patterns for every building block: `PlanCreateModal.tsx` shows the friend-picker checkbox pattern with `useFriends`, `BirthdayCard.tsx` shows the card + skeleton pattern, `SegmentedControl.tsx` shows haptic-on-selection. Currency formatting uses `Intl.NumberFormat` (built into Hermes on Expo SDK 55 — verified in STATE.md). The settle action is a Supabase `iou_members` UPDATE that only succeeds when the caller is the expense creator (RLS enforced server-side).

The only non-trivial client-side logic is the live currency input formatter (cents-to-display and display-to-cents conversion) and the custom-split Remaining indicator. Both are pure TypeScript utility functions with no external dependency.

**Primary recommendation:** Single-screen creation with inline friend checkboxes and split-mode segmented control, navigate to detail on success. Follow PlanCreateModal pattern for friend picker; follow SegmentedControl pattern for split toggle; follow BirthdayCard pattern for skeleton loading on detail.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-haptics | ~55.0.9 | Haptic feedback on create/settle | Already installed; used in SegmentedControl, FriendSwipeCard, MoodPicker [VERIFIED: package.json] |
| @supabase/supabase-js | ^2.99.2 | RPC calls and table mutations | Already installed; used throughout [VERIFIED: package.json] |
| expo-router | ~55.0.5 | File-based routing for new screens | Already installed; Stack navigator from squad/_layout.tsx [VERIFIED: package.json] |
| react-native (core) | 0.83.2 | TextInput, FlatList, ScrollView, StyleSheet | Base RN — used for all UI [VERIFIED: package.json] |
| Intl.NumberFormat | built-in | Currency display formatting (USD) | Built into Hermes on Expo SDK 55 — zero deps [VERIFIED: STATE.md, Accumulated Context] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @expo/vector-icons (Ionicons) | bundled | Checkboxes, plus button icon, settled icon | All icon needs in this phase [VERIFIED: existing usage across codebase] |
| react-native-safe-area-context | ~5.6.2 | Safe area insets for detail screen header | Used in squad.tsx already [VERIFIED: package.json + squad.tsx] |
| zustand | ^5.0.12 | Auth store (userId guard) | useAuthStore already used in all hooks [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Intl.NumberFormat | custom formatCurrency utility | Intl is built in — no extra code needed |
| Inline friend checkboxes | Separate picker screen | Single screen simpler, matches PlanCreateModal pattern |
| Segmented control for split mode | Toggle switch | SegmentedControl already exists in codebase, uses Haptics.Light |

**Installation:** No new packages needed — all dependencies already present. [VERIFIED: package.json]

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/squad/expenses/
│   ├── create.tsx              # Route: /squad/expenses/create
│   └── [id].tsx                # Route: /squad/expenses/[id]
├── hooks/
│   ├── useExpenseCreate.ts     # create_expense() RPC call + form state
│   └── useExpenseDetail.ts     # fetch iou_groups + iou_members + settle action
├── components/iou/
│   ├── ExpenseHeroCard.tsx     # title + amount + split type + payer + date
│   ├── ParticipantRow.tsx      # avatar + name + share + settled badge + settle button
│   └── SplitModeControl.tsx    # even/custom segmented control
├── utils/
│   └── currencyFormat.ts       # centsToDisplay(), parseCentsFromInput()
└── types/
    └── iou.ts                  # ExpenseDetail, ParticipantEntry types
```

### Pattern 1: Route Files as Thin Shells (established pattern)

**What:** Route files (`src/app/squad/expenses/[id].tsx`) extract params and delegate to a screen component or inline JSX. Keeps routing logic separate from rendering.
**When to use:** Every new route in this phase.
**Example:**
```typescript
// src/app/squad/expenses/[id].tsx — mirrors src/app/plans/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { ExpenseDetailScreen } from '@/screens/iou/ExpenseDetailScreen';

export default function ExpenseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <ExpenseDetailScreen expenseId={id} />;
}
```
[VERIFIED: src/app/plans/[id].tsx pattern]

### Pattern 2: Hook Pattern (useUpcomingBirthdays model)

**What:** Custom hook wraps RPC call, guards with `userId`, manages `loading/error/data` state, exposes `refetch`.
**When to use:** `useExpenseCreate` and `useExpenseDetail` should follow this exactly.
**Example:**
```typescript
// Source: src/hooks/useUpcomingBirthdays.ts (verified in codebase)
export function useExpenseDetail(expenseId: string): ExpenseDetailData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [detail, setDetail] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || !expenseId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    // fetch iou_groups + iou_members with profiles join
    ...
    setLoading(false);
  }, [userId, expenseId]);

  useEffect(() => { refetch(); }, [refetch]);
  return { detail, loading, error, refetch, settle };
}
```
[VERIFIED: src/hooks/useUpcomingBirthdays.ts structure]

### Pattern 3: Currency Input — Live Formatting

**What:** TextInput receives raw string input; `onChange` filters non-numeric chars, re-formats to "$X.XX" display string; internal state keeps integer cents.
**When to use:** Amount field on create screen (D-01).
**Example:**
```typescript
// Source: STATE.md — "Intl.NumberFormat built into Hermes on Expo SDK 55"
function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(cents / 100);
}

function parseCentsFromInput(raw: string): number {
  // Strip non-digit chars, treat last two digits as cents
  const digits = raw.replace(/\D/g, '');
  return parseInt(digits || '0', 10);
}
// On change: keep rawCents state; display = formatCents(rawCents)
```
[VERIFIED: Intl.NumberFormat available — STATE.md Accumulated Context; pattern is [ASSUMED] best practice]

### Pattern 4: Haptic Feedback (established pattern)

**What:** `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` wrapped in `.catch(() => {})` to swallow errors on simulators.
**When to use:** On successful expense creation AND on settle confirmation (D-07).
**Example:**
```typescript
// Source: src/components/home/FriendSwipeCard.tsx (verified in codebase)
import * as Haptics from 'expo-haptics';

// On success:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
```
[VERIFIED: FriendSwipeCard.tsx, SegmentedControl.tsx — same pattern throughout codebase]

Convention note: Light = selection feedback (tab switch, segmented control). Medium = action confirmation (create expense, settle). Heavy not used in this codebase yet.

### Pattern 5: Skeleton Loading (BirthdayCard model)

**What:** When `loading === true`, render a skeleton placeholder (grey boxes at `opacity: 0.5`, `backgroundColor: COLORS.border`) instead of live content.
**When to use:** `useExpenseDetail` loading state on detail screen (D-08).
**Example:**
```typescript
// Source: src/components/squad/BirthdayCard.tsx (verified in codebase)
function ExpenseDetailSkeleton() {
  return (
    <View style={[styles.card, { opacity: 0.5 }]}>
      <View style={{ width: 160, height: 16, borderRadius: RADII.md, backgroundColor: COLORS.border }} />
      ...
    </View>
  );
}
```
[VERIFIED: BirthdayCard.tsx skeleton pattern]

### Pattern 6: Header '+' Button via navigation.setOptions

**What:** `useNavigation().setOptions({ headerRight: () => <TouchableOpacity/> })` in a `useEffect` depending on relevant state.
**When to use:** Adding '+' button to squad.tsx header (D-10). Also used in detail screen for creator-only actions.
**Example:**
```typescript
// Source: src/screens/plans/PlanDashboardScreen.tsx (verified in codebase)
useEffect(() => {
  navigation.setOptions({
    headerRight: () => (
      <TouchableOpacity onPress={handleCreatePress} accessibilityLabel="Create expense">
        <Ionicons name="add" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
    ),
  });
}, []);
```
[VERIFIED: PlanDashboardScreen.tsx navigation.setOptions pattern]

**IMPORTANT NOTE on squad.tsx header:** The Squad tab is currently a plain `View` with `paddingTop: insets.top` — it does NOT use the Stack navigator header. The `SquadTabSwitcher` renders inline. Adding a header '+' button for D-10 means either (a) adding a custom header row inside the ScrollView/View, or (b) using the existing `ScreenHeader` component with a `rightAction` prop. Option (b) is simpler and matches the established ScreenHeader API. [VERIFIED: src/app/(tabs)/squad.tsx — no Stack screen header used]

### Pattern 7: Friend Picker with Checkboxes (PlanCreateModal model)

**What:** FlatList of friends with `Ionicons checkbox / square-outline` toggle, `Set<string>` for selected IDs, `useFriends().fetchFriends()` called on mount.
**When to use:** Participant selection on create screen.
**Example:**
```typescript
// Source: src/screens/plans/PlanCreateModal.tsx (verified in codebase)
const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

function toggleFriend(id: string) {
  setSelectedFriendIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
// Render: <Ionicons name={selected ? 'checkbox' : 'square-outline'} />
```
[VERIFIED: PlanCreateModal.tsx lines 85-95]

### Pattern 8: Settle Action (iou_members UPDATE)

**What:** Direct `.update()` on `iou_members` table setting `settled_at = new Date().toISOString()` and `settled_by = userId`. RLS ensures only the expense creator can execute this successfully.
**When to use:** Settle button tap on detail screen (IOU-04).
**Example:**
```typescript
// Source: verified from 0015_iou_v1_4.sql RLS policy
async function settleParticipant(expenseId: string, participantUserId: string) {
  const { error } = await supabase
    .from('iou_members')
    .update({
      settled_at: new Date().toISOString(),
      settled_by: userId,          // current auth user
    })
    .eq('iou_group_id', expenseId)
    .eq('user_id', participantUserId);
  // RLS UPDATE policy: is_iou_group_creator(iou_group_id) — server enforced
  return error;
}
```
[VERIFIED: 0015_iou_v1_4.sql Section 7 — "iou_members_update_creator_settles" policy]

### Anti-Patterns to Avoid

- **Two chained insert calls for create_expense:** The `create_expense()` RPC is atomic on purpose. Never replace it with two separate `supabase.from('iou_groups').insert()` + `supabase.from('iou_members').insert()` — network failure between them creates orphan records. [VERIFIED: STATE.md decision + migration]
- **Float arithmetic for amounts:** All amounts must be integer cents on the wire. Never pass `42.50` — pass `4250`. Floating-point causes phantom debts that cannot be fixed after data is written. [VERIFIED: STATE.md, REQUIREMENTS.md Out of Scope]
- **FlatList inside ScrollView:** The detail screen should use a single ScrollView (small fixed participant count) or a FlatList with `ListHeaderComponent` for the hero card — never nest FlatList inside ScrollView. [VERIFIED: STATE.md Accumulated Context — "FlatList inside ScrollView breaks Android scroll silently"]
- **Self-settle without RLS trust:** Do NOT add a client-side guard for "is this the payer?" as the only protection. The RLS UPDATE policy (`is_iou_group_creator`) is the authoritative gate. The UI should hide the settle button from non-creators for UX, but the server enforces it regardless. [VERIFIED: migration RLS policy]
- **Hardcoded style values without eslint-disable comment:** When a theme token does not exist for an exact value, use `// eslint-disable-next-line campfire/no-hardcoded-styles` with an inline comment explaining why. [VERIFIED: birthdays.tsx, BirthdayCard.tsx pattern]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic expense creation with correct split | Two-step insert | `create_expense()` RPC | Already deployed; largest-remainder split logic is complex; two-step creates orphan records |
| Currency display formatting | Custom formatter | `Intl.NumberFormat` built-in | Available in Hermes/Expo SDK 55; handles locale, rounding, symbol |
| RLS settlement authorization | Client-only guard | Supabase RLS UPDATE policy | Already enforced server-side; client guard is UX convenience only |
| Skeleton loading animation | Custom animated pulses | Static opacity 0.5 grey boxes | BirthdayCard establishes the project pattern; animation adds no value here |
| Haptics import | Custom vibration utility | `expo-haptics` already installed | Consistent with entire codebase |

---

## Common Pitfalls

### Pitfall 1: Currency Input — Cents Drift on Backspace

**What goes wrong:** If you re-format on every keystroke, backspace feels broken — deleting "$4.20" produces "$0.42" instead of "$4.2" interim state.
**Why it happens:** Treating raw string as cents (strip non-digits → pad to cents) means backspace drops a cent digit, not a display character.
**How to avoid:** Maintain `rawDigits: string` state (only digit chars, no decimal point). Re-render display as `formatCents(parseInt(rawDigits || '0', 10))`. Backspace naturally trims the last digit from `rawDigits`.
**Warning signs:** User can't delete cleanly; amount jumps unexpectedly while typing.
[ASSUMED — standard React Native currency input pattern]

### Pitfall 2: Custom Split — Remaining Indicator Negative vs Positive

**What goes wrong:** If the user over-allocates, remaining goes negative. "Remaining: -$1.00" is confusing copy.
**Why it happens:** Naive `total - sum(custom)` can go negative.
**How to avoid:** Label as "Remaining: $X.XX" (absolute value) with red color when negative, green/neutral when zero or positive. Submit stays disabled for any non-zero remaining regardless of sign. [ASSUMED — UX convention] D-02 says red when mismatch — clamp display to show negative as red "Over by $X.XX".
**Warning signs:** User confused about whether $0.00 means done or broken.

### Pitfall 3: iou_members Composite PK — No Separate id Column

**What goes wrong:** Calling `.eq('id', ...)` on iou_members will fail — the table has no `id` column. The PK is `(iou_group_id, user_id)`.
**Why it happens:** Other tables in this codebase all have a UUID `id` PK.
**How to avoid:** Always filter iou_members by both `.eq('iou_group_id', ...).eq('user_id', ...)` together.
**Warning signs:** Supabase returns empty result or column-not-found error.
[VERIFIED: 0015_iou_v1_4.sql — "composite PK — no separate id column" comment in migration]

### Pitfall 4: Squad Tab Has No Stack Header — '+' Button Needs Custom Placement

**What goes wrong:** `navigation.setOptions({ headerRight })` has no effect in `squad.tsx` because the squad tab renders inside a tab bar, not a Stack navigator header.
**Why it happens:** The Stack navigator only exists inside `src/app/squad/_layout.tsx` (for child routes like `/squad/birthdays`). The tab itself (`/squad`) doesn't get a stack header.
**How to avoid:** For D-10, add the '+' button as a custom element inside the squad.tsx render tree using `ScreenHeader` component's `rightAction` prop, or a `TouchableOpacity` placed in the existing top bar area.
**Warning signs:** Button appears on every squad sub-route, or doesn't appear at all.
[VERIFIED: src/app/(tabs)/squad.tsx — no Stack header, custom View layout]

### Pitfall 5: TypeScript Types for iou_groups and iou_members Not Re-exported

**What goes wrong:** New hooks import from `database.ts` but there are no convenience type aliases for `IouGroup` / `IouMember` (unlike `Profile`, `Plan`, etc.).
**Why it happens:** Type aliases at bottom of `database.ts` only cover the original tables.
**How to avoid:** Add `export type IouGroup = Tables<'iou_groups'>` and `export type IouMember = Tables<'iou_members'>` to `database.ts`, and add `create_expense` and `get_iou_summary` to the `Functions` section.
[VERIFIED: src/types/database.ts — iou_groups/iou_members rows present but no type aliases, create_expense not in Functions section]

### Pitfall 6: create_expense RPC p_participant_ids Must Include the Payer

**What goes wrong:** Expense creator is not in the split — they paid but don't have an iou_members row, so the detail screen can't show their share.
**Why it happens:** The RPC inserts members for `p_participant_ids` only. If the caller isn't in that array, they get no row.
**How to avoid:** On submit, always include `userId` (the payer) in the `p_participant_ids` array, even if they didn't explicitly select themselves in the friend picker.
[VERIFIED: 0015_iou_v1_4.sql — RPC iterates `p_participant_ids` only, no auto-include of caller]

### Pitfall 7: Detail Screen Fetch — iou_groups RLS Requires iou_members Row

**What goes wrong:** Querying `iou_groups` by ID returns nothing even though the expense exists.
**Why it happens:** The `iou_groups_select_member` RLS policy requires an iou_members row for the caller. If the caller is not a participant, they get zero rows.
**How to avoid:** This is expected behavior — non-participants can't see expenses. The create screen must ensure the caller is always in `p_participant_ids` (see Pitfall 6). If a user sees an empty detail screen right after creating, the payer inclusion fix resolves it.
[VERIFIED: 0015_iou_v1_4.sql Section 7 — iou_groups SELECT policy]

---

## Code Examples

### create_expense RPC Call

```typescript
// Source: 0015_iou_v1_4.sql — GRANT EXECUTE confirmed
const { data: groupId, error } = await supabase.rpc('create_expense', {
  p_title: title.trim(),
  p_total_amount_cents: totalCents,           // integer, e.g. 4250 for $42.50
  p_participant_ids: participantIds,           // uuid[] — MUST include payer
  p_split_mode: splitMode,                    // 'even' | 'custom'
  p_custom_cents: splitMode === 'custom'
    ? customCentsList                          // integer[] parallel to participant_ids
    : null,
});
// Returns: uuid (the new iou_groups.id)
```

### Settle Action

```typescript
// Source: 0015_iou_v1_4.sql RLS UPDATE policy
const { error } = await supabase
  .from('iou_members')
  .update({
    settled_at: new Date().toISOString(),
    settled_by: currentUserId,
  })
  .eq('iou_group_id', expenseId)
  .eq('user_id', participantUserId);
// Silently fails (no rows updated) if caller is not the expense creator — RLS enforced
```

### Fetch Expense Detail (iou_groups + iou_members with profile join)

```typescript
// Source: database.ts table shape (verified)
// iou_groups has no built-in join to iou_members — fetch separately
const { data: group } = await supabase
  .from('iou_groups')
  .select('*')
  .eq('id', expenseId)
  .single();

const { data: members } = await supabase
  .from('iou_members')
  .select('user_id, share_amount_cents, settled_at, settled_by')
  .eq('iou_group_id', expenseId);

// Resolve display_names from profiles for each member user_id
const memberIds = (members ?? []).map(m => m.user_id);
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, display_name, avatar_url')
  .in('id', memberIds);
```

### Currency Live Formatting

```typescript
// Source: [ASSUMED] standard cents-input pattern; Intl.NumberFormat verified available
function formatCentsDisplay(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

function parseDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

// State: rawDigits = '4250' → display = '$42.50'
// On change: setRawDigits(parseDigits(text)); (display derived from state)
// On submit: totalCents = parseInt(rawDigits || '0', 10)
```

### Adding TypeScript Types for IOU (database.ts addition)

```typescript
// Add to bottom of src/types/database.ts
export type IouGroup = Tables<'iou_groups'>;
export type IouMember = Tables<'iou_members'>;

// Add to Database.public.Functions (after get_upcoming_birthdays):
create_expense: {
  Args: {
    p_title: string;
    p_total_amount_cents: number;
    p_participant_ids: string[];
    p_split_mode?: string;
    p_custom_cents?: number[] | null;
  };
  Returns: string; // uuid
};
```
[VERIFIED: database.ts Functions section — create_expense not yet present]

---

## Validation Architecture

**nyquist_validation: true** (config.json)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (visual/screenshot tests) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/visual/iou-create-detail.spec.ts` |
| Full suite command | `npx playwright test tests/visual/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IOU-01 | Create expense screen is reachable via '+' button in squad header | visual/screenshot | `npx playwright test tests/visual/iou-create-detail.spec.ts` | ❌ Wave 0 |
| IOU-01 | Submitting create form creates an expense and navigates to detail | visual/screenshot | same spec | ❌ Wave 0 |
| IOU-02 | Even split mode creates equal share rows (largest-remainder) | visual/screenshot | same spec | ❌ Wave 0 |
| IOU-02 | Custom split Remaining indicator turns red on mismatch | visual/screenshot | same spec | ❌ Wave 0 |
| IOU-04 | Settle button appears only for expense creator | visual/screenshot | same spec | ❌ Wave 0 |
| IOU-04 | Tapping settle updates participant row to "Settled" badge | visual/screenshot | same spec | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx playwright test tests/visual/iou-create-detail.spec.ts`
- **Per wave merge:** `npx playwright test tests/visual/`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/visual/iou-create-detail.spec.ts` — covers IOU-01, IOU-02, IOU-04 (new file, must be created in Wave 0)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (remote) | create_expense RPC, settle UPDATE | ✓ | migration 0015 deployed | — |
| expo-haptics | D-07 haptic feedback | ✓ | ~55.0.9 | — |
| Intl.NumberFormat | Currency display | ✓ | Hermes built-in (Expo SDK 55) | — |
| Playwright | Visual tests | ✓ | playwright.config.ts present | — |

[VERIFIED: package.json, STATE.md migration note]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `rawDigits` backspace pattern for currency input (strip non-digits, derive display) | Code Examples / Pitfall 1 | UX bug — user can't type amount cleanly; fixable in implementation |
| A2 | `HapticFeedbackStyle.Medium` is appropriate for create/settle (Light used elsewhere for selection) | Patterns | Haptic feels wrong — change to Light; cosmetic |
| A3 | Detail screen should fetch iou_groups + iou_members separately then join profiles in a third query | Code Examples | Three round-trips could be slow; alternative is a single Postgres function — low risk given small participant counts (2-10) |
| A4 | Custom split "Over by $X.XX" red copy for negative remaining | Pitfall 2 | UX mismatch if user expects plain "Remaining: -$1.00" |

---

## Open Questions

1. **Payer's own share on detail screen**
   - What we know: The RPC inserts a row for every `p_participant_ids` entry, including the payer if included.
   - What's unclear: Should the payer's own row show a "Settle" button (to settle their own share with themselves)? Or should the settle button be hidden for the payer-as-participant row?
   - Recommendation: Hide settle button for the payer's own member row. The payer tracking their own share as "settled" is nonsensical UX. Debtors owe the payer — the payer's share is conceptually already settled.

2. **Number of profile round-trips on detail screen**
   - What we know: Three queries needed (iou_groups, iou_members, profiles.in()).
   - What's unclear: Acceptable latency for the skeleton loading period?
   - Recommendation: Three queries is fine for 2-10 participants. If this becomes a concern in Phase 9, a summary RPC can be added.

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0015_iou_v1_4.sql` — Full RPC signatures, RLS policies, table schema
- `src/types/database.ts` — IOU table TypeScript types
- `package.json` — All installed dependencies and versions
- `src/app/(tabs)/squad.tsx` — Squad tab layout (no stack header confirmed)
- `src/app/squad/_layout.tsx` — Stack navigator for squad/* routes
- `src/hooks/useUpcomingBirthdays.ts` — Hook pattern template
- `src/screens/plans/PlanCreateModal.tsx` — Friend picker checkbox pattern
- `src/components/status/SegmentedControl.tsx` — Haptics.Light usage pattern
- `src/components/squad/BirthdayCard.tsx` — Card + skeleton pattern
- `src/screens/plans/PlanDashboardScreen.tsx` — navigation.setOptions pattern
- `.planning/STATE.md` — Accumulated decisions including Intl.NumberFormat and integer cents

### Secondary (MEDIUM confidence)
- `playwright.config.ts` — Test framework and commands
- `tests/visual/birthday-calendar.spec.ts` — Playwright spec structure for new spec authoring

### Tertiary (LOW confidence — see Assumptions Log)
- Currency input `rawDigits` pattern (A1) — standard React Native practice, not verified in this codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture: HIGH — patterns verified directly from codebase files
- Pitfalls: HIGH (pitfalls 1, 3-7 verified from migration/code) / MEDIUM (pitfall 2 — UX assumption)
- Code examples: HIGH (RPC calls from migration) / MEDIUM (currency input)

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable codebase, no fast-moving deps)
