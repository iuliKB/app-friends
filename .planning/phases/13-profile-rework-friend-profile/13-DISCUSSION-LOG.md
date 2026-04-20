# Phase 13: Profile Rework + Friend Profile - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 13-profile-rework-friend-profile
**Areas discussed:** Edit profile split

---

## Edit Profile Split

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar tap = photo only, new row = Edit Profile | Avatar tap/pencil triggers photo picker directly. Separate 'Edit Profile' tappable row navigates to text-only detail editor. | ✓ |
| Keep pencil on avatar, add Edit Profile button | Pencil overlay still opens picker. Explicit 'Edit Profile' text button under name/username. | |
| Single 'Edit Profile' opens sub-options | Tapping 'Edit Profile' opens action sheet with 'Change Photo' / 'Edit Details'. | |

**User's choice:** Avatar tap = photo only, new row = Edit Profile

---

| Option | Description | Selected |
|--------|-------------|----------|
| Username editable | Add username text field with uniqueness validation on save. | |
| Username read-only | Show @username for context, not editable. Simpler — avoids validation complexity. | ✓ |

**User's choice:** Username read-only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on the detail editor screen | Detail editor has: display name, @username read-only, birthday, wish list. Minimal restructure. | |
| Birthday stays, wish list moves to its own screen | Detail editor = display name + birthday. Wish list gets its own dedicated screen. | ✓ |
| Both move to separate screens | Detail editor = display name only. Birthday and wish list on separate screens. | |

**User's choice:** Birthday stays, wish list moves to its own screen

---

| Option | Description | Selected |
|--------|-------------|----------|
| A 'My Wish List' row on the Profile tab | Profile tab gets a tappable 'My Wish List' row navigating to the dedicated screen. | ✓ |
| A 'Wish List' section within the detail editor | Wish list accessible via 'Edit Profile' first, then below birthday. | |

**User's choice:** A 'My Wish List' row on the Profile tab

---

## Claude's Discretion

- Exact placement of "Edit Profile" and "My Wish List" rows in profile tab section order
- Copy for null/expired status on friend profile
- Whether detail editor reuses `/profile/edit` route or becomes `/profile/edit-details`
- Styling for friend profile wish list section

## Deferred Ideas

- Username editing (read-only this phase, potential future phase addition)
- Claim/vote interactivity on friend profile wish list
- Status freshness badge (FADING/DEAD) on friend profile
