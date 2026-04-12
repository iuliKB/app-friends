# Phase 7: Birthday Calendar Feature - Research

**Researched:** 2026-04-12
**Domain:** React Native / Expo Router — read-only birthday display UI (list screen + dashboard card)
**Confidence:** HIGH

## Summary

Phase 7 builds two UI surfaces on top of the `get_upcoming_birthdays()` RPC that was created and deployed in Phase 5 (migration 0016). The RPC already handles all the hard work: leap-year guarding, year-wrapping past birthdays to next year, and ordering by `days_until ASC`. The client work is purely reading that data, formatting it, and rendering it in two places.

The dashboard card (`BirthdayCard`) sits below `StreakCard` in the goals tab `ScrollView` in `squad.tsx` and taps through to a new stack screen (`/squad/birthdays`). That screen renders a `FlatList` of birthday rows using the same `AvatarCircle` + name + info layout as `FriendCard`. A custom `useUpcomingBirthdays` hook (modelled exactly on `useStreakData`) wraps the RPC call. No new npm packages are required — all primitives are already in the project.

**Primary recommendation:** Build a single `useUpcomingBirthdays` hook that both `BirthdayCard` and `BirthdaysScreen` consume via props (same pattern as `StreakCard` / `squad.tsx`). Call the RPC once in `squad.tsx`, pass data down. Keep birthday date logic (days-until label formatting) in a small pure utility function that is easy to unit-test.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Birthday list layout**
- D-01: Avatar + name + date row format, consistent with FriendsList row pattern. Each row shows avatar circle, display name, and "Jan 15 · 3 days" style info on the right.
- D-02: Days-until labels use "Today" / "Tomorrow" / "In N days" format. Special labels for today and tomorrow, numeric for the rest. Sorted by nearest first.
- D-03: Today's birthdays get accent background highlight — subtle accent-tinted row background with "Today" badge in accent color.
- D-04: List shows all friends who have a birthday set, sorted nearest-first. Past birthdays this year wrap to next year's occurrence (handled by RPC).
- D-05: Screen title "Birthdays" with back button in the nav bar. Standard screen pattern.

**Dashboard card design**
- D-06: Card shows count + nearest birthday: "3 birthdays in the next 30 days" headline, then nearest friend's name + avatar + "in 2 days".
- D-07: Birthday card sits below StreakCard on the goals tab. StreakCard stays on top as the daily engagement driver.
- D-08: Tapping the birthday card navigates to the full birthday list screen.
- D-09: Card title uses birthday cake emoji: "Birthdays 🎂".
- D-10: Card shows a small avatar circle next to the nearest birthday friend's name.

**Empty states**
- D-11: Birthday list empty state: "No birthdays yet — ask your friends to add theirs!" Friendly message, no illustration.
- D-12: Dashboard card stays visible with "No upcoming birthdays" copy when no friends have upcoming birthdays (matches SC-4). Card does not disappear.

**Navigation**
- D-13: Birthday list screen is a stack screen under the Squad tab, e.g., `/squad/birthdays`. Back button returns to Squad. Matches friends/requests pattern.
- D-14: Card tap is the only entry point to the birthday list. No additional nav items.

### Claude's Discretion
- Card styling details (shadow, border radius, padding) — match StreakCard pattern
- Birthday list row spacing and typography — match FriendsList established pattern
- Data fetching approach (use existing `get_upcoming_birthdays` RPC or build client-side)
- Loading states and skeleton patterns
- Birthday list pull-to-refresh behavior

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BDAY-02 | User can view a list of friends' birthdays sorted by next occurrence | `get_upcoming_birthdays()` RPC already returns rows ordered by `days_until ASC`; client renders them in a new `BirthdaysScreen` stack route under `/squad/birthdays` |
| BDAY-03 | Squad dashboard shows an upcoming birthdays card with count and nearest birthday | `BirthdayCard` component added to goals tab `ScrollView` below `StreakCard`; count from RPC row count filtered to next 30 days on client; nearest friend = first row |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native (FlatList, Pressable, ScrollView, StyleSheet) | bundled with Expo SDK 55 | List rendering, card tap, row layout | Already in project everywhere |
| Expo Router (Stack, useRouter, Link) | bundled | File-based routing for `/squad/birthdays` stack screen | Project routing standard |
| `@supabase/supabase-js` (`supabase.rpc`) | already installed | Call `get_upcoming_birthdays()` | Already in project |
| `@/theme` (COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII) | project | All styling tokens | Enforced by `campfire/no-hardcoded-styles` ESLint rule |
| `AvatarCircle` (`src/components/common/AvatarCircle.tsx`) | project | Avatar circle in rows and card | Already handles imageUri + initials fallback |
| `EmptyState` (`src/components/common/EmptyState.tsx`) | project | Empty states for list and card | Already in use across app |

