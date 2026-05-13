---
phase: 33-friend-profile-redesign
plan: 07
subsystem: profile-edit, bio-editor
tags: [screen, bio-editor, profile-edit, mutation-wiring, phase-33]

# Dependency graph
requires:
  - plan: 33-01
    provides: useUpdateMyBio hook, profiles.bio column

provides:
  - Bio TextInput on /profile/edit with 160-char counter, color flip above 144, save via useUpdateMyBio

affects:
  - src/app/profile/edit.tsx (bio field added inside existing card)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useUpdateMyBio wired into existing screen; bio save fires AFTER display_name+birthday raw write in handleSave"
    - "(supabase as any) cast on .from('profiles').select() + { data: any; error: any } callback annotation — database.ts regen deferred per Phase 31/32/33 precedent"

key-files:
  created: []
  modified:
    - src/app/profile/edit.tsx

key-decisions:
  - "Bio save fires AFTER the existing display_name+birthday raw write — partial failure mode: display_name+birthday saved, bio fails → user sees Alert and originalBio snapshot NOT advanced (retry possible)"
  - "(supabase as any) cast required on the entire query chain because adding bio to the select string produces a SelectQueryError from the un-regenerated database.ts; explicit { data: any; error: any } annotation on .then() callback resolves implicit-any tsc errors"
  - "canSave guards on both saving and savingBio — button is disabled while either mutation is in-flight"

# Metrics
duration: 3min
completed: 2026-05-13
---

# Phase 33 Plan 07: Bio Editor on /profile/edit Summary

**Bio TextInput added to the existing /profile/edit card with 160-char counter, per-UI-SPEC color flip at 144 chars, and save routed through useUpdateMyBio (Plan 01 Pattern 5 hook) — existing display_name + birthday raw-write path preserved verbatim**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-13T20:02:45Z
- **Completed:** 2026-05-13T20:05:35Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Bio field renders in the existing `card` View on `/profile/edit`, inserted after the birthday row with a divider separator (consistent with display_name and username rows)
- Char counter `{bio.length}/160` in `colors.text.secondary`, flips to `colors.feedback.error` when `bio.length > 144` (last 16 chars soft warning per UI-SPEC §Copywriting line 515)
- `isDirty` extended with `bio.trim() !== originalBio` — Save button enables when bio changes
- Save order: existing `supabase.from('profiles').update(...)` for display_name + birthday fires first; bio update via `updateBio(bio.trim() || null)` fires second only if bio changed
- `(supabase as any)` cast applied to the select query chain + explicit `{ data: any; error: any }` annotation resolves tsc implicit-any errors from un-regenerated database.ts
- tsc: zero errors in `profile/edit.tsx`; full test suite (48 tests across useUpdateMyBio + mutationShape) green

## Task Commits

1. **Task 1: Bio editor on /profile/edit** — `0f8cb00` (feat)

## Files Created/Modified

- `src/app/profile/edit.tsx` — bio field added; +66 lines, -6 lines (net +60)

## Insertion Point

The bio field was inserted at approximately **line 300** in the final file (after the birthday `BirthdayPicker` row, preceded by a `<View style={styles.divider} />`). The field UI occupies lines 302–329 in the committed file.

## Existing handleSave Raw Write: Preserved Verbatim

The existing `supabase.from('profiles').update({ display_name, birthday_month, birthday_day, birthday_year, updated_at }).eq('id', session.user.id)` block (original lines 79–96) was left **completely untouched**. The bio save block is an additive `if (bio.trim() !== originalBio) { ... }` inserted after that block, before `router.back()`.

## Save-Order Policy

1. Existing raw write (display_name + birthday) fires first via `supabase.from('profiles').update(...)`
2. Bio update fires via `await updateBio(trimmedBio.length === 0 ? null : trimmedBio)` only when `bio.trim() !== originalBio`
3. If the raw write fails → function returns early (Alert shown); bio update never fires
4. If bio update fails → Alert shown, `setSaving(false)`, `originalBio` snapshot NOT advanced (user can retry)
5. Only when both succeed → `router.back()` is called

