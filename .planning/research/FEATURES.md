# Feature Landscape

**Domain:** Social coordination app — group expense splitting (IOUs), birthday calendar, Squad dashboard redesign (Campfire v1.4)
**Researched:** 2026-04-11
**Overall confidence:** MEDIUM — IOU and birthday patterns are stable and well-documented across Splitwise, Venmo, and social apps; dashboard card layouts are established in mobile design; exact behavior tradeoffs for Campfire's constraints (no payment integration, small groups only, Expo managed) derived from first principles + pattern research.

---

## Feature A: IOU Expense Splitting

### Table Stakes

Features users expect from any expense-splitting tool. Absence makes the feature feel broken or amateur.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add an expense: amount + description + who paid | The foundational entry point. Every bill-splitting app starts here. | LOW | Payer is one person from the group. Amount is required. Description is optional but expected. |
| Split evenly among selected members | Default behavior users assume without reading docs. "Dinner for 4 → $25 each." | LOW | Even split is the 80% case. Must be the default, not a mode to discover. |
| Custom split by amount or percentage | Groups frequently deal with "I only had a salad" situations. Users expect at least one manual override mode. | MEDIUM | Either exact amounts or percentages. Both is ideal; exact amounts is MVP. |
| Per-person running balance view | Users need to see "Alex owes me $12, I owe Sam $7" at a glance. The ledger is the whole product. | MEDIUM | Net balance per person across all expenses in the group. Must reconcile direction (owe vs. owed). |
| Mark as settled (manual) | No payment integration → manual settle is the only mechanism. Must exist. | LOW | Tapping "Settle" with a friend clears their balance. Creates a settlement record. No money moves in-app. |
| Expense history list | Users need audit trail: "What was that $43 from last week?" | LOW | Chronological list of expenses tied to the group or split context. |
| Tied to friends, not open groups | Campfire is friends-only (3–15 people). IOUs are between existing Campfire friends, not invite-by-email strangers. | LOW | Payer and participants must already be Campfire friends. No anonymous debt. |

### Differentiators

