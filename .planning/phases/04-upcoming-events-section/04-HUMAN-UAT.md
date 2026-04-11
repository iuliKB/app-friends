---
status: partial
phase: 04-upcoming-events-section
source: [04-VERIFICATION.md]
started: 2026-04-11T00:00:00Z
updated: 2026-04-11T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Cover image picker in PlanCreateModal
expected: Tap image picker, select photo from camera roll, preview shows in modal, create plan, EventCard displays the cover image with dark overlay
result: [pending]

### 2. Cover image edit on PlanDashboardScreen
expected: Open plan you created, see "Add cover image" prompt (or edit button if cover exists), pick new image, verify it uploads and replaces existing
result: [pending]

### 3. Event section layout and scroll
expected: Horizontal FlatList with snap-to-card scrolling, ~1.5 cards visible, pastel backgrounds on image-less cards
result: [passed - approved in Wave 3 checkpoint]

### 4. EventCard tap navigation
expected: Tap EventCard navigates to plan detail screen
result: [passed - approved in Wave 3 checkpoint]

### 5. Placeholder card navigation
expected: Tap placeholder "No plans yet" card navigates to plan creation
result: [passed - approved in Wave 3 checkpoint]

### 6. See All navigation
expected: Tap "See all" navigates to Explore tab
result: [passed - approved in Wave 3 checkpoint]

## Summary

total: 6
passed: 4
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
