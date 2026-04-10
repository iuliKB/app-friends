---
phase: 02-status-liveness-ttl
plan: 06
subsystem: status-ui-integration
tags: [home, profile, mood-picker, heartbeat, status-pill, effective-status]
requires:
  - 02-03 (heartbeat util, windows util, types)
  - 02-04 (useStatus rewrite + back-compat shims)
  - 02-05 (MoodPicker, ReEngagementBanner)
  - 02-02 (effective_status view, statuses table v1.3)
provides:
  - HomeScreen wired to MoodPicker + ReEngagementBanner + DEAD heading + 60s tick
  - Profile wired to MoodPicker
  - HomeFriendCard renders heartbeat-aware label + 0.6 opacity for FADING
  - StatusPill renders heartbeat-aware format when callers opt in (D-31 Option B)
  - useFriends + useHomeScreen read from public.effective_status
  - useStatus shims removed (canonical D-33 shape only)
affects:
  - Home tab (visual + sort behavior)
  - Profile tab (mood picker mount)
  - PlanCreateModal + FriendCard (StatusPill compatible via legacy fallback)
tech-stack:
  added: []
  patterns:
    - Screen-level setInterval(60_000) tick to force heartbeat re-render without refetch (OVR-06)
    - ScrollView ref + onLayout-tracked Y for ReEngagementBanner Update scroll target
    - Single STATUS_SORT_ORDER export consumed by both useHomeScreen + useFriends (OVR-07)
    - effective_status view as read source; statuses table for writes + realtime
key-files:
  created: []
  modified:
    - src/hooks/useFriends.ts
    - src/hooks/useHomeScreen.ts
    - src/stores/useHomeStore.ts
    - src/components/home/HomeFriendCard.tsx
    - src/components/friends/StatusPill.tsx
    - src/app/(tabs)/profile.tsx
    - src/screens/home/HomeScreen.tsx
    - src/hooks/useStatus.ts
decisions:
  - "Adopted Option B for D-31: extend StatusPill props with optional heartbeat fields, falling back to legacy bare-mood pill so PlanCreateModal + FriendCard call sites stay green without threading new fields through their row shapes."
  - "Changed FriendWithStatus.context_tag from EmojiTag → string | null to match the actual preset strings written by MoodPicker (Plan 05). Avoids dishonest type casts and matches CurrentStatus shape."
  - "DEAD heading uses a per-mount ref (deadOnOpenRef) plus a session-scoped 'hasCommittedThisSession' flag so the heading appears only once per cold open and disappears on first commit."
  - "60s heartbeat tick stays a no-op state setter (setHeartbeatTick) instead of plumbing the value anywhere — the re-render itself is what HomeFriendCard needs to recompute computeHeartbeatState()."
metrics:
  duration: ~30 minutes
  completed: 2026-04-08
  tasks_completed: 6
  files_modified: 8
---

# Phase 02 Plan 06: Final Integration Summary

End-to-end wiring of MoodPicker, ReEngagementBanner, heartbeat-aware friend cards, and effective_status reads. Lands TTL-03, TTL-06, HEART-04, HEART-05, D-31 and removes the Plan 04 back-compat shims.

## What Shipped

| Surface | Before | After |
|---------|--------|-------|
| Home mood control | SegmentedControl (3-button bar, no window) | MoodPicker (mood + preset chips + window chips) |
| Home heartbeat | None — friends stayed "fresh" until refetch | ReEngagementBanner on FADING own status, 60s screen tick re-evaluates everyone |
| Home cold-open DEAD | No special UI | "What's your status today?" heading above MoodPicker until first commit |
| Home friend cards | Bare avatar + name + optional mood pill | Avatar + name + heartbeat-aware label ("Free · grab a coffee · until 6pm" / "Free · 5h ago" at 0.6 opacity / "inactive") |
| Free section sort | updated_at DESC | last_active_at DESC (OVR-07 freshness) |
| Friend partition | mood-only (`status === 'free'`) | heartbeat-aware: ALIVE/FADING free in Free, DEAD or non-free in Everyone Else |
| Profile mood control | SegmentedControl + EmojiTagPicker (two separate widgets) | MoodPicker (single unified widget) |
| Status read source | `public.statuses` (raw, no expiry semantics) | `public.effective_status` (returns NULL effective_status for expired rows) |
| useStatus public shape | 8 fields (4 canonical + 4 back-compat shims) | 6 fields (D-33 canonical only) |

## Tasks & Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 — effective_status reads + last_active_at sort + heartbeat partition + STATUS_SORT_ORDER consolidation | `4144c35` | src/hooks/useFriends.ts, src/hooks/useHomeScreen.ts, src/stores/useHomeStore.ts |
| 2 — HomeFriendCard heartbeat label + 0.6 opacity, drop showStatusPill prop | `bdce2d3` | src/components/home/HomeFriendCard.tsx, src/screens/home/HomeScreen.tsx (call site) |
| 2b — StatusPill D-31 Option B (heartbeat-aware extension, legacy fallback) | `d0d8f01` | src/components/friends/StatusPill.tsx |
| 3 — Profile mounts MoodPicker, drops SegmentedControl + EmojiTagPicker | `2cfede9` | src/app/(tabs)/profile.tsx |
| 4 — HomeScreen mounts MoodPicker + ReEngagementBanner + DEAD heading + 60s tick + scroll-to-picker | `c9c2b62` | src/screens/home/HomeScreen.tsx |
| 5 — Remove useStatus back-compat shims | `139aa01` | src/hooks/useStatus.ts |