Features that make Campfire's IOU meaningfully better within its "friendship OS" context.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| IOU tied to a Plan | Dinner at Joe's → the plan already has the friend group assembled. Pre-populate participants from plan attendees. | MEDIUM | Plan → IOU creation flow reduces entry friction. IOU can also be standalone (not tied to plan). |
| Consolidated net balance between two friends | Instead of "Alex paid $30 for dinner, you paid $20 for drinks" as two rows, show: "Alex owes you $5 net." Splitwise's debt simplification is the gold standard. | MEDIUM | Collapse multi-expense balances into a single directional net. Requires summing across all shared expenses. |
| Settlement push notification | Settling sends a push notification to the other person. Closes the social loop without needing a separate conversation. | MEDIUM | Reuses existing `notify-plan-invite` Edge Function pattern (outbox queue → push). |
| IOU card on Squad dashboard | Surfaces total outstanding balance on the Squad tab without navigating to a separate screen. "You're owed $34 across 2 friends." | LOW | Dashboard card is read-only summary. Tap → IOU detail screen. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-app payment processing (Venmo/Apple Pay) | Requires Apple/Google Pay integration, financial compliance, App Store payment rules. Massive scope for v1.4. | Manual settle button. Show "Venmo them" as a share/copy action if requested in v2. |
| Debt simplification algorithm (multi-person graph) | Impressive but complex: "Alex owes Sam who owes you → net: Alex pays you." Requires graph traversal. Valuable at scale, premature for 3–15 person groups with infrequent use. | Show direct pairwise balances only. Each pair's net. No indirect chain resolution in v1.4. |
| Recurring expenses | Monthly rent splits, subscriptions — common in Splitwise. Requires scheduling infrastructure (pg_cron not enabled on free tier). | One-off expenses only. Defer to v2. |
| Expense categories (food, transport, lodging) | Adds entry friction. More valuable for trip expense reporting than casual friend IOUs. | Description field only. No category taxonomy in v1.4. |
| Currency conversion | Only needed for international travel groups. Campfire groups are local by design. | Single currency (user's locale). No conversion. |
| Photo receipt attachment | OCR and image storage are explicitly deferred in PROJECT.md (V2 feature). | Description text only. |
| "Who owes who" optimization across the whole group | Requires matrix inversion / graph reduction. High implementation cost, low marginal value for 3–15 person groups that settle frequently. | Pairwise balances only. Keep it simple. |

---

## Feature B: Birthday Calendar

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Birthday field on user profile (optional) | The data source for everything. Users expect to find it in profile settings under their name/info section. | LOW | Store month + day only (not year). Year is private and rarely relevant. Optional — never force it. |
| Birthday visible to friends only | Birthdays are personal. No public profiles in Campfire. Friends-only by design. | LOW | RLS: only mutual friends can read another user's birthday. |
| Upcoming birthdays card on Squad dashboard | "Sarah's birthday is in 3 days" surfaced without having to check a calendar. The feature's core value. | LOW | Show next 30 days of friend birthdays. Sorted ascending by days-remaining. Tap → birthday list screen. |
| Birthday list screen | Dedicated screen showing all friend birthdays, organized by upcoming / this month / later. | LOW | Sorted by distance from today. "No birthdays yet" empty state with prompt to add your own. |
| "Today" birthday highlight | A friend's birthday today deserves top billing, visual distinction. Every birthday app does this. | LOW | Today's birthdays pinned at top of the list with a distinct visual treatment (color accent, label). |
| Push notification on friend's birthday | The reason users enter their birthday in the first place — so friends get notified. | MEDIUM | Day-of notification at ~9am user local time. On-device scheduled notification (same pattern as morning status prompt, v1.3). |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Birthday notification with DM deep-link | Notification opens a pre-composed DM to the birthday friend. One tap to send "Happy birthday!" | MEDIUM | Requires notification action button or deep link into DM thread. Reuses existing DM routing. |
| "Days away" label on upcoming birthdays card | "3 days" is more scannable than a date. Users don't want to do mental math. | LOW | Calculated at render time. "Today", "Tomorrow", "3 days", etc. |
| Your birthday listed in profile as reminder | After entering their birthday, show users "Your friends will be notified on [date]" — closes the loop and explains the value of the field. | LOW | Read-back in the Profile settings UI, not a feature per se — but drives completion rate for the optional field. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Birth year collection | Users are reluctant to share age. Year adds no functional value for birthday reminders. | Month + day only. Age is never displayed. |
| Contact sync to import birthdays | Requires contacts permission, complex iOS/Android permission flows, potential rejection risk. Out of scope for managed Expo workflow simplicity. | Manual entry in profile only. |
| "Send a gift" / gift suggestions | E-commerce integration, affiliate links — scope creep far beyond a coordination app. | DM deep-link is the action. Keep it social, not transactional. |
| Birthday countdown widget / home screen widget | Expo managed workflow does not support iOS WidgetKit or Android App Widgets. | In-app dashboard card only. |
| Recurring annual birthday reminder scheduling | Scheduling 12 months of notifications per friend requires persistent background job or cron. Free-tier pg_cron not enabled. | Schedule on each app launch for the next 30 days. Re-schedule on every foreground event. Same pattern as morning status prompt. |

---

## Feature C: Squad Dashboard Redesign

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Friends list visible on Squad tab | The v1.2 Squad tab already has this under the Friends sub-tab. Moving it to the top of a scrollable dashboard is a reorganization, not a new feature — but the expectation is set. | LOW | Friends list remains the anchor of the Squad tab. Removing it would regress user expectations. |
| Feature cards below the friends list | Dashboard pattern: hero content (friends) followed by contextual feature modules (Streaks, IOUs, Birthdays). Established by apps like Notion, Monzo, Robinhood. | LOW | Cards with title, summary metric, and tap-to-drill-down. No more underline tab switcher for Goals. |
| Streak card (existing, migrated) | StreakCard already exists in Goals tab. It should move to the dashboard as a feature card. | LOW | Migration, not new feature. Same data, new container. |
| Empty/loading state per card | Each feature card must handle its own loading and empty state. Partial failure (IOUs loaded, Birthdays failed) should not break the whole dashboard. | LOW | Per-card error boundary pattern. Reuse existing ErrorDisplay component. |
| Scrollable screen (FlatList or ScrollView) | Multiple stacked cards will exceed screen height. Vertical scroll is required. | LOW | ScrollView with fixed friends section at top is fine for 3–15 friends (no pagination needed). |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Feature cards as progressive disclosure | Cards show a summary (number owed, next birthday) without requiring navigation. Users get value from the dashboard without drilling in. | LOW | The card is the preview. Tap is optional, not required. |
| Friends list above feature cards (not in a tab) | Friends are the primary content of the Squad tab. Feature cards are contextual extras. This ordering makes the social graph primary and features secondary — right priority for a coordination app. | LOW | Scroll down to see features; friends are always above the fold on typical device sizes (assuming ≤8 friends shown). |
| IOU balance visible on dashboard without opening IOU screen | "You're owed $34" surfaced on the card. Users who don't have active debts see "All clear" — positive reinforcement. | LOW | Aggregate query: sum all balances for current user across all friends. |
| Upcoming birthday on dashboard without opening birthday screen | "Sarah's birthday in 3 days" — glanceable without a dedicated screen visit. | LOW | Query: next birthday among friends within 30 days. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Underline tab switcher for Friends/Goals (current v1.2 pattern) | Two tabs fragments the Squad tab content. Goals only has one card (Streak). No benefit to a tab for a single card. | Scrollable dashboard with all content visible on one screen. |
| Horizontally scrolling feature cards | Horizontal scroll for feature cards (like App Store feature banners) hides content below the fold laterally. Users don't expect to swipe sideways to find features. | Vertical stack of cards. Full width. Discoverable by scrolling down. |
| Collapsible / expandable feature card sections | Adds interaction complexity. Users must learn to tap to expand. Cards with summaries are already the right level of compression. | Fixed-height summary cards with tap-to-navigate. No accordion. |
| Drag-to-reorder cards | Adds interaction complexity, requires persistence, has no meaningful value for 3 fixed feature cards. | Fixed order: Streaks, IOUs, Birthdays. Logical order by feature maturity and engagement frequency. |

---

## Feature Dependencies

```
Squad Dashboard
    └──replaces──> Friends/Goals underline tab switcher [existing: to be removed]
    └──contains──> FriendsList [existing: migrated from Friends sub-tab]
    └──contains──> StreakCard [existing: migrated from Goals sub-tab]
    └──contains──> IOUCard [new: summary only, tap → IOU screens]
    └──contains──> BirthdayCard [new: summary only, tap → birthday list screen]

IOU Feature
    └──requires──> Supabase migration: expenses table, expense_participants table, settlements table
    └──reads──> existing friends table (participants must be mutual friends)
    └──optional link──> plans table (plan_id foreign key, nullable)
    └──push notification──> reuses outbox + Edge Function pattern from notify-friend-free
    └──migrates──> existing IOU notes field on plans (free text, NOT structured — no data migration needed, different feature)

Birthday Feature
    └──requires──> Supabase migration: birthday column on profiles table (month + day, nullable)
    └──reads──> existing friends table (only friends' birthdays visible)
    └──push notification──> on-device scheduleNotificationAsync (same pattern as morning prompt, v1.3)
    └──new screen──> BirthdayListScreen (new route in Squad tab navigator)
    └──profile edit──> birthday field added to existing profile edit screen

Dashboard reorganization
    └──no new data fetching──> all three cards fetch independently; dashboard is a layout container
    └──removes──> Squad tab underline segmented control
    └──removes──> Goals sub-tab screen (content moves inline as StreakCard)
    └──removes──> Friends sub-tab screen (FriendsList moves to dashboard top)
```

### Dependency Notes

- **IOU notes field on plans is NOT migrated.** The existing `plan_iou_notes` text field is free-form notes ("Venmo me for pizza"). The new IOU feature is structured expense tracking — a different data model. They coexist. Do not attempt to parse or migrate existing notes.
- **Birthday notification reuses the morning prompt pattern exactly.** `scheduleNotificationAsync` on app launch, scheduled for each friend's next birthday. Re-schedule on foreground. No server cron needed.
- **Dashboard reorganization requires removing two existing sub-tab screens.** The Friends and Goals sub-tabs disappear. Their content moves into the dashboard scroll. Navigation routes must be cleaned up.
- **IOU participants are drawn from existing friend relationships.** No new invitation flow. You can only split with people already in your Campfire friends list.
- **Settlement record does not move money.** It's a boolean state change on the balance pair. The UX expectation is "record that this was settled outside the app."

---

## MVP Recommendation

### Launch With (v1.4)

1. **Squad Dashboard layout** — FriendsList at top, three feature cards below (Streaks, IOUs, Birthdays). Removes underline tab switcher.
2. **IOU: Add expense** — amount, description, payer (defaults to self), even split among selected friends.
3. **IOU: Custom split by exact amount** — per-person override.
4. **IOU: Per-person balance view** — net owed / owed-to per friend pair.
5. **IOU: Mark as settled** — manual settle with confirmation.
6. **IOU: Expense history list** — chronological list for the current user.
7. **IOU card on dashboard** — aggregate balance summary.
8. **Birthday field on profile** — month + day, optional, friends-only visibility.
9. **Birthday card on dashboard** — next upcoming birthday within 30 days.
10. **Birthday list screen** — all friend birthdays, sorted by days-remaining, today highlighted.
11. **Birthday push notification** — day-of, on-device scheduled, with DM deep-link.

### Defer After Validation (v1.5+)

- IOU tied to Plan (pre-populate participants from plan attendees) — adds friction to plan creation; validate standalone IOU first.
- Settlement push notification — useful but not MVP; settle is an in-app action the recipient can already see.
- IOU expense history filtered by friend or plan — add if users express confusion navigating history.
- Birthday notification "send a wish" action button with pre-composed DM — can ship in a follow-on push notification update.

### Out of Scope (v2+)

- In-app payment processing
- Debt simplification graph algorithm
- Recurring expenses
- Contact sync for birthdays
- Multi-currency support
- OCR receipt scanning

---

## Complexity Summary

| Feature Area | Implementation Complexity | Primary Risk |
|--------------|--------------------------|--------------|
| Squad Dashboard layout | LOW — layout reorganization, no new data | Removing sub-tab navigation cleanly without breaking deep links |
| IOU data model (DB schema) | MEDIUM — 3 new tables, RLS policies, balance calculation query | Balance calculation edge cases (partial settlement, rounding) |
| IOU UI (add expense, balance view, history) | MEDIUM — multiple screens, form validation, optimistic updates | Even/custom split UX — must be obvious without tutorial |
| IOU settlement | LOW — boolean state change + optional notification | User expectation: "does this confirm they received money?" — copy must set correct expectation |
| Birthday profile field | LOW — one column addition, profile edit screen update | Ensuring year is never collected or shown |
| Birthday list screen | LOW — read query, date arithmetic, sorted list | "Days away" calculation at year boundary (Dec → Jan wrapping) |
| Birthday push notification | LOW — reuses existing on-device scheduling pattern | Scheduling next-year birthday when this year's has passed (date math) |
| Dashboard card for IOU | LOW — aggregate query, single read | Handling "no expenses yet" state gracefully |
| Dashboard card for birthdays | LOW — next-birthday query, date display | Year-boundary wrapping in the query |

---

## Sources

- Splitwise core feature model: https://en.wikipedia.org/wiki/Splitwise
- Splitwise vs Venmo Groups comparison (2026): https://splittyapp.com/learn/venmo-groups-vs-splitwise/
- Venmo Groups feature announcement: https://techcrunch.com/2023/11/14/venmo-gets-a-new-way-to-split-expenses-among-groups-like-clubs-teams-trip-buddies-and-more/
- Best bill splitting apps 2026: https://splittyapp.com/learn/best-bill-splitting-apps/
- Birthday reminder app UX case study (Bootcamp / UX Collective): https://bootcamp.uxdesign.cc/case-study-designing-an-app-to-help-people-remember-important-birthdays-cce2487da68e
- Birthday input UX patterns: https://smart-interface-design-patterns.com/articles/birthday-picker/
- Dashboard UX best practices: https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards
- Mobile card UI examples (Mobbin): https://mobbin.com/explore/mobile/ui-elements/card
- Campfire PROJECT.md: /Users/iulian/Develop/campfire/.planning/PROJECT.md

---
*Feature research for: Campfire v1.4 — Squad Dashboard, IOU Expense Splitting, Birthday Calendar*
*Researched: 2026-04-11*
