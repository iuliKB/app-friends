# Phase 27: Plans & Squad Polish - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the Plans, Explore, and Squad screens so they feel responsive and rewarding:
- PLANS-01: Skeleton cards in the Explore/Plans list while data loads
- PLANS-02: Spring bounce + haptic on RSVP button tap
- PLANS-03: `notificationAsync(Success)` haptic after successfully creating a plan
- PLANS-04: Friendly card overlay on the Explore map when no friend plans are nearby
- SQUAD-01: `notificationAsync(Success)` on friend request accept; `impactAsync(Medium)` on reject
- SQUAD-02: Fix IOU settle haptic from `impactAsync(Medium)` → `notificationAsync(Success)`
- SQUAD-03: Squad Dashboard cards stagger-animate in on load; add `ANIMATION.duration.staggerDelay` token
- SQUAD-04: Spring scale press feedback on the WishListItem Claim/Unclaim button

No new data models, routes, or capabilities.

</domain>

<decisions>
## Implementation Decisions

### Plans List Skeleton (PLANS-01)
- **D-01:** Skeleton card shape: image placeholder block (~140px tall) at top + title bar + two metadata lines. Mirrors the full PlanCard shape to minimise layout shift on reveal.
- **D-02:** Show **3 skeleton cards** while loading — fills visible space without over-scaffolding.
- **D-03:** Skeleton condition: `loading && plans.length === 0` — same pattern as Phase 26. Pull-to-refresh keeps existing content visible with the RefreshControl spinner.
- **D-04:** Skeletons appear in the **My Plans tab only**. The Invitations tab does not need skeleton treatment.

### RSVP Spring Animation & Haptic (PLANS-02)
- **D-05:** Only the **tapped button bounces** — overshoot spring sequence: `1.0 → 0.92 → 1.05 → 1.0`. Unselected buttons don't animate. Confirms the selection.
- **D-06:** Haptic on RSVP tap: `Haptics.selectionAsync()` — subtle selection tick. Matches the reaction emoji tap haptic from Phase 26.

### Plan Creation Haptic (PLANS-03)
- **D-07:** Fire `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` immediately after the plan is successfully created (before navigation away). Fire-and-forget with `.catch(() => {})`.

### Explore Map Empty State (PLANS-04)
- **D-08:** Show a **centered card overlay on top of the map** when no friend plans are within range. Map tiles remain visible underneath for spatial context.
- **D-09:** Card content: map/location icon, heading ("No plans nearby"), one-liner ("None of your friends have plans within 25km"). Standard theme surface card with rounded corners and shadow.
- **D-10:** Trigger condition: plans have loaded and the filtered nearby plans array is empty (same condition ExploreMapView uses to decide whether to render pins).

### Friend Request Haptics (SQUAD-01)
- **D-11:** Accepting a friend request: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` — success confirmation.
- **D-12:** Rejecting a friend request: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` — physical impact, no success signal.
- **D-13:** Both fire in `FriendRequests.tsx` `handleAccept`/`handleReject` after the async call succeeds. Fire-and-forget.

### IOU Settle Haptic Fix (SQUAD-02)
- **D-14:** Change `useExpenseDetail.ts:174` from `impactAsync(Medium)` to `notificationAsync(Success)`. Settle = debt cleared — success notification is semantically correct.

### Squad Dashboard Stagger (SQUAD-03)
- **D-15:** Add `staggerDelay: 80` to `ANIMATION.duration` in `src/theme/animation.ts`. Update `squad.tsx` to use `ANIMATION.duration.staggerDelay` instead of the raw `80`.
- **D-16:** Animation style: **opacity-only** (existing `AnimatedCard` wrapper). No translateY needed — the fade stagger is sufficient.
- **D-17:** `hasAnimated.current` guard stays — cards never re-animate on pull-to-refresh or tab re-focus.

### Wish List Press Feedback (SQUAD-04)
- **D-18:** Wrap the WishListItem Claim/Unclaim `Pressable` with `Animated.spring` **1.0 → 0.96** compress-and-release. Consistent with the HOME-04 card press pattern.
- **D-19:** Use `ANIMATION.easing.spring` (damping: 15, stiffness: 120) and `useNativeDriver: true`.

