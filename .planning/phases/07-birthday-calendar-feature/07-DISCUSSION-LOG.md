# Phase 7: Birthday Calendar Feature - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 07-birthday-calendar-feature
**Areas discussed:** Birthday list layout, Dashboard card design, Empty states & edge cases, Navigation & access

---

## Birthday list layout

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar + name + date row | Similar to FriendsList rows — avatar circle, display name, and "Jan 15 · 3 days" on the right | ✓ |
| Card per birthday | Each friend gets a small card with avatar, name, and days-remaining badge | |
| Grouped by month | Section headers for each month with simple name + day rows | |

**User's choice:** Avatar + name + date row
**Notes:** Consistent with existing FriendsList pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Today / Tomorrow / In N days | Special labels for today and tomorrow, numeric for rest | ✓ |
| Always show date + days | "Jan 15 · In 3 days" uniform format | |
| Relative only | Just "Today", "In 3 days" with no calendar date | |

**User's choice:** Today / Tomorrow / In N days

| Option | Description | Selected |
|--------|-------------|----------|
| Accent background highlight | Subtle accent-tinted background + "Today" badge in accent color | ✓ |
| Bold text only | "Today" label in bold/accent color, normal background | |
| You decide | Claude picks | |

**User's choice:** Accent background highlight

| Option | Description | Selected |
|--------|-------------|----------|
| All friends with birthdays, sorted nearest-first | Shows every friend who has a birthday, sorted by days until next occurrence | ✓ |
| Only next 30 days | Shorter, more focused list | |
| Only next 90 days | Middle ground — next quarter | |

**User's choice:** All friends with birthdays, sorted nearest-first

| Option | Description | Selected |
|--------|-------------|----------|
| Screen title "Birthdays" with back button | Standard screen with title in nav bar | ✓ |
| Inline header within scroll | Title as first scrollable element | |
| You decide | Claude picks | |

**User's choice:** Screen title "Birthdays" with back button

---

## Dashboard card design

| Option | Description | Selected |
|--------|-------------|----------|
| Count + nearest birthday | "3 birthdays in the next 30 days" + nearest friend name/days | ✓ |
| Mini-list of next 3 birthdays | Up to 3 friends with avatar + name + days | |
| Count only | Just "3 upcoming birthdays" with "See all" | |

**User's choice:** Count + nearest birthday

| Option | Description | Selected |
|--------|-------------|----------|
| Below StreakCard | StreakCard on top, birthday card below | ✓ |
| Above StreakCard | Birthdays first, streaks second | |
| You decide | Claude picks | |

**User's choice:** Below StreakCard

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to full birthday list | Standard drill-down pattern | ✓ |
| Expand inline | Card expands in place | |
| No tap action | Card is read-only | |

**User's choice:** Navigate to full birthday list

| Option | Description | Selected |
|--------|-------------|----------|
| Birthday cake emoji 🎂 in title | "Birthdays 🎂" — friendly, social tone | ✓ |
| Ionicons gift icon | gift-outline icon — polished | |
| No icon | Plain text — minimal | |

**User's choice:** Birthday cake emoji 🎂 in title

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, small avatar next to name | More personal and recognizable | ✓ |
| No avatar on card | Text-only, compact | |
| You decide | Claude picks | |

**User's choice:** Yes, small avatar next to name

---

## Empty states & edge cases

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly message + nudge | "No birthdays yet — ask your friends to add theirs!" | ✓ |
| Illustration + message | Birthday-themed illustration + message | |
| You decide | Claude picks | |

**User's choice:** Friendly message + nudge

| Option | Description | Selected |
|--------|-------------|----------|
| Card stays visible with empty copy | "No upcoming birthdays" in card body | ✓ |
| Card shows "Add yours!" CTA | Link to profile edit | |
| You decide | Claude picks | |

**User's choice:** Card stays visible with empty copy

---

## Navigation & access

| Option | Description | Selected |
|--------|-------------|----------|
| Stack screen under Squad tab | /squad/birthdays pushed from card tap | ✓ |
| Top-level route | /birthdays accessible from anywhere | |
| You decide | Claude picks | |

**User's choice:** Stack screen under Squad tab

| Option | Description | Selected |
|--------|-------------|----------|
| Card tap is the only entry point | Simple — birthday card is the sole way to open the list | ✓ |
| Also add to friends tab | Additional "Birthdays" row on friends tab | |
| You decide | Claude picks | |

**User's choice:** Card tap is the only entry point

---

## Claude's Discretion

- Card styling details (shadow, border radius, padding)
- Birthday list row spacing and typography
- Data fetching approach
- Loading states and skeleton patterns
- Pull-to-refresh behavior

## Deferred Ideas

None — discussion stayed within phase scope