[VERIFIED: codebase grep]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useSafeAreaInsets` (react-native-safe-area-context) | already installed | Screen top inset for new stack screen | Same as all other stack screens |
| `RefreshControl` | bundled RN | Pull-to-refresh on birthday list | Only on the list screen, not the card |

[VERIFIED: codebase grep]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RPC call in hook | Client-side filter of cached friend data | RPC is correct — birthday data is NOT in the friends Zustand store; client-side would require extra data fetching |
| Hook owned by squad.tsx, passed as props | Hook called independently in BirthdayCard and BirthdaysScreen | Single hook call avoids double network request; matches StreakCard pattern exactly |

**Installation:**
No new packages needed. [VERIFIED: STATE.md — "Zero new npm dependencies required"]

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   └── useUpcomingBirthdays.ts        # New — RPC wrapper, same shape as useStreakData
├── components/squad/
│   └── BirthdayCard.tsx               # New — dashboard card below StreakCard
├── app/squad/
│   ├── _layout.tsx                    # New — Stack layout for squad sub-routes
│   └── birthdays.tsx                  # New — birthday list screen (BirthdaysScreen)
└── app/(tabs)/
    └── squad.tsx                      # Modified — add BirthdayCard + refetch wiring
```

### Pattern 1: Hook modelled on useStreakData

**What:** `useUpcomingBirthdays` calls `supabase.rpc('get_upcoming_birthdays')`, stores `data`, `loading`, `error`, exposes `refetch`. Returns typed array of birthday rows + metadata.

**When to use:** Any component that needs birthday list data.

**Example:**
```typescript
// Source: modelled on src/hooks/useStreakData.ts [VERIFIED: codebase]
export interface BirthdayEntry {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  birthday_month: number;
  birthday_day: number;
  days_until: number;
}

export interface UpcomingBirthdaysData {
  entries: BirthdayEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUpcomingBirthdays(): UpcomingBirthdaysData {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [entries, setEntries] = useState<BirthdayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_upcoming_birthdays');
    if (rpcErr) {
      console.warn('get_upcoming_birthdays failed', rpcErr);
      setError(rpcErr.message);
      setEntries([]);
    } else {
      setEntries((data ?? []) as BirthdayEntry[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { entries, loading, error, refetch };
}
```

### Pattern 2: squad.tsx owns the hook, passes props down

**What:** `squad.tsx` calls `useUpcomingBirthdays()` once and passes the result to `BirthdayCard` as props. `BirthdaysScreen` receives the list via route params or re-fetches on mount (re-fetch on mount is simpler and avoids serialization complexity).

**When to use:** Both components need the same data; single fetch point avoids dual network requests.

**Example — squad.tsx goals tab addition:**
```typescript
// Source: pattern from src/app/(tabs)/squad.tsx [VERIFIED: codebase]
const birthdays = useUpcomingBirthdays();

// In the goals tab ScrollView, after <StreakCard>:
<BirthdayCard birthdays={birthdays} />
```

**Note on BirthdaysScreen:** The list screen lives at `/squad/birthdays` and calls `useUpcomingBirthdays()` independently on mount. This avoids Expo Router serialization of an array through params. Acceptable because the RPC is cheap (SQL STABLE, indexed friends query).

### Pattern 3: Days-until label utility (pure function)

**What:** A small utility converts `days_until: number` to display label and formats the date string.

