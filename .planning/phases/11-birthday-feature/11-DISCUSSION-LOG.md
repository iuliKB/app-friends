# Phase 11: Birthday Feature — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 11-birthday-feature
**Areas discussed:** Phase goal, Wish list items, Claiming, Birthday year, Wish list access, Year required, Friend list clarification, Claim visibility, Unclaim rules, Group chat name

---

## Phase Goal

| Option | Description | Selected |
|--------|-------------|----------|
| Birthday push notifications | BDAY-04; infrastructure in place | |
| Month-grid calendar view | BDAY-05 | |
| In-app birthday moment | Special highlight on actual birthday | |
| Combo — notifications + in-app | Push + in-app | |
| **User-defined scope** | Wish list + birthday year + friend birthday page + group chat | ✓ |

**User's choice:** User defined a new scope: add birth year, wish lists per profile, friend birthday page showing wish list + mutual friends, and birthday group chat creation.

---

## Wish List Items

| Option | Description | Selected |
|--------|-------------|----------|
| Title + URL link | Name + product link | |
| Title only | Text label only | |
| Title + URL + price + notes | Full fields | |
| **Title + URL + notes** | No price, but notes field | ✓ |

**User's choice:** Title + URL + notes (no price field).

---

## Secret Claiming

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, secret claim | Claim visible to friends, hidden from birthday person | ✓ |
| Yes, visible claim | Claim visible to everyone | |
| No claiming | Read-only for friends | |

**User's choice:** Secret claim — friends see "Claimed", birthday person cannot see any claim data.

---

## Birthday Year

| Option | Description | Selected |
|--------|-------------|----------|
| Show age on birthday list ("turning 28") | | ✓ |
| Private — just for sorting | Year stored, not shown | |
| Age optional / user controls | User chooses visibility | |

**User's choice:** Show "turning N" age on birthday list rows.

---

## Wish List Access (where to manage own wish list)

| Option | Description | Selected |
|--------|-------------|----------|
| Profile tab | Wish list section in Profile | ✓ |
| Squad tab | In birthday area | |
| Both | Quick-add + full management | |

**User's choice:** Profile tab.

---

## Birth Year Required?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional | Month+day only still valid | |
| Required | Year must be provided | ✓ |

**User's choice:** Required.

---

## "Friend List" Clarification

**User's note:** Tapping a friend from the birthday list should show their wish list AND all of that friend's friends (not just mutual friends), because the user wants the opportunity to create a group with any of their friends to coordinate a birthday surprise.

---

## Claim Visibility to Other Friends

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — claimed items show as taken | Friends see "Claimed" | ✓ |
| No — fully secret | Nobody sees claims except claimer | |

**User's choice:** Friends see "Claimed" on items. Birthday person sees nothing.

---

## Unclaiming

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — unclaim anytime | Toggle, low-commitment | ✓ |
| No — claim is permanent | Locked once claimed | |

**User's choice:** Unclaim anytime.

---

## Birthday Group Chat Name

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-named "[Name]'s birthday" | Pre-filled, renameable | ✓ |
| User sets the name | Manual name entry | |

**User's choice:** Auto-named "[Name]'s birthday".

---

## Claude's Discretion

- Wish list item layout and claiming UX (inline toggle vs. swipe)
- Friend Birthday Page layout (section order, spacing)
- Empty states for wish list (friend has no items)
- Group member selection UI
- Migration strategy for profiles with birthday_month/day but no birthday_year

## Deferred Ideas

- Birthday push notifications (BDAY-04) — was the expected Phase 11 content before discussion revealed the actual scope
- Month-grid calendar view (BDAY-05) — remains v1.5
- Claim notifications to birthday person — explicitly excluded (claims must stay secret)
