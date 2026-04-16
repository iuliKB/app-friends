# Requirements: Campfire v1.4 Squad Dashboard & Social Tools

**Defined:** 2026-04-12
**Core Value:** Daily availability status (Free/Busy/Maybe) drives daily active use — if nothing else works, this must

## v1.4 Requirements

Requirements for v1.4 milestone. Each maps to exactly one phase.

### Squad Dashboard

- [x] **DASH-01**: User sees Squad tab as a scrollable dashboard with friends list at top and feature cards below
- [x] **DASH-02**: Each feature card shows a glanceable summary (e.g. "2 unsettled", "birthday in 3 days")
- [x] **DASH-03**: Dashboard cards animate in with smooth entrance transitions on load
- [x] **DASH-04**: Existing Streaks card is preserved and displayed on the dashboard

### IOU Expense Splitting

- [x] **IOU-01**: User can create an expense with title, amount, and select friends to split with
- [x] **IOU-02**: User can split an expense evenly or set custom amounts per person
- [x] **IOU-03**: User can view net balance per friend across all expenses (who owes whom)
- [x] **IOU-04**: User can mark a debt as settled (manual "mark as paid")
- [x] **IOU-05**: User can view expense history (list of past expenses with payer, participants, amounts)

### Birthday Calendar

- [x] **BDAY-01**: User can add their birthday (month + day) to their profile, visible to friends
- [x] **BDAY-02**: User can view a list of friends' birthdays sorted by next occurrence
- [x] **BDAY-03**: Squad dashboard shows an upcoming birthdays card with count and nearest birthday

## v1.5 Requirements (Deferred)

Tracked but not in current roadmap.

### Lightweight Nudge

- **NUDGE-01**: User can send a lightweight "ping" notification to a friend without composing a message
- **NUDGE-02**: Nudged friend receives a push notification ("Iulian nudged you!")

### Stat Strip

- **STAT-01**: User sees stat pills below the friend view (Free tonight count, streak, goals progress)

### Status Enhancements

- **LOCK-01**: True lock-screen action buttons that mutate status WITHOUT opening the app

### Birthday Enhancements

- **BDAY-04**: User receives push notification reminder for upcoming friend birthdays
- **BDAY-05**: Month-grid calendar view for birthdays

### IOU Enhancements

- **IOU-06**: Link expense to a plan (pre-populate participants from attendees)
- **IOU-07**: Debt simplification (minimize transactions across group)

## Out of Scope

Explicitly excluded.

| Feature | Reason |
|---------|--------|
| Payment integration (Venmo, PayPal) | Adds liability and complexity; manual settle sufficient for friend groups |
| Debt simplification / graph algorithm | Pairwise balances sufficient for 3-15 person groups |
| Float/decimal currency storage | Integer cents only — float arithmetic causes phantom debts |
| Birthday year display to friends | Privacy concern; month+day sufficient for birthday features |
| IOU categories/tags | Unnecessary complexity for v1.4; expense title is sufficient |
| Calendar sync for birthdays | Deferred to v1.5+; requires native calendar APIs |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 10 | Complete |
| DASH-02 | Phase 10 | Complete |
| DASH-03 | Phase 10 | Complete |
| DASH-04 | Phase 10 | Complete |
| IOU-01 | Phase 8 | Complete |
| IOU-02 | Phase 8 | Complete |
| IOU-03 | Phase 9 | Complete |
| IOU-04 | Phase 8 | Complete |
| IOU-05 | Phase 9 | Complete |
| BDAY-01 | Phase 6 | Complete |
| BDAY-02 | Phase 7 | Complete |
| BDAY-03 | Phase 7 | Complete |

**Coverage:**
- v1.4 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

**Note on Phase 5:** Phase 5 (Database Migrations) creates the schema required by IOU-01 through IOU-05 and BDAY-01 through BDAY-03. Those requirements are assigned to the phases that deliver their client-facing behavior, not to the migration phase itself.

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 — traceability complete after roadmap creation*
