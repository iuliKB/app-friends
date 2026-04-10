---
status: partial
phase: 02-status-liveness-ttl
source: [02-VERIFICATION.md]
started: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:00:00Z
deferred_to: "v1.3 Phase 5 Hardware Verification Gate"
defer_reason: "No Apple Dev account; hardware smoke tests consolidated into Phase 5 per project rule"
---

## Current Test

[awaiting v1.3 Phase 5 Hardware Verification Gate]

## Tests

### 1. MoodPicker two-stage commit flow
expected: MoodPicker expands on row tap, preset chip toggles, window chip commits; own status label updates instantly on both Home and Profile
result: [pending]

### 2. ReEngagementBanner appears when heartbeat enters FADING
expected: Banner animates in, shows "Still {Mood}? · active {windowLabel}", three buttons render, auto-dismisses after 8s
result: [pending]

### 3. "Keep it" action on ReEngagementBanner
expected: touch() fires, banner hides locally, heartbeat returns to ALIVE on next 60s tick
result: [pending]

### 4. "Heads down" action on ReEngagementBanner
expected: setStatus('busy', null, '3h') commits, MoodPicker shows Busy active, banner hides
result: [pending]

### 5. "Update" action on ReEngagementBanner scroll-to-picker
expected: HomeScreen scrolls MoodPicker into view
result: [pending]

### 6. Cold launch with DEAD heartbeat shows "What's your status today?" heading
expected: Heading visible on cold open with DEAD state; disappears on first commit; does not reappear in same session
result: [pending]

### 7. Friend card FADING opacity + DEAD partition
expected: FADING friends rendered at 0.6 opacity with "{Mood} · Xh ago"; DEAD friends move to Everyone Else with "inactive" label
result: [pending]

### 8. 60s setInterval re-renders Home on silent expiry
expected: Status that expires during foreground session flips friend cards to DEAD within ~60s without user action
result: [pending]

### 9. Signout clears useStatusStore cache
expected: New user on same device sees their own status, not previous user's
result: [pending]

### 10. touch() 60s debounce on rapid foreground
expected: Only one last_active_at write despite multiple foregrounds within debounce window
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps

None recorded. This UAT file is intentionally deferred to v1.3 Phase 5 Hardware Verification Gate per project rule (no Apple Dev account until near-publication; feature phases don't block on hardware smoke tests). Will surface in /gsd-progress and /gsd-audit-uat until Phase 5 runs.
