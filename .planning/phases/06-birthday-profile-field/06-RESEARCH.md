# Phase 6: Birthday Profile Field - Research

**Researched:** 2026-04-12
**Domain:** React Native inline dropdown UI + Supabase profile field integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Two inline dropdowns side by side — Month dropdown + Day dropdown. Day options update dynamically based on the selected month (e.g., Feb shows 1–29, Apr shows 1–30).
- **D-02:** Feb 29 is selectable but normalized to Feb 28 at save time so the value is valid in non-leap years (matches SC-3).
- **D-03:** Birthday field placed below the display name TextInput, above the Save button. Natural flow: avatar → name → birthday → save. No section dividers needed.
- **D-04:** Label text: "Birthday" (no "(optional)" suffix — blank state with placeholder text makes optionality clear).

### Claude's Discretion
- Month dropdown format: full names vs abbreviations — pick what fits the layout best
- Display format when reopening: pre-selected dropdowns vs read-only text. Lean toward dropdowns pre-selected (input IS the display) for simplicity, but free to choose.
- Dropdown styling: match existing form field patterns (COLORS.surface.card background, RADII.lg, etc.)
- Placeholder text when no birthday is set (e.g., "Month" / "Day")
- Whether to show a "Clear" option for removing a previously saved birthday

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BDAY-01 | User can add their birthday (month + day) to their profile, visible to friends | Schema already exists (migration 0016); client integration in edit.tsx; dropdown UI with dynamic day list; Supabase select/update; dirty-tracking extension |
</phase_requirements>

---

## Summary

Phase 6 is a focused UI integration phase: the birthday columns exist in Supabase (migration 0016, applied in Phase 5) and the TypeScript types need updating. The only new work is adding two inline dropdowns to `src/app/profile/edit.tsx`, wiring them to the existing select/update pattern, and enforcing the Feb 29 → Feb 28 normalization on save.

There is no native date picker involved. The locked decision (D-01) is two custom inline dropdowns built from `TouchableOpacity` + `Modal` — the same pattern used elsewhere in the codebase. `@react-native-community/datetimepicker` is installed but is used for date+time pickers in plan creation and morning prompt; a day-picker that hides the year does not map naturally to the DateTimePicker API, making custom dropdowns the correct call here.

The implementation is small (one screen file, one updated type file, no new npm packages) and can be completed in two plans: (1) types + dropdown component + screen wiring, and (2) end-to-end verification tests.

**Primary recommendation:** Build a self-contained `BirthdayPicker` component using `TouchableOpacity` + `Modal` + `ScrollView` (or `FlatList`) following the FriendActionSheet pattern. Wire it directly into `edit.tsx` without a custom hook; extend the existing `isDirty` / `handleSave` logic.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native `TouchableOpacity` + `Modal` | bundled (RN 0.83.2) | Custom dropdown overlay | Already the pattern for action sheets; no extra dependency |
| `@supabase/supabase-js` | ^2.99.2 | Profile read/write | Already used in edit.tsx; no wrapper needed |

### No New Dependencies Required
The project already has everything needed. [VERIFIED: package.json]
- `@react-native-community/datetimepicker` 8.6.0 — installed but NOT used here (no year suppression API)
- `react-native-gesture-handler`, `react-native-reanimated` — available but unnecessary for simple dropdowns

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Modal dropdown | `@react-native-community/datetimepicker` mode="date" | DateTimePicker always includes year; no supported "month+day only" mode — wrong tool |
| Custom Modal dropdown | Native `Picker` from `@react-native-picker/picker` | Not installed; would need a new dependency; cross-platform styling is awkward |
| Custom Modal dropdown | Inline `ScrollView` column spinners | More complex to build; overkill for 12-month + 31-day selection |

---

## Architecture Patterns

### Recommended Project Structure
No new directories needed. Two files change + one new component file:

```
src/
├── app/profile/
│   └── edit.tsx                    ← extend: add birthday state + BirthdayPicker
├── components/common/
│   └── BirthdayPicker.tsx          ← NEW: self-contained inline dropdowns
└── types/
    └── database.ts                 ← extend: add birthday_month, birthday_day to profiles
```

