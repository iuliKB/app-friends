---
phase: 13-profile-rework-friend-profile
plan: "03"
subsystem: friend-profile
tags: [friend-profile, effective-status, birthday, wish-list, read-only]
dependency_graph:
  requires: []
  provides: [friend-profile-enriched, effective-status-friend-profile, birthday-display, wish-list-read-only]
  affects:
    - src/app/friends/[id].tsx
tech_stack:
  added: []
  patterns: [effective-status-null-handling, birthday-formatting, wish-list-mapped-no-flatlist, read-only-wish-list]
key_files:
  created: []
  modified:
    - src/app/friends/[id].tsx
decisions:
  - statusDot width/height changed from hardcoded 10 to SPACING.sm (8px) — plan said SPACING.xs but SPACING.xs=4px not 8px; SPACING.sm=8px matches the UI-SPEC 8x8 intent
  - Both tasks implemented in single atomic write because all changes target the same file and are logically cohesive; committed as one feat commit
metrics:
  duration_minutes: 2
  completed_date: "2026-04-20"
  tasks_completed: 2
  files_modified: 1
---

# Phase 13 Plan 03: Friend Profile Enrichment Summary

**One-liner:** Enriched friend profile with freshness-aware status (effective_status view, null = omit row), birthday display (Month Day format), and read-only wish list section (mapped WishListItem, no FlatList).

## Changes to friends/[id].tsx

### Task 1: Status data source swap to effective_status view (D-09)

| Change | Before | After |
|--------|--------|-------|
| Status state type | `useState<StatusValue>('free')` | `useState<StatusValue \| null>(null)` |
| Status query table | `from('statuses').select('status, context_tag')` | `from('effective_status').select('effective_status, context_tag')` |
| Status result handling | `if (data && !error) setStatus(data.status)` | `effectiveStatus = (error \|\| !data) ? null : data.effective_status` |
| Status row render | Unconditional | Wrapped in `{status !== null ? (...) : null}` |
| Status dot size | Hardcoded `width: 10, height: 10` | `SPACING.sm` (8px) per UI-SPEC |

**Null handling strategy:** Two distinct cases both resolve to `null`:
1. Friend never set a status: `effective_status` view returns 0 rows → `.single()` returns `PGRST116` error → `statusResult.error` truthy → `effectiveStatus = null`
2. Friend's status expired: view returns 1 row with `effective_status: null` → `statusResult.data.effective_status` is null → `effectiveStatus = null`

Both cases cause the status row to be omitted from the rendered UI.

### Task 2: Birthday display and wish list section (D-10, D-11)

**New imports added:**
- `useFriendWishList` from `@/hooks/useFriendWishList`
- `WishListItem` from `@/components/squad/WishListItem`

**FriendProfile interface extended:**
```typescript
birthday_month: number | null;
birthday_day: number | null;
```

**profiles SELECT updated:** `display_name, username, avatar_url, birthday_month, birthday_day`

**formatBirthday helper** (module-level, before component):
- Uses `MONTH_NAMES` array (12 abbreviated month names, 0-indexed in array, 1-indexed input)
- Returns `"${MONTH_NAMES[month - 1]} ${day}"` — e.g., "Aug 14"

**Birthday row** (below @username, inside topSection):
- Conditional: `{profile.birthday_month && profile.birthday_day ? <Text>...</Text> : null}`
- Style: `FONT_SIZE.md`, `FONT_WEIGHT.regular`, `COLORS.text.secondary`, `marginTop: SPACING.xs`, `textAlign: 'center'`

**useFriendWishList hook call:** `const { items: wishListItems, loading: wishListLoading } = useFriendWishList(id ?? '')`

**Wish list section** (below actionsSection closing `</View>`):
- Section header: `WISH LIST` (plain Text, sectionHeader style)
- Loading: renders nothing while `wishListLoading` is true
- Empty state: `No wish list items.` (emptyWishList style)
- Items: `wishListItems.map(item => <WishListItem ... readOnly={true} />)`
- No FlatList — items mapped directly inside ScrollView (Pitfall 3 avoided)

