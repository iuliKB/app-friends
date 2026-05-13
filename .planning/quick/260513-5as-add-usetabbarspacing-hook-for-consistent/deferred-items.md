# Quick 260513-5as — Deferred Items

Pre-existing ESLint issues in files touched by this task, but unrelated to the
useTabBarSpacing migration. Captured per executor SCOPE BOUNDARY rule (do NOT
fix pre-existing issues in unrelated parts of files we happened to edit).

## src/app/(tabs)/squad.tsx (pre-existing)

- L43: `ReadonlyArray<T>` warning — should be `readonly T[]` per project rule.
- L108: prettier formatting in `friends.filter` predicate.
- L208: prettier formatting in `openChat` group-variant call.
- L323: stale `eslint-disable-line campfire/no-hardcoded-styles` after `letterSpacing: 0.5` — no longer triggers a violation, so the directive is dead.

## src/screens/plans/PlansListScreen.tsx (pre-existing)

- L247: `gap: 4` hardcoded in `viewToggle` style — should use a SPACING token (custom `campfire/no-hardcoded-styles` rule).
- L258: hardcoded `rgba(185, 255, 59, 0.15)` in `toggleButtonActive` — should use a COLORS token.

## Verification

These exact errors were reproduced on the un-stashed baseline (pre-change tree)
during Task 2 verification — see SUMMARY.md "Lint baseline diff" section.

The `useTabBarSpacing` migration itself introduces **zero** new lint errors;
two transient prettier errors I authored during Task 2 (profile.tsx multi-line
array, squad.tsx single-line array) were fixed before commit.
