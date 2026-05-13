---
status: partial
phase: 33-friend-profile-redesign
source: [33-VERIFICATION.md]
started: 2026-05-13T00:00:00Z
updated: 2026-05-13T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Header collapse animation on iOS hardware
expected: Smooth Reanimated v4 scroll-driven collapse. Avatar shrinks from ~140pt to ~32pt between scrollY 0–160. Display name fades out; Stack nav title fades in. No jank or flicker. Reduced-motion mode shows static collapsed avatar from screen open with no animation.
result: [pending]

### 2. Blurred-avatar wash render on iOS hardware
expected: Wash fades in over 300ms once avatar image decodes (expo-image onLoad). Falls back to solid colors.surface.card rectangle when friend has no avatar.
result: [pending]

### 3. Quick-action haptics + press spring on iOS hardware
expected: Message=light impact, Mute/Unmute=selection, Photos=light impact, More=selection. Press spring 0.96 scale on each. No haptics or spring when Reduce Motion is enabled.
result: [pending]

### 4. Avatar viewer modal swipe-down dismiss on iOS hardware
expected: Tapping large header avatar opens ImageViewerModal full-screen. Swipe down dismisses the modal. No z-index issue behind the nav header. When avatar is null, tap target is absent.
result: [pending]

### 5. Remove Friend rollback under Airplane Mode
expected: Enable Airplane Mode → open friend profile → More → Remove Friend → confirm. Friend is optimistically removed from friends list immediately. After DELETE fails (network error), the friend reappears. Error alert "Couldn't remove friend. Try again." is shown.
result: [pending]

### 6. Deep-link to non-friend profile
expected: Open /friends/{id} for a user who is NOT your friend. Screen shows "No longer friends" inline view with "Back to friends" CTA. Tapping the CTA routes back to the friends list.
result: [pending]

### 7. Reduce Motion accessibility path
expected: With iOS Settings → Accessibility → Reduce Motion enabled, open a friend profile. Avatar starts in collapsed state (32pt, opacity 0). Nav title starts at opacity 1. No scroll-driven animation. No scale spring on quick-action presses. All haptics suppressed.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
