# Phase 11: Birthday Feature — Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 14 new/modified files
**Analogs found:** 13 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/0017_birthday_social_v1_4.sql` | migration | CRUD | `supabase/migrations/0015_iou_v1_4.sql` | exact |
| `src/hooks/useUpcomingBirthdays.ts` | hook | request-response | self (extend) | exact |
| `src/utils/birthdayFormatters.ts` | utility | transform | self (extend) | exact |
| `src/components/common/BirthdayPicker.tsx` | component | request-response | self (extend) | exact |
| `src/app/profile/edit.tsx` | screen | CRUD | self (extend) | exact |
| `src/app/squad/birthdays.tsx` | screen | request-response | self (extend) | exact |
| `src/app/squad/_layout.tsx` | config | — | self (extend) | exact |
| `src/app/squad/birthday/[id].tsx` | screen | request-response | `src/app/squad/expenses/[id].tsx` | role-match |
| `src/hooks/useFriendWishList.ts` | hook | CRUD | `src/hooks/useExpenseDetail.ts` | role-match |
| `src/hooks/useMyWishList.ts` | hook | CRUD | `src/hooks/useExpenseDetail.ts` | role-match |
| `src/hooks/useFriendsOfFriend.ts` | hook | request-response | `src/hooks/useUpcomingBirthdays.ts` | role-match |
| `src/hooks/useChatRoom.ts` | hook | event-driven | self (extend) | exact |
| `src/components/squad/WishListItem.tsx` | component | request-response | `src/components/squad/CompactFriendRow.tsx` | role-match |
| `src/app/(tabs)/chat/room.tsx` | screen | request-response | self (extend) | exact |

---

## Pattern Assignments

### `supabase/migrations/0017_birthday_social_v1_4.sql` (migration, CRUD)

**Analog:** `supabase/migrations/0015_iou_v1_4.sql`

**File header comment pattern** (lines 1-5 of 0015):
```sql
-- Phase v1.4 Migration 0015 — IOU tables, RPCs, plans.iou_notes → general_notes rename.
-- Implements IOU-01..IOU-05 schema foundation per 05-CONTEXT.md D-03..D-09, D-14.
-- Decisions: D-03 table naming, D-04 atomic RPC, D-05 summary RPC, D-06 audit columns,
--            D-07 creator-only settlement RLS, D-08 INTEGER cents, D-09 largest-remainder.
```

**Table creation pattern** (lines 10-21 of 0015):
```sql
CREATE TABLE public.iou_groups (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title              text NOT NULL,
  total_amount_cents integer NOT NULL CHECK (total_amount_cents > 0),
  split_mode         text NOT NULL DEFAULT 'even'
                     CHECK (split_mode IN ('even', 'custom')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.iou_groups ENABLE ROW LEVEL SECURITY;
```

**Many-to-many join table pattern** (lines 26-34 of 0015):
```sql
CREATE TABLE public.iou_members (
  iou_group_id       uuid NOT NULL REFERENCES public.iou_groups(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_amount_cents integer NOT NULL CHECK (share_amount_cents >= 0),
  settled_at         timestamptz,
  settled_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (iou_group_id, user_id)
);
ALTER TABLE public.iou_members ENABLE ROW LEVEL SECURITY;
```

**SECURITY DEFINER helper pattern** (lines 60-82 of 0015):
```sql
CREATE OR REPLACE FUNCTION public.is_iou_group_creator(p_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.iou_groups
    WHERE id = p_group_id
      AND created_by = (SELECT auth.uid())
  );
$$;
```

**Atomic RPC pattern** (lines 118-170 of 0015):
```sql
CREATE OR REPLACE FUNCTION public.create_expense(
  p_title              text,
  p_total_amount_cents integer,
  p_participant_ids    uuid[],
  p_split_mode         text DEFAULT 'even',
  p_custom_cents       integer[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_group_id    uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.iou_groups (created_by, title, total_amount_cents, split_mode)
  VALUES (v_caller, p_title, p_total_amount_cents, p_split_mode)
  RETURNING id INTO v_group_id;

  FOREACH v_participant IN ARRAY p_participant_ids LOOP
    INSERT INTO public.iou_members (iou_group_id, user_id, share_amount_cents)
    VALUES (v_group_id, v_participant, v_share);
  END LOOP;

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_expense(...) TO authenticated;
```

**ALTER TABLE pattern** (lines 12-23 of 0016):
```sql
ALTER TABLE public.profiles
  ADD COLUMN birthday_month smallint
    CHECK (birthday_month BETWEEN 1 AND 12),
  ADD COLUMN birthday_day   smallint
    CHECK (
      birthday_day BETWEEN 1 AND
      CASE
        WHEN birthday_month IN (4, 6, 9, 11) THEN 30
        WHEN birthday_month = 2             THEN 29
        ELSE 31
      END
    );
```

**SECURITY DEFINER RPC returning TABLE pattern** (lines 32-42 of 0016):
```sql
CREATE OR REPLACE FUNCTION public.get_upcoming_birthdays()
RETURNS TABLE (
  friend_id      uuid,
  display_name   text,
  avatar_url     text,
  birthday_month smallint,
  birthday_day   smallint,
  days_until     int
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH friends AS (
    SELECT
      CASE WHEN f.requester_id = (SELECT auth.uid()) THEN f.addressee_id
           ELSE f.requester_id END AS friend_id
    FROM public.friendships f
    WHERE (f.requester_id = (SELECT auth.uid()) OR f.addressee_id = (SELECT auth.uid()))
      AND f.status = 'accepted'
  ),
  ...
$$;
```

**Key application for Phase 11:**
- `wish_list_items`: plain table with `user_id` owner + `title NOT NULL`, `url` nullable, `notes` nullable. RLS: owner CRUD, friends SELECT (via `is_friend` SECURITY DEFINER helper from 0015 pattern).
- `wish_list_claims`: composite PK (`item_id`, `claimer_id`) — same pattern as `iou_members` composite PK. RLS SELECT: SECURITY DEFINER `is_not_wish_list_owner(item_id)` blocks item owner.
- `group_channels`: plain table. `group_channel_members`: composite PK, same pattern as `iou_members`.
- `messages` ALTER: `ADD COLUMN group_channel_id uuid REFERENCES public.group_channels(id) ON DELETE CASCADE` — nullable, same as existing `plan_id` and `dm_channel_id`.
- `create_birthday_group` RPC: FOREACH loop over `p_member_ids`, same `DECLARE / INSERT ... RETURNING / FOREACH` pattern as `create_expense`.
- `get_friends_of(p_target_user uuid)` RPC: RETURNS TABLE, LANGUAGE sql STABLE SECURITY DEFINER, friend CTE pattern from 0016.
- `get_upcoming_birthdays` RPC update: DROP and recreate (add `birthday_year smallint` to SELECT and RETURNS TABLE).

---

### `src/hooks/useUpcomingBirthdays.ts` (hook, request-response) — EXTEND

**Analog:** Self — extend the existing file at `/Users/iulian/Develop/campfire/src/hooks/useUpcomingBirthdays.ts`

**Interface extension** (lines 10-17 — add `birthday_year`):
```typescript
export interface BirthdayEntry {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  birthday_month: number;
  birthday_day: number;
  birthday_year: number | null;  // NEW — null for legacy profiles (D-03)
  days_until: number;
}
```

**Hook shape to preserve** (lines 19-57): The entire hook structure (`useCallback` wrapping `supabase.rpc()`, `useEffect` calling `refetch`, returning `{ entries, loading, error, refetch }`) stays unchanged — only the interface gains the new field which the RPC now returns.

---

### `src/utils/birthdayFormatters.ts` (utility, transform) — EXTEND

**Analog:** Self — extend the existing file at `/Users/iulian/Develop/campfire/src/utils/birthdayFormatters.ts`

**Existing formatter pattern** (lines 4-15):
```typescript
export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function formatBirthdayDate(month: number, day: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(2000, month - 1, day),
  );
}
```

**New function to add** — follows the same pure-function, no-React-dependency pattern:
```typescript
export function formatTurningAge(
  year: number,
  month: number,
  day: number,
  referenceDate: Date = new Date()
): string {
  // Leap-year guard: clamp Feb 29 to Feb 28 in non-leap years
  const safeDay =
    month === 2 && day === 29 && referenceDate.getFullYear() % 4 !== 0 ? 28 : day;
  const thisYearBirthday = new Date(referenceDate.getFullYear(), month - 1, safeDay);
  const turningYear =
    thisYearBirthday >= referenceDate
      ? referenceDate.getFullYear()
      : referenceDate.getFullYear() + 1;
  return `turning ${turningYear - year}`;
}
// Combined usage: `${formatBirthdayDate(m, d)} · ${formatTurningAge(y, m, d)} · ${formatDaysUntil(days)}`
// → "Jan 15 · turning 28 · In 3 days"
// Guard: only call formatTurningAge when birthday_year !== null
```

---

### `src/components/common/BirthdayPicker.tsx` (component, request-response) — EXTEND

**Analog:** Self — extend the existing file at `/Users/iulian/Develop/campfire/src/components/common/BirthdayPicker.tsx`

**Props interface extension** (lines 71-76 — add `year`):
```typescript
interface BirthdayPickerProps {
  month: number | null;
  day: number | null;
  year: number | null;    // NEW — 4-digit year or null
  onChange: (month: number | null, day: number | null, year: number | null) => void;
  disabled?: boolean;
}
```

**Year data constant** — add alongside existing `MONTH_NAMES` / `getDaysInMonth`:
```typescript
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - 1 - i);
// → [2025, 2024, ..., 1926]
```

**Dropdown type extension** (line 83 — extend union):
```typescript
const [openDropdown, setOpenDropdown] = useState<'month' | 'day' | 'year' | null>(null);
```

**Three-trigger row** (lines 135-161 — add Year trigger after Day trigger, same `flex: 1` pattern):
```typescript
<View style={styles.row}>
  {/* Month trigger — unchanged */}
  <TouchableOpacity style={[styles.trigger, ...]} onPress={() => handleOpenDropdown('month')} ...>
    <Text ...>{monthLabel ?? 'Month'}</Text>
  </TouchableOpacity>

  {/* Day trigger — unchanged */}
  <TouchableOpacity style={[styles.trigger, ...]} onPress={() => handleOpenDropdown('day')} ...>
    <Text ...>{dayLabel ?? 'Day'}</Text>
  </TouchableOpacity>

  {/* Year trigger — NEW, same pattern */}
  <TouchableOpacity
    style={[styles.trigger, disabled && styles.triggerDisabled]}
    onPress={() => handleOpenDropdown('year')}
    activeOpacity={0.7}
    disabled={disabled}
    accessibilityLabel={`Select birth year, currently ${year ? String(year) : 'not set'}`}
  >
    <Text style={year !== null ? styles.triggerTextSelected : styles.triggerTextPlaceholder}>
      {year !== null ? String(year) : 'Year'}
    </Text>
  </TouchableOpacity>
</View>
```

**Year option rendering** — add third branch in Modal ScrollView (same `TouchableOpacity` + `optionRow` + `optionText` pattern as month/day):
```typescript
: openDropdown === 'year'
  ? YEARS.map((y) => {
      const isSelected = year === y;
      return (
        <TouchableOpacity
          key={y}
          style={styles.optionRow}
          onPress={() => handleSelectYear(y)}
          activeOpacity={0.7}
        >
          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
            {String(y)}
          </Text>
        </TouchableOpacity>
      );
    })
```

**Clear link update** (line 164 — now requires all three):
```typescript
{month !== null && day !== null && year !== null && (
  <TouchableOpacity onPress={handleClearBirthday} ...>
    <Text style={styles.clearLink}>Clear Birthday</Text>
  </TouchableOpacity>
)}
```

---

### `src/app/profile/edit.tsx` (screen, CRUD) — EXTEND

**Analog:** Self — extend the existing file at `/Users/iulian/Develop/campfire/src/app/profile/edit.tsx`

**State additions** (after line 39 — same `useState<number | null>(null)` pattern):
```typescript
const [birthdayYear, setBirthdayYear] = useState<number | null>(null);
const [originalBirthdayYear, setOriginalBirthdayYear] = useState<number | null>(null);
```

**Profile fetch extension** (line 45 — add `birthday_year` to select + state):
```typescript
supabase
  .from('profiles')
  .select('display_name, avatar_url, birthday_month, birthday_day, birthday_year')
  .eq('id', session.user.id)
  .single()
  .then(({ data, error }) => {
    if (data && !error) {
      // existing fields...
      setBirthdayYear(data.birthday_year ?? null);
      setOriginalBirthdayYear(data.birthday_year ?? null);
    }
    setLoading(false);
  });
```

**Save guard pattern** (after line 136 — block save if month/day set but year missing):
```typescript
// Birthday year required when month+day are set (D-01)
if (finalMonth !== null && finalDay !== null && birthdayYear === null) {
  Alert.alert('Birthday incomplete', 'Please add your birth year to save your birthday.');
  setSaving(false);
  return;
}
```

**Profile update extension** (line 144 — add `birthday_year`):
```typescript
const { error } = await supabase
  .from('profiles')
  .update({
    display_name: displayName.trim(),
    avatar_url: avatarUrl,
    birthday_month: finalMonth,
    birthday_day: finalDay,
    birthday_year: finalMonth !== null ? birthdayYear : null,  // NEW
    updated_at: new Date().toISOString(),
  })
  .eq('id', session.user.id);
```

**BirthdayPicker call update** (line 223 — wire year prop):
```typescript
<BirthdayPicker
  month={birthdayMonth}
  day={birthdayDay}
  year={birthdayYear}        // NEW
  onChange={(m, d, y) => {   // NEW signature
    setBirthdayMonth(m);
    setBirthdayDay(d);
    setBirthdayYear(y);
  }}
  disabled={saving}
/>
```

**Wish List section** — add below birthday field, above Save button. Use same section label pattern as "Birthday" label (line 222) and card pattern from `IOUCard`/`BirthdayCard`:
```typescript
{/* My Wish List section */}
<Text style={styles.birthdayLabel}>My Wish List</Text>
{/* WishListManageSection component or inline list */}
```

**isDirty extension** (line 162 — add year):
```typescript
const isDirty =
  displayName.trim() !== originalDisplayName ||
  avatarUrl !== originalAvatarUrl ||
  birthdayMonth !== originalBirthdayMonth ||
  birthdayDay !== originalBirthdayDay ||
  birthdayYear !== originalBirthdayYear;  // NEW
```

---

### `src/app/squad/birthdays.tsx` (screen, request-response) — EXTEND

**Analog:** Self — extend the existing file at `/Users/iulian/Develop/campfire/src/app/squad/birthdays.tsx`

**Pressable wrapper for tap-to-navigate** — wrap the existing `BirthdayRow` View in a Pressable (same pattern as `IOUCard`/`BirthdayCard` which use `Pressable` with `router.push`):
```typescript
import { Pressable, ... } from 'react-native';
import { useRouter } from 'expo-router';

function BirthdayRow({ entry }: BirthdayRowProps) {
  const router = useRouter();
  const isToday = entry.days_until === 0;
  // ...existing labels...

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isToday && { backgroundColor: TODAY_BG },
        pressed && { opacity: 0.75 },
      ]}
      onPress={() =>
        router.push(
          `/squad/birthday/${entry.friend_id}?name=${encodeURIComponent(entry.display_name)}` as never
        )
      }
      testID="birthday-row"
    >
      {/* existing content unchanged */}
    </Pressable>
  );
}
```

**"Turning N" label addition** (after `dateLabel` line 57):
```typescript
const dateLabel = formatBirthdayDate(entry.birthday_month, entry.birthday_day);
const ageLabel =
  entry.birthday_year !== null
    ? formatTurningAge(entry.birthday_year, entry.birthday_month, entry.birthday_day)
    : null;
const daysLabel = formatDaysUntil(entry.days_until);

// In render:
<Text style={styles.rowDate}>
  {[dateLabel, ageLabel, daysLabel].filter(Boolean).join(' · ')}
</Text>
```

---

### `src/app/squad/_layout.tsx` (config) — EXTEND

**Analog:** Self — extend the existing file at `/Users/iulian/Develop/campfire/src/app/squad/_layout.tsx`

**Register new route** (after line 18 — same `Stack.Screen` pattern as existing entries):
```typescript
<Stack.Screen name="birthday/[id]" options={{ title: 'Birthday' }} />
```

---

### `src/app/squad/birthday/[id].tsx` (screen, request-response) — NEW

**Analog:** `src/app/squad/expenses/[id].tsx`

**Imports pattern** (lines 1-10 of expenses/[id].tsx):
```typescript
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
```

**Route param extraction pattern** (line 13 of expenses/[id].tsx):
```typescript
const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
```

**Loading / error / data guard pattern** (lines 17-41 of expenses/[id].tsx):
```typescript
if (loading) {
  return (
    <ScrollView style={styles.container}>
      {/* skeleton rows */}
    </ScrollView>
  );
}

if (error || !data) {
  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.interactive.accent} />}
    >
      <Text style={styles.errorText}>{error ?? "Couldn't load. Pull down to refresh."}</Text>
    </ScrollView>
  );
}
```

**ScrollView with RefreshControl pattern** (lines 44-77 of expenses/[id].tsx):
```typescript
return (
  <ScrollView
    style={styles.container}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={COLORS.interactive.accent} />}
  >
    {/* Sections: WishListSection, FriendPickerSection, Plan Birthday button */}
  </ScrollView>
);
```

**Section label style** (lines 59-64 of expenses/[id].tsx):
```typescript
<Text style={styles.participantsLabel}>
  Wish List
