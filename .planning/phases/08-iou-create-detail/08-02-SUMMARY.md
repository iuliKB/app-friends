---
phase: 08-iou-create-detail
plan: 02
subsystem: iou
tags: [currency, formatting, components, presentational, haptics]
dependency_graph:
  requires:
    - 08-01 (IOU types, hooks, database schema)
  provides:
    - src/utils/currencyFormat.ts (formatCentsDisplay, parseCentsFromInput, rawDigitsToInt)
    - src/components/iou/ExpenseHeroCard.tsx (ExpenseHeroCard, ExpenseHeroCardSkeleton)
    - src/components/iou/ParticipantRow.tsx (ParticipantRow)
    - src/components/iou/SplitModeControl.tsx (SplitModeControl)
    - src/components/iou/RemainingIndicator.tsx (RemainingIndicator)
  affects:
    - 08-03 (create screen assembles these components)
    - 08-04 (detail screen assembles these components)
tech_stack:
  added: []
  patterns:
    - "Intl.NumberFormat for USD display (built into Hermes, no external dependency)"
    - "rawDigits pattern: internal state is digit-only string, display is derived"
    - "Named exports only — no default exports (follows birthdayFormatters.ts pattern)"
    - "Skeleton pattern: opacity 0.5 wrapper with COLORS.border grey boxes"
    - "Haptics.impactAsync with .catch(() => {}) to suppress non-haptic-device errors"
key_files:
  created:
    - src/utils/currencyFormat.ts
    - src/components/iou/ExpenseHeroCard.tsx
    - src/components/iou/ParticipantRow.tsx
    - src/components/iou/SplitModeControl.tsx
    - src/components/iou/RemainingIndicator.tsx
  modified: []
decisions:
  - "Intl.NumberFormat currency formatter avoids external library (zero new dependencies)"
  - "ParticipantRow settle button guard: isCreator && !isPayerRow && !isSettled — UI convenience only; RLS is the authoritative enforcement"
  - "RemainingIndicator returns null at zero remaining (per UI-SPEC copywriting table — no copy shown at $0.00)"
  - "SplitModeControl active segment uses '#ffffff14' (COLORS.surface.overlay) per Phase 02-01 decision"
  - "ExpenseHeroCard all-settled banner renders ABOVE card content as separate View (not nested inside card)"
metrics:
  duration: "2 minutes"
  completed: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 0
---

# Phase 8 Plan 02: IOU Presentational Components Summary

**One-liner:** Currency formatting utilities and five pure presentational IOU components (ExpenseHeroCard, ParticipantRow, SplitModeControl, RemainingIndicator) ready for assembly by create/detail screens.

## What Was Built

### Task 1: Currency Utility Functions (`a564bb2`)
Created `src/utils/currencyFormat.ts` with three named exports:
- `formatCentsDisplay(cents)` — converts integer cents to USD string via `Intl.NumberFormat` (e.g. `4250` → `"$42.50"`)
- `parseCentsFromInput(raw)` — strips non-digit chars for onChange handlers (e.g. `"$42.50"` → `"4250"`)
- `rawDigitsToInt(rawDigits)` — converts rawDigits string to integer cents (e.g. `"4250"` → `4250`)

Follows the named-export pattern from `birthdayFormatters.ts`. Zero external dependencies — `Intl.NumberFormat` is built into Hermes on Expo SDK 55.

### Task 2: IOU Presentational Components (`52f4928`)
Created all four components in `src/components/iou/`:

**ExpenseHeroCard** — Detail screen hero: title (20px/semibold), total amount (24px/semibold), payer + date + split type metadata (14px/secondary). All-settled green banner above card when `allSettled=true`. `ExpenseHeroCardSkeleton` with opacity 0.5 + grey boxes.

**ParticipantRow** — One row per participant: `AvatarCircle` (size=36) + name + share amount + settled/unsettled badge. "Mark Settled" `TouchableOpacity` visible only when `isCreator && !isPayerRow && !isSettled`. `ActivityIndicator` replaces button label during `settleLoading`.

**SplitModeControl** — Two-segment Even/Custom control. Fires `Haptics.impactAsync(ImpactFeedbackStyle.Light)` then calls `onChange` on press. Active segment uses `'#ffffff14'` overlay background.

**RemainingIndicator** — Returns `null` when `remaining === 0`. Secondary text for positive remaining, destructive red for over-allocated. Used by custom split entry in create screen.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-08-P02-01 | mitigate | `isCreator && !isPayerRow && !isSettled` guard implemented in ParticipantRow. RLS UPDATE policy (Phase 01) is authoritative enforcement. |
| T-08-P02-02 | accept | `formatCentsDisplay` is pure display; no sensitive data. |

## Self-Check: PASSED

All 5 files exist on disk. Both task commits (a564bb2, 52f4928) verified in git log.
