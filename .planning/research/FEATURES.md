# Feature Landscape — v1.3 Liveness & Notifications

**Domain:** Social coordination / "friendship OS" for small close-friend groups (3–15 people)
**Researched:** 2026-04-06
**Scope:** User-facing behavior of the five v1.3 feature groups only. Not tech stack.
**Overall confidence:** MEDIUM–HIGH (UX patterns below are well-established in mainstream social apps; specific numeric thresholds are informed recommendations, not industry standards.)

---

## 1. Status TTL / Freshness

**User problem today:** Status in Campfire is set once and "lives forever." After 24 hours a "Free" friend is probably lying to you, which erodes trust in the Home screen — the core loop.

### How comparable apps handle it

| App | Pattern | Notable detail |
|-----|---------|----------------|
| **Snapchat (Bitmoji status / Zzz)** | Status tied to activity; auto-expires a few hours after set; sleeps automatically after device idle | Never shows a stale status; no explicit "expired" concept visible to users |
| **BeReal** | Hard daily window — the post represents "today" only, resets at a fixed time | Whole concept is "today-only," no per-post TTL |
| **Houseparty (RIP)** | Presence = app foreground. Went offline when backgrounded | Presence, not status — binary, zero-effort but felt creepy |
| **Marco Polo** | "Recently active" timestamp (e.g., "active 2h ago") | Never a hard expiry; relative timestamp + decay |
| **Locket** | Last-photo timestamp decays visually (fades) | Uses visual decay rather than a binary expired state |
| **WhatsApp status** | 24h hard expiry | The dominant convention for "status that disappears" |
| **Slack status** | User picks duration up-front: 30m / 1h / 4h / today / don't clear / custom | The closest fit for Campfire's "Free until X" UX |
| **Discord custom status** | Clear after: 4h / today / this week / don't clear | Similar menu, longer ceiling |

### Table stakes