</Text>
```

**Navigation to group chat** — same pattern as `room.tsx` route push:
```typescript
router.push(
  `/chat/room?group_channel_id=${groupChannelId}&friend_name=${encodeURIComponent(`${name}'s birthday`)}` as never
);
```

---

### `src/hooks/useFriendWishList.ts` (hook, CRUD) — NEW

**Analog:** `src/hooks/useExpenseDetail.ts`

**Hook skeleton pattern** (lines 43-57 of useExpenseDetail.ts):
```typescript
export function useFriendWishList(friendId: string) {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<WishListItemWithClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || !friendId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Query 1: fetch wish_list_items for the friend
    const { data: itemRows, error: itemsErr } = await supabase
      .from('wish_list_items')
      .select('*')
      .eq('user_id', friendId)
      .order('created_at', { ascending: true });

    if (itemsErr) {
      setError("Couldn't load wish list.");
      setLoading(false);
      return;
    }

    // Query 2: fetch claims for those items (RLS hides claims from item owner)
    const itemIds = (itemRows ?? []).map((i) => i.id);
    const { data: claimRows } = await supabase
      .from('wish_list_claims')
      .select('item_id, claimer_id')
      .in('item_id', itemIds);

    // Build items with claim info
    const claimedByMe = new Set((claimRows ?? []).filter(c => c.claimer_id === userId).map(c => c.item_id));
    const claimedByAnyone = new Set((claimRows ?? []).map(c => c.item_id));

    setItems(
      (itemRows ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url ?? null,
        notes: item.notes ?? null,
        isClaimed: claimedByAnyone.has(item.id),
        isClaimedByMe: claimedByMe.has(item.id),
      }))
    );
    setLoading(false);
  }, [userId, friendId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Toggle claim — follows settle() pattern from useExpenseDetail lines 136-178
  const toggleClaim = useCallback(async (itemId: string, currentlyClaimed: boolean) => {
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
    await refetch();
  }, [userId, refetch]);

  return { items, loading, error, refetch, toggleClaim };
}
```

---

### `src/hooks/useMyWishList.ts` (hook, CRUD) — NEW

**Analog:** `src/hooks/useExpenseDetail.ts` (fetch shape) + `src/hooks/useFriends.ts` (insert/update pattern)

**Hook imports pattern** (lines 1-4 of useExpenseDetail.ts):
```typescript
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
```

**Fetch pattern** (same `useCallback` + `useEffect` structure as useUpcomingBirthdays lines 33-54):
```typescript
const refetch = useCallback(async () => {
  if (!userId) { setLoading(false); return; }
  setLoading(true);
  setError(null);
  const { data, error: fetchErr } = await supabase
    .from('wish_list_items')
    .select('id, title, url, notes, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (fetchErr) {
    setError(fetchErr.message);
    setItems([]);
  } else {
    setItems((data ?? []) as WishListItem[]);
  }
  setLoading(false);
}, [userId]);
```

**Mutation pattern** (same `{ error: Error | null }` return as `useFriends` actions, lines 171-207):
```typescript
async function addItem(title: string, url?: string, notes?: string) {
  if (!userId) return { error: new Error('Not authenticated') };
  const { error } = await supabase
    .from('wish_list_items')
    .insert({ user_id: userId, title, url: url ?? null, notes: notes ?? null });
  if (!error) await refetch();
  return { error };
}

