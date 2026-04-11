# Phase 6: Birthday Profile Field - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 06-birthday-profile-field
**Areas discussed:** Input method, Field placement, Display format

---

## Input Method

| Option | Description | Selected |
|--------|-------------|----------|
| Two inline dropdowns | Month + Day dropdowns side by side. Day options update based on month. | ✓ |
| Bottom sheet wheel picker | iOS-style scroll wheels in a bottom sheet. Polished but heavier. | |
| Single text input with mask | User types MM/DD directly. Minimal but error-prone. | |

**User's choice:** Two inline dropdowns
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Full names (January, February...) | Clearer, more readable | |
| Abbreviations (Jan, Feb...) | Compact | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on month name format.

---

## Field Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Below display name | Natural flow: avatar → name → birthday → save. No section dividers. | ✓ |
| Own 'Personal Info' section | Section header with birthday underneath. More structured. | |
| You decide | Claude picks | |

**User's choice:** Below display name
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Birthday | Short and clear | ✓ |
| Birthday (optional) | Explicitly signals optionality | |
| You decide | Claude picks | |

**User's choice:** Birthday
**Notes:** None

---

## Display Format

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdowns pre-selected | Input IS the display. Consistent and editable. | |
| Read-only text + Edit button | Show text, tap to re-open dropdowns | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on display approach.

---

## Claude's Discretion

- Month dropdown format (full names vs abbreviations)
- Display format when reopening (dropdowns pre-selected vs read-only text)
- Dropdown styling details
- Placeholder text for empty state
- Clear/remove birthday option

## Deferred Ideas

None — discussion stayed within phase scope.