### Claude's Discretion
- Exact SkeletonPulse sizing proportions within the PlanCard skeleton (Claude reads `PlanCard.tsx` and mirrors faithfully)
- Exact copy for the map empty state one-liner (keep it warm and contextual, not technical)
- Where exactly in `PlanCreateModal.tsx` the success haptic fires (after modal dismisses or before)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §PLANS-01–PLANS-04, §SQUAD-01–SQUAD-04 — The eight requirements this phase covers

### Plans & Explore (main implementation targets)
- `src/screens/plans/PlansListScreen.tsx` — Add skeleton loading state (PLANS-01); PlanCreateModal entry point (PLANS-03)
- `src/components/plans/PlanCard.tsx` — Reference for skeleton card shape (PLANS-01)
- `src/components/plans/RSVPButtons.tsx` — Add spring bounce animation and selectionAsync haptic (PLANS-02)
- `src/screens/plans/PlanCreateModal.tsx` — Fire notificationAsync(Success) on successful plan creation (PLANS-03)
- `src/components/maps/ExploreMapView.tsx` — Add centered overlay card empty state (PLANS-04)

### Squad & Social (main implementation targets)
- `src/screens/friends/FriendRequests.tsx` — Add notificationAsync(Success) to handleAccept, impactAsync(Medium) to handleReject (SQUAD-01)
- `src/hooks/useExpenseDetail.ts:174` — Fix haptic from impactAsync(Medium) → notificationAsync(Success) (SQUAD-02)
- `src/app/(tabs)/squad.tsx` — Update raw `80` stagger delay to `ANIMATION.duration.staggerDelay` (SQUAD-03)
- `src/components/squad/WishListItem.tsx` — Add Animated spring 1.0→0.96 to Claim/Unclaim Pressable (SQUAD-04)

### Shared Primitives (Phase 24 output)
- `src/components/common/SkeletonPulse.tsx` — Use for all skeleton placeholders (PLANS-01)
- `src/theme/animation.ts` — Add `staggerDelay: 80` to ANIMATION.duration; use ANIMATION.easing.spring for press animations (SQUAD-03, SQUAD-04, PLANS-02)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/common/SkeletonPulse.tsx` — Use for skeleton card blocks in PLANS-01
- `src/theme/animation.ts` — `ANIMATION.duration.*`, `ANIMATION.easing.spring` — no raw ms values
- `Haptics.selectionAsync()` / `Haptics.impactAsync()` / `Haptics.notificationAsync()` — all established patterns in codebase

### Established Patterns
- Skeleton condition: `loading && items.length === 0` (Phase 26, D-03/D-13) — pull-to-refresh keeps existing content visible
- Spring press: 1.0→0.96 `Animated.spring` + `ANIMATION.easing.spring` (Phase 26, D-11)
- Haptics fire-and-forget: `void Haptics.X()` or `.catch(()=>{})` — never `await` in sync event handlers (Phase 26)
- `AnimatedCard` wrapper (opacity `Animated.Value`) already exists in `squad.tsx` — stagger infra is already wired

### Integration Points
- `squad.tsx` `Animated.stagger(80, ...)` already uses `AnimatedCard` — only token replacement needed for D-15
- `useExpenseDetail.ts:174` — single-line haptic swap for D-14
- `FriendRequests.tsx` `handleAccept` / `handleReject` — add haptic after successful async call
- `RSVPButtons.tsx` — add `Animated.Value` per button for the bounce; or use a single `selectedAnim` keyed by `currentRsvp`

</code_context>

<specifics>
## Specific Ideas

- RSVP bounce is **per-selection** (overshoot: 0.92 → 1.05), not just compress-and-release — more satisfying than the standard 0.96 press
- Squad stagger: the `hasAnimated.current` guard must NOT be reset on refresh — cards stagger in once, then stay (existing behavior is correct)
- Map empty state: card overlays the map, doesn't replace it — preserve the spatial context of the map tiles

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 27-plans-squad-polish*
*Context gathered: 2026-05-05*
