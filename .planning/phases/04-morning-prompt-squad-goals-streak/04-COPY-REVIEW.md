# Phase 4 — Copy Review Gate

**Status:** pending-review
**Blocking:** YES — Phase 4 VERIFICATION cannot run until the "Non-engineer approval" field below is filled.
**Requirement:** STREAK-08
**Decision ref:** D-19, D-20

***

## Why this review exists

STREAK-08 mandates: "Copy is positive-only — celebratory framing, no countdown / hourglass / 'you're about to lose it' UI; copy reviewed by a non-engineer before ship."

D-20 locks the enforcement: a dedicated blocking plan task listing every user-facing string. D-15 additionally forbids surfacing grace-week state. This file is that enforcement.

***

## String inventory

Every user-facing string introduced by Phase 4. Strings already shipped in earlier phases (e.g., Phase 1 `PrePromptModal` body) are NOT re-reviewed here.

| # | File | Element | String | Seen when |
|---|------|---------|--------|-----------|
| 1 | `src/lib/morningPrompt.ts` | Notification title | `☀️ What's your status today?` | Daily local push fires at user's configured time |
| 2 | `src/lib/morningPrompt.ts` | Notification body | *(empty — title only)* | Same as #1 |
| 3 | `src/components/squad/StreakCard.tsx` | Main label | `week streak` | Goals tab, every render |
| 4 | `src/components/squad/StreakCard.tsx` | Subline (non-zero state) | `Best: ${bestWeeks} weeks` | Goals tab, when current streak > 0 |
| 5 | `src/components/squad/StreakCard.tsx` | Subline (zero state) | `Start your first week — make a plan with friends.` | Goals tab, when current streak === 0 |
| 6 | `src/components/squad/StreakCard.tsx` | Accessibility label (non-zero) | `${currentWeeks} week streak. Best ${bestWeeks} weeks` | Screen reader |
| 7 | `src/components/squad/StreakCard.tsx` | Accessibility label (zero) | `Start your first week streak` | Screen reader |
| 8 | `src/components/squad/StreakCard.tsx` | Emoji accessibility | `on fire` | Screen reader reads 🔥 |
| 9 | `src/app/(tabs)/profile.tsx` | Section header | `MORNING PROMPT` | Profile screen |
| 10 | `src/app/(tabs)/profile.tsx` | Switch row label | `Morning prompt` | Profile screen |
| 11 | `src/app/(tabs)/profile.tsx` | Time row label | `Time` | Profile screen |
| 12 | `src/app/(tabs)/profile.tsx` | Permission-denied hint | `Enable notifications in iOS Settings to receive morning prompts.` | After user denies the permission prompt |

*If any string above does not exist verbatim in the referenced source file, the implementing plan has drifted — flag to planner and re-run Plan 03/04/05 before proceeding with review.*

**Grep verification status (run 2026-04-10):** All 12 strings confirmed present in their claimed source files. No drift detected.

***

## STREAK-08 positive-only guardrails

The reviewer should tick each box after reading every string in the inventory:

- [ ] No countdown timers ("5 days left", "4 hours remaining", "this week is almost over")
- [ ] No "about to lose it" / "don't break your streak" framing
- [ ] No hourglass, flame-dying, or similar urgency imagery language
- [ ] No grace-week counter exposed to the user (D-15 — grace is silent)
- [ ] No loss-aversion phrasing ("you'll lose your {N}-week streak")
- [ ] Zero-state copy is inviting, not scolding
- [ ] Notification title reads as a friendly nudge, not a nag
- [ ] Profile labels are neutral and descriptive (no exclamation-driven hype, no guilt)

***

## Review decisions

For any string the reviewer wants changed, record the final wording below. The engineer implementing the change updates the source file AND re-runs this review with the new string pasted into the inventory above.

| # | Original string | Revised string | Reason |
|---|-----------------|----------------|--------|
|   |                 |                |        |

*(Leave this table empty if no changes are requested — "all strings approved as-is" is a valid outcome.)*

***

## Non-engineer approval

**Reviewer:** _(pasted name OR pasted approval message from the reviewer — free form)_

**Date (ISO 8601):** _(YYYY-MM-DD)_

**Notes:** _(optional — any caveats, follow-up questions, or phrasing the reviewer felt strongly about)_

**Approval statement:** I have read every string in the inventory above, ticked the positive-only guardrails, and I approve these strings for v1.3 ship.

***

## Known copy debt (for v1.4, not blocking v1.3)

- The Phase 1 `PrePromptModal` body is friend-free framed and is reused here for the morning-prompt onboarding path (D-38). The mismatch is acknowledged; a `body` prop refactor is tracked for v1.4. Flag in this review ONLY IF the reviewer feels it is a v1.3 ship blocker.

***

*Copy review instantiated: 2026-04-10*
*Gate: BLOCKING — Phase 4 VERIFICATION depends on a populated "Non-engineer approval" field.*
