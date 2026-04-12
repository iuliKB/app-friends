# Security Audit — Phase 07: Birthday Calendar Feature

**ASVS Level:** 1
**Audit Date:** 2026-04-12
**Auditor:** gsd-security-auditor
**Result:** SECURED — 8/8 threats closed

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-07-01 | Information Disclosure | accept | CLOSED | See accepted risks log |
| T-07-02 | Information Disclosure | mitigate | CLOSED | `useUpcomingBirthdays.ts:34` — `if (!userId)` guard returns empty state before any RPC call |
| T-07-03 | Spoofing | accept | CLOSED | See accepted risks log |
| T-07-04 | Information Disclosure | accept | CLOSED | See accepted risks log |
| T-07-05 | Information Disclosure | accept | CLOSED | See accepted risks log |
| T-07-06 | Information Disclosure | mitigate | CLOSED | `BirthdayCard.tsx:34` — `router.push('/squad/birthdays' as never)` passes no params; `birthdays.tsx:20` — screen calls `useUpcomingBirthdays()` independently on mount |
| T-07-07 | Information Disclosure | accept | CLOSED | See accepted risks log |
| T-07-08 | Denial of Service | accept | CLOSED | See accepted risks log |

---

## Mitigate Threats — Evidence Detail

### T-07-02: useUpcomingBirthdays hook — unauthenticated guard
- **File:** `src/hooks/useUpcomingBirthdays.ts`
- **Pattern verified:** `if (!userId)` guard present before RPC call
- **Lines 34–38:**
  ```
  if (!userId) {
    setLoading(false);
    setEntries([]);
    return;
  }
  ```
- When `userId` is null (unauthenticated), the hook returns empty state immediately and `supabase.rpc('get_upcoming_birthdays')` is never invoked.

### T-07-06: Route param serialization — no birthday data in params
- **File:** `src/components/squad/BirthdayCard.tsx` line 34 — navigation call is `router.push('/squad/birthdays' as never)` with no query params or state attached.
- **File:** `src/app/squad/birthdays.tsx` line 20 — `BirthdaysScreen` calls `useUpcomingBirthdays()` directly on mount; it does not read any route params for birthday data.
- Birthday data is never serialized into navigation state or URL params.

---

## Accepted Risks Log

| Threat ID | Category | Component | Rationale |
|-----------|----------|-----------|-----------|
| T-07-01 | Information Disclosure | `get_upcoming_birthdays()` RPC | RPC is SECURITY DEFINER and scoped to `auth.uid()` accepted friends only — enforced in SQL (migration 0016), no client bypass possible. Accepted: enforcement is server-side, outside this codebase's control surface. |
| T-07-03 | Spoofing | Session identity in RPC | Supabase JWT verified server-side; `auth.uid()` in RPC is authoritative, not client-supplied. ASVS L1 V2 satisfied by existing Supabase auth infrastructure. Accepted: identity verification delegated to Supabase platform (transfer-by-infrastructure). |
| T-07-04 | Information Disclosure | BirthdayCard display | Card renders only data returned by the SECURITY DEFINER RPC — no client-side data augmentation or cross-user access possible. Accepted: data boundary enforced at source (T-07-01). |
| T-07-05 | Information Disclosure | BirthdaysScreen display | BirthdaysScreen calls `useUpcomingBirthdays()` independently on mount — same SECURITY DEFINER RPC, same `auth.uid()` scope as T-07-01. Accepted: same rationale as T-07-04. |
| T-07-07 | Information Disclosure | squad.tsx prop passing | `useUpcomingBirthdays()` called in `SquadScreen` body; `UpcomingBirthdaysData` passed as prop to `BirthdayCard` — same session-scoped Supabase query as all other squad.tsx data. No new trust boundary introduced. |
| T-07-08 | Denial of Service | Double RPC call | `squad.tsx` owns one `useUpcomingBirthdays()` instance (goals tab); `birthdays.tsx` owns a second instance mounted only when navigated to. Stack navigator unmounts the previous screen — the two instances are never simultaneously live. Accepted: React Navigation Stack guarantees single-mount semantics. |

---

## Unregistered Threat Flags

None — all three execution summaries (07-01, 07-02, 07-03) reported no new attack surface, network endpoints, or auth paths beyond the threat register.
