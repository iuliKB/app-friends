# Phase 11: Birthday Feature — Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the birthday experience with: (1) birth year on profiles, (2) personal wish lists, (3) a friend birthday page with wish list viewing and secret claiming, and (4) a birthday group chat creation flow. Tapping a friend from the birthday list becomes a rich experience — see their wish list, claim items, and spin up a private planning group with mutual friends.

Core birthday feature (picker, list screen, dashboard card) is already complete from Phases 6–7. This phase builds the social layer on top.

</domain>

<decisions>
## Implementation Decisions

### Birthday Year
- **D-01:** Birth year is now **required** — users must provide month + day + year to save a birthday. Existing profiles with month/day only need to be handled gracefully (prompt to complete on next edit).
- **D-02:** Birthday list rows display "turning N" age label alongside the existing days-until info (e.g., "Jan 15 · turning 28 · 3 days").
- **D-03:** Schema addition: `birthday_year` smallint column on `profiles`, NOT NULL for new entries. Existing rows with null year are valid legacy data — handle without crash.

### Wish List
- **D-04:** Each user has a personal wish list. Items contain: **title** (required), **URL** (optional), **notes** (optional). No price field.
- **D-05:** Wish list is managed from the **Profile tab** — a "My Wish List" section with add/edit/delete item controls.
- **D-06:** Wish list is publicly visible to all friends (read-only from their side).
- **D-07:** Schema: new `wish_list_items` table — `id`, `user_id`, `title`, `url` (nullable), `notes` (nullable), `created_at`. RLS: owner can CRUD, friends can SELECT.

### Secret Claiming
- **D-08:** Friends can claim and unclaim wish list items freely (toggle, no commitment locked).
- **D-09:** Claimed items show a "Claimed" indicator visible to all friends viewing the list — so duplicates are avoided.
- **D-10:** The **birthday person (item owner) sees NO claim information** on their own wish list. This is enforced at the RLS level — claims are invisible to the item owner.
- **D-11:** Schema: new `wish_list_claims` table — `id`, `item_id`, `claimer_id`, `created_at`. RLS: claimer can INSERT/DELETE their own claim; friends (non-owners) can SELECT; item owner cannot SELECT.

### Friend Birthday Page
- **D-12:** Tapping a friend's row in the birthday list opens a dedicated "Friend Birthday Page" screen.
- **D-13:** This screen shows:
  1. Friend's wish list (with Claimed/Unclaim/Claim toggle per item)
  2. **All of the birthday friend's friends** (for selecting birthday group participants)
  3. "Plan birthday" button to create a group chat
- **D-14:** All of the birthday friend's friends list is shown for group selection — user picks who to include before creating the group. This is NOT limited to mutual friends; it's everyone that friend knows in the app.

### Birthday Group Chat
- **D-15:** "Plan birthday" creates a **private group chat** (not a plan/event) auto-named `"[Name]'s birthday"`.
- **D-16:** The birthday friend is **NOT** added to the group. User selects from mutual friends only.
- **D-17:** **Schema gap:** Current chat system only supports 1:1 `dm_channels` and plan-linked group chats. A new `group_channels` table (with `group_channel_members` many-to-many) is needed for standalone group DMs. Researcher should evaluate whether to add a new table vs. repurpose plan chats (creating a plan behind the scenes).
- **D-18:** Group chat navigation opens the existing chat room UI — no new chat UI needed beyond the group creation flow.

### Claude's Discretion
- Exact layout of the Friend Birthday Page (wish list vs. friends list stacking order, section headers)
- Empty state for wish list (friend hasn't added items yet)
- How to handle claiming UX (inline toggle vs. swipe action)
- Group member selection UI (checkboxes, multiselect modal, etc.)
- Migration strategy for existing profiles with birthday_month/birthday_day but no birthday_year

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Birthday Decisions
- `.planning/phases/07-birthday-calendar-feature/07-CONTEXT.md` — list layout (D-01–D-14), card design, navigation pattern, empty states — carry forward all decisions that aren't overridden above

### Existing Birthday Code
- `src/hooks/useUpcomingBirthdays.ts` — hook to extend with age calculation from birthday_year
- `src/app/squad/birthdays.tsx` — birthday list screen; needs "turning N" label + tap-to-friend-page navigation
- `src/utils/birthdayFormatters.ts` — birthday formatter utilities; add age formatter here
- `src/components/squad/BirthdayCard.tsx` — dashboard card (not directly modified but context for data shape)

### Profile Edit
- `src/app/profile/edit.tsx` — birthday picker wiring; update BirthdayPicker to include year field + add wish list section

### Chat Infrastructure
- `src/types/database.ts` — `dm_channels` (1:1 DM) and `messages` schema (plan_id or dm_channel_id); researcher should assess group chat schema gap (D-17)
- `src/screens/chat/ChatRoomScreen.tsx` — existing chat room UI to reuse for group chat

### IOU Pattern Reference
- `.planning/phases/08-iou-create-detail/08-CONTEXT.md` — atomic RPC pattern, claim-like settle action pattern; wish list claims follow similar ownership/RLS logic

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/common/BirthdayPicker.tsx` — existing month+day picker; extend with year field
- `src/components/common/AvatarCircle.tsx` — used in birthday rows; reuse in wish list and friend selection
- `src/components/squad/StreakCard.tsx` / `BirthdayCard.tsx` — card pattern for wish list section in Profile
- `src/components/squad/IOUCard.tsx` — claim/settle toggle pattern analogous to wish list claiming
- `get_or_create_dm_channel` RPC — pattern for get-or-create; birthday group chat needs similar atomic creation

### Established Patterns
- Data-ownership pattern: hook in parent, prop to child (StreakCard, BirthdayCard, IOUCard all follow this)
- RLS SECURITY DEFINER helpers for cross-table SELECT policies (established in Phase 5 iou_groups)
- `iou_members` settle pattern (owner-only UPDATE RLS) is the closest analog to wish list claim visibility rules
- Atomic RPCs for multi-table writes (create_expense); birthday group chat creation should follow same pattern

### Integration Points
- `src/app/squad/birthdays.tsx` — add tap handler → Friend Birthday Page route
- `src/app/profile/edit.tsx` — add wish list management section + birthday year field
- `src/app/squad/_layout.tsx` — register new Friend Birthday Page route
- Chat navigation: existing `router.push('/chat/room')` pattern for opening chat room

### Schema Gap (D-17)
- `dm_channels` is strictly 1:1. Group chat for birthday planning needs a new table unless researcher identifies a better approach. New `group_channels` + `group_channel_members` is the likely path but must be validated against existing message routing (`messages.dm_channel_id` vs `messages.plan_id`).

</code_context>

<specifics>
## Specific Ideas

- Wish list UX analogy: like a lightweight Amazon wish list — title, link, notes per item
- Birthday group chat name: auto-filled as "[Name]'s birthday" — user can rename after creation
- Claiming is low-commitment and reversible — users should feel free to claim without pressure
- The Friend Birthday Page is the new hub for birthday coordination (wish list + friends + group creation)

</specifics>

<deferred>
## Deferred Ideas

- Push notification reminders for upcoming birthdays (BDAY-04) — originally the expected Phase 11 content; deferred since the wish list + group chat feature is the actual scope
- Month-grid calendar view (BDAY-05) — still in v1.5 backlog
- Claiming notifications ("Your friend just claimed an item from your wish list") — wishlist claims are fully secret; no notification to birthday person

None from this discussion went off-scope.

</deferred>

---

*Phase: 11-birthday-feature*
*Context gathered: 2026-04-17*
