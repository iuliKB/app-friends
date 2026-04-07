# Phase 2: Status Liveness & TTL — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents. Decisions captured in `02-CONTEXT.md` — this log preserves the path the conversation took.

**Date:** 2026-04-07
**Phase:** 02-status-liveness-ttl
**Mode:** discuss (standard)
**Notable:** User pivoted twice mid-session. Final spec is the Mood + Context + Window + Heartbeat model with Free/Busy/Maybe labels.

## Timeline

### Round 1 — Original TTL direction (from ROADMAP.md)

Claude scouted the codebase and presented 6 gray areas against the ROADMAP draft (duration picker UX, default-on-cancel, "Free until 6pm" display format, expired banner, friend's expired visual, 5am local reset mechanism).

User did not answer these. Instead, the user delivered a new direction out-of-band as a full redesign spec:

### Round 2 — "Mood + Window + Heartbeat" redesign (first version)

User: "the new philosophy: Your status stays alive as long as you are." Three layers:
- **Mood** = relabel Free/Busy/Maybe to "Down to hang / Reach out first / Heads down" with 🟢/🟡/🔴 emoji
- **Windows** = time-adaptive forward-looking options ("This afternoon / Tonight / Late night / A couple hours / Until morning")
- **Heartbeat** = `last_active_at` + client-computed ALIVE/FADING/DEAD states with friend-card dimming and ReEngagementBanner

Spec also included:
- Window-expiry push 30min before `status_expires_at`
- Morning spark push at 9am if DEAD
- "Keep it" Edge Function action to extend windows

Claude flagged 4 blockers:
1. REQUIREMENTS.md conflicts — TTL-01/02/03/05 would need rewriting, HEART-* needed adding
2. Scope bleed — window-expiry push has no phase home, morning spark overlaps Phase 4
3. Phase 1 ripple — StatusPill and HomeFriendCard labels would change
4. Clarification that this is discuss-phase, not execute-phase — SQL/Edge Function code belongs in plan-phase + execute-phase downstream

### Round 3 — User reverted the mood relabel

User: "i've change my mind i little bit, so the main idea remain free/bussy/maybe but users can choose to customize, like if they choose free they can choose for what are they free like down to hang out, down to grab a coffe, on so on, but the main title should be free, and an additional message what they are done for, also maybe (Reach out first), busy till night or bussy for 4h"

Claude interpreted this as:
- Mood labels revert to Free / Busy / Maybe
- Add a **context tag** layer (freeform or presets TBD) — user's examples "grab a coffee" / "Reach out first" / "till night"
- User's "busy till night" / "for 4h" examples conflated context tag with window — Claude flagged the ambiguity

Claude presented 4 refinement questions (Q1–Q4).

### Round 4 — User's final answers (Q1–Q4)

- **Q1 (context tag UX):** (a) Preset chips only
- **Q2 (which moods get context):** (a) All three moods support context
- **Q3 (window format):** (b) Fixed durations + a few time-of-day pins (original TTL-01)
- **Q4 (which parts of the heartbeat spec to keep):** (a) Keep everything except the mood relabel

Claude proposed 15 preset chips (5 per mood) and the 4 structural resolutions for the blockers (update REQUIREMENTS.md now, EXPIRY in Phase 3, morning spark folded into Phase 4, stick to discuss → plan → execute flow).

### Round 5 — "ship it"

User approved all 15 presets and all 4 structural resolutions in one word.

Claude then updated REQUIREMENTS.md, ROADMAP.md coverage map, and wrote this CONTEXT.md + DISCUSSION-LOG.md.

## Key Resolved Points

| Question | Final answer |
|---|---|
| Mood labels | Free / Busy / Maybe (unchanged) |
| Context tag — presets vs freeform | Presets only (5 per mood) |
| Context tag — which moods | All three moods |
| Context tag — optional? | Yes, optional |
| Window options | 1h / 3h / Until 6pm / Until 10pm / Rest of day, time-of-day hidden when <30min away |
| Does Maybe get a window? | Yes, every mood has a non-null `status_expires_at` |
| Heartbeat | Yes — `last_active_at` column, client-computed state, 4h/8h thresholds |
| ReEngagementBanner | Yes — "Still {mood}?" with Keep it / Update / Heads down; auto-dismiss 8s |
| Friend card dimming | Yes — FADING at 0.6 opacity, DEAD moves to Everyone Else |
| 5am local reset | Removed — replaced by heartbeat |
| Window expiry push (30min before) | Phase 3 as EXPIRY-01 |
| Morning spark push at 9am if DEAD | Phase 4 — update MORN-01/MORN-06 to gate on heartbeat |
| REQUIREMENTS.md update | Done — TTL-01..08 rewritten, HEART-01..05 added, EXPIRY-01 added, MORN-01/06 updated |
| Flow | discuss → plan → execute (GSD standard) |

## Dropped Ideas (with reason)

- **"Down to hang / Reach out first / Heads down" mood relabel** — user reverted mid-session. Captured in Deferred Ideas in CONTEXT.md as a potential v1.4 copy pass.
- **Time-adaptive window options** ("This afternoon / Tonight / Late night") — user picked fixed durations instead (Q3b).
- **Freeform text input for context tag** — user picked presets only (Q1a).

## Pre-Existing Decisions Carried Forward (from Phase 1 CONTEXT.md)

- AsyncStorage prefixed with `campfire:`
- Design tokens mandatory via ESLint rule `campfire/no-hardcoded-styles`
- Zero new npm dependencies
- Hooks per domain, don't split files
- Migration numbering sequential (next is 0009)
- RLS-first on every table change
- No `profiles.timezone` column

## Scout Findings (from Explore subagent)

- `statuses` table: `user_id` PK, `status` enum, `context_tag` nullable, `updated_at`. No expiry/history/heartbeat columns.
- `SegmentedControl` at `src/components/status/SegmentedControl.tsx` is the current composer. 3-segment horizontal.
- `useStatus` hook writes directly to `statuses` table at line 36.
- `useFriends.fetchFriends()` calls `get_friends` RPC, sorts by enum order, no TTL filter.
- `OfflineBanner` animated-height pattern exists — reuse for `ReEngagementBanner`.
- Design tokens live in `src/theme/` (colors, spacing, radii, typography, shadows).
- pg_cron **not** instantiated in current migrations; research docs plan it but it's not wired up yet.
- No date utility library — zero-deps rule means native `Date` only.
- Migrations 0001–0008 exist; next is 0009.