async function deleteItem(itemId: string) {
  if (!userId) return { error: new Error('Not authenticated') };
  const { error } = await supabase
    .from('wish_list_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);  // belt-and-suspenders; RLS also enforces this
  if (!error) await refetch();
  return { error };
}
```

---

### `src/hooks/useFriendsOfFriend.ts` (hook, request-response) — NEW

**Analog:** `src/hooks/useUpcomingBirthdays.ts` (RPC call pattern, lines 26-57)

**Exact structure to copy:**
```typescript
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface FriendOfFriend {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useFriendsOfFriend(targetUserId: string) {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const [friends, setFriends] = useState<FriendOfFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || !targetUserId) {
      setLoading(false);
      setFriends([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_friends_of', {
      p_target_user: targetUserId,
    });
    if (rpcErr) {
      console.warn('get_friends_of failed', rpcErr);
      setError(rpcErr.message);
      setFriends([]);
    } else {
      // Filter out current user (Pitfall 3 — Research.md)
      const filtered = ((data ?? []) as FriendOfFriend[]).filter(
        (f) => f.friend_id !== userId
      );
      setFriends(filtered);
    }
    setLoading(false);
  }, [userId, targetUserId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { friends, loading, error, refetch };
}
```

---

### `src/hooks/useChatRoom.ts` (hook, event-driven) — EXTEND

**Analog:** Self — extend the existing file at `/Users/iulian/Develop/campfire/src/hooks/useChatRoom.ts`

**Options interface extension** (line 7-10):
```typescript
interface UseChatRoomOptions {
  planId?: string;
  dmChannelId?: string;
  groupChannelId?: string;  // NEW
}
```

**fetchMessages guard extension** (line 53):
```typescript
async function fetchMessages() {
  if (!planId && !dmChannelId && !groupChannelId) return;
  // ...
  } else if (groupChannelId) {
    // Fetch group member user_ids
    const { data: members } = await supabase
      .from('group_channel_members')
      .select('user_id')
      .eq('group_channel_id', groupChannelId);

    const userIds = (members ?? []).map((m) => m.user_id as string);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      for (const p of profiles ?? []) {
        profilesMapRef.current.set(p.id, {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        });
      }
    }
  }
```

**Messages filter extension** (line 108-109 — refactor to avoid broken ternary, Pitfall 4 in RESEARCH.md):
```typescript
const column = planId
  ? 'plan_id'
  : dmChannelId
    ? 'dm_channel_id'
    : 'group_channel_id';
const value = planId ?? dmChannelId ?? groupChannelId;
```

**Realtime filter extension** (line 160 — same refactor):
```typescript
const filter = planId
  ? `plan_id=eq.${planId}`
  : dmChannelId
    ? `dm_channel_id=eq.${dmChannelId}`
    : `group_channel_id=eq.${groupChannelId}`;

const channelName = `chat-${planId ?? dmChannelId ?? groupChannelId}`;
```

**sendMessage insert extension** (line 250-255 — add `group_channel_id`):
```typescript
const { error: insertError } = await supabase.from('messages').insert({
  plan_id: planId ?? null,
  dm_channel_id: dmChannelId ?? null,
  group_channel_id: groupChannelId ?? null,  // NEW
  sender_id: currentUserId,
  body,
});
```

**Optimistic message extension** (line 235-246 — add field):
```typescript
const optimistic: MessageWithProfile = {
  id: tempId,
  plan_id: planId ?? null,
  dm_channel_id: dmChannelId ?? null,
  group_channel_id: groupChannelId ?? null,  // NEW
  sender_id: currentUserId,
  body,
  // ...
};
```

**useEffect deps extension** (line 228):
```typescript
}, [planId, dmChannelId, groupChannelId, session?.user?.id]);
```

---

### `src/components/squad/WishListItem.tsx` (component, request-response) — NEW

**Analog:** `src/components/squad/CompactFriendRow.tsx` (row with avatar + text + action)

Let me check that file briefly to confirm the pattern:

**Pattern to use** — `BirthdayCard`'s `nearestRow` (lines 53-68) + `IOUCard`'s `Pressable` action button:

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';

interface WishListItemProps {
  title: string;
  url: string | null;
  notes: string | null;
  isClaimed: boolean;
  isClaimedByMe: boolean;
  onToggleClaim: () => void;
  readOnly?: boolean;  // true when viewing own wish list (my profile)
}

export function WishListItem({ title, url, notes, isClaimed, isClaimedByMe, onToggleClaim, readOnly }: WishListItemProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textGroup}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {url ? (
          <Text style={styles.url} numberOfLines={1}>{url}</Text>
        ) : null}
        {notes ? (
          <Text style={styles.notes} numberOfLines={2}>{notes}</Text>
        ) : null}
      </View>
      {!readOnly && (
        <Pressable
          style={({ pressed }) => [
            styles.claimButton,
            isClaimedByMe && styles.claimButtonActive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onToggleClaim}
          accessibilityLabel={isClaimedByMe ? 'Unclaim' : isClaimed ? 'Claimed by someone' : 'Claim'}
        >
          <Text style={[styles.claimText, isClaimedByMe && styles.claimTextActive]}>
            {isClaimedByMe ? 'Unclaim' : isClaimed ? 'Claimed' : 'Claim'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
```