**Example:**
```typescript
// Pure — easy to test, no React dependency
export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function formatBirthdayDate(month: number, day: number): string {
  // Intl.DateTimeFormat is built into Hermes on Expo SDK 55 [VERIFIED: STATE.md]
  const date = new Date(2000, month - 1, day); // year doesn't matter for month/day
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}
// Produces: "Jan 15" — combine with days label: "Jan 15 · 3 days" (D-01)
```

### Pattern 4: BirthdayCard matching StreakCard structure

**What:** `BirthdayCard` is a `Pressable` with same `COLORS.surface.card`, `RADII.lg`, `SPACING` values as `StreakCard`. Renders title, count line, divider, nearest friend row.

**Example skeleton:**
```typescript
// Source: pattern from src/components/squad/StreakCard.tsx [VERIFIED: codebase]
<Pressable
  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
  onPress={() => router.push('/squad/birthdays' as never)}
>
  <Text style={styles.title}>Birthdays 🎂</Text>
  {isEmpty ? (
    <Text style={styles.emptyText}>No upcoming birthdays</Text>  // D-12
  ) : (
    <>
      <Text style={styles.countLine}>{countIn30Days} birthdays in the next 30 days</Text>
      <View style={styles.divider} />
      {/* nearest friend row: AvatarCircle + name + "in N days" */}
      <View style={styles.nearestRow}>
        <AvatarCircle size={32} imageUri={nearest.avatar_url} displayName={nearest.display_name} />
        <Text style={styles.nearestName}>{nearest.display_name}</Text>
        <Text style={styles.nearestDays}>{formatDaysUntil(nearest.days_until)}</Text>
      </View>
    </>
  )}
</Pressable>
```

### Pattern 5: Squad sub-route layout (matching friends/_layout.tsx)

**What:** A new `src/app/squad/_layout.tsx` creates a `Stack` with the same dark header options as `src/app/friends/_layout.tsx`. The `birthdays.tsx` screen gets `title: 'Birthdays'` via screen options.

**Example:**
```typescript
// Source: pattern from src/app/friends/_layout.tsx [VERIFIED: codebase]
export default function SquadLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface.base },
        headerTintColor: COLORS.text.primary,
        headerShadowVisible: false,
      }}
    />
  );
}
// birthdays.tsx sets: export const options = { title: 'Birthdays' };
```

**CRITICAL NOTE — root layout registration:** The root `_layout.tsx` has explicit `Stack.Screen` declarations for `(tabs)`, `plan-create`, `plans`. A `squad` sub-route group does NOT require a new entry there — Expo Router auto-discovers file-based routes. The `squad/_layout.tsx` is sufficient. [VERIFIED: codebase review of `src/app/_layout.tsx`]

### Pattern 6: Birthday list row with accent highlight for today

**What:** A `BirthdayRow` component renders avatar + name + date. When `days_until === 0`, applies accent-tinted background. The accent color is `COLORS.interactive.accent` (`#f97316`). A tinted background can be `COLORS.interactive.accent` at low opacity — but since there is no opacity token, use `rgba(249, 115, 22, 0.12)` with `// eslint-disable-next-line campfire/no-hardcoded-styles` or extract as a local constant.

**Alternative (no hardcoded RGBA):** Use `COLORS.surface.overlay` (`'#ffffff14'`) as the card background is dark — however this is white-tinted not accent-tinted. The intent of D-03 is accent tint, so the rgba approach with an eslint-disable comment is the right call, consistent with prior precedent (e.g. `FONT_WEIGHT.bold` workaround in Phase 01.1).

### Anti-Patterns to Avoid