### Pattern 1: Custom Inline Dropdown (established project pattern)
**What:** A `TouchableOpacity` that displays the current selection (or placeholder text), triggers a `Modal` overlay with `ScrollView` list of options. Animates via `Animated.timing` identical to `FriendActionSheet`.
**When to use:** Any selection from a small finite list where a native picker adds complexity or looks wrong.

Existing example: `FriendActionSheet.tsx` — `Modal visible={visible} transparent animationType="none"`, `TouchableWithoutFeedback` backdrop, `Animated.View` sliding up with `translateY`. [VERIFIED: src/components/friends/FriendActionSheet.tsx]

**BirthdayPicker props interface:**
```typescript
// Source: inferred from edit.tsx patterns + FriendActionSheet pattern
interface BirthdayPickerProps {
  month: number | null;   // 1-12 or null
  day: number | null;     // 1-31 (max depends on month) or null
  onChange: (month: number | null, day: number | null) => void;
  disabled?: boolean;
}
```

### Pattern 2: Dynamic Day Count Per Month
**What:** A `getDaysInMonth(month)` helper that returns the max day for the given month. Feb always returns 29 (matching the DB CHECK constraint which allows 1-29 for month=2). The Feb 29 → Feb 28 normalization happens only at save time, not in the dropdown UI.

```typescript
// Source: migration 0016 CHECK constraint + D-02 decision
function getDaysInMonth(month: number): number {
  const daysPerMonth: Record<number, number> = {
    1: 31, 2: 29, 3: 31, 4: 30,
    5: 31, 6: 30, 7: 31, 8: 31,
    9: 30, 10: 31, 11: 30, 12: 31,
  };
  return daysPerMonth[month] ?? 31;
}
```

When `month` changes and the currently selected `day` exceeds the new max, reset `day` to `null` (not clamp silently — forces re-selection, prevents invalid combos).

### Pattern 3: Extending isDirty + handleSave in edit.tsx
**What:** The edit screen tracks `originalDisplayName` / `originalAvatarUrl` vs current state. Birthday adds two more fields to this pattern.

```typescript
// Source: src/app/profile/edit.tsx (existing pattern, extended)
const [birthdayMonth, setBirthdayMonth] = useState<number | null>(null);
const [birthdayDay, setBirthdayDay] = useState<number | null>(null);
const [originalBirthdayMonth, setOriginalBirthdayMonth] = useState<number | null>(null);
const [originalBirthdayDay, setOriginalBirthdayDay] = useState<number | null>(null);

// isDirty extension
const isDirty =
  displayName.trim() !== originalDisplayName ||
  avatarUrl !== originalAvatarUrl ||
  birthdayMonth !== originalBirthdayMonth ||
  birthdayDay !== originalBirthdayDay;
```

**Feb 29 normalization at save time (D-02):**
```typescript
// Applied in handleSave before the .update() call
const saveMonth = birthdayMonth;
const saveDay =
  birthdayMonth === 2 && birthdayDay === 29 ? 28 : birthdayDay;

await supabase.from('profiles').update({
  display_name: displayName.trim(),
  avatar_url: avatarUrl,
  birthday_month: saveMonth,
  birthday_day: saveDay,
  updated_at: new Date().toISOString(),
}).eq('id', session.user.id);
```

**Select extension (useEffect):**
```typescript
// Add birthday_month, birthday_day to the .select() call
supabase
  .from('profiles')
  .select('display_name, avatar_url, birthday_month, birthday_day')
  ...
  .then(({ data, error }) => {
    if (data && !error) {
      setBirthdayMonth(data.birthday_month ?? null);
      setBirthdayDay(data.birthday_day ?? null);
      setOriginalBirthdayMonth(data.birthday_month ?? null);
      setOriginalBirthdayDay(data.birthday_day ?? null);
      // ... existing fields
    }
  });
```

### Pattern 4: TypeScript Types Update
The `profiles` Row/Insert/Update in `src/types/database.ts` do not yet include `birthday_month` / `birthday_day`. [VERIFIED: src/types/database.ts — birthday fields absent]

```typescript
// Add to profiles.Row, Insert, Update (following existing nullable smallint pattern)
birthday_month: number | null;  // Row
birthday_day: number | null;    // Row

birthday_month?: number | null; // Insert
birthday_day?: number | null;   // Insert

birthday_month?: number | null; // Update
birthday_day?: number | null;   // Update
```

