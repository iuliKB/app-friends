# Feature Research

**Domain:** Social coordination app for close friend groups (3-15 people)
**Researched:** 2026-03-17
**Confidence:** MEDIUM-HIGH (core patterns backed by multiple sources; some competitive specifics from primary app pages only)

---

## Feature Landscape

### Table Stakes

Features that users expect from day one. Missing any of these and users return to WhatsApp + Splitwise within a week.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Group messaging / chat | Every competitor has it. Users treat this as baseline communication infrastructure. | Medium | Text-only acceptable for v1. WhatsApp has conditioned users to expect this. |
| Push notifications | Without them, status updates and nudges are invisible. 65% of users return within 30 days when push is enabled vs. not. | Medium | Needs careful scoping — over-notification is a churn driver. |
| RSVP / plan attendance tracking | Partiful and WhatsApp events both do this. Users expect to know who's coming. | Low-Medium | Binary yes/no/maybe is sufficient; no waitlist needed at group sizes 3-15. |
| Friend / contact management | Users need to add people and see their own group. QR or username lookup expected. | Medium | Must feel instant. Deep-link invite flow dramatically improves conversion. |
| Auth with social login option | Email-only auth causes abandonment during onboarding. Google OAuth is the minimum. | Medium | Apple Sign-In required on iOS if any other OAuth is offered (App Store policy). |
| Profile with avatar and display name | Users need to recognize each other. A handle + avatar is minimum viable identity. | Low | Avatar from gallery or URL; no camera crop needed in v1. |
| Direct messaging | Users expect 1:1 reach-out separate from group channels. | Medium | Can share infrastructure with group chat. |
| Event / plan creation | Core coordination primitive. Users expect to create a named event, set time/place, invite people. | Medium | Partiful ships this in under 2 minutes; Campfire must match that speed. |

### Differentiators

Features that separate Campfire from the "WhatsApp + Splitwise" default stack.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Daily availability status (Free / Busy / Maybe) | Solves the "is anyone free tonight?" problem without requiring an event to exist first. Drives daily app opens. BeReal achieves 68% open-within-3-min of notification; this is the same mechanic applied to social availability. | Low-Medium | The single highest-leverage feature. Must be <3 taps to set. Status defaults to "Maybe" to prompt curiosity. |
| "Who's Free" home screen with realtime updates | Instant visual answer to "who can hang right now." No competitor shows this as a primary surface. | Medium | Realtime via Supabase subscriptions. Must render from local cache first, revalidate in background. |
| Nudge mechanic (ping a free friend) | Frictionless "Hey, want to hang?" without composing a message. Lower social activation energy than a text. | Low | Maps to a short DM pre-fill. Partiful uses "boops" for similar low-friction social touch. |
| Quick Plan (<10 seconds) | Pre-fills title, time, and invites free friends. Eliminates the friction gap between "seeing someone is free" and "making actual plans." | Medium | Down-to-Hang and similar apps fail here by requiring full form completion. Autocomplete is the key UX investment. |
| IOU / expense notes on plans | Lightweight "Alice owes Bob $12 for pizza" without leaving the app. Not full Splitwise — just plan-scoped IOUs. | Low | Plain text, last-write-wins is fine. No settlement engine needed in v1. Full Splitwise integration is an anti-feature at this stage. |
| Emoji context tags on availability | Adds social signal beyond binary status. "Free (at home)" vs "Free (out and about)" communicates hangout type. | Low | Emoji palette is a known UI pattern; no custom input needed. |
| Squad Goals stub / group identity | Named group (the "squad") creates shared identity beyond a chat thread. Enables group-level goals and challenges in v2+. | Low (stub) | Even a named-group concept is a differentiator vs. unnamed WhatsApp chats. |

### Anti-Features