- **FlatList inside ScrollView:** The birthday list screen (`/squad/birthdays`) should NOT nest a FlatList inside a ScrollView. The screen root should be a plain View with a FlatList taking `flex: 1`. [VERIFIED: STATE.md — "FlatList inside ScrollView breaks Android scroll silently"]
- **Calling the hook in both BirthdayCard and BirthdaysScreen simultaneously while both are mounted:** The goals tab and the list screen cannot be simultaneously mounted in a stack navigator, so dual-fetch is not a problem in practice.
- **Passing birthday array through Expo Router route params:** Arrays cannot be reliably serialized as route params. BirthdaysScreen should fetch independently.
- **Hardcoded font sizes, colors, or spacing:** ESLint rule `campfire/no-hardcoded-styles` is enforced as an error. Use `COLORS`, `SPACING`, `FONT_SIZE`, `RADII` tokens. Use `// eslint-disable-next-line campfire/no-hardcoded-styles` only where no token exists (e.g. custom RGBA, exact pixel sizes without a token).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Days-until calculation | Custom JS date arithmetic | Use `days_until` field from RPC | RPC handles year-wrap, leap-year (Feb 29 guard), timezone-safe CURRENT_DATE comparison — all edge cases solved |
| Birthday sorting | Client-side sort | Use RPC result order (already sorted by `days_until ASC`) | RPC guarantees order; client sort is redundant |
| Month/day to display string | Custom month name lookup | `Intl.DateTimeFormat` (built into Hermes, Expo SDK 55) | Handles locale, no extra package needed |
| Avatar with initials fallback | Custom initials component | `AvatarCircle` (`src/components/common/AvatarCircle.tsx`) | Already handles imageUri + initials, circular border radius |
| Empty state UI | Custom illustration component | `EmptyState` (`src/components/common/EmptyState.tsx`) | Consistent with all other empty states in the app |

**Key insight:** The RPC already encapsulates all date complexity. The client is purely display: fetch, format label, render rows.

## Common Pitfalls

### Pitfall 1: Forgetting the squad/_layout.tsx

**What goes wrong:** Creating `src/app/squad/birthdays.tsx` without `src/app/squad/_layout.tsx` causes Expo Router to render the screen without a navigation header, so there is no back button and no title.

**Why it happens:** Expo Router requires a `_layout.tsx` for each directory that uses `Stack` navigation. Without it the screen renders but the Stack header is absent.

**How to avoid:** Always create `_layout.tsx` alongside the first screen in a new directory. Model it on `src/app/friends/_layout.tsx`.

**Warning signs:** Screen appears without a header bar when navigating to `/squad/birthdays`.

### Pitfall 2: Counting "birthdays in 30 days" on client vs. trusting full RPC result

**What goes wrong:** The RPC returns ALL friends with birthdays, ordered by `days_until`. The D-06 card copy says "in the next 30 days". The count must be filtered client-side to `days_until <= 30`.

**Why it happens:** The RPC has no 30-day filter — it returns all upcoming birthdays. The 30-day window is a display decision, not a data decision.

**How to avoid:** In `BirthdayCard`, compute `const countIn30Days = entries.filter(e => e.days_until <= 30).length` from the full `entries` array. The nearest birthday is always `entries[0]` (RPC is sorted by `days_until ASC`). The list screen shows ALL entries, not just 30-day ones.

**Warning signs:** Card shows a count larger than 30-day window, or list screen is truncated to 30 days.

### Pitfall 3: Today highlight rgba value triggering ESLint

**What goes wrong:** `backgroundColor: 'rgba(249, 115, 22, 0.12)'` triggers `campfire/no-hardcoded-styles` error.

**Why it happens:** The lint rule blocks any literal color/size not from `@/theme`. There is no accent-with-opacity token in `COLORS`.

**How to avoid:** Add `// eslint-disable-next-line campfire/no-hardcoded-styles` on the line immediately before the property, with a comment explaining the workaround. Consistent with prior art in `UpcomingEventsSection.tsx` (lines 18, 101, 114) and `_layout.tsx` (lines 313, 321). [VERIFIED: codebase]

### Pitfall 4: RefreshControl on birthday list triggers double-fetch

**What goes wrong:** If `BirthdaysScreen` and `squad.tsx` both hold a `useUpcomingBirthdays` instance, pull-to-refresh on the list screen only refetches the list instance, not the card. The card data stays stale until the user returns to the goals tab.

**Why it happens:** Two independent hook instances with no shared state.