Also add a `Profile` convenience alias extension or ensure the existing `Profile = Tables<'profiles'>` picks up the new fields automatically once Row is extended.

### Anti-Patterns to Avoid
- **Using DateTimePicker for year-less birthday:** No supported mode hides the year. Selecting a date then discarding the year silently creates user confusion and a bad UX. [ASSUMED — based on @react-native-community/datetimepicker API knowledge; no year-suppression mode documented]
- **Clamping day silently on month change:** If user picks Feb 31 and then changes month, silently clamping to 28 can save wrong data without user awareness. Reset to null instead — forces re-selection.
- **Saving Feb 29 without normalization:** The DB CHECK allows birthday_day = 29 for birthday_month = 2. However, the business rule (D-02) says save as Feb 28. Apply normalization in handleSave, not in the dropdown UI — lets the user see "Feb 29" selected before saving, but stores "Feb 28".
- **Forgetting to extend isDirty:** If birthday fields are not part of isDirty, the Save button stays disabled when only birthday changes. This would break SC-1 (user can save successfully).
- **Hardcoded magic numbers without tokens:** The no-hardcoded-styles ESLint rule enforces use of `COLORS.*`, `SPACING.*`, `RADII.*`, `FONT_SIZE.*`. Any exception requires `// eslint-disable-next-line campfire/no-hardcoded-styles` with a comment. [VERIFIED: edit.tsx + FriendActionSheet.tsx patterns]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month names list | Custom locale lookup | `['January', 'February', ..., 'December']` static array | 12 months, stable, no i18n needed in this app |
| Day count per month | Complex Date API calls | Simple lookup table keyed by month number | Simpler, no timezone edge cases |
| Dropdown animation | Reanimated complex sequence | `Animated.timing` translateY (same as FriendActionSheet) | Already proven pattern, zero new dependency |
| Database type update | Supabase CLI re-gen | Manual add to database.ts | Migration already applied; manual patch is faster and avoids re-gen side effects |

**Key insight:** This phase has zero new npm dependencies and zero new Supabase migrations. All complexity is UI state management in one screen.

---

## Common Pitfalls

### Pitfall 1: TypeScript Type Error on Supabase Query
**What goes wrong:** `data.birthday_month` TypeScript error because the `profiles.Row` type doesn't include the column yet — even though the column exists in the DB.
**Why it happens:** `database.ts` was last manually updated in Phase 5, and the birthday fields were added to the DB but not to the TypeScript types.
**How to avoid:** Update `database.ts` in the same plan as the screen changes. Make it the first task.
**Warning signs:** TypeScript compiler error on `.select('display_name, avatar_url, birthday_month, birthday_day')` result access.

### Pitfall 2: Day Dropdown Not Resetting When Month Changes
**What goes wrong:** User picks Feb 31 (invalid), then switches month to February — `day` state still holds 31, which exceeds the new max of 29.
**Why it happens:** State is set independently; no cross-dependency handling.
**How to avoid:** In `BirthdayPicker.onChange` (or wherever month is updated), check `if (newDay > getDaysInMonth(newMonth)) reset day to null`.
**Warning signs:** Save succeeds with a day value that violates the DB CHECK constraint → Supabase returns a 400 error.

### Pitfall 3: Save Button Stays Disabled After Birthday-Only Change
**What goes wrong:** User opens edit screen with no birthday → adds birthday → Save button remains disabled.
**Why it happens:** `isDirty` was not extended to include birthday fields.
**How to avoid:** Extend `isDirty` to compare `birthdayMonth !== originalBirthdayMonth || birthdayDay !== originalBirthdayDay`.
**Warning signs:** SC-1 fails (user cannot save birthday).

### Pitfall 4: canSave Gate Too Strict
**What goes wrong:** `canSave` currently requires `displayName.trim().length > 0`. If a user with a valid display name only wants to update their birthday, canSave might be false if dirty check is wrong.
**Why it happens:** Display name validation is separate from dirty check. The existing pattern is correct — `canSave = displayName.trim().length > 0 && isDirty && !saving`. Birthday does not add new validation requirements (blank birthday is valid per SC-4).
**How to avoid:** No change to canSave validation logic needed — only extend isDirty.

