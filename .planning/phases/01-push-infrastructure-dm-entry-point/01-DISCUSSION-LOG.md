# Phase 1: Push Infrastructure & DM Entry Point - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in `01-CONTEXT.md` — this log preserves the discussion.

**Date:** 2026-04-06
**Phase:** 01-push-infrastructure-dm-entry-point
**Mode:** discuss (interactive)
**Areas selected:** iOS permission pre-prompt timing, DM entry point UX, EAS dev build setup scope, Notifications toggle off/on behavior

## Gray Areas Presented

| Area | Discussed |
|------|-----------|
| iOS permission pre-prompt timing | Yes |
| DM entry point UX (HomeFriendCard) | Yes |
| EAS dev build setup scope | Yes |
| Notifications toggle off/on behavior | Yes |
| Pre-existing `default` Android channel migration | No — handled as Claude's discretion (leave dormant, document in D-18) |

## A. iOS Permission Pre-Prompt Timing

**Q1: When should the friendly pre-prompt fire?**
- Options: After first meaningful action (recommended) / On first launch / On second launch / Passive only
- **User selection:** After first meaningful action (first status set OR first friend added)

**Q2: Pre-prompt copy style?**
- Options: Value-led (recommended) / Plain iOS-mirroring / Playful brand-voice
- **User selection:** Value-led — "Get a heads up when friends are free — we only push when something matters"

## B. DM Entry Point UX

**Q1: How should HomeFriendCard tap-to-DM work?**
- Options: Whole card tap → DM (recommended) / Whole card tap + long-press action sheet / Icon overlay / Card → friend detail
- **User selection:** Whole card tap → DM, **long-press → action sheet** (selected the more featureful option, not the recommended single-tap-only)

**Q2: Visual affordance hint?**
- Options: No new visual / Chat bubble icon / Elevation change
- **User selection:** No new visual — Pressable opacity feedback only

**Q3 (follow-up): What's in the long-press action sheet?**
- Options (multi-select): Send DM / View profile / Plan with... / Cancel
- **User selection:** View profile, Plan with... (intentionally NOT Send DM since tap already does it; Cancel is automatic on iOS)

## C. EAS Dev Build Setup Scope

**Q1: How much EAS scaffolding?**
- Options: Document only (recommended) / Scaffold eas.json / Full setup
- **User selection:** Document only — Claude writes instructions, user runs `eas build`

**Q2: Where should verification artifacts live?**
- Options: Phase 1 plan files (recommended) / docs/eas-dev-build.md / README addition
- **User selection:** Phase 1 plan files only

## D. Notifications Toggle Off/On Behavior

**Q1: Toggle OFF — what happens to push_tokens row?**
- Options: Delete row server-side (recommended) / Mark `invalidated_at` / Just AsyncStorage flag
- **User selection:** Delete the row server-side

**Q2: Toggle ON later — what happens?**
- Options: Re-register silently (recommended) / Re-register + show pre-prompt / Re-register with permission re-check
- **User selection:** Re-register silently — no UI prompt

## Codebase Findings Surfaced During Discussion

- **`/dm/[userId]` route does NOT exist** — research SUMMARY.md was incorrect. Real route verified as `/chat/room?dm_channel_id=…&friend_name=…` from `src/app/friends/[id].tsx:55-67`. Captured as D-08 (CRITICAL correction).
- **`src/hooks/usePushNotifications.ts`** — current 50-line file uses single `default` Android channel and unique on `(user_id, token)`. Full migration to channels-per-kind and composite `(user_id, device_id)` confirmed.
- **`src/components/home/HomeFriendCard.tsx`** — pure `View`, no current `onPress`. Wrap in `Pressable` is a clean addition.
- **`/plan-create` pre-selection** — unknown whether `?preselect_friend_id=…` is supported. Plan-phase must verify and add the parameter if missing (small Phase 1 addition for Plan with...).
- **Existing `setNotificationsEnabled`** at usePushNotifications.ts:48-50 only writes AsyncStorage; no server-side delete. Phase 1 fix is in scope.

## Scope Creep Redirected

None — discussion stayed within Phase 1 boundary.

## Decisions Locked

22 decisions (D-01 through D-22) recorded in `01-CONTEXT.md`.

---

*Discussion log written: 2026-04-06*
