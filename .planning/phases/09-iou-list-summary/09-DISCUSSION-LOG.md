# Phase 9: IOU List & Summary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-13
**Phase:** 09-iou-list-summary
**Mode:** discuss
**Areas analyzed:** Screen structure, IOU card in Goals tab, Balance display style, Expense history scope

## Assumptions Going In

From Phase 8 CONTEXT.md:
- Routes under `/squad/expenses/*` (D-09)
- Temporary '+' header button for create — persists through Phase 9 (D-10)
- Phase 9/10 will provide permanent IOU card entry point (D-11)

`get_iou_summary()` RPC already exists in migration 0015 — returns unsettled net balances per friend. No `useIOUSummary` hook yet.

Squad tab currently: SquadTabSwitcher (Friends/Goals). Goals tab has StreakCard + BirthdayCard. Phase 10 will replace this entire layout with scrollable dashboard.

## Gray Areas Presented

All four areas selected by user.

### Screen structure
| Option | Chosen |
|--------|--------|
| Two separate screens (`/squad/expenses` index + `/squad/expenses/friend/[id]`) | ✓ Yes |
| Single scrollable screen (balances + history sections) | — |

### IOU card content
| Option | Chosen |
|--------|--------|
| Net summary + unsettled count ("You're owed $34", "3 unsettled") | ✓ Yes |
| Friend balance previews (2-3 rows in card) | — |

### Balance display style
| Option | Chosen |
|--------|--------|
| Natural language rows ("Alex owes you $42" / "You owe Jamie $18") | — |
| Signed amount with label (`+$42 → you` green / `-$18 ← you` red) | ✓ Yes |

### Expense history scope
| Option | Chosen |
|--------|--------|
| All shared expenses, newest first — settled rows dimmed | ✓ Yes |
| Unsettled only with filter toggle | — |
| All expenses, no visual difference | — |

## Corrections Made

No corrections — all recommendations accepted.

## External Research

None required — `get_iou_summary()` RPC already exists, patterns from Phase 8 are sufficient.
