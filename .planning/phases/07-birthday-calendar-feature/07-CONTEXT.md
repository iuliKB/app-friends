# Phase 7: Birthday Calendar Feature - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view a sorted list of friends' upcoming birthdays and the Squad dashboard shows a glanceable birthdays card. This phase builds the read-only birthday display — the birthday input was completed in Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Birthday list layout
- **D-01:** Avatar + name + date row format, consistent with FriendsList row pattern. Each row shows avatar circle, display name, and "Jan 15 · 3 days" style info on the right.
- **D-02:** Days-until labels use "Today" / "Tomorrow" / "In N days" format. Special labels for today and tomorrow, numeric for the rest. Sorted by nearest first.
- **D-03:** Today's birthdays get accent background highlight — subtle accent-tinted row background with "Today" badge in accent color.
- **D-04:** List shows all friends who have a birthday set, sorted nearest-first. Past birthdays this year wrap to next year's occurrence.
- **D-05:** Screen title "Birthdays" with back button in the nav bar. Standard screen pattern.

### Dashboard card design
- **D-06:** Card shows count + nearest birthday: "3 birthdays in the next 30 days" headline, then nearest friend's name + avatar + "in 2 days".
- **D-07:** Birthday card sits below StreakCard on the goals tab. StreakCard stays on top as the daily engagement driver.
- **D-08:** Tapping the birthday card navigates to the full birthday list screen.
- **D-09:** Card title uses birthday cake emoji: "Birthdays 🎂".
- **D-10:** Card shows a small avatar circle next to the nearest birthday friend's name.

### Empty states
- **D-11:** Birthday list empty state: "No birthdays yet — ask your friends to add theirs!" Friendly message, no illustration.
- **D-12:** Dashboard card stays visible with "No upcoming birthdays" copy when no friends have upcoming birthdays (matches SC-4). Card does not disappear.

### Navigation
- **D-13:** Birthday list screen is a stack screen under the Squad tab, e.g., `/squad/birthdays`. Back button returns to Squad. Matches friends/requests pattern.
- **D-14:** Card tap is the only entry point to the birthday list. No additional nav items.

### Claude's Discretion
- Card styling details (shadow, border radius, padding) — match StreakCard pattern
- Birthday list row spacing and typography — match FriendsList established pattern
- Data fetching approach (use existing `get_upcoming_birthdays` RPC or build client-side)
- Loading states and skeleton patterns
- Birthday list pull-to-refresh behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and ROADMAP.md success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/squad/StreakCard.tsx`: Card component pattern on the goals tab — match styling for BirthdayCard
- `src/screens/friends/FriendsList.tsx`: Row layout with avatar + name — reuse pattern for birthday list rows
- `src/components/home/UpcomingEventsSection.tsx`: SectionHeader + FlatList pattern for event-like lists
- `src/hooks/useUpcomingEvents.ts`: Hook pattern for fetching upcoming data — model birthday hook similarly
- `src/components/common/BirthdayPicker.tsx`: Phase 6 component — not directly reused but confirms birthday types
- `src/types/database.ts`: `birthday_month` and `birthday_day` fields on profiles Row/Insert/Update

### Established Patterns
- Squad tab uses `SquadTabSwitcher` with `friends` and `goals` tabs
- Goals tab currently shows `StreakCard` in a `ScrollView` with `RefreshControl`
- Theme tokens from `@/theme` (COLORS, SPACING, FONT_SIZE, FONT_WEIGHT) used everywhere
- Expo Router file-based routing under `src/app/`

### Integration Points
- `src/app/(tabs)/squad.tsx`: Goals tab ScrollView — add BirthdayCard below StreakCard
- Supabase `get_upcoming_birthdays` RPC (created in Phase 5 migration 0016) — data source for both card and list
- New route needed: `src/app/squad/birthdays.tsx` (or equivalent Expo Router path)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-birthday-calendar-feature*
*Context gathered: 2026-04-12*
