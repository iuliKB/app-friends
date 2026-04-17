# Phase 11: Birthday Feature — Research

**Researched:** 2026-04-17
**Domain:** React Native / Supabase — birthday social layer (wish lists, claiming, group chat, friend-of-friend queries)
**Confidence:** HIGH (all findings verified from codebase; no external library additions needed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Birthday Year**
- D-01: Birth year is now required — month + day + year to save. Existing profiles with month/day only handled gracefully (prompt to complete on next edit).
- D-02: Birthday list rows display "turning N" age label alongside days-until info (e.g., "Jan 15 · turning 28 · 3 days").
- D-03: `birthday_year` smallint column on `profiles`, NOT NULL for new entries. Existing rows with null year are valid legacy data — handle without crash.

**Wish List**
- D-04: Items contain title (required), URL (optional), notes (optional). No price field.
- D-05: Wish list managed from Profile tab — "My Wish List" section with add/edit/delete.
- D-06: Wish list publicly visible to all friends (read-only from their side).
- D-07: Schema: `wish_list_items` table — `id`, `user_id`, `title`, `url`, `notes`, `created_at`. RLS: owner CRUD, friends SELECT.

**Secret Claiming**
- D-08: Friends can claim/unclaim freely (toggle, no locked commitment).
- D-09: Claimed items show "Claimed" indicator visible to all friends.
- D-10: Birthday person (item owner) sees NO claim information. Enforced at RLS level.
- D-11: Schema: `wish_list_claims` table — `id`, `item_id`, `claimer_id`, `created_at`. RLS: claimer INSERT/DELETE own claim; friends (non-owners) SELECT; item owner cannot SELECT.

**Friend Birthday Page**
- D-12: Tapping a birthday list row opens a Friend Birthday Page screen.
- D-13: Screen shows: (1) friend's wish list with claim toggles, (2) all of friend's friends for group selection, (3) "Plan birthday" button.
- D-14: All of the birthday friend's friends are shown — NOT limited to mutual friends.

**Birthday Group Chat**
- D-15: "Plan birthday" creates a private group chat (not a plan/event) auto-named `"[Name]'s birthday"`.
- D-16: Birthday friend NOT added to the group. User selects who to include.
- D-17: Schema gap — new `group_channels` + `group_channel_members` tables needed for standalone group DMs. Researcher must evaluate new table vs. plan-reuse approach.
- D-18: Group chat navigation opens existing chat room UI — no new chat UI needed.

### Claude's Discretion
- Exact layout of Friend Birthday Page (stacking order, section headers)
- Empty state for wish list (friend hasn't added items yet)
- Claiming UX (inline toggle vs. swipe action)
- Group member selection UI (checkboxes, multiselect modal, etc.)
- Migration strategy for existing profiles with birthday_month/birthday_day but no birthday_year

### Deferred Ideas (OUT OF SCOPE)
- Push notification reminders for upcoming birthdays (BDAY-04)
- Month-grid calendar view (BDAY-05)
- Claiming notifications to the birthday person
</user_constraints>

---

## Summary

Phase 11 builds the social layer on top of Phases 6–7's birthday foundation. Five distinct sub-problems must be solved: (1) adding `birthday_year` to the existing profile schema with a graceful migration path, (2) implementing a wish list CRUD flow in the Profile tab, (3) implementing asymmetric claim visibility (friends see claims, owner does not) using the established SECURITY DEFINER RLS pattern, (4) fetching a friend's friend list without RLS blocking, and (5) deciding how group chat channels are modelled.

The most architecturally significant decision is the group chat schema gap (D-17). After reviewing `useChatRoom`, `ChatRoomScreen`, and the `messages` table, the recommended path is a new `group_channels` + `group_channel_members` schema rather than plan-reuse. Reusing plans would require creating a semantically wrong `plans` row, polluting the plans list UI and requiring hacks to hide it. The `messages` table already has nullable `plan_id` / `dm_channel_id` columns; adding a third nullable `group_channel_id` column is a clean, low-risk extension of that pattern.

The friend-of-friend list (D-14) is achievable via a new SECURITY DEFINER RPC `get_friends_of(target_user_id uuid)` that bypasses per-row friendships RLS and returns the target user's friend list. Direct client-side querying of `friendships` would fail because the current RLS policy on `friendships` only returns rows where the caller is a participant — it does not allow viewing another user's friendships.

**Primary recommendation:** New `group_channels` + `group_channel_members` + `group_channel_id` column on messages; new `get_friends_of(uuid)` SECURITY DEFINER RPC; SECURITY DEFINER helper for `wish_list_claims` owner-exclusion RLS.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| birthday_year column + migration | Database | — | Schema change; client reads the result |
| `get_upcoming_birthdays` RPC age field | Database | Client hook | Age can be computed client-side from returned year, but RPC returning the year is cleaner |
| "turning N" label formatting | Client (formatter util) | — | Pure display logic; no DB involvement |
| Wish list CRUD | API (Supabase RLS) | Client (Profile tab) | Row-level ownership enforced at DB; client calls direct table insert/update/delete |
| Claim visibility asymmetry | Database (RLS + SECURITY DEFINER) | — | Owner-exclusion must be server-enforced; cannot rely on client to hide data |
| Friend Birthday Page data | Client (hooks) | Database (RPCs) | Two fetches: wish_list_items + claims via RLS; friend list via new RPC |
| Friend-of-friend list | Database (SECURITY DEFINER RPC) | Client hook | RLS on friendships blocks cross-user queries; must go through RPC |
| Group chat creation | Database (atomic RPC) | Client hook | Multi-table write — same pattern as `create_expense` |
| Group chat messaging | Client (useChatRoom extension) | Database (messages + new table) | Chat room UI unchanged; hook extended with group_channel_id branch |

---

## Standard Stack

### Core (zero new npm dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | existing | DB queries, RPC calls, realtime | Already installed |
| Expo Router | existing | Navigation to Friend Birthday Page | File-system routing already used |
| React Native | existing | All UI components | Already installed |
| Animated (RN built-in) | existing | BirthdayPicker year column animation | Same Modal+Animated.timing pattern as existing BirthdayPicker |

[VERIFIED: codebase package.json] — No new npm installs required. `Intl.DateTimeFormat` covers age display (already used in `birthdayFormatters.ts`).

### Supporting (existing utilities to extend)

| Utility | File | Purpose |
|---------|------|---------|
| `BirthdayPicker` | `src/components/common/BirthdayPicker.tsx` | Extend with year column |
| `birthdayFormatters.ts` | `src/utils/birthdayFormatters.ts` | Add `formatTurningAge(year, month, day)` |
| `useUpcomingBirthdays` | `src/hooks/useUpcomingBirthdays.ts` | Extend `BirthdayEntry` with `birthday_year` |
| `useChatRoom` | `src/hooks/useChatRoom.ts` | Extend with `groupChannelId` branch |

---

## Architecture Patterns

### System Architecture Diagram

```
User taps birthday row
        │
        ▼
BirthdaysScreen (squad/birthdays.tsx)
        │  [tap] passes friend_id + display_name
        ▼
FriendBirthdayPage (squad/birthday/[id].tsx)
   ┌────┴─────────────┐
   │                   │
   ▼                   ▼
useFriendWishList    useFriendsOfFriend
(wish_list_items     (get_friends_of RPC
  + claims via RLS)    SECURITY DEFINER)
   │                   │
   ▼                   ▼
WishListSection     FriendPickerSection
(item rows with      (checkboxes for
 Claim/Unclaim       group members)
 toggles)               │
                        ▼
                   "Plan birthday" button
                        │
                        ▼
                  create_birthday_group RPC
                  (atomic: group_channels +
                   group_channel_members INSERT)
                        │
                        ▼
              router.push /chat/room?group_channel_id=...

Profile tab → "My Wish List" section
        │
        ▼
useMyWishList hook
(wish_list_items owner CRUD)
        │
  add / edit / delete items
```

### Recommended Project Structure

```
src/
├── app/squad/
│   ├── birthday/
│   │   └── [id].tsx          # Friend Birthday Page route
│   └── _layout.tsx           # +Stack.Screen for birthday/[id]
├── components/squad/
│   └── WishListItem.tsx       # Reusable row: title + URL chip + claim toggle
├── hooks/
│   ├── useUpcomingBirthdays.ts   # Extend: add birthday_year + days_until age
│   ├── useFriendWishList.ts      # Fetch friend's items + claims; toggle claim
│   ├── useMyWishList.ts          # CRUD for own wish list items
│   └── useFriendsOfFriend.ts     # Call get_friends_of(target_id) RPC
├── utils/
│   └── birthdayFormatters.ts     # Add formatTurningAge()
└── supabase/migrations/
    └── 0017_birthday_social_v1_4.sql
```

### Pattern 1: SECURITY DEFINER for Owner-Exclusion RLS on Wish List Claims

**What:** The claim owner-exclusion rule (D-10) cannot be expressed as a simple RLS USING clause on `wish_list_claims` because the check requires joining `wish_list_items` to get the `user_id` (birthday person). Doing this join inside a normal RLS policy creates a cross-table read that may cause RLS recursion if `wish_list_items` also has RLS. The established project pattern is a SECURITY DEFINER helper.

**When to use:** Any time an RLS policy needs to check ownership of a related table (same pattern as `is_iou_member` and `is_iou_group_creator` in migration 0015).

**Example — migration SQL pattern:**

```sql
-- Helper: returns true if the caller is NOT the owner of the wish list item
CREATE OR REPLACE FUNCTION public.is_not_wish_list_owner(p_item_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.wish_list_items
    WHERE id = p_item_id
      AND user_id = (SELECT auth.uid())
  );
$$;

-- wish_list_claims SELECT policy: friends can see claims, but NOT the item owner
CREATE POLICY "wish_list_claims_select_non_owner"
  ON public.wish_list_claims FOR SELECT TO authenticated
  USING (public.is_not_wish_list_owner(item_id));
```

[VERIFIED: supabase/migrations/0015_iou_v1_4.sql] — exact same SECURITY DEFINER + `SET search_path = ''` pattern used for `is_iou_member`.

### Pattern 2: Friend-of-Friend via SECURITY DEFINER RPC

**What:** The current `friendships` RLS policy (`friendships_select_participant`) only exposes rows where `auth.uid()` is `requester_id` OR `addressee_id`. Querying another user's friends from the client will return zero rows. Solution: a SECURITY DEFINER RPC that bypasses per-row RLS and returns the target user's accepted friends.

**Security consideration:** This deliberately exposes a user's friend list to any authenticated user who knows their `user_id`. This aligns with D-14 ("all of the birthday friend's friends"). The query is scoped to accepted friendships only.

```sql
CREATE OR REPLACE FUNCTION public.get_friends_of(p_target_user uuid)
RETURNS TABLE (
  friend_id    uuid,
  display_name text,
  avatar_url   text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    CASE WHEN f.requester_id = p_target_user THEN f.addressee_id
         ELSE f.requester_id END AS friend_id,
    p.display_name,
    p.avatar_url
  FROM public.friendships f
  JOIN public.profiles p ON p.id = (
    CASE WHEN f.requester_id = p_target_user THEN f.addressee_id
         ELSE f.requester_id END
  )
  WHERE (f.requester_id = p_target_user OR f.addressee_id = p_target_user)
    AND f.status = 'accepted';
$$;
```

[VERIFIED: supabase/migrations/0016_birthdays_v1_4.sql] — identical friend-CTE pattern used in `get_upcoming_birthdays`.

### Pattern 3: Group Channel Schema (D-17 Resolution)

**What:** The `messages` table currently routes via `plan_id` (nullable) OR `dm_channel_id` (nullable). Adding `group_channel_id` (nullable) follows the same pattern exactly. `useChatRoom` already branches on `planId` vs `dmChannelId`; adding a third branch is minimal.

**Why NOT plan-reuse:** Creating a hidden `plans` row pollutes:
- `usePlans` Zustand store (loads all plan rows)
- Plans list UI (would need to filter out "birthday" plans)
- `plan_members` table semantics (birthday person excluded, which violates plan ownership model)
- Future: if users can delete plans, they could accidentally delete the group chat

**Schema:**

```sql
-- group_channels: standalone group DM (not a plan)
CREATE TABLE public.group_channels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- group_channel_members: many-to-many
CREATE TABLE public.group_channel_members (
  group_channel_id uuid NOT NULL REFERENCES public.group_channels(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_channel_id, user_id)
);

-- messages: add nullable group_channel_id column
ALTER TABLE public.messages
  ADD COLUMN group_channel_id uuid REFERENCES public.group_channels(id) ON DELETE CASCADE;
```

**`useChatRoom` extension:**

```typescript
// Add to UseChatRoomOptions
interface UseChatRoomOptions {
  planId?: string;
  dmChannelId?: string;
  groupChannelId?: string;  // NEW
}

// In fetchMessages — add third branch after dmChannelId branch:
} else if (groupChannelId) {
  const { data: members } = await supabase
    .from('group_channel_members')
    .select('user_id')
    .eq('group_channel_id', groupChannelId);
  // ... same profiles map build as planId branch
}

// Messages filter already works: column = 'group_channel_id', value = groupChannelId
// Realtime filter: `group_channel_id=eq.${groupChannelId}`
```

[VERIFIED: src/hooks/useChatRoom.ts lines 80-105, 108-116, 160-162] — the branching and filter patterns are structurally identical.

### Pattern 4: Atomic Group Chat Creation RPC

**What:** Creating a group chat requires: INSERT into `group_channels`, INSERT N rows into `group_channel_members`. Must be atomic (same reasoning as `create_expense`).

```sql
CREATE OR REPLACE FUNCTION public.create_birthday_group(
  p_name        text,
  p_member_ids  uuid[]   -- excludes birthday person; caller added automatically
)
RETURNS uuid   -- group_channels.id
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_group_id uuid;
  v_member   uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.group_channels (name, created_by)
  VALUES (p_name, v_caller)
  RETURNING id INTO v_group_id;

  -- Always add the caller
  INSERT INTO public.group_channel_members (group_channel_id, user_id)
  VALUES (v_group_id, v_caller);

  -- Add selected members (caller already added; skip if accidentally included)
  FOREACH v_member IN ARRAY p_member_ids LOOP
    IF v_member <> v_caller THEN
      INSERT INTO public.group_channel_members (group_channel_id, user_id)
      VALUES (v_group_id, v_member);
    END IF;
  END LOOP;

  RETURN v_group_id;
END;
$$;
```

[VERIFIED: supabase/migrations/0015_iou_v1_4.sql] — `create_expense` is the direct precedent for this pattern.

### Pattern 5: Birthday Year in BirthdayPicker

**What:** `BirthdayPicker` currently has two columns (Month, Day) as side-by-side dropdown triggers. Adding a third Year column follows the same pattern exactly.

**Year range:** Current year - 100 to current year - 1. Computed dynamically:

```typescript
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - 1 - i);
// → [2025, 2024, 2023 ... 1926]
```

**BirthdayPicker props extension:**

```typescript
interface BirthdayPickerProps {
  month: number | null;
  day: number | null;
  year: number | null;    // NEW
  onChange: (month: number | null, day: number | null, year: number | null) => void;
  disabled?: boolean;
}
```

**Row layout:** Three triggers (Month | Day | Year) in a flex row with `gap: SPACING.md`. The existing two-column flex row already uses `flex: 1` per trigger — with three columns each trigger stays proportional.

[VERIFIED: src/components/common/BirthdayPicker.tsx lines 71-76, 133-161] — direct extension of existing structure.

### Pattern 6: "Turning N" Age Calculation

**What:** Given `birthday_year`, `birthday_month`, `birthday_day`, compute the age the person will be on their next birthday (or today if it's their birthday).

```typescript
// Add to src/utils/birthdayFormatters.ts
export function formatTurningAge(
  year: number,
  month: number,
  day: number,
  referenceDate: Date = new Date()
): string {
  const thisYearBirthday = new Date(referenceDate.getFullYear(), month - 1, day);
  const turningYear =
    thisYearBirthday >= referenceDate
      ? referenceDate.getFullYear()
      : referenceDate.getFullYear() + 1;
  const age = turningYear - year;
  return `turning ${age}`;
}
// → "turning 28"
// Combined display: `${formatBirthdayDate(m, d)} · ${formatTurningAge(y, m, d)} · ${formatDaysUntil(days)}`
// → "Jan 15 · turning 28 · In 3 days"
```

**Edge case — birthday today:** `thisYearBirthday >= referenceDate` is true when days_until === 0 (today), so `turningYear = referenceDate.getFullYear()` which is correct (they ARE turning N today).

**Feb 29 leap-year note:** The RPC already normalizes Feb 29 to Feb 28 in non-leap years for `days_until`. The client formatter should use the same normalization: if month === 2 && day === 29, use day 28 in the `new Date()` constructor for non-leap years. Simplest approach: use `Math.min(day, getDaysInMonth(referenceDate.getFullYear(), month))`.

[VERIFIED: src/utils/birthdayFormatters.ts] — existing formatters use `new Date(2000, month - 1, day)` anchor; same pattern extended.

### Pattern 7: `get_upcoming_birthdays` RPC Update

**What:** The existing RPC returns `birthday_month` and `birthday_day` but not `birthday_year`. To display "turning N", the hook needs `birthday_year`. Two options:

1. **Add `birthday_year` to the RPC return** (recommended) — avoids a second query, consistent with how the RPC already returns `display_name`, `avatar_url`, etc.
2. Client computes from a separate profiles fetch.

Option 1 is cleaner. The RPC already queries `profiles`; adding `p.birthday_year` to the SELECT is trivial. The RPC returns `NULL` for users who have not set a year (legacy data — D-03).

Updated RPC return type:
```sql
RETURNS TABLE (
  friend_id      uuid,
  display_name   text,
  avatar_url     text,
  birthday_month smallint,
  birthday_day   smallint,
  birthday_year  smallint,   -- NULL for legacy profiles
  days_until     int
)
```

`BirthdayEntry` interface extension:
```typescript
export interface BirthdayEntry {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  birthday_month: number;
  birthday_day: number;
  birthday_year: number | null;  // null = legacy profile, no year
  days_until: number;
}
```

[VERIFIED: src/hooks/useUpcomingBirthdays.ts + supabase/migrations/0016_birthdays_v1_4.sql]

### Anti-Patterns to Avoid

- **Reusing `plans` for group chat:** Pollutes plans list, creates semantic mismatch, risks accidental deletion. Never do this (D-17 analysis).
- **Inline RLS join for claim ownership:** Do NOT write `USING (item_id NOT IN (SELECT id FROM wish_list_items WHERE user_id = auth.uid()))` directly in a policy — this triggers cross-table RLS evaluation that may recurse. Always use a SECURITY DEFINER helper function.
- **Client-side friend-of-friend query:** Direct `supabase.from('friendships').select().eq('requester_id', friendId)` will return 0 rows due to RLS. Must use an RPC.
- **birthday_year NOT NULL on existing rows:** D-03 states NOT NULL for new entries only. Do NOT add NOT NULL constraint without a DEFAULT or migration path — existing rows will fail the constraint check.
- **Passing `birthday_year` as 0 for legacy:** Use `null` — 0 is a falsy sentinel that breaks age arithmetic. The `formatTurningAge` caller must check `birthday_year !== null` before calling.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic group chat creation | Sequential inserts from client | `create_birthday_group` RPC | Network failure between inserts creates orphan `group_channels` row with no members |
| Cross-user friend list query | Client-side `.from('friendships').eq(...)` | `get_friends_of(uuid)` RPC | RLS blocks it silently — returns empty array, no error |
| Claim owner-exclusion | Client-side filter after fetching all claims | SECURITY DEFINER RLS policy | Claims would be fetched and visible in network traffic; owner must not receive the data at all |
| Age display | Date math inline in component | `formatTurningAge()` in `birthdayFormatters.ts` | Keeps formatter testable; Feb 29 edge case handled once |

**Key insight:** Every cross-ownership data access (friend-of-friend, claim invisibility) must be enforced server-side. Client-side filtering is UI cosmetics, not security.

---

## Common Pitfalls

### Pitfall 1: birthday_year NOT NULL Constraint Timing

**What goes wrong:** Adding `birthday_year smallint NOT NULL` to `profiles` fails on Supabase if existing rows have `birthday_month`/`birthday_day` already set (they would get NULL year, violating the constraint).

**Why it happens:** D-03 says NOT NULL for new entries. The correct migration is: add column as nullable, then application enforces NOT NULL at save time (client validation), not at DB constraint level.

**How to avoid:** Add column as `smallint` with no `NOT NULL` constraint:
```sql
ALTER TABLE public.profiles ADD COLUMN birthday_year smallint
  CHECK (birthday_year BETWEEN 1900 AND EXTRACT(year FROM now())::int);
```
The edit.tsx save handler enforces that year is required when saving new/updated birthday.

**Warning signs:** `ERROR: column "birthday_year" of relation "profiles" contains null values` during `supabase db push`.

### Pitfall 2: RLS Recursion on wish_list_claims Owner Check

**What goes wrong:** Writing an RLS USING clause on `wish_list_claims` that JOINs `wish_list_items` causes Postgres to evaluate `wish_list_items` RLS policies recursively when checking the wish_list_claims policy.

**Why it happens:** `wish_list_items` has its own RLS. When the claims policy tries to join items, Postgres enforces items RLS, which may in turn reference claims... infinite recursion.

**How to avoid:** Use a SECURITY DEFINER helper function (`is_not_wish_list_owner`) that bypasses per-row RLS on `wish_list_items` with `SET search_path = ''`.

**Warning signs:** `ERROR: infinite recursion detected in policy for relation "wish_list_items"`.

### Pitfall 3: `get_friends_of` Returns Current User Among Results

**What goes wrong:** The birthday friend's friend list could include the current user (the person using the Friend Birthday Page). If included in the multiselect, the user could accidentally add themselves — or be confused by seeing their own avatar.

**How to avoid:** Filter `friend_id <> auth.uid()` in the RPC (or client-side). The group creation RPC always adds the caller anyway, so excluding them from the displayed picker list is correct.

### Pitfall 4: Realtime Subscription for Group Channels

**What goes wrong:** `useChatRoom` builds the realtime filter as:
```typescript
const filter = planId ? `plan_id=eq.${planId}` : `dm_channel_id=eq.${dmChannelId}`;
```
If `groupChannelId` is provided but neither `planId` nor `dmChannelId` is set, this produces an incorrect filter from the ternary chain.

**How to avoid:** Refactor the filter expression to a helper:
```typescript
const filter = planId
  ? `plan_id=eq.${planId}`
  : dmChannelId
    ? `dm_channel_id=eq.${dmChannelId}`
    : `group_channel_id=eq.${groupChannelId}`;
```

**Warning signs:** Group chat messages don't appear in realtime; the realtime channel subscribed to the wrong filter column.

### Pitfall 5: Existing Birthday Data on Profile Edit

**What goes wrong:** When a user with `birthday_month` + `birthday_day` (no year) opens profile edit, the year picker shows empty. They hit "Save" without noticing, and the save handler enforces year-is-required → save blocked with no feedback.

**How to avoid:** The save guard should only block saving if the user has provided month OR day AND year is missing. If month/day/year are ALL null, saving is fine (birthday cleared). Show a specific inline hint "Please add your birth year to save your birthday."

### Pitfall 6: messages Table Schema Change — Existing RLS

**What goes wrong:** Adding `group_channel_id` to `messages` requires updating the messages SELECT and INSERT RLS policies to allow group channel members.

**Current messages RLS (from migration 0001):**
```sql
-- messages_select_member_or_participant checks plan membership OR dm_channel participation
-- Adding group_channel_id requires a third OR branch
```

**How to avoid:** Migration 0017 must update the existing `messages_select_member_or_participant` and `messages_insert_member_or_participant` policies to add an OR branch for group channel membership — checked via a SECURITY DEFINER helper to avoid recursion.

**Warning signs:** Sending a message in a group chat returns RLS violation 403; messages not visible even to members.

---

## Code Examples

### Wish List Claim Toggle (client hook pattern)

```typescript
// src/hooks/useFriendWishList.ts — claim toggle pattern
async function toggleClaim(itemId: string, currentlyClaimed: boolean) {
  if (!userId) return;
  if (currentlyClaimed) {
    await supabase
      .from('wish_list_claims')
      .delete()
      .eq('item_id', itemId)
      .eq('claimer_id', userId);
  } else {
    await supabase
      .from('wish_list_claims')
      .insert({ item_id: itemId, claimer_id: userId });
  }
  await refetch(); // re-fetch items + claims after toggle
}
```

This follows the same pattern as `settle()` in `useExpenseDetail` — optimistic state not needed given low-latency toggle.

### Navigation to Friend Birthday Page

```typescript
// In BirthdaysScreen BirthdayRow — add Pressable wrapper
<Pressable
  onPress={() => router.push(`/squad/birthday/${entry.friend_id}?name=${encodeURIComponent(entry.display_name)}` as never)}
>
  {/* existing row content */}
</Pressable>
```

### Navigation to Group Chat

```typescript
// After create_birthday_group RPC returns group_channel_id
const { data: groupChannelId } = await supabase.rpc('create_birthday_group', {
  p_name: `${friendName}'s birthday`,
  p_member_ids: selectedMemberIds,
});
router.push(`/chat/room?group_channel_id=${groupChannelId}&friend_name=${encodeURIComponent(`${friendName}'s birthday`)}` as never);
```

The existing `/chat/room.tsx` route reads `useLocalSearchParams` and would need `group_channel_id` added alongside `plan_id` and `dm_channel_id`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `birthday_month` + `birthday_day` only | Add `birthday_year` as nullable smallint | Phase 11 | Age calculation enabled; no forced migration of existing rows |
| No friend-of-friend query | `get_friends_of(uuid)` SECURITY DEFINER RPC | Phase 11 | Cross-user social graph accessible in controlled way |
| DM (1:1) only | DM (1:1) + Group channels (N:N) | Phase 11 | Unlocks group messaging without coupling to plans |

---

## Open Questions

1. **`get_upcoming_birthdays` RPC OR/UPDATE approach**
   - What we know: RPC already deployed in migration 0016; changing the return type requires a `CREATE OR REPLACE` on the function.
   - What's unclear: Does Supabase allow modifying a SECURITY DEFINER function's return TABLE shape with `CREATE OR REPLACE`? Or must the old function be dropped and recreated?
   - Recommendation: Use `DROP FUNCTION IF EXISTS` then `CREATE` in migration 0017 to be safe. This is a non-destructive migration step (function body replaces itself).

2. **BirthdayPicker year trigger width**
   - What we know: Three flex:1 columns fit reasonably on a 375px iPhone. The existing two-column trigger is 52px tall, 100%/2 wide each.
   - What's unclear: Whether the text "2001" fits comfortably in a narrower trigger without truncation. The year value is always 4 digits.
   - Recommendation: Claude's Discretion — year trigger can be slightly wider (flex: 1.2) or the row can scroll horizontally (ScrollView with horizontal=true) if needed.

3. **Wish list item URL field validation**
   - What we know: URL is optional (D-04).
   - What's unclear: Whether to validate URL format on client before save (e.g., require `https://`), or accept any string.
   - Recommendation: Accept any non-empty string; no strict URL validation. Low friction is important for this feature.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code + database migration changes only. No new CLI tools, runtimes, or external services required beyond the existing Supabase project (`zqmaauaopyolutfoizgq`).

---

## Validation Architecture

No automated test framework is configured (no jest.config.* / vitest.config.* / pytest.ini found in codebase). The project's verification pattern is Playwright visual screenshots + human review checkpoints (see Phase 8, 10 PLAN files).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Verification |
|--------|----------|-----------|-------------|
| D-01/D-03 | `birthday_year` saves and round-trips | Manual | Open profile edit, save year, reopen — value persists |
| D-02 | "turning N" label appears in birthday list | Manual/Screenshot | Birthday list row shows "turning 28" or similar |
| D-04/D-05 | Wish list items add/edit/delete in Profile tab | Manual | CRUD operations visible |
| D-06 | Friend sees wish list (read-only) | Manual | Friend Birthday Page shows items; no edit controls |
| D-09/D-10 | Claim visible to friends, invisible to owner | Manual | Friend claims item; item owner opens own profile wish list — no claim indicator |
| D-12/D-13 | Friend Birthday Page shows items + friends list + button | Manual/Screenshot | Playwright screenshot of the screen |
| D-15/D-16/D-18 | Group chat created, birthday person excluded, chat room opens | Manual | Create group; verify birthday person not listed; send message |

### Wave 0 Gaps

- [ ] No automated tests for formatter functions — `formatTurningAge` should have unit tests in `src/utils/__tests__/birthdayFormatters.test.ts` if a test runner is ever added.
- No test framework installed — no Wave 0 test scaffolding needed. Human verify checkpoint after group chat creation is the phase gate.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | All routes already behind Supabase auth session |
| V3 Session Management | no | Existing session management unchanged |
| V4 Access Control | **yes** | RLS + SECURITY DEFINER helpers for claim visibility |
| V5 Input Validation | **yes** | `wish_list_items.title` NOT NULL; URL is any text (no SQL injection via parameterized supabase-js client) |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Birthday person queries claim table directly (SQL client) | Information Disclosure | SECURITY DEFINER `is_not_wish_list_owner` RLS — server enforced, not client filtered |
| User adds birthday person to their own group chat | Spoofing / Tampering | `create_birthday_group` RPC accepts `p_member_ids` but birthday person's exclusion is a UI concern. The RPC does not enforce exclusion — document that the birthday person CAN be added if someone calls the RPC directly. Acceptable risk per D-16 scope. |
| Group channel member adds non-friend to birthday group | Privilege Escalation | `group_channel_members` INSERT RLS should restrict to members of the channel — standard plan_members pattern applies |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Adding `group_channel_id` as a third nullable column to `messages` is safe (no constraint violations on existing rows) | Architecture Patterns #3 | Low — NULL is the default for nullable columns; existing messages unaffected |
| A2 | `CREATE OR REPLACE FUNCTION` can change a SECURITY DEFINER function's return TABLE columns on Supabase Postgres 15 | Open Questions #1 | Medium — if not allowed, migration must DROP+CREATE; plan accordingly |
| A3 | Birthday person's friend list being world-readable (to any authenticated user via `get_friends_of`) is acceptable privacy tradeoff per D-14 | Architecture Patterns #2 | Low — D-14 explicitly states "all of the birthday friend's friends"; this is the designed behavior |

[ASSUMED] items: A2 only — standard Postgres behavior for `CREATE OR REPLACE` with changed return type. All other findings verified directly from codebase.

---

## Sources

### Primary (HIGH confidence — verified from codebase)
- `src/types/database.ts` — confirmed messages table schema (plan_id, dm_channel_id nullable); profiles schema (birthday_month, birthday_day but no birthday_year yet)
- `supabase/migrations/0015_iou_v1_4.sql` — SECURITY DEFINER helper pattern, atomic RPC pattern, RLS cross-table pattern
- `supabase/migrations/0016_birthdays_v1_4.sql` — confirmed birthday_year not in current schema; confirmed RPC return shape; friend CTE pattern
- `src/hooks/useChatRoom.ts` — confirmed branching logic, realtime filter pattern, profiles map fetch pattern
- `src/hooks/useFriends.ts` — confirmed friendships RLS restriction (get_friends RPC only returns caller's friends)
- `src/app/squad/_layout.tsx` — Stack navigator pattern for new routes
- `src/app/(tabs)/chat/room.tsx` — navigation params pattern (plan_id, dm_channel_id)
- `src/components/common/BirthdayPicker.tsx` — confirmed two-column layout; extension points for year column
- `src/utils/birthdayFormatters.ts` — confirmed existing formatter API; extension point for formatTurningAge
- `supabase/migrations/0001_init.sql` — confirmed friendships RLS (select_participant) and profiles RLS

### Secondary (MEDIUM confidence)
- D-01 through D-18 from `11-CONTEXT.md` — locked decisions for scope

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all patterns verified in codebase
- Architecture: HIGH — group_channel schema gap fully analyzed; all RLS patterns have direct precedents
- Pitfalls: HIGH — derived from actual migration code and hook implementations

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable codebase, no external API dependencies)
