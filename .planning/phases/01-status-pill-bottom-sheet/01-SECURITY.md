---
phase: 01
slug: status-pill-bottom-sheet
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-11
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| User -> StatusPickerSheet -> MoodPicker | Sheet passes onCommit callback; MoodPicker calls it on commit | UI callback (no data) |
| MoodPicker -> useStatus.setStatus -> Supabase | Status write validated server-side (RLS) | Status value + context tag |
| Supabase session -> display_name | Reading user_metadata from in-memory auth session | User's own profile data |
| Module-level sessionIncrementedThisLaunch | Mutable module state; persists for JS runtime lifetime | Counter integer |
| AsyncStorage campfire:session_count | Device-local persistence; readable by app only | Counter integer |
| StatusPickerSheet as Modal | Renders over app UI | User's own MoodPicker |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Denial of Service | Animated.timing in PanResponder release | accept | Timing is short (150/200ms), triggered by user gesture only; no loop risk | closed |
| T-01-02 | Repudiation | onClose called twice (onCommit + auto-dismiss) | accept | Calling onClose when sheet is already closed is a no-op (Modal visible=false); no data corruption | closed |
| T-01-03 | Information Disclosure | display_name from session user_metadata | accept | user_metadata is the authenticated user's own data; only visible to them | closed |
| T-01-04 | Denial of Service | Animated.loop pulse blocking FlatList | mitigate | isInteraction: false on all Animated.timing calls in the loop (verified in OwnStatusPill.tsx + OwnStatusCard.tsx) | closed |
| T-01-05 | Spoofing | sessionCount prop could be manipulated by caller | accept | sessionCount only gates a cosmetic pulse animation; no security implication | closed |
| T-01-06 | Tampering | sessionIncrementedThisLaunch module flag | accept | Only gates cosmetic pulse animation; no security or data implication if reset between reloads | closed |
| T-01-07 | Denial of Service | AsyncStorage read on HomeScreen mount | accept | Single async read with no await blocking render; stored in useState, falls back to 0 | closed |
| T-01-08 | Elevation of Privilege | StatusPickerSheet rendering as Modal | accept | Modal contains only user's own MoodPicker; no data access beyond existing setStatus permissions | closed |

*Status: open / closed*
*Disposition: mitigate (implementation required) / accept (documented risk) / transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-01 | Animation timing is short and user-initiated; no exploit vector | gsd-orchestrator | 2026-04-11 |
| AR-02 | T-01-02 | Double onClose is idempotent; Modal visible=false makes it a no-op | gsd-orchestrator | 2026-04-11 |
| AR-03 | T-01-03 | user_metadata is own-user data from in-memory session | gsd-orchestrator | 2026-04-11 |
| AR-04 | T-01-05 | sessionCount only controls cosmetic pulse; no security impact | gsd-orchestrator | 2026-04-11 |
| AR-05 | T-01-06 | Module flag only gates cosmetic animation | gsd-orchestrator | 2026-04-11 |
| AR-06 | T-01-07 | Single non-blocking async read with fallback default | gsd-orchestrator | 2026-04-11 |
| AR-07 | T-01-08 | Modal only exposes user's own MoodPicker; no privilege escalation | gsd-orchestrator | 2026-04-11 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-11 | 8 | 8 | 0 | gsd-orchestrator |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-11
