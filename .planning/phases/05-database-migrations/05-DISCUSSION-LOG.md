# Phase 5: Database Migrations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 05-database-migrations
**Areas discussed:** iou_notes field disposition, IOU table naming, Settlement tracking model, Seed data strategy

---

## iou_notes Field Disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Rename to general_notes | Avoids user/developer confusion when structured IOUs ship. Requires ~10 client file updates. | ✓ |
| Keep as-is, coexist | No migration risk, zero client changes. Accept naming overlap. | |
| Drop the column entirely | Remove free-text field since structured IOUs replace it. Destructive. | |

**User's choice:** Rename to general_notes
**Notes:** Research was split — PITFALLS.md recommended rename, ARCHITECTURE.md said coexist. User chose rename for long-term clarity.

---

## IOU Table Naming

| Option | Description | Selected |
|--------|-------------|----------|
| expenses + expense_shares | Domain-accurate, matches UI language. | |
| iou_groups + iou_members | Matches roadmap language. IOU prefix groups all related objects. | ✓ |
| iou_expenses + iou_shares | Hybrid: IOU prefix + domain clarity. Longer names. | |

**User's choice:** iou_groups + iou_members
**Notes:** Consistent with roadmap and feature naming convention.

---

## Settlement Tracking Model

| Option | Description | Selected |
|--------|-------------|----------|
| settled_at timestamp | NULL = unsettled, non-NULL = settled with datetime. Simple. | |
| Boolean is_settled | Simplest model, no temporal info. | |
| settled_at + settled_by | Full audit trail: when and who marked settled. | ✓ |

**User's choice:** settled_at + settled_by columns
**Notes:** Full audit trail. settled_by aligns with RLS constraint (only creator can settle).

---

## Seed Data Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, extend seed.sql | Add IOU expenses and birthday values for existing seed users. | ✓ |
| No, seed data in client phases | Keep migration phase pure schema. | |
| Separate seed migration file | 0017_seed_v1_4.sql — keeps schema clean, skippable in prod. | |

**User's choice:** Extend seed.sql
**Notes:** Same pattern as existing seed data. Developers get test data immediately.

---

## Claude's Discretion

- Exact index strategy on iou_groups/iou_members
- RPC parameter naming and return type shapes
- RLS policy naming conventions
- CHECK constraint specifics for day-in-month validation