### Pitfall 5: Birthday Null vs. Both-Null Invariant
**What goes wrong:** User selects a month but not a day (or vice versa) and saves. DB CHECK constraint requires both fields to be consistent — but the compound CHECK only fires if both are non-null. A half-filled state (month=2, day=null) is DB-valid but semantically wrong.
**Why it happens:** Two independent dropdowns can diverge.
**How to avoid:** In handleSave, treat "one field set but not the other" as an error state. Either: (a) disable Save if month XOR day is set, or (b) clear both fields if either is null at save time (treat partial selection as "no birthday"). Option (b) matches the "blank is valid" requirement (SC-4).
**Warning signs:** Profile shows a month with no day, or day with no month — confusing UI in Phase 7.

### Pitfall 6: Modal Overlay on Android Z-Index
**What goes wrong:** The dropdown modal overlaps the scroll view but the backdrop doesn't cover the keyboard on Android.
**Why it happens:** Android keyboard and Modal z-order differ from iOS.
**How to avoid:** Use `keyboardShouldPersistTaps="handled"` on the outer `ScrollView` (already set in edit.tsx). Dismiss keyboard before opening dropdown: `Keyboard.dismiss()` in the dropdown onPress handler.

---

## Code Examples

Verified patterns from the existing codebase:

### Animated Bottom Sheet Modal (FriendActionSheet pattern)
```typescript
// Source: src/components/friends/FriendActionSheet.tsx
const translateY = useRef(new Animated.Value(300)).current;

useEffect(() => {
  if (visible) {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  } else {
    translateY.setValue(300);
  }
}, [visible, translateY]);

// In JSX:
<Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
  <TouchableWithoutFeedback onPress={onClose}>
    <View style={styles.backdrop} />
  </TouchableWithoutFeedback>
  <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
    {/* content */}
  </Animated.View>
</Modal>
```

### Supabase Profile Update Pattern (edit.tsx)
```typescript
// Source: src/app/profile/edit.tsx
const { error } = await supabase
  .from('profiles')
  .update({
    display_name: displayName.trim(),
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  })
  .eq('id', session.user.id);
```

### Form Field Styling Tokens (edit.tsx)
```typescript
// Source: src/app/profile/edit.tsx styles
textInput: {
  backgroundColor: COLORS.surface.card,
  borderRadius: RADII.lg,        // 12
  height: 52,
  paddingHorizontal: SPACING.lg, // 16
  fontSize: FONT_SIZE.lg,        // 16
  color: COLORS.text.primary,
},
```

### Birthday Dropdown Display (Claude's discretion — abbreviated months fit better side-by-side)
```typescript
// Abbreviated month names fit in a side-by-side layout without truncation
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
// Full names available for accessibility label (accessibilityLabel prop)
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Birthday stored as TIMESTAMPTZ | Separate birthday_month + birthday_day smallint columns | Phase 5 / v1.4 roadmap decision | No timezone off-by-one-day errors; simpler client code |
| `plans.iou_notes` field | `plans.general_notes` | Phase 5 migration 0015 | Already migrated; database.ts already updated |

**Deprecated/outdated:**
- `FormField` component: designed for TextInput only (no `onChangeText` substitute for dropdown); not reusable for this case — create a new `BirthdayPicker` component instead.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@react-native-community/datetimepicker` has no supported "year-less" mode for month+day-only birthday input | Architecture Patterns (anti-patterns) | Low — if a year-suppression API exists, could use it instead of custom dropdowns; decision already locked to custom dropdowns (D-01) regardless |
| A2 | Abbreviated month names (Jan–Dec) fit in side-by-side dropdown without truncation on a 375px screen with SPACING.lg padding | Code Examples | Low — if they don't fit, use full names in a full-width single-column layout instead |

**All other claims in this research were verified against the codebase.**

---

## Open Questions

