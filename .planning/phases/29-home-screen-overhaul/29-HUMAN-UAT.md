---
status: partial
phase: 29-home-screen-overhaul
source: [29-VERIFICATION.md]
started: 2026-05-06T00:00:00Z
updated: 2026-05-06T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. View preference persists across app kill
expected: Set home view to "cards", force-quit app, reopen — should restore to "cards" view, not revert to default "radar"
result: [pending]

### 2. Zero-friends EmptyState navigation
expected: On an account with 0 friends, home screen shows "Invite your crew" heading, "Invite friends" CTA, tapping CTA navigates to /friends/add (Add Friends screen)
result: [pending]

### 3. Skeleton loading transition
expected: On a slow network or fresh app launch, UpcomingEventsSection shows 2 pulsing skeleton cards at 240×160, then fades them out (300ms) when plan data arrives — no flash of empty content
result: [pending]

### 4. DEAD bubble visual quality
expected: A friend in DEAD heartbeat state renders at 0.38 opacity with a visible greyscale overlay, clearly distinct from FADING (amber pulse ring) and ALIVE bubbles — not interactive (no tap/long-press response)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