Style tokens follow `IOUCard` (lines 71-136): `COLORS.surface.card`, `RADII.lg`, `SPACING.*`, `FONT_SIZE.*`, `FONT_WEIGHT.*`.

---

### `src/app/(tabs)/chat/room.tsx` (screen, request-response) — EXTEND

**Analog:** Self — extend the existing file at `/Users/iulian/Develop/campfire/src/app/(tabs)/chat/room.tsx`

**Param extension** (line 7-10):
```typescript
const { plan_id, dm_channel_id, group_channel_id, friend_name } = useLocalSearchParams<{
  plan_id?: string;
  dm_channel_id?: string;
  group_channel_id?: string;  // NEW
  friend_name?: string;
}>();
```

**ChatRoomScreen prop pass-through** (line 19):
```typescript
return (
  <ChatRoomScreen
    planId={plan_id}
    dmChannelId={dm_channel_id}
    groupChannelId={group_channel_id}  // NEW
    friendName={friend_name}
  />
);
```

---

## Shared Patterns

### SECURITY DEFINER Function Skeleton
**Source:** `supabase/migrations/0015_iou_v1_4.sql` lines 60-82
**Apply to:** All new SECURITY DEFINER helper functions in 0017 migration
```sql
CREATE OR REPLACE FUNCTION public.<function_name>(<params>)
RETURNS <type>
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.<table>
    WHERE <condition using (SELECT auth.uid())>
  );
$$;
```
**Critical:** Always use `(SELECT auth.uid())` not `auth.uid()` directly — avoids repeated function evaluation per row.

