# Deferred Items — Phase 01 Push Infrastructure

Pre-existing issues discovered during execution but out of scope for the current plan.

## src/app/_layout.tsx (discovered during 01-03)

- **Pre-existing lint warning:** `'FONT_SIZE' is defined but never used` (`@typescript-eslint/no-unused-vars`) — present on base commit before plan 01-03 edits.
- **Pre-existing prettier error:** Stack `screenOptions` line needs multi-line wrapping — present on base commit before plan 01-03 edits.

Both are unrelated to the notifications-init refactor. Recommend a single cleanup commit at phase wrap-up.