Features to deliberately not build. Each one has a clear reason and a "what to do instead."

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full Splitwise-style expense accounting (debt simplification, multi-group balances, recurring bills) | Complexity mismatch. Splitwise's power features are irrelevant for casual friend hangs. Users abandon complex financial flows mid-setup. | Plain-text IOU notes on a plan. "Alice owes Bob $12" in a text field. |
| Calendar sync (Apple/Google/Outlook) | Native calendar APIs require Expo prebuild and exit the managed workflow. Howbout's core value is calendar sync — Campfire's is availability status, which is conceptually simpler. | Manual status setting is the engagement hook. Calendar sync can be v2 after validation. |
| Receipt scanning / OCR | Requires camera + ML pipeline. High complexity for a feature that belongs in a dedicated expense app. | IOU notes on plans cover the 80% case without infrastructure investment. |
| Public profiles or event discovery | IRL (app) built this and 95% of users were fake/bots. Public discovery defeats the close-friends value proposition. | Friends-only by design. Invite codes and QR codes are the growth mechanism. |
| AI social suggestions | Premature optimization. No data to train on in v1. Adds complexity without validated user need. | Defer to v3+. Manual nudges and status signals are sufficient for the target group size. |
| Read receipts and message reactions | Signals feature parity with iMessage/WhatsApp, which users will subconsciously compare. Campfire cannot win that comparison. Adds per-message state complexity. | Defer to v2 after core chat is validated. |
| Media/image sharing in chat | Storage costs, moderation surface, native module requirements. WhatsApp owns this use case. | Text-only chat is a principled constraint, not a shortcut. Frame it as "intentional." |
| Web app / PWA | Splits mobile-native focus. React Native's strengths are wasted in a web context. Small group apps need push notifications, which PWA handles poorly. | Mobile-only. No web until network effects justify multi-platform investment. |
| Venue booking / B2B integrations | Enterprise complexity, partnership overhead, market mismatch with close-friend groups. | Link dump field on plans covers "here's the restaurant reservation" without integration. |
| Group size pagination / search | Overkill for 3-15 person groups. Premature scalability engineering. | Simple flat lists. FlatList with no pagination is correct at target scale. |

---

## Feature Dependencies

```
Auth (email + Google OAuth)
  └─> Profile creation (username, avatar, display name)
        └─> Friend system (add by username / QR code)
              ├─> Daily status (Free/Busy/Maybe + emoji tags)
              │     └─> "Who's Free" home screen (realtime updates)
              │           └─> Nudge mechanic (ping a free friend via DM)
              │
              ├─> Direct messaging (1:1 DMs between friends)
              │     └─> Nudge mechanic (pre-filled DM)
              │
              └─> Quick Plan creation (title, time, location, invite friends)
                    ├─> Plan dashboard (RSVP, link dump, IOU notes)
                    │     └─> IOU / expense notes (plain text, per plan)
                    └─> Plan group chat (per-plan thread)
                          └─> Push notifications (nudges + plan updates)

Push notifications
  └─> Daily status reminder (optional, user-controlled)
  └─> Nudge delivery
  └─> Plan RSVP / update alerts
```

Key constraint: Every feature above auth requires a working friend system. The friend system is the critical path dependency that blocks all social features.

---

## MVP Definition

### Launch With (v1)

The atomic unit of value: "I can see who's free and spin up a plan in under 60 seconds."

1. Auth (email + Google OAuth)
2. Profile creation (username, display name, avatar)
3. Friend system (username add + QR code)
4. Daily availability status (Free / Busy / Maybe + emoji tags)
5. "Who's Free" home screen with realtime status updates
6. Nudge (pre-filled DM to a free friend)
7. Quick Plan creation (<10 seconds, free friends pre-selected)
8. Plan dashboard (RSVP, link dump text field, IOU notes text field)
9. Chat (per-plan group chat + 1:1 DMs)
10. Push notifications (nudges and plan invites)
11. Profile editing + settings
12. Seed data for development iteration

### Add After Validation (v1.x)

Features that enhance the core loop once the core loop is confirmed to work.

- Realtime chat push notifications (not just nudges — full message delivery)
- Image sharing in chat (if users request it; adds storage cost)
- Message reactions (if chat engagement metrics justify complexity)
- Read receipts (same threshold)
- Plan recurrence ("Same time next week?")
- Calendar export (ICS file export as lightweight alternative to full sync)
- Expense settlement tracking (mark IOU as "settled" without full accounting engine)

### Future Consideration (v2+)

- Calendar sync (Apple/Google/Outlook — requires Expo prebuild)
- Interactive social map showing where friends are
- Squad Goals (group-level challenges, streaks, shared milestones)
- OCR receipt scanning for expense splitting
- AI-powered hangout suggestions (requires usage data to be meaningful)
- Web companion (read-only notifications, not full app)
- Group size expansion beyond 15 (requires pagination, moderation)

---

## Feature Prioritization Matrix

| Feature | User Value | Retention Impact | Complexity | Build Order |
|---------|------------|-----------------|------------|-------------|
| Auth + profile | Mandatory | Gating | Medium | 1 — nothing works without it |
| Friend system | Mandatory | Gating | Medium | 2 — blocks all social features |
| Daily availability status | Very High | Core daily hook | Low-Medium | 3 — primary retention driver |
| "Who's Free" home screen | Very High | Core daily hook | Medium | 4 — makes status visible and actionable |
| Quick Plan creation | Very High | Converts status into action | Medium | 5 — closes the loop from "free" to "plans" |
| Nudge mechanic | High | Reduces activation energy | Low | 5 — shares DM infrastructure |
| Plan dashboard (RSVP + IOU) | High | Keeps users in-app vs. Splitwise | Low-Medium | 6 — after plan creation |
| Chat (DMs + group) | High | Table stakes | Medium | 6 — can parallel-track with plan |
| Push notifications | High | Without this, status is invisible | Medium | 7 — enables all async engagement |
| Profile editing | Medium | Hygiene | Low | 7 — can ship after MVP validation |
| Squad Goals stub | Low | Future hook | Very Low | 8 — placeholder, no logic needed |