## Verification

- `npx tsc --noEmit` → clean project-wide
- `npx eslint` on all touched files → 0 errors. Two pre-existing react-hooks/exhaustive-deps warnings (logged in `deferred-items.md`, not introduced by this plan).
- Manual code-path trace: MoodPicker.setStatus → supabase.statuses upsert → effective_status view (server-side) → useHomeScreen refetch via realtime channel → useHomeStore.setFriends → HomeFriendCard heartbeat re-evaluation. All hops compile.
- Sort partition logic verified by reading: `freeFriends` excludes DEAD by `computeHeartbeatState`, `otherFriends` includes both DEAD-any-mood and ALIVE/FADING non-free.
- 60s interval cleanup confirmed: useEffect return clears the interval.
- Realtime subscription still references `table: 'statuses'` (OVR-03 enforcement; views can't be published).

## Deviations from Plan

### [Rule 2 - Type Hygiene] FriendWithStatus.context_tag widened to `string | null`

- **Found during:** Task 1
- **Issue:** Plan 05 (MoodPicker) writes preset IDs like `'grab a coffee'`, `'deep work'` into `statuses.context_tag`. The legacy `EmojiTag` type only allows null + 8 emoji literals, so `(s.context_tag as EmojiTag)` was a dishonest cast that would mask runtime mismatches. The new effective_status read path makes this even more visible.
- **Fix:** Changed `FriendWithStatus.context_tag: EmojiTag` → `string | null` in `src/hooks/useFriends.ts` and updated both fetch sites (useFriends + useHomeScreen) to populate it as `string | null`. `CurrentStatus.context_tag` was already `string | null` so this aligns the two shapes.
- **Files modified:** src/hooks/useFriends.ts, src/hooks/useHomeScreen.ts
- **Commit:** `4144c35` (bundled with Task 1)
- **Risk:** None. No call site outside HomeFriendCard reads `friend.context_tag`, and HomeFriendCard already wraps it in `String(friend.context_tag)` for the inline label.

### [Sequencing] HomeScreen showStatusPill removal landed in Task 2 commit

- **Found during:** Task 2
- **Issue:** Task 2 dropped `showStatusPill` from `HomeFriendCard` props. Task 4 was scheduled to remove the matching arg from the HomeScreen call site, but tsc would fail between Task 2's commit and Task 4's commit because `<HomeFriendCard friend={item} showStatusPill />` would reference a non-existent prop.
- **Fix:** Removed the `showStatusPill` arg from the `otherFriends` FlatList renderItem in HomeScreen.tsx as part of Task 2's commit. Task 4 still does the heavy mount work.
- **Files modified:** src/screens/home/HomeScreen.tsx (one line)
- **Commit:** `bdce2d3`

## Known Stubs / Future Work

### Emoji badge in HomeFriendCard renders preset strings

- **File:** src/components/home/HomeFriendCard.tsx (existing `emojiBadge` view)
- **Issue:** The pre-Phase-2 `emojiBadge` was designed to render an EmojiTag character (`☕️`, `🎮`, etc.) overlaid on the avatar. Plan 05 changed `context_tag` to store preset strings like `"grab a coffee"`, so the badge now renders text inside a 12px container. This looks awkward/clipped at runtime.
- **Why not fixed here:** Out of scope per plan tasks (Plan 06 only adds the inline `statusLabel` text). The new statusLabel already shows the tag in proper context, making the emoji badge redundant.
- **Recommendation for follow-up:** Either delete the emojiBadge view entirely (the inline statusLabel covers the same information) or revive an emoji-vs-text policy. Deferring to a polish/UX plan in Phase 3+.

## Threat Flags

None. All trust boundaries identified in the plan's threat_model are mitigated as designed:
- T-02-24 mitigated: reads come from `effective_status` which returns NULL for expired rows; client computeHeartbeatState defaults null → DEAD.
- T-02-25 mitigated: 60s interval has useEffect cleanup.
- T-02-26 mitigated: STATUS_SORT_ORDER is a single export.
- T-02-27 mitigated: Task 5 deleted the shims; tsc verifies no caller references them.
- T-02-28 accepted: scroll-to-picker uses approximate Y from onLayout.

## Self-Check: PASSED

All claimed commits exist in `git log` (52928d0..HEAD):
- `4144c35` Task 1
- `bdce2d3` Task 2
- `d0d8f01` Task 2b
- `2cfede9` Task 3
- `c9c2b62` Task 4
- `139aa01` Task 5

All claimed file modifications present:
- src/hooks/useFriends.ts FOUND
- src/hooks/useHomeScreen.ts FOUND
- src/stores/useHomeStore.ts FOUND
- src/components/home/HomeFriendCard.tsx FOUND
- src/components/friends/StatusPill.tsx FOUND
- src/app/(tabs)/profile.tsx FOUND
- src/screens/home/HomeScreen.tsx FOUND
- src/hooks/useStatus.ts FOUND

`npx tsc --noEmit` exit 0 (clean project-wide).
`npx eslint` on touched files: 0 errors, 2 pre-existing warnings (logged in deferred-items.md).