**How to avoid:** Since `BirthdaysScreen` is a push-on Stack (user navigates away from squad.tsx to reach it), the squad.tsx goals tab is unmounted or backgrounded. When user navigates back, `squad.tsx` re-mounts and the hook re-fetches. This is acceptable UX. Pull-to-refresh on the list screen only needs to update the list screen's own hook instance.

### Pitfall 5: Stack.Screen registration in root layout

**What goes wrong:** Developer adds a `<Stack.Screen name="squad" />` to the root `_layout.tsx`, causing navigation conflicts.

**Why it happens:** Misunderstanding of Expo Router file-based routing — a `squad/_layout.tsx` file is auto-discovered without needing explicit root registration.

**How to avoid:** Do NOT add `squad` to the root `_layout.tsx`. The `src/app/squad/_layout.tsx` file is sufficient. [VERIFIED: codebase review — friends routes work this way without root registration]

## Code Examples

### RPC call shape (verified from migration)
```typescript
// Source: supabase/migrations/0016_birthdays_v1_4.sql [VERIFIED: codebase]
// RPC returns: friend_id, display_name, avatar_url, birthday_month, birthday_day, days_until
// Already ordered by days_until ASC
// Only includes friends with BOTH birthday_month and birthday_day set
// Only includes accepted friends of the caller
const { data, error } = await supabase.rpc('get_upcoming_birthdays');
```

### formatDaysUntil + formatBirthdayDate (pure utility)
```typescript
// No source dep — pure arithmetic matching D-02 label spec
export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function formatBirthdayDate(month: number, day: number): string {
  // Intl built into Hermes SDK 55 — no extra package [VERIFIED: STATE.md]
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    .format(new Date(2000, month - 1, day));
}
// Combine: `${formatBirthdayDate(m, d)} · ${formatDaysUntil(days)}` → "Jan 15 · In 3 days"
// Exception: when days=0, show "Jan 15 · Today" (no "In" prefix since formatDaysUntil returns "Today")
```

### Birthday list row layout
```typescript
// Source: pattern from src/components/friends/FriendCard.tsx [VERIFIED: codebase]
// Row: flexDirection:'row', alignItems:'center', minHeight:64, paddingHorizontal:SPACING.lg
// Left: AvatarCircle size={40}
// Middle: flex:1, marginLeft:SPACING.lg — display_name + date label below
// Right: days label text, accent color for "Today"
```

