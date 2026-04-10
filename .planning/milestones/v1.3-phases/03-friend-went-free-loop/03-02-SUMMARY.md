---
phase: 03-friend-went-free-loop
plan: "02"
subsystem: database
tags: [supabase, migrations, attestation, guc, security-definer, typescript-types]

requires:
  - phase: 03-friend-went-free-loop
    provides: "0010_friend_went_free_v1_3.sql migration file authored by Plan 03-01"

provides:
  - "Migration 0010 applied to linked Supabase project zqmaauaopyolutfoizgq"
  - "7-SELECT attestation trace of live DB state (see below)"
  - "app.edge_functions_url + app.service_role_key GUCs set at database level via Studio SQL Editor"
  - "src/types/database.ts hand-patched with free_transitions, friend_free_pushes, profiles.timezone, profiles.notify_friend_free, get_friend_free_candidates RPC shape, FreeTransition/FriendFreePush type aliases"
  - "Human Studio verification confirmed (tables, functions, triggers, app regression check)"

affects:
  - "03-03 (notify-friend-free Edge Function — live tables available)"
  - "03-04 (client primitives — already landed in Wave 1, types compile against patched database.ts)"
  - "03-05 (useStatus rewrite — profiles.timezone writable)"
  - "03-07 (profile toggle — profiles.notify_friend_free writable)"

---

## Outcome

Migration 0010 applied successfully to the linked Supabase project. 7-SELECT attestation suite passed. GUCs set via Studio SQL Editor (CLI could not ALTER DATABASE because `npx supabase db query --linked` runs as a limited role — permission denied 42501). src/types/database.ts hand-patched and committed.

## Tasks executed

| Task | Description | Status |
|------|-------------|--------|
| 4 | Hand-patch `src/types/database.ts` (+108 lines) | ✓ commit `b3b19ec` |
| 1 | Pre-push safety gate + `supabase db push --linked` | ✓ (orchestrator-driven via env SUPABASE_ACCESS_TOKEN) |
| 2 | 7-SELECT attestation suite against live DB | ✓ (all 7 queries returned expected shapes) |
| 3 | Set `app.edge_functions_url` + `app.service_role_key` GUCs | ✓ (run by user via Studio SQL Editor) |
| 5 | Human Studio verification checkpoint | ✓ approved by user |

## Pre-push state (Task 1)

```
 Local | Remote | Time (UTC)
-------|--------|------------
 0001  | 0001   | 0001
 0002  | 0002   | 0002
 ...
 0009  | 0009   | 0009
 0010  |        | 0010
```

`supabase db push --linked --include-all` → `Applying migration 0010_friend_went_free_v1_3.sql... Finished supabase db push.`

## Attestation trace (Task 2)

| Q | Check | Result |
|---|-------|--------|
| Q1 | `pg_net` extension | installed in `extensions` schema |
| Q2 | new tables | `free_transitions` ✓, `friend_free_pushes` ✓ |
| Q3 | `profiles` columns | `timezone text NULL`, `notify_friend_free boolean NOT NULL` |
| Q4 | SECURITY DEFINER + pinned `search_path=""` on `on_status_went_free`, `dispatch_free_transition`, `get_friend_free_candidates` | all 3 functions prosecdef=t, proconfig=`{search_path=""}` |
| Q5 | `on_status_went_free` trigger on `statuses` | present, `tgenabled='O'` (origin = enabled) |
| Q6 | `dispatch_free_transition` trigger on `free_transitions` | present |
| Q7 | RLS enabled + zero client policies | `free_transitions` relrowsecurity=t policy_count=0; `friend_free_pushes` relrowsecurity=t policy_count=0 |

## GUC configuration (Task 3)

Set via Studio SQL Editor (CLI path blocked — see Deviations):

```sql
ALTER DATABASE postgres SET app.edge_functions_url = 'https://zqmaauaopyolutfoizgq.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.service_role_key = '<service_role secret>';
```

User confirmed both GUCs return non-null in a fresh SQL Editor session.

## Studio visual checks (Task 5)

- ✓ Table Editor: `free_transitions`, `friend_free_pushes` (empty), `profiles.timezone`, `profiles.notify_friend_free`
- ✓ Database → Functions: `on_status_went_free`, `dispatch_free_transition`, `get_friend_free_candidates` (all security definer)
- ✓ Database → Triggers: `on_status_went_free` AFTER UPDATE on `statuses`; `dispatch_free_transition` AFTER INSERT on `free_transitions`
- ✓ App regression check: setting a status in the running app produces no errors

## Key files

### created
- (none — plan was operational + 1 file edit)

### modified
- `src/types/database.ts` (+108 lines) — free_transitions, friend_free_pushes, profiles columns, get_friend_free_candidates RPC shape, FreeTransition/FriendFreePush aliases

## Commits

- `b3b19ec` feat(03-02): hand-patch src/types/database.ts with Phase 3 tables and columns

## Deviations

1. **GUC setting path changed from CLI to Studio SQL Editor.** Plan expected `npx supabase db query --linked` to work for `ALTER DATABASE postgres SET app...`. In practice the CLI runs as a limited role and returned `42501: permission denied to set parameter "app.edge_functions_url"`. Work-around: user ran both `ALTER DATABASE` statements via Studio SQL Editor (authenticated as `postgres`). Same end state, different execution path. Future plans that expect CLI-driven GUC setting should be updated to route through Studio SQL Editor.
2. **Checkpoint combined auth gate with Task 5 human-verify.** The plan anticipated a `human-verify` checkpoint at Task 5. In practice, Tasks 1-3 also required human action (supplying `SUPABASE_ACCESS_TOKEN`, running the Studio SQL Editor statements). The orchestrator combined both into a single checkpoint to minimize round-trips. No semantic impact.

## Self-Check: PASSED

All must_haves verified:
- [x] Migration 0010 applied to linked Supabase project (Task 1, pre-push + apply trace above)
- [x] All 7 attestation SELECTs return expected shapes (Task 2, table above)
- [x] `app.edge_functions_url` + `app.service_role_key` GUCs set at database level (Task 3, user-confirmed via fresh SQL Editor session)
- [x] `src/types/database.ts` hand-patched with the new tables/columns (commit `b3b19ec`)