### RPC GRANT Pattern
**Source:** `supabase/migrations/0015_iou_v1_4.sql` line 172
**Apply to:** All new RPCs in 0017
```sql
GRANT EXECUTE ON FUNCTION public.<function_name>(<signature>) TO authenticated;
```

### Hook: useCallback + useEffect Fetch
**Source:** `src/hooks/useUpcomingBirthdays.ts` lines 33-56
**Apply to:** `useFriendWishList`, `useMyWishList`, `useFriendsOfFriend`
- Always wrap fetch in `useCallback` with `[userId, ...]` deps
- `useEffect` calls `refetch()` with `[refetch]` dep only
- Silent errors: `console.warn(...)` + set error string, never throw

### Supabase Auth Session Pattern
**Source:** `src/hooks/useUpcomingBirthdays.ts` lines 27-28
**Apply to:** All new hooks
```typescript
const session = useAuthStore((s) => s.session);
const userId = session?.user?.id ?? null;
```

### Router Navigation (Expo Router)
**Source:** `src/components/squad/BirthdayCard.tsx` line 11 + line 37
**Apply to:** `FriendBirthdayPage`, any screen with navigation
```typescript
import { useRouter } from 'expo-router';
const router = useRouter();
router.push('/some/path' as never);
```

### Screen Container Style
**Source:** `src/app/squad/birthdays.tsx` lines 77-82 + `src/app/squad/expenses/[id].tsx` line 81
**Apply to:** `src/app/squad/birthday/[id].tsx`
```typescript
container: { flex: 1, backgroundColor: COLORS.surface.base },
```

### Error Text Style
**Source:** `src/app/squad/expenses/[id].tsx` lines 90-93
**Apply to:** `src/app/squad/birthday/[id].tsx`
```typescript
errorText: {
  fontSize: FONT_SIZE.lg,
  color: COLORS.interactive.destructive,
  padding: SPACING.lg,
},
```

### RefreshControl Tint
**Source:** `src/app/squad/birthdays.tsx` line 43
**Apply to:** All screens with pull-to-refresh
```typescript
tintColor={COLORS.interactive.accent}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All files have direct analogs |

The group member multiselect UI (checkboxes inside `FriendBirthdayPage`) has no prior multiselect component in the codebase. Use the `BirthdayRow` pattern (FlatList rows with `AvatarCircle` + name text) but replace the days label with a checkbox/selected indicator. The `IOUCard` pressed opacity pattern (`pressed && { opacity: 0.85 }`) handles the Pressable feedback.

---

## Metadata

**Analog search scope:** `src/hooks/`, `src/app/squad/`, `src/app/(tabs)/chat/`, `src/components/squad/`, `src/components/common/`, `src/utils/`, `supabase/migrations/`
**Files scanned:** 21
**Pattern extraction date:** 2026-04-17