### Today highlight row background
```typescript
// eslint-disable-next-line campfire/no-hardcoded-styles
const TODAY_BG = 'rgba(249, 115, 22, 0.12)'; // accent orange at 12% — no theme token for this
// Apply conditionally: entry.days_until === 0 ? TODAY_BG : COLORS.surface.base
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Birthday stored as TIMESTAMPTZ | Separate birthday_month + birthday_day smallint columns | Phase 5 (migration 0016) | Eliminates off-by-one-day errors in negative-UTC timezones |
| Client-side year-wrap arithmetic | RPC handles year-wrap + leap-year guard | Phase 5 | Client never needs to do date math for sorting |

**Deprecated/outdated:**
- `TIMESTAMPTZ` for birthdays: explicitly rejected in project decisions — use `birthday_month` / `birthday_day` integers only. [VERIFIED: STATE.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `BirthdaysScreen` re-fetching independently on mount is acceptable UX (vs. passing data from squad.tsx through params) | Architecture Patterns | Adds one extra RPC call on navigation; mitigated by SQL STABLE |
| A2 | The squad/_layout.tsx pattern (no root layout registration) follows friends/_layout.tsx behavior exactly | Architecture Patterns / Pitfall 5 | Could cause navigation stack issues; low risk — Expo Router file-based discovery is deterministic |
| A3 | "30 days" threshold for BirthdayCard count is client-side filter on RPC result | Common Pitfalls | If the filter should be in the RPC, the count would differ; but the full list always shows all entries |

## Open Questions

1. **BirthdayCard skeleton shape**
   - What we know: StreakCard uses simple `View` placeholders with `opacity: 0.5`
   - What's unclear: Exact skeleton layout for the BirthdayCard (one row? two rows?)
   - Recommendation: Mirror StreakCard pattern — skeleton with muted count line + muted avatar row placeholder

2. **"Jan 15 · Today" vs "Today · Jan 15" ordering**
   - What we know: D-01 specifies "Jan 15 · 3 days" format (date first, days label second)
   - What's unclear: For the "Today" case specifically, is "Jan 15 · Today" the desired copy?
   - Recommendation: Keep consistent with D-01 — always date first, then label. "Jan 15 · Today"

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — phase is pure client-side React Native code against already-deployed Supabase RPC)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (visual regression) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/visual/birthday-calendar.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BDAY-02 | Birthday list screen renders with friend rows sorted by days_until | visual | `npx playwright test tests/visual/birthday-calendar.spec.ts` | Wave 0 |
| BDAY-02 | Empty state shown when no friends have birthdays | visual | `npx playwright test tests/visual/birthday-calendar.spec.ts` | Wave 0 |
| BDAY-03 | Dashboard card visible on goals tab below StreakCard | visual | `npx playwright test tests/visual/birthday-calendar.spec.ts` | Wave 0 |
| BDAY-03 | Card shows empty state copy (not hidden) when no upcoming birthdays | visual | `npx playwright test tests/visual/birthday-calendar.spec.ts` | Wave 0 |
| BDAY-02+03 | Tapping card navigates to birthday list screen | visual/smoke | `npx playwright test tests/visual/birthday-calendar.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/visual/birthday-calendar.spec.ts`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/visual/birthday-calendar.spec.ts` — covers BDAY-02 and BDAY-03; follow `birthday-profile.spec.ts` pattern (login + navigate + screenshot)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase session via `useAuthStore` — all RPC calls inherit caller's auth context |
| V3 Session Management | no | No new session handling |
| V4 Access Control | yes | `get_upcoming_birthdays()` is SECURITY DEFINER, scoped to accepted friends only — RLS enforced in SQL, no client bypass possible |
| V5 Input Validation | no | Phase is read-only display; no user input accepted |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accessing another user's friends' birthdays | Information Disclosure | SECURITY DEFINER RPC filters by `auth.uid()` — only accepted friends returned; already deployed and tested in Phase 5 |
| Client filtering the RPC result incorrectly (e.g. showing wrong user's data) | Information Disclosure | Hook is called once per auth session; `userId` guard in hook prevents call when unauthenticated |

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0016_birthdays_v1_4.sql` — RPC schema, return columns, days_until sort order, Feb-29 guard
- `src/components/squad/StreakCard.tsx` — card styling pattern, skeleton pattern, Pressable structure
- `src/app/(tabs)/squad.tsx` — goals tab ScrollView structure, hook ownership pattern
- `src/hooks/useStreakData.ts` — hook shape to model `useUpcomingBirthdays` on
- `src/app/friends/_layout.tsx` — Stack layout pattern for new squad/_layout.tsx
- `src/components/friends/FriendCard.tsx` — row layout pattern for BirthdayRow
- `src/components/common/AvatarCircle.tsx` — avatar component API (size, imageUri, displayName)
- `src/components/common/EmptyState.tsx` — empty state component API
- `src/theme/colors.ts`, `spacing.ts`, `typography.ts`, `radii.ts` — all available tokens
- `.planning/phases/07-birthday-calendar-feature/07-CONTEXT.md` — all locked decisions
- `.planning/STATE.md` — Intl.NumberFormat/DateTimeFormat confirmed built into Hermes SDK 55, FlatList-in-ScrollView pitfall, zero new deps decision

### Secondary (MEDIUM confidence)
- `src/components/home/UpcomingEventsSection.tsx` — `// eslint-disable-next-line campfire/no-hardcoded-styles` precedent for necessary hardcoded values
- `tests/visual/birthday-profile.spec.ts` — Playwright login + navigate + screenshot test pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are existing project dependencies, verified in codebase
- Architecture: HIGH — all patterns are direct analogues of existing, working code
- Pitfalls: HIGH — sourced from verified codebase review and STATE.md accumulated decisions

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack, no external moving parts)