## Existing Tests: Still Passing

- `useFriendProfile.test.ts`: 4 tests, all passing
- `useUpdateMyBio.test.ts`: 7 tests (part of 48-test mutationShape run), all passing
- `mutationShape.test.ts` (46 tests): all passing
- No `profile/__tests__/edit.test.tsx` exists — none was required (UI-only change; mutation logic tested by Plan 01)

## database.ts Regen Note

The `(supabase as any)` cast at the select query site is a known Phase 33/31/32 pattern (STATE.md lines 165–166). The `profiles.bio` column exists on the live database (migration 0027 applied in Plan 01) but `database.ts` has not been regenerated. The cast matches the pattern used in Phase 29.1 habits hooks and Phase 32 polls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] supabase typed query chain rejects `bio` in select string**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** Adding `bio` to `.select('..., bio')` caused the Supabase type-gen to return `SelectQueryError<"column 'bio' does not exist on 'profiles'.">` instead of the row type, propagating tsc errors on every field access (display_name, birthday_month, etc.)
- **Fix:** Applied `(supabase as any)` cast to the entire query chain (same pattern as Phase 32-01 polls table). Added explicit `{ data: any; error: any }` annotation on the `.then()` callback to resolve implicit-any tsc errors. Removed the now-redundant `(data as any).bio` inner cast (data is already `any`).
- **Files modified:** `src/app/profile/edit.tsx` (hydrate block only)
- **Commit:** `0f8cb00` (same commit — caught during pre-commit tsc check)

**Total deviations:** 1 auto-fixed (tsc error from un-regenerated database.ts — expected pattern, not a new issue)

## Known Stubs

None — the bio field is fully wired: hydrates from `profiles.bio`, saves via `useUpdateMyBio`, `isDirty` guard prevents spurious saves, empty trim converts to NULL.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The bio field reads via the existing `profiles` select query (already within `profiles_select_authenticated` RLS). The bio write goes through `useUpdateMyBio` which scopes to `.eq('id', userId)` matching `profiles_update_own` RLS. Threat T-33-29 (Save spam DoS) mitigated by `loading={saving || savingBio}` and `disabled={!canSave}` on PrimaryButton. Threat T-33-30 (whitespace-only bio) mitigated by `bio.trim()` + null conversion.

## Self-Check: PASSED

- `src/app/profile/edit.tsx` modified and committed ✓
- `grep -c "useUpdateMyBio" src/app/profile/edit.tsx` → 3 (import + call + saving destructure) ✓
- `grep -c "const \[bio, setBio\]"` → 1 ✓
- `grep -c "const \[originalBio, setOriginalBio\]"` → 1 ✓
- `grep -c "bio.trim() !== originalBio"` → 2 (isDirty + handleSave guard) ✓
- `grep -c "maxLength={160}"` → 1 ✓
- `grep -c "{bio.length}/160"` → 1 ✓
- `grep -c "bio.length > 144"` → 1 ✓
- `grep -c "A short something about you"` → 2 (placeholder + hint) ✓
- `grep -c "colors.feedback.error"` → 1 ✓
- `grep -c "chatbubble-ellipses-outline"` → 1 ✓
- `grep -c "multiline"` → 2 (prop + numberOfLines) ✓
- `grep -c "bioTextInput"` → 2 (style key + use) ✓
- `grep -c "textAlignVertical: 'top'"` → 1 ✓
- `grep -c "await updateBio"` → 1 ✓
- Commit `0f8cb00` exists in git log ✓
- tsc: zero errors in profile/edit.tsx ✓
- Tests: 48 passing ✓

---
*Phase: 33-friend-profile-redesign*
*Completed: 2026-05-13*
