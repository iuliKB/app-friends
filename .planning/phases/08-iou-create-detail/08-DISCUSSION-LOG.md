# Phase 8: IOU Create & Detail - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 08-iou-create-detail
**Areas discussed:** Expense creation flow, Expense detail screen, Split mode UX, Navigation & entry points, Haptic feedback, Error handling, Loading & empty states

---

## Expense Creation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrollable screen | Title, amount, friend picker, split mode all on one screen | |
| Two-step flow | Step 1: Title + amount + friends. Step 2: Split mode + per-person amounts | |
| You decide | Claude picks based on codebase patterns | ✓ |

**User's choice:** Claude's discretion for screen structure
**Notes:** User locked currency-formatted input specifically

### Friend Picker

| Option | Description | Selected |
|--------|-------------|----------|
| Inline checkboxes | Friend list with checkboxes directly on create screen | |
| Separate picker screen | Tap 'Add friends' to open picker, selected shown as chips | |
| You decide | Claude picks based on existing patterns | ✓ |

### Amount Input

| Option | Description | Selected |
|--------|-------------|----------|
| Plain number input | Standard text input for dollar amount, converted to cents on submit | |
| Currency-formatted input | Live formatting as user types with decimal enforcement | ✓ |

### Submit UX

| Option | Description | Selected |
|--------|-------------|----------|
| Loading + navigate to detail | Show loading, call RPC, navigate to new expense detail on success | |
| Loading + navigate back | Show loading, call RPC, navigate back with success toast | |
| You decide | Claude picks the best UX | ✓ |

---

## Expense Detail Screen

| Option | Description | Selected |
|--------|-------------|----------|
| Card-based layout | Title + amount in hero card, participant rows below with avatar + badges | ✓ |
| Simple list layout | Title + amount as header text, flat list of participant rows | |

### Settle Action

| Option | Description | Selected |
|--------|-------------|----------|
| Swipe to settle | Swipe right on participant row | |
| Tap button per row | Each unsettled participant has a 'Settle' button | |
| Long press to settle | Long press triggers settle | |
| You decide | Claude picks the best UX | ✓ |

### Settled State Visual

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded badges | Green 'Settled' / red 'Unsettled' badge next to share amount | ✓ |
| Strikethrough + checkmark | Settled rows have strikethrough amount and checkmark | |

### Detail Info

| Option | Description | Selected |
|--------|-------------|----------|
| Payer + date + total | Show who paid, when, and total amount | |
| Payer + date + total + split type | Also show even/custom split type | ✓ |

### All-Settled State

| Option | Description | Selected |
|--------|-------------|----------|
| All-settled banner | Green "All settled!" banner at top, all badges green, no action buttons | ✓ |
| Normal view, no change | Same layout, all badges green, no special treatment | |

### Debtor View

| Option | Description | Selected |
|--------|-------------|----------|
| Same view, no settle button | Same layout but settle buttons hidden for non-creator | |
| Simplified view | Debtor sees only their own share + settled status | |
| You decide | Claude decides debtor experience | ✓ |

---

## Split Mode UX

### Split Toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented control | Two-option: 'Even' / 'Custom' | |
| Toggle switch | Default to even, toggle reveals per-person inputs | |
| You decide | Claude picks the UI pattern | ✓ |

### Custom Amount Editing

| Option | Description | Selected |
|--------|-------------|----------|
| Inline editable fields | Each row shows editable amount, running total at bottom | |
| Modal editor | Tap participant to open modal for amount entry | |
| You decide | Claude picks editing approach | ✓ |

### Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Inline with remaining amount | "Remaining: $X.XX" updates live, submit disabled until $0.00, red on mismatch | ✓ |
| Error on submit | Validate on submit, show error if sum ≠ total | |

---

## Navigation & Entry Points

### Primary Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| FAB on Squad tab | Floating action button with 'New Expense' option | |
| Button inside IOU card | 'New expense' button inside IOU dashboard card | ✓ (final) |
| Standalone screen + deep link | /squad/expenses route with '+' button in header | |

**Notes:** IOU card doesn't exist until Phase 9/10, so a temporary entry point is needed for Phase 8.

### Interim Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| FAB on Squad Goals tab | '+' FAB on Goals tab, removed when dashboard card arrives | |
| Button in Squad header | '+' button in Squad screen header bar | ✓ |

### Route Structure

| Option | Description | Selected |
|--------|-------------|----------|
| /squad/expenses/* pattern | Under existing squad/_layout.tsx stack | ✓ |
| /expenses/* top-level | Separate from squad stack | |

---

## Haptic Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Settle only | Haptic on settle confirmation only | |
| Settle + submit | Haptic on both settle and successful expense creation | ✓ |

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error + retry | Error message on create screen with retry button | |
| Toast + stay on form | Toast/snackbar error, form state preserved | |
| You decide | Claude picks error handling | ✓ |

---

## Loading States

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton + disabled submit | Skeleton on detail load, spinner on submit button, disabled during RPC | ✓ |
| Full-screen loading | Full-screen loading indicator during create and detail fetch | |

---

## Claude's Discretion

- Screen structure (single vs two-step)
- Friend picker approach
- Split mode toggle UI
- Custom amount editing approach
- Submit navigation behavior
- Settle action gesture
- Debtor view experience
- Error handling approach

## Deferred Ideas

- IOU dashboard card — Phase 9/10
- Net balance per friend — Phase 9
- Expense history list — Phase 9
- Linking expense to a plan — IOU-06, backlog