---

## Competitor Feature Analysis

| Feature | WhatsApp Groups | Splitwise | Partiful | Howbout | BeReal | Campfire (target) |
|---------|----------------|-----------|----------|---------|--------|-------------------|
| Group chat | Yes (core) | No | Per-event only | Per-plan | No | Yes (per-plan + DMs) |
| Availability/status | Online indicator only | No | No | Yes (calendar-based) | No | Yes (Free/Busy/Maybe — daily) |
| Event/plan creation | Basic (Events feature) | No | Yes (core) | Yes | No | Yes (quick plan) |
| RSVP tracking | Via events | No | Yes | Yes | No | Yes |
| Expense tracking | No | Yes (full) | Venmo/CashApp link only | No | No | Lightweight IOU notes only |
| Daily engagement hook | Notifications | No | No | No | Yes (random-time prompt) | Yes (status = daily habit) |
| Friend group focus | No (public) | Partial | No (event-centric) | Yes | Partial | Yes (3-15 people, friends-only) |
| Spontaneous hangout support | No | No | No | Partial | No | Yes (core use case) |
| QR code add friend | No | No | No | No | No | Yes |
| Nudge / ping mechanic | No | No | Boop | No | No | Yes |
| Link dump on events | No | No | No | No | No | Yes |
| Cold-start solution | Already has users | Already has users | Text-based invites | Calendar import | Random prompt | QR codes + invite links |
| Retention model | Network lock-in | Debt lock-in | Event-triggered | Calendar habit | Daily notification | Daily status habit |

**Key insight from competitor analysis:**

No single competitor combines daily habit formation (BeReal's mechanic) with spontaneous plan creation (Partiful's event tooling) and lightweight expense tracking (Splitwise's IOU primitive) in a friends-only context. WhatsApp groups come closest to the total feature set but lack the availability/spontaneity layer entirely. Campfire's differentiated position is the intersection of these three concerns in a small, warm, high-trust context.

---

## Sources

- [WhatsApp New Feature Roundup: Group chats, events, calls (official blog)](https://blog.whatsapp.com/new-feature-roundup-updates-to-group-chats-events-calls-channels-and-more)
- [WhatsApp Enhances Group Chats With Three New Features (Jan 2026) — MacRumors](https://www.macrumors.com/2026/01/07/whatsapp-group-chats-three-new-features/)
- [Splitwise Features & Pricing — SaaSWorthy](https://www.saasworthy.com/product/splitwise)
- [Splitwise official site — feature list](https://www.splitwise.com/)
- [Partiful on TIME100 Most Influential Companies 2025](https://time.com/collections/time100-companies-2025/7289589/partiful/)
- [Meet Partiful, the Gen Z party-planning staple — CNBC](https://www.cnbc.com/2025/04/19/meet-partiful-the-gen-z-party-planning-staple-thats-taking-on-apple.html)
- [Partiful App Review: Tips, Tricks & Settings — party.pro](https://party.pro/partiful/)
- [BeReal comeback strategy — Marketing Brew](https://www.marketingbrew.com/stories/2025/07/16/bereal-comeback-strategy/)
- [BeReal Statistics 2026 — Charle](https://www.charle.co.uk/articles/bereal-statistics/)
- [Howbout: The best shared calendar app for making plans with friends](https://howbout.app/blog/making-plans/the-app-to-get-friends-together)
- [Social app IRL is shutting down because most of its users are fake — Quartz](https://qz.com/social-app-irl-is-shutting-down-because-most-of-its-use-1850580325)
- [VCs on IRL debacle: 95% fake users — Fortune](https://fortune.com/2023/07/02/venture-capitalists-on-irl-social-app-startup-failture-fake-users-softbank-funding/)
- [How to solve the cold-start problem for social products — Andrew Chen](https://andrewchen.com/how-to-solve-the-cold-start-problem-for-social-products/)
- [Beyond Instagram & Snapchat: best social apps for keeping up with friends — Howbout](https://howbout.app/blog/apps-you-need/beyond-instagram-snapchat-the-best-social-apps-for-keepin)
- [Partiful vs. Luma — Favs blog](https://favshq.com/blog/partiful-vs-luma)
- [Mobile App Retention Benchmarks 2025 — UXCam](https://uxcam.com/blog/mobile-app-retention-benchmarks/)
- [As people look for ways to make new friends — TechCrunch (March 2026)](https://techcrunch.com/2026/03/14/as-people-look-for-ways-to-make-new-friends-here-are-the-apps-promising-to-help/)
