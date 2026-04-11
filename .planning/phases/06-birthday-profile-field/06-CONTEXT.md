# Phase 6: Birthday Profile Field - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can add their birthday (month + day) to their profile and friends can see it — the new columns are exercised by real client code before dependent screens are built. No year component. No birthday list or dashboard card (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Input Method
- **D-01:** Two inline dropdowns side by side — Month dropdown + Day dropdown. Day options update dynamically based on the selected month (e.g., Feb shows 1–29, Apr shows 1–30).
- **D-02:** Feb 29 is selectable but normalized to Feb 28 at save time so the value is valid in non-leap years (matches SC-3).

### Field Placement
- **D-03:** Birthday field placed below the display name TextInput, above the Save button. Natural flow: avatar → name → birthday → save. No section dividers needed.
- **D-04:** Label text: "Birthday" (no "(optional)" suffix — blank state with placeholder text makes optionality clear).

### Claude's Discretion
- Month dropdown format: full names vs abbreviations — pick what fits the layout best
- Display format when reopening: pre-selected dropdowns vs read-only text. Lean toward dropdowns pre-selected (input IS the display) for simplicity, but free to choose.
- Dropdown styling: match existing form field patterns (COLORS.surface.card background, RADII.lg, etc.)
- Placeholder text when no birthday is set (e.g., "Month" / "Day")
- Whether to show a "Clear" option for removing a previously saved birthday

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Profile edit screen
- `src/app/profile/edit.tsx` — Current edit profile screen (avatar + display name + save). Birthday field integrates here.

### Database schema
- `supabase/migrations/0016_birthdays_v1_4.sql` — birthday_month (smallint, nullable, CHECK 1-12), birthday_day (smallint, nullable, compound CHECK for valid day-per-month)
- `src/types/database.ts` — TypeScript types for profiles table (must include birthday_month, birthday_day)

### Requirements
- `.planning/REQUIREMENTS.md` — BDAY-01: "User can add their birthday (month + day) to their profile, visible to friends"
- `.planning/ROADMAP.md` §Phase 6 — Success criteria (date picker, round-trip, Feb 29 normalization, blank valid)

### Prior phase context
- `.planning/phases/05-database-migrations/05-CONTEXT.md` — D-10 (birthday columns nullable smallint), D-12 (CHECK constraints)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FormField` component (`src/components/common/FormField.tsx`) — may be adaptable for dropdown fields
- `PrimaryButton`, `ScreenHeader`, `LoadingIndicator` — already used in edit screen
- `AvatarCircle` — already in edit screen, no changes needed
- Design tokens: `COLORS.surface.card`, `RADII.lg`, `FONT_SIZE.lg`, `SPACING.lg` — used in existing TextInput styling

### Established Patterns
- Edit profile screen uses direct Supabase queries (no custom hook) — `supabase.from('profiles').select(...)` and `.update(...)`
- Save button disabled until `isDirty` (tracks original vs current values) — birthday fields need same dirty tracking
- `router.back()` on successful save — no change needed
- Design tokens enforced by ESLint `campfire/no-hardcoded-styles` rule

### Integration Points
- `supabase.from('profiles').select(...)` in useEffect — add `birthday_month, birthday_day` to select
- `supabase.from('profiles').update(...)` in handleSave — add birthday fields to update payload
- `isDirty` computation — extend to include birthday field changes

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing edit profile patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-birthday-profile-field*
*Context gathered: 2026-04-12*