1. **Clear birthday button (Claude's discretion)**
   - What we know: Blank birthday is valid (SC-4); the DB allows NULL
   - What's unclear: Whether to add a "Clear" button once a birthday is set
   - Recommendation: Add a small "Clear" link/button below the dropdowns if both fields are set. Sends `birthday_month: null, birthday_day: null` in the update payload. Simple to implement, needed for users who want to remove their birthday.

2. **isDirty with clearing birthday**
   - What we know: `originalBirthdayMonth` and `originalBirthdayDay` are loaded from DB
   - What's unclear: If user clears birthday (sets both to null) when the original was also null, isDirty should be false
   - Recommendation: The `birthdayMonth !== originalBirthdayMonth` check handles this correctly since `null !== null` is false — no special case needed.

---

## Environment Availability

Step 2.6: This phase is purely UI + client code changes with no new external dependencies. All required tools are confirmed present from Phase 5 execution.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@supabase/supabase-js` | Profile read/write | Yes | ^2.99.2 | — |
| Supabase project (remote) | DB columns exist | Yes | migration 0016 applied | — |
| React Native (Expo SDK 55) | UI components | Yes | RN 0.83.2 | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright |
| Config file | `playwright.config.ts` (project root) |
| Quick run command | `npx playwright test tests/visual/design-system.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BDAY-01 | Birthday dropdowns appear in profile edit screen | visual / e2e | `npx playwright test tests/visual/birthday-profile.spec.ts` | No — Wave 0 gap |
| BDAY-01 | Round-trip: save month+day, reopen, verify pre-selected | e2e / manual | `npx playwright test tests/visual/birthday-profile.spec.ts` | No — Wave 0 gap |
| BDAY-01 | Feb 29 normalized to Feb 28 on save | e2e / manual | Manual or e2e in spec | No — Wave 0 gap |
| BDAY-01 | Blank birthday: no error, save button behaves correctly | e2e / manual | Manual or e2e in spec | No — Wave 0 gap |

### Sampling Rate
- **Per task commit:** TypeScript compile check (`npx tsc --noEmit`)
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green + manual smoke test on Expo Go before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/visual/birthday-profile.spec.ts` — covers BDAY-01 (edit screen screenshot + round-trip)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | Yes | Existing RLS UPDATE policy `WITH CHECK (id = auth.uid())` covers new columns — no policy change needed [VERIFIED: migration 0016 comment] |
| V5 Input Validation | Yes | Client: reject partial birthday (month XOR day); DB: CHECK constraint enforces valid day-per-month range |
| V6 Cryptography | No | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Profile update spoofing (write another user's birthday) | Tampering | RLS UPDATE policy restricts to `id = auth.uid()` — already in place |
| Invalid day value for month (e.g. April 31) | Tampering | DB compound CHECK constraint in migration 0016 rejects invalid combos server-side |
| Feb 29 written in non-leap context | Tampering | Client normalization to Feb 28 at save time; DB allows 1-29 for month=2 so no DB-level rejection needed |

---

## Sources

### Primary (HIGH confidence)
- `src/app/profile/edit.tsx` — edit screen structure, isDirty pattern, Supabase update pattern [VERIFIED in session]
- `src/components/friends/FriendActionSheet.tsx` — Modal + Animated.timing dropdown pattern [VERIFIED in session]
- `supabase/migrations/0016_birthdays_v1_4.sql` — exact CHECK constraints, column definitions [VERIFIED in session]
- `src/types/database.ts` — confirms birthday fields absent from TypeScript types [VERIFIED in session]
- `package.json` — confirms @react-native-community/datetimepicker 8.6.0 installed, no picker/dropdown libs present [VERIFIED in session]
- `src/theme/` — all design tokens (COLORS, SPACING, RADII, FONT_SIZE, FONT_WEIGHT) [VERIFIED in session]

### Secondary (MEDIUM confidence)
- `.planning/phases/06-birthday-profile-field/06-CONTEXT.md` — locked decisions D-01..D-04, code context, canonical references [VERIFIED in session]
- `.planning/STATE.md` — v1.4 roadmap decisions including birthday column approach and "zero new npm dependencies" [VERIFIED in session]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json and existing source files; no guesswork
- Architecture: HIGH — patterns taken directly from existing codebase (FriendActionSheet, edit.tsx)
- Pitfalls: HIGH — derived from actual code constraints (CHECK constraints, isDirty logic, TypeScript types)

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable — no external APIs, no version-sensitive packages involved)