**WishListItem props passed:** `title`, `url`, `notes`, `isClaimed`, `isClaimedByMe`, `readOnly={true}`
No `claimerName` prop — WishListItem does not accept claimerName in its interface (only used internally by the hook).

## Verification Output

```
grep statuses src/app/friends/[id].tsx                     → 0 matches (PASS)
grep effective_status src/app/friends/[id].tsx              → 4 matches (PASS)
grep "status !== null" src/app/friends/[id].tsx             → 1 match (PASS)
grep useFriendWishList src/app/friends/[id].tsx             → 2 matches (import + hook call) (PASS)
grep WishListItem src/app/friends/[id].tsx                  → 2 matches (import + usage) (PASS)
grep formatBirthday src/app/friends/[id].tsx                → 2 matches (function + call) (PASS)
grep "WISH LIST" src/app/friends/[id].tsx                   → 1 match (PASS)
grep -c "FlatList" src/app/friends/[id].tsx                 → 0 (PASS)
grep -c "readOnly={true}" src/app/friends/[id].tsx          → 1 (PASS)
npx tsc --noEmit                                            → exit 0 (PASS)
npx eslint src/app/friends/[id].tsx --max-warnings 0       → exit 0 (PASS)
Full phase lint (all 4 files) --max-warnings 0             → exit 0 (PASS)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] statusDot token mismatch: plan says SPACING.xs but intent is 8px**
- **Found during:** Task 1 implementation
- **Issue:** Plan Task 1 action step 5 says "use `SPACING.xs` (8px)" but SPACING.xs = 4px (not 8px); SPACING.sm = 8px
- **Fix:** Used `SPACING.sm` (8px) which matches the UI-SPEC 8x8 intent stated in the same sentence
- **Files modified:** `src/app/friends/[id].tsx`
- **Commit:** 7fc24c0

**2. [Rule 1 - Bug] Prettier formatting on effectiveStatus ternary**
- **Found during:** ESLint --max-warnings 0 run after initial write
- **Issue:** Multi-condition ternary `statusResult.error || !statusResult.data ? null : ...` was written inline; Prettier requires wrapped format
- **Fix:** `npx eslint --fix` applied; ternary reformatted to 3-line Prettier-compliant style
- **Files modified:** `src/app/friends/[id].tsx`
- **Commit:** 7fc24c0

## Known Stubs

None. All functionality is fully wired:
- `effective_status` view query: live Supabase query, both null cases handled
- Birthday: fetched from `profiles` SELECT, conditionally rendered
- `useFriendWishList`: live Supabase query, returns real wish list items
- `WishListItem` with `readOnly={true}`: renders title/url/notes, no claim button

## Threat Flags

No new threat surface beyond the plan's threat model (T-13-03-01 through T-13-03-04):
- T-13-03-02 mitigated: `effective_status` view used (not `statuses` table); NULL = no active status, row omitted
- T-13-03-03 accepted: `readOnly={true}` means no claim UI is rendered regardless of `isClaimed`/`isClaimedByMe` values
- T-13-03-04 accepted: No mutation possible; `toggleClaim` from hook is not called in this context

## Self-Check: PASSED

- `src/app/friends/[id].tsx` exists: FOUND
- Task commit 7fc24c0: FOUND (`git log --oneline | grep 7fc24c0`)
- `from('statuses')` absent: CONFIRMED (count = 0)
- `from('effective_status')` present: CONFIRMED (count = 1 in query)
- `status !== null` conditional: CONFIRMED (count = 1)
- `StatusValue | null` type: CONFIRMED
- `effectiveStatus` variable: CONFIRMED
- `birthday_month, birthday_day` in SELECT: CONFIRMED
- `formatBirthday` function: CONFIRMED (count = 2)
- `useFriendWishList`: CONFIRMED (count = 2)
- `WishListItem` import + usage: CONFIRMED (count = 2)
- `WISH LIST` section header: CONFIRMED (count = 1)
- `No wish list items.`: CONFIRMED (count = 1)
- FlatList absent: CONFIRMED (count = 0)
- `readOnly={true}`: CONFIRMED (count = 1)
- tsc --noEmit: PASS
- eslint --max-warnings 0 (single file): PASS
- eslint --max-warnings 0 (full phase, 4 files): PASS
