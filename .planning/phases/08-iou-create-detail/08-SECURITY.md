---
phase: 08
slug: iou-create-detail
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-13
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| User input → useExpenseCreate | Title string and rawDigits enter via TextInput; trimmed on submit | User-provided strings, low sensitivity |
| Route params → useExpenseDetail | expenseId from useLocalSearchParams is a UUID string | UUID, passed to Supabase RLS-filtered query |
| Hook → Supabase RPC (create_expense) | Only write path to insert expense data; atomic RPC | Expense title, amount, participant IDs |
| Hook → iou_members UPDATE (settle) | settle() sends userId as settled_by; RLS enforces creator-only | UUID, boolean flag |
| Component props → rendered UI | All amount values in cents (integer); display formatting is client-side only | Integer cents, non-sensitive |
| Test credentials → Playwright runner | Hardcoded test credentials in spec file; test environment only | Test-account credentials |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-08-P01-01 | Information Disclosure | tests/visual/iou-create-detail.spec.ts | accept | Test-only credentials match pattern in all spec files; no production data | closed |
| T-08-P02-01 | Tampering | ParticipantRow.tsx settle button visibility | mitigate | showSettleButton = isCreator && !isPayerRow && !isSettled (line 32); RLS UPDATE policy is authoritative | closed |
| T-08-P02-02 | Information Disclosure | formatCentsDisplay | accept | Pure display function; cents stored server-side, display is derived | closed |
| T-08-P03-01 | Elevation of Privilege | useExpenseDetail.settle() | mitigate | isCreator = userId !== null && userId === detail?.createdBy (line 180); RLS iou_members_update_creator_settles is authoritative | closed |
| T-08-P03-02 | Tampering | useExpenseCreate.submit() — p_custom_cents | mitigate | canSubmit requires splitMode === 'even' or allocatedCents === totalCents (line 82); RPC validates sum server-side | closed |
| T-08-P03-03 | Repudiation | settle() settled_by column | accept | settled_by = userId stored on iou_members row provides implicit audit trail | closed |
| T-08-P03-04 | Denial of Service | useExpenseCreate.submit() — double tap | mitigate | !submitting in canSubmit (line 78); disabled={!form.canSubmit || form.submitting} in create.tsx (line 121) | closed |
| T-08-P04-01 | Tampering | ExpenseDetailScreen — expenseId from URL params | mitigate | .eq('id', expenseId) scoped by RLS iou_groups_select_member; non-participant gets zero rows (line 63) | closed |
| T-08-P04-02 | Information Disclosure | create.tsx — friend picker | accept | Friends are accepted friendships only; get_friends RPC enforces RLS; no privacy escalation | closed |
| T-08-P04-03 | Denial of Service | create.tsx — double-submit via PrimaryButton | mitigate | disabled={!form.canSubmit || form.submitting} (create.tsx line 121) | closed |
| T-08-P04-04 | Elevation of Privilege | detail screen — settle button visibility | mitigate | isCreator={isCreator} prop passed to ParticipantRow ([id].tsx line 71); RLS is authoritative gate | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-01 | T-08-P01-01 | Test credentials are tester2@gmail.com — same pattern as all other spec files; test environment only, never production data | gsd-security-auditor | 2026-04-13 |
| AR-08-02 | T-08-P02-02 | formatCentsDisplay is a pure display utility; cents stored server-side only; no sensitive data exposure | gsd-security-auditor | 2026-04-13 |
| AR-08-03 | T-08-P03-03 | settled_by column provides implicit repudiation trail; dedicated audit log not required at v1.4 scale | gsd-security-auditor | 2026-04-13 |
| AR-08-04 | T-08-P04-02 | Friend list visible only to accepted friends via get_friends RPC (RLS enforced); no escalation beyond existing friend list screen | gsd-security-auditor | 2026-04-13 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-13 | 11 | 11 | 0 | gsd-security-auditor (ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] threats_open: 0 confirmed
- [x] status: verified set in frontmatter

**Approval:** verified 2026-04-13