| Feature | Why expected | Complexity | Depends on |
|---------|--------------|------------|------------|
| Status has an explicit expiry time stored server-side | Every modern status/presence system expires. Users already assume Campfire does. | Low | DB column on `statuses` table |
| Home screen treats expired statuses as "unknown" / muted, not as still-current | Showing a stale "Free" is worse than no data — breaks trust | Low | Home query filter |
| User sees how long their own status is valid for ("Free until 6pm") | Users need to know what they're committing to | Low | Status composer UI |
| Daily reset (everyone's status clears overnight) | WhatsApp/BeReal/Snap all reset. Feels fresh every morning. | Low | Scheduled job / cron / Edge Function |
| "Expired" banner on own profile prompting re-set | Users forget; a visible nudge drives re-engagement | Low | Home screen |

### Differentiators (make Campfire's version notably good)

| Feature | Value | Complexity |
|---------|-------|------------|
| **Duration-first composer**: user picks "Free for 1h / until 6pm / rest of day" at set-time, not a toggle | Most apps bolt TTL on as an afterthought. Campfire's loop is duration-aware — lean into it. | Medium |
| **Smart defaults by time of day**: morning → "rest of day"; late afternoon → "until 10pm"; evening → "for a few hours" | Reduces taps; feels the app "gets" you | Low (pure client logic) |
| **status_history table**: every status change recorded | Enables future Goals/streaks, timeline features, "you were Free 4 times this week" recaps | Low-Medium (append-only insert) |
| **Grace window** before showing expired state (e.g., 10 min after expiry, status still visible but dimmed) | Avoids jarring "friend just vanished" moments | Low |
| **Context tag persists across refresh** ("pizza 🍕" sticks when user re-ups status) | Reduces re-entry friction for users who refresh same status | Low |

### Anti-features (AVOID)

| Anti-feature | Why | Instead |
|--------------|-----|---------|
| Presence-based "online now" | Creepy (Houseparty lesson), privacy-hostile, doesn't fit async friend coordination | Explicit user-set status with TTL |
| Silent deletion of expired statuses | Loses signal for future features (history, recaps) | Soft-expire: keep row, mark `expires_at` passed |
| TTL shorter than 1h | Too noisy; users won't re-up constantly | 1h floor |
| TTL longer than "rest of day" without daily reset | Defeats the freshness goal | Cap at daily reset |
| Auto-extending on app open | Users would never have "Busy" show — turns into presence | Never auto-extend |
| Hard reset at midnight local time | People are often out at midnight; killing their "Free" status mid-night is hostile | Reset at 5–6am local (see recommendation) |

### Recommendation: Status duration option set

Recommended menu (in this order, with the first as default suggestion based on time of day):

1. **For 1 hour** — quick "I'm around right now" signal
2. **For a few hours (3h)** — default afternoon/evening pick
3. **Until 6pm** — shown only when current time is before ~4pm
4. **Until 10pm** — shown only when current time is before ~8pm
5. **Rest of day** — expires at daily reset
6. *(implicit)* daily reset always applies as a ceiling

**Rationale:** Five options is the Slack/Discord sweet spot — enough flexibility, low cognitive load. The time-sensitive options (Until 6pm / Until 10pm) are only shown when meaningful, so the menu usually shows 3–4 items. "For 30 min" is intentionally omitted: it creates re-entry churn without user benefit in a non-presence app. "For a week" is omitted: breaks the daily-freshness contract.

### Recommendation: Daily reset time

**5:00am local time**, not midnight.

**Rationale:** Midnight resets strand people who are actively out socializing ("I was Free and now I'm not, per the app"). BeReal and most social apps that do daily cycles avoid midnight for this reason. 5am is after almost all natural socializing has ended but before the morning prompt fires, which means the morning prompt arrives with a clean slate. 5am also avoids DST edge cases better than 4am.

### Dependencies on existing features

- `statuses` table — needs `expires_at` column and `context_tag` retained through re-up
- Home screen "Who's Free" query — must filter on `expires_at > now()`
- Realtime subscription — should emit when a status expires (either via trigger or client-side timer)
- Morning prompt (§3) — depends on reset having run

---

## 2. "Friend Went Free" Notification

**User problem today:** The "Free" signal is invisible unless the recipient happens to open the app. The core loop (spontaneous plans) depends on the signal being delivered.

### How comparable apps handle it

| App | Pattern | Notable |
|-----|---------|---------|
| **Snapchat "Best Friends active"** | Silent, in-app only (activity dots) | No push for mere activity; push is reserved for direct messages |
| **Marco Polo** | Push on "new Polo from friend" — but not on presence | No presence push at all |
| **Life360 "arrived at home"** | Push per-friend, per-place, aggressively batched | The closest analog; uses quiet hours + per-contact mute heavily |
| **Find My "[Friend] has arrived at Home"** | Opt-in per friend, rate-limited | Table-stakes rate limiting |
| **Houseparty "[Friend] is in the house"** | Push on app-open; spectacularly noisy — cited as a reason for decline | Cautionary tale |
| **Strava "Friend just finished a run"** | Batched digest; never real-time per friend | Defaults to digest |

### Table stakes

| Feature | Why | Complexity | Depends on |
|---------|-----|------------|------------|
| Push fires when a friend transitions from non-Free → Free | This is the whole point | Medium | push infra, Postgres trigger, Edge Function |
| Per-recipient mute toggle in Profile / notification settings | Mandatory for a social app; users will disable if they can't control it | Low | settings + `push_prefs` table |
| Do-not-disturb window (quiet hours) | Users don't want "Ana is Free" at 2am | Low | per-user quiet-hours setting, defaults 22:00–08:00 |
| Rate limiting per recipient per sender | Prevents Houseparty-tier spam from one bouncy friend | Medium | Edge Function dedup state (Redis or Postgres) |
| Deep link to Home screen with that friend highlighted | Users who tap the push expect to do something about it | Low | notification payload with `friend_id` |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| **Batched "N friends are free now"** when ≥3 friends go Free within a short window | The loop is "who should I hang with?", not "did Ana become free?" — aggregate is more actionable | Medium-Heavy |
| **Notification includes the context tag** ("Ana is Free • pizza 🍕") | Turns a ping into an immediate CTA | Low |
| **Smart muting**: if recipient just marked themselves Busy, suppress inbound "friend went Free" pushes for that window | Respects the user's declared unavailability | Low-Medium |
| **Per-friend "notify me" setting** (opt-in to specific friends' liveness, not all) | Power-user feature; respects social asymmetries in a 3–15 group | Medium |
| **In-app liveness feed** showing recent transitions even without push | Users who disable push still get the value | Low |

### Anti-features (AVOID)

| Anti-feature | Why |
|--------------|-----|
| Push for every status edit (Free → Free with different tag) | Noise; users will disable notifications entirely |
| Pushing the *sender* that "your status has been delivered" | Not needed; adds zero value |
| "Friend went Busy" notifications | Negative signal, no CTA; annoys users |
| Group-wide broadcast DMs ("Ana is free, so is Ben") | Not a notification, not a message — do neither |
| No cap on bursts (e.g., user rapidly toggling status) | Looks like a bug to recipients |
| Per-sender rate-limits without per-recipient limits | A chatty sender can still spam 10 friends — only the per-pair limit matters |

### Recommendation: Rate-limit window

**Per (sender, recipient) pair, 15 minutes, hard.**
**Additionally:** per recipient, max 1 "friend went Free" push every 5 minutes (batched into "N friends are free now" if overflow).

**Rationale:**
- **Why per-pair, not per-sender:** A sender going Free is interesting *once* to each recipient. Per-sender-global rate limits break the case where Ana goes Free and 8 people should hear about it. Per-pair protects recipients from bouncy senders without starving coverage.
- **Why 15 min:** Shorter than the natural "change my mind" window (Ana flips Busy → Free → Busy → Free in 3 min shouldn't page 3 times). Longer than a user fat-fingering. Matches intuition for "I already heard this."
- **Why a secondary per-recipient 5-min cap:** In a 15-person squad, if everyone wakes up and marks themselves Free within a minute, that's 14 pushes to one phone. The 5-min per-recipient cap triggers the batched "N friends are free now" instead, which is the differentiator above.
- **Threshold for batching:** ≥3 distinct friends going Free within a 5-minute window collapses into a single batched notification. Below 3, deliver individually.

### Dependencies on existing features

- Existing `push_tokens` wiring (mentioned as partially wired for plan invites)
- `statuses` table — needs transition detection (was not Free → is Free)
- Friend system — only fire for mutual friends
- Notification toggle in Profile — must extend the existing "Plan invites" toggle with a new "Friend went Free" toggle

---

## 3. Morning Status Prompt with Action Buttons

**User problem today:** Daily setting a status is friction. Most users won't remember. Without the morning prompt, the TTL/reset work is wasted because nobody re-ups.

### How comparable apps handle it

| App | Pattern |
|-----|---------|
| **BeReal** | Single daily push at a randomized time; tapping opens camera directly |
| **Duolingo** | Aggressive daily push with personalized copy; drives to a specific action |
| **Apple Health "Stand"** | Local notification with action buttons (start workout) — action mutates state without foregrounding |
| **Slack "Set your status"** | In-app morning banner; no push |
| **Strava "Log today's activity"** | Push with quick-add action buttons |

### iOS / Android action buttons — current reality

- **iOS UNNotificationCategory** with action buttons is fully supported and lets users tap "Free" / "Busy" / "Maybe" from the notification drawer without opening the app. Background handler mutates state.
- **Android notification actions** equally supported (NotificationCompat.Action).
- **Expo support:** `expo-notifications` supports categories/actions cross-platform — this is the critical compatibility constraint given Campfire's Expo managed workflow.
- **Caveat:** iOS enforces that destructive or foregrounding actions behave differently; a pure "set status" action is non-foregrounding and works from lockscreen.

### Table stakes

| Feature | Why | Complexity | Depends on |
|---------|-----|------------|------------|
| Daily local push at a user-configurable time (default 9am) | Users expect a daily prompt and expect to control timing | Low | expo-notifications local schedule |
| Tap-to-open opens a status composer directly (not Home) | Minimizes taps to the core action | Low | deep link |
| Single prompt per day, never multiple | Anti-spam table stakes | Low | scheduling logic |
| User can disable morning prompt entirely | Non-negotiable | Low | Profile toggle |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| **Notification action buttons: Free / Busy / Maybe** that mutate status without opening the app | Zero-tap friction; signature Campfire moment. iOS categories fully support this. | Medium |
| **Context-aware default time** (user's typical wake time learned over ~2 weeks) | Feels personal; reduces "too early" complaints | Medium |
| **Skip prompt if user already set status** (e.g., set it last night with "rest of day" — don't ping) | Respects user intent | Low |
| **"Same as yesterday" quick action** | Power users fall into routines | Low-Medium |
| **Weekend vs weekday schedule** (different default times or disable on weekends) | Different social rhythms | Low |

### Anti-features (AVOID)

| Anti-feature | Why |
|--------------|-----|
| Re-prompting if the user ignores the first push | Annoying; once-a-day means once-a-day |
| Server-sent morning prompt (remote push) | Local push is offline-resilient, battery-friendly, and doesn't need a cron. Only reason to go remote is if you need centralized copy experiments — not v1.3. |
| Morning prompt that only opens the app | Wastes the action-button affordance |
| Default time before 8am | Too early for a "friendship" app; annoys users |

### Fallback behavior

- **If action-button tap fails (network down):** queue the mutation locally, apply optimistically, sync on next foreground. This matches the existing "server confirmation for status updates" decision in PROJECT.md — needs a narrow exception for offline notification-action queueing.
- **If user didn't grant notification permission:** show an in-app morning banner on first daily app open.
- **If notification permission revoked later:** surface an in-app banner reminder prompting to re-enable.

### Dependencies on existing features

- expo-notifications (already partially wired)
- Status composer deep link
- Existing "Plan invites" notification toggle — the morning prompt becomes a second toggle row under it
- Depends on §1 daily reset firing before morning prompt (reset at 5am, prompt at 9am = clean state)

---

## 4. DM Entry Point

**User problem today:** Group DMs work, but there is no obvious way to start a DM with a specific friend. Users have to go through Chats tab which shows existing threads only.

### How comparable apps handle it

| App | Entry point pattern |
|-----|---------------------|
| **iMessage** | Compose icon top-right of Messages list (pencil-and-square) |
| **WhatsApp** | FAB bottom-right on Chats tab, opens contact picker |
| **Telegram** | FAB bottom-right, pencil icon |
| **Signal** | FAB bottom-right |
| **Instagram DMs** | Compose icon top-right of Inbox; also tap-username → DM from profile |
| **Snapchat** | Swipe from camera; also tap any friend in friends list |

**Conclusion:** Two conventions coexist: compose icon top-right (iOS-native feel) or FAB bottom-right (Material / messaging-first apps). Tappable contact cards exist as a *secondary* entry point, not a primary one — users expect a dedicated compose action somewhere.

### Table stakes

| Feature | Why | Complexity | Depends on |
|---------|-----|------------|------------|
| Dedicated compose entry point on Chats tab | Users look here first for "start a conversation" | Low | Chats screen header |
| Tapping a friend card on Home opens their DM | Zero-friction path from "Ana is Free" to "ping her" — core to the loop | Low | Home friend card + DM deep link |
| Friend picker lists only mutual friends | Obvious but worth stating | Low | Existing friends query |

### Recommendation: Pattern choice

**Do both:** FAB (bottom-right) on Chats tab + tappable friend cards on Home screen.

**Rationale:**
- The Chats tab needs the canonical compose action (FAB matches Campfire's existing FAB pattern — v1.1 ships a shared FAB component already)
- The Home friend card tap is the *real* unlock for the v1.3 loop: "Ana is Free → tap → DM her → 'pizza at 7?'" is one gesture. This is where Campfire's differentiation lives.
- Using the existing FAB component means zero new UI work — consistent with v1.1 design system investment.

**Avoid:** Compose icon in Chats tab *header* — Campfire's ScreenHeader is reserved for titles and doesn't currently host actions. Adding a header action contradicts v1.2 Profile simplification direction.

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| **Long-press friend card on Home → quick action sheet** (DM / Invite to plan / View profile) | Power-user affordance; surfaces multiple actions without cluttering | Medium |
| **"Continue conversation" hint on friend cards** if there's an unread DM | Makes the Home screen a better launch pad | Low-Medium |

### Anti-features (AVOID)

| Anti-feature | Why |
|--------------|-----|
| Tappable friend cards with ambiguous default action (DM? Invite? View?) | Users should feel confident about what tap does |
| Compose icon *and* FAB *and* header button | Pick one primary; redundancy is noise |
| Auto-creating empty DM thread on friend card tap | Creates junk threads in the Chats list |

### Dependencies on existing features

- Existing DM infrastructure (v1.0)
- Shared FAB component (v1.1)
- Home screen friend cards (v1.0)
- least()/greatest() DM pair logic (already decided)

---

## 5. Streaks / Squad Goals — "N Weeks in a Row"

**User problem today:** Goals tab is a "Coming soon" stub. The v1.3 goal is a shared squad streak: "your squad has been active N weeks in a row."

### How comparable apps handle streaks

| App | Pattern | Lesson |
|-----|---------|--------|
| **Snapchat streaks** | Daily mutual snap required; "snapstreak" count visible; hourglass warning when about to break | Generated real anxiety, cited in studies; teens felt obligated. **Cautionary tale.** |
| **Duolingo streaks** | Daily XP required; "streak freeze" grace item; earned via gameplay | Grace items massively reduce anxiety while preserving the feeling of an unbroken streak |
| **BeReal memories/recap** | Shows which days you posted; no "streak" framing; no breaking | Zero anxiety, zero commitment |
| **Apple Fitness move rings** | Monthly calendar of rings; "perfect week" etc. badges | Milestone-based, not continuous pressure |
| **GitHub contribution graph** | Shows activity density; no streak counter since 2016 removal | GitHub deliberately removed streaks because they caused burnout |
| **Strava weekly goals** | Week-granular; resets; "N weeks in a row" framing | Closest analog to Campfire's goal |

### What makes a streak rewarding vs anxiety-inducing

**Rewarding:**
- Low daily bar (Strava weekly, Duolingo 5 min)
- Forgiveness mechanics (freeze items, grace periods)
- Shared / social streaks feel communal, not individual pressure
- Visible progress before the streak breaks ("you're 2 days from losing it")
- Breaking feels like "oh well, restart" not "I failed my friends"

**Anxiety-inducing:**
- Per-day bar with no grace (Snapchat)
- Individual-to-individual accountability ("I'll let Ana down")
- No visible decay warning
- Resetting to 0 with no memory of prior streaks
- Counter shown prominently at all times

### Table stakes

| Feature | Why | Complexity | Depends on |
|---------|-----|------------|------------|
| Squad-level streak, not per-person | Shared = communal feeling; per-person = Snapchat anxiety trap | Medium | `status_history` table |
| Clear definition of "active week" visible in-app | Users must understand the rules | Low | Copy |
| Current streak count visible in Goals tab | The reward | Low | Query |
| Past streak record shown ("best: 8 weeks") | Softens breaking — there's still a trophy | Low | Query |

### Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| **Grace week** (1 per 4-week window) — a squad can "miss" a week without breaking | Duolingo's lesson; preserves the feel without the pressure | Medium |
| **Forward-looking visualization** ("4 of 5 squad members active this week — you're on track") | Makes the streak a positive signal, not a ticking bomb | Medium |
| **Squad "active week" requires only ≥50% members setting ≥1 status that week** | Low enough bar that life events don't kill it | Low |
| **Weekly recap card on Sunday evening** ("Week 5 in a row! Here's what your squad was up to") | Closes the week on a high note; drives re-open | Medium |
| **No hourglass / countdown warning** — positive framing only | Anti-Snapchat stance; differentiates Campfire | Low |

### Anti-features (AVOID)

| Anti-feature | Why |
|--------------|-----|
| Per-member accountability ("Ana broke your streak") | Social pressure, relationship damage |
| Daily streak requirement | Too tight; friend groups can't sustain daily coordination |
| Hard reset to 0 with no record of prior best | Demotivating; removes "trophy" feeling |
| Push notification "your streak is about to break!" | Anxiety-inducing; Snap/Duo lesson |
| Prominent streak counter on Home tab | Goals tab, not Home. Don't make the app about streaks. |
| Streaks that require *plans*, not just *statuses* | Too high a bar. Statuses are the daily loop, plans are bonus. |

### Recommendation: "In a row" definition

A **week** is Monday 00:00 → Sunday 23:59 local (squad creator's timezone, or majority timezone).

A week is **active** if:
- At least 50% of current squad members set at least one status (any value) that week, **OR**
- At least one plan was created and had ≥2 confirmed attendees that week.

A streak **extends** when the current week becomes active.
A streak **holds** across one non-active week per 4-week window (grace week) without breaking.
A streak **breaks** only when two non-active weeks occur within a 4-week window.
Broken streak's prior count is recorded as "best: N weeks" — new streak starts at 1 on the next active week.

**Rationale:**
- **50% threshold** accommodates life events and vacation without starving the signal. In a 15-person squad, 8 people need to check in — easy. In a 3-person squad, 2 of 3 — also easy.
- **Grace week** is the single most important anti-anxiety mechanic. Without it, streaks punish life.
- **"Best: N" permanent record** means breaking isn't total loss. Trophy-preservation.
- **Two non-active weeks to break** is forgiving without being meaningless; a squad that genuinely stops using the app will break within two weeks.
- **Monday–Sunday** matches most Western calendar conventions. Avoid Sunday–Saturday which confuses non-US users.

### Dependencies on existing features

- `statuses` table (already exists) — needs `status_history` append-only log (from §1)
- Squad / Friends table — squad membership definition already exists
- Plans table (for secondary activation condition)
- Goals tab stub — to be replaced with live UI

---

## Cross-Feature Dependencies

```
Status TTL (§1)
  ├─→ status_history table ──→ Streaks (§5)
  ├─→ Daily reset ──────────→ Morning prompt (§3) needs clean state
  └─→ "went Free" transition detection ──→ Friend-went-Free push (§2)

Push infrastructure
  ├─→ Friend went Free (§2)
  ├─→ Morning prompt (§3, local push + optional remote fallback)
  └─→ (existing) Plan invites

DM entry point (§4) — independent, no dependencies on §1–§3
Streaks (§5) — depends only on status_history from §1
```

**Critical path:** §1 (TTL) must land before §2 (transition detection needs it) and §5 (history depends on it). §3 (morning prompt) depends on §1 daily reset. §4 (DM entry) is independent and can land anytime.

## MVP Recommendation for v1.3

**Must ship (core loop):**
1. Status TTL + daily reset + duration composer (§1)
2. "Friend went Free" push with per-pair rate limiting (§2)
3. Morning prompt with Free/Busy/Maybe action buttons (§3)
4. DM entry point: FAB on Chats tab + tappable Home friend cards (§4)

**Should ship (differentiator):**
5. Squad streak with grace week and positive-only framing (§5)

**Defer if time pressured:**
- Batched "N friends are free now" (§2 differentiator) — ship per-pair rate limit only, add batching in v1.4
- Weekly recap card (§5 differentiator) — streak count only in v1.3, recap in v1.4
- Long-press quick actions on friend cards (§4 differentiator)
- Per-friend notification opt-in (§2 differentiator) — global toggle only in v1.3

## Confidence Assessment

| Section | Confidence | Why |
|---------|------------|-----|
| Comparable-app patterns | HIGH | Well-known, widely documented UX of mainstream social apps |
| Table-stakes lists | HIGH | These are the baseline any social app ships |
| Anti-features | HIGH | All grounded in publicly-known failures (Houseparty, Snap streak anxiety, GitHub streak removal) |
| Rate-limit window (15min per pair, 5min per recipient, batch at ≥3) | MEDIUM | Informed recommendation based on presence-app norms; no single canonical source. Validate with real usage telemetry in v1.4. |
| Status duration option set (1h / few hours / until 6pm / until 10pm / rest of day) | MEDIUM | Modeled on Slack/Discord; adapted for Campfire's daily-reset model. Test with users. |
| Daily reset at 5am local | MEDIUM-HIGH | Consensus pattern for "daily" apps that avoid midnight. |
| Streak definition (50% members, grace week, 2-non-active breaks it) | MEDIUM | Synthesized from Duolingo + Strava + anti-Snapchat design principles. Numbers are starting points, not proven. |
| Action-button technical feasibility | HIGH | `expo-notifications` documented support for categories + actions on iOS and Android. |

## Gaps / Open Questions for Requirements Phase

- **Timezone handling for daily reset** in mixed-timezone squads — recommendation uses squad creator TZ, but requirements phase should define this explicitly
- **Notification permission onboarding** — when/how to prompt? Not covered here; UX flow question for requirements
- **Quiet hours defaults** — 22:00–08:00 suggested; should be user-configurable from day one or v1.4?
- **Streak "active week" inclusion of DMs or chat messages** — intentionally excluded above (statuses + plans only), but worth confirming with user
- **Grace week counter visibility** — show it to users ("1 grace week available") or hide it? Visible is more honest but can feel game-y
- **Batched "N friends are free now" copy** — needs writing: "3 friends are free now" vs "Ana, Ben and Sam are free" (named vs count)

## Sources

- Pattern knowledge drawn from direct product experience and documentation of: Snapchat, BeReal, Marco Polo, Houseparty (retrospectives), Locket, WhatsApp, Slack, Discord, Life360, Find My, Strava, Duolingo, GitHub (streak removal announcement), Apple Fitness, iMessage, Telegram, Signal, Instagram DMs
- iOS UNNotificationCategory / Android NotificationCompat.Action: Apple + Android developer documentation (training-data knowledge; confidence HIGH for capability, MEDIUM for latest API surface — confirm in stack research)
- Campfire project state: `/Users/iulian/Develop/campfire/.planning/PROJECT.md`

**Note on verification:** Web search and Context7 were unavailable in this research session (tool access denied). Findings rely on training-data knowledge of well-established UX patterns. Specific numeric recommendations (rate-limit windows, streak thresholds) are informed starting points and should be validated with real usage data post-launch.
