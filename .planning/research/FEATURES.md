# Feature Landscape

**Domain:** Close-friend social coordination app — chat enrichment (reactions, media, threading, polls) + profile rework (Campfire v1.5)
**Researched:** 2026-04-20
**Overall confidence:** HIGH for reactions/threading/profile patterns (iMessage, WhatsApp, Discord patterns are stable and well-documented); MEDIUM for polls (fewer reference implementations in small-group intimate apps); MEDIUM for Supabase Storage image pipeline complexity in Expo managed workflow.

---

## Feature A: Message Reactions (Emoji Tapback)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Long-press to trigger reaction picker | Universal gesture across iMessage, WhatsApp, Messenger, Discord. Users will long-press and expect a picker to appear. | LOW | The gesture itself is the entry point — no alternative is acceptable. |
| React with a single emoji, reaction appears on the bubble | Core behavior: emoji badge attached to the message with count. Without this, reactions feel broken. | MEDIUM | Badge shows emoji + count (e.g. "❤️ 3"). Multiple distinct emoji per message must stack. |
| Tap own reaction to toggle it off (unreact) | Users expect a reaction to be a toggle, not a permanent action. | LOW | Same tap target on the badge removes your reaction. Server-side: delete the row. |
| Show who reacted on long-press of the badge | "Who laughed at this?" is a table-stakes question in a 3–15 person group. | LOW | Bottom sheet or tooltip listing names. For 3–15 people, a simple name list (not avatars) is sufficient. |
| Reactions persist across app restarts | Reactions are data, not ephemeral state. Must be stored in Supabase and fetched with messages. | MEDIUM | Requires a `message_reactions` table with (message_id, user_id, emoji). RLS must scope to message participants. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Curated 6–8 emoji set (no open picker) | Intimate groups benefit from a fast, low-friction reaction experience. Open full-emoji pickers (5000+ options) add decision overhead with no meaningful gain when you already know the person. Speed and familiarity beat expressiveness at this scale. | LOW | Recommended set: ❤️ 😂 😮 😢 👍 🔥 + 2 optional (e.g. 🎉 😤). Hard-coded — no configuration needed. |
| Reaction summary bar visible without interaction | If reactions exist on a message, display the emoji badges inline below the bubble without requiring a tap. Mirrors iMessage / WhatsApp behavior. | LOW | Empty state: no bar rendered. One reaction: single badge. Multiple: stacked badges up to 3, then "+N". |
| Haptic feedback on react | Micro-interaction that makes reactions feel intentional and fun in a close-friend context. | LOW | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on reaction select. |

### Anti-Features / Explicit Defers

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Open full emoji picker (all 5000+) | In a 3–15 person group, reaction speed matters more than maximum expressiveness. Full emoji picker is slower, harder to build, and introduces fat-finger risk on small targets. iMessage only expanded to open emoji in iOS 18 — start with curated. | Curated 6–8 set. Can expand later. |
| Animated reaction bursts / confetti | Engineering effort disproportionate to use frequency. Adds JS animation complexity. | Static badge with count is sufficient. |
| Reaction notifications ("Alex reacted to your message") | At 3–15 people, reactions happen fast. Push notifications for reactions would be noise. Chat badge is sufficient. | Do not send push notifications for reactions in v1.5. |
| Custom emoji / sticker packs | Adds asset management complexity. Not expected in v1.5 for an intimate app. | Defer to V2+. |

**Complexity note:** MEDIUM overall. Requires new DB table, RLS policy, Realtime subscription update, and UI component (picker sheet + badge row). The curated-set decision removes the hardest part (full emoji keyboard integration). The main challenge is correctly layering the reaction picker above the message bubble without z-index clipping, and updating the message list efficiently on reaction change (avoid full re-render of all messages).

---

## Feature B: Media Sharing in Chat (Images)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pick image from photo library | Universal entry point. Users expect to share photos from their camera roll. Campfire already uses `expo-image-picker` for plan covers — reuse the pattern. | LOW | `expo-image-picker` in Expo managed workflow. No new native module needed. |
| Capture image with in-app camera | "Take a photo right now" is expected for spontaneous friend-group moments. | LOW | `expo-image-picker` with `launchCameraAsync`. Already available in managed workflow. |
| Image renders inline in chat bubble | Users expect to see the photo in the conversation, not a link or file name. | MEDIUM | Inline `<Image>` in the message bubble. Requires storing the Supabase Storage URL in the message body or a dedicated `media_url` column. |
| Upload progress indication | Image uploads can be slow on mobile. Users need feedback that something is happening. | LOW | Spinner or progress bar in the send bar while upload is in progress. Disable send button during upload. |
| Full-screen image on tap | Users expect to pinch-to-zoom and view images full-screen. | LOW | Modal with `expo-image` or React Native `<Image>` in a `<Modal>`. No third-party library needed. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Client-side compression before upload | Reduces upload time 5–10x, stays within Supabase free tier 1 GB storage budget for 3–15 person groups, and avoids slow sends on cellular. A 4.7 MB photo → ~420 KB compressed. | MEDIUM | Use `expo-image-manipulator` (Expo managed-compatible, no custom native module) to resize to 1920px max-width at 80% JPEG quality before upload. This already exists in Expo SDK — no extra dependency. |
| Organized storage bucket with path structure | `chat-media/{channelId}/{userId}/{timestamp}.jpg` — keeps media scoped, debuggable, and easily deletable by user. | LOW | Supabase Storage bucket: `chat-media`. Private bucket with RLS policy matching chat participant membership. |

### Anti-Features / Explicit Defers

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Video sharing | Video files (even short ones) easily exceed 50 MB Supabase free-tier per-file limit. Storage budget (1 GB total) would be consumed rapidly by a 15-person group sharing clips. | Images only in v1.5. Defer video to V2 or paid tier. |
| Multiple image selection / gallery send | Adds complexity (queue management, multiple upload progress states). Single image per send is sufficient for v1.5. | One image per send. |
| Image deletion / unsend | Requires storage cleanup and message mutation. Adds significant complexity. | Defer. Messages are immutable in v1.5. |
| GIF support from a GIF library (Giphy etc.) | External API dependency, content moderation concerns, and bandwidth cost on free tier. | Defer to V2. |
| Message editing | Orthogonal to media feature. Not in v1.5 scope. | Defer. |

**Complexity note:** MEDIUM. The upload path is the hardest part: `expo-image-picker` → `expo-image-manipulator` (resize/compress) → `fetch().arrayBuffer()` → Supabase Storage upload (the arrayBuffer pattern is already proven in Campfire for plan covers — reuse it). The DB change is small: add `media_url TEXT` and `media_type TEXT` columns to the messages table. The chat bubble needs a conditional branch to render image vs. text. Inline rendering with a loading placeholder is the UX risk — test on slow connections.

**Supabase free tier fit:** 1 GB storage total. At ~420 KB per compressed image, that's ~2,400 images before hitting the limit. For a 3–15 person group using the app daily, this is fine for v1.5 scale. No storage management needed yet.

---

## Feature C: Reply Threading (Reply to Specific Message)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Swipe-right or long-press → "Reply" action | Gesture or action that enters reply mode. iMessage uses swipe-right; WhatsApp uses swipe-right; Telegram uses swipe-right. Swipe-right is the dominant mobile pattern. | MEDIUM | Expo/React Native: `PanResponder` or `react-native-gesture-handler` swipe gesture on the message row. Long-press → contextual menu is an acceptable alternative if swipe conflicts with FlatList scroll. |
| Reply composer shows quoted preview | When composing a reply, user sees a "replying to [name]: [truncated message]" preview above the text input. Must show who they're replying to, not just the message content. | LOW | Stateful "replyingTo" object in the chat room. Small UI bar above the SendBar. Cancel button clears it. |
| Reply message links to the original | The sent reply displays a quoted bubble snippet (author name + truncated content) above the reply text. Tapping the quote scrolls to the original message. | MEDIUM | Requires storing `reply_to_message_id` on the message. Fetching the original message content for display requires either: (a) denormalizing the snippet into the message row, or (b) fetching by ID on render. Option (a) is simpler and avoids extra queries. |
| Visual distinction from regular messages | Replies must look different: indented quote block, colored left border, or shaded background. Without this, the threading is invisible. | LOW | Styled quote component in MessageBubble. Left border accent color is the standard pattern. |

### Pattern Decision: Inline Reply vs. Separate Thread View

**Recommendation: Inline reply only. Do not build a separate thread view for v1.5.**

Rationale:
- For 3–15 people, message volume is low enough that inline quoted context is sufficient. The main chat stream does not get so busy that threads need to be separated.
- WhatsApp only introduced a full thread view (in beta) in 2025 — after years of inline replies working fine for small groups. Campfire's groups are smaller than the WhatsApp groups where threading noise became a problem.
- Separate thread view requires: a new navigation stack level, a separate Realtime subscription, complex scroll-to-parent behavior across two screens. This is high engineering cost for low real-world gain at 3–15 people.
- iMessage (the dominant reference for close-friend messaging in iOS) still uses inline tapback + inline reply for most interactions. Full thread views (Slack-style) are a workplace/high-volume pattern, not a close-friends pattern.

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Scroll-to-original on quote tap | Makes the threading feel connected rather than just decorative. Users tap the quoted preview to jump to context. | MEDIUM | `FlatList.scrollToIndex()` with the original message's index. Requires knowing the index — maintain a message ID → index map or search the messages array. |

### Anti-Features / Explicit Defers

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Separate thread view / "Open thread" navigation | High complexity, wrong UX pattern for intimate groups. Slack threading solves a different problem (high-volume workplace). | Inline reply only. |
| Nested replies (reply to a reply) | Creates visual hierarchy that quickly becomes unreadable in a small chat window. iMessage doesn't do this. | Flat: every reply references the original, not another reply. |
| Reply count indicators / "N replies" thread summary | Redundant when the entire thread is visible inline. This is a Slack pattern for threads that live off-screen. | Not needed for inline approach. |
| Read receipts on replies | Out of scope for v1.5. | Defer to V2. |

**Complexity note:** MEDIUM. DB change: add `reply_to_message_id UUID REFERENCES messages(id)` + denormalize `reply_to_snippet TEXT` and `reply_to_sender_name TEXT` for display without extra queries. UI: stateful reply mode in the chat room, a quote display component in MessageBubble, and optional scroll-to-index. The gesture (swipe vs. long-press menu) needs careful testing — swipe-right on a FlatList row can conflict with iOS back-swipe gesture; long-press contextual menu is safer and more reliable cross-platform.

---

## Feature D: Polls in Chat

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create poll via attachment menu | Entry point already exists (the attachment menu with Poll, Split Expenses, To-Do items). Users expect polls to be reachable the same way they create other structured content. | LOW | Tap Poll in attachment menu → open poll creation sheet. |
| Poll question + 2–4 options | The core data: one question, multiple options to vote on. 3-5 options avoid decision fatigue; 2 is the minimum. | LOW | Text input for question + dynamic "Add option" rows up to 4 maximum. |
| Vote by tapping an option | Users expect to tap an option and see it selected. Immediate visual feedback. | LOW | Highlight the selected option. Store vote server-side. |
| See live vote counts | In a small group, "3 out of 5 voted for Saturday" is the whole point. Must show counts in real time. | MEDIUM | Realtime subscription updates counts as friends vote. Show count next to each option. Highlight winning option. |
| Poll renders as a distinct message type in chat | Poll must be visually distinct from a text message — not just text that says "Poll: ...". Must look like a poll (card with options). | MEDIUM | New message_type="poll" branch in MessageBubble. Renders a PollCard component. |
| One vote per person | Standard constraint. Users expect they cannot vote multiple times. | LOW | UNIQUE constraint on (poll_id, user_id) in the votes table, or RPC-level enforcement. |

### Binary vs. Multi-Option Decision

**Recommendation: Multi-option (2–4 options) with single-choice voting only.**

Rationale:
- Binary yes/no is too limiting for the primary use case: "When should we meet?" or "What restaurant?" both benefit from 3–4 options.
- More than 4 options introduces poll fatigue and is unnecessary for a 3–15 person group making concrete plans.
- Multiple-choice voting (select multiple options) adds significant complexity (results are harder to read, "winner" is ambiguous) with limited benefit for quick group decisions. Defer to V2.
- The attachment menu entry point naturally frames polls as structured decisions, not open surveys — 2–4 options matches this framing.

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Who voted for what (visible in small group) | In a close friend group, "Did Sam vote for Saturday?" is a normal question. Showing voter names next to options (or on tap) is appropriate and expected given the intimate context — unlike public polls where anonymity matters. | LOW | Display list of voter first names next to each option. No anonymity needed in a 3–15 friend group. |
| Poll closes automatically or creator can close | Prevents zombie polls that never resolve. Closed polls show final result without "Vote" UI. | LOW | Optional: creator taps "Close poll" button. Auto-close is optional for v1.5. |

### Anti-Features / Explicit Defers

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Anonymous voting | In a 3–15 person friend group, anonymity is not expected and adds complexity. Groups at this scale operate on trust. | Show names. |
| Multiple-choice voting (select N options) | Results become ambiguous ("4 people voted for Saturday and 3 for Sunday but 2 voted for both"). Hard to declare a winner. | Single choice only. |
| Poll scheduling / expiry time | Adds complexity. Manual close by creator is sufficient. | Manual close only. |
| Open-ended text responses | That's a survey, not a poll. Different UX pattern. | Structured options only. |
| Poll editing after votes cast | Vote integrity issue. | Polls are immutable once created. Show an "Add new poll" option instead. |

**Complexity note:** MEDIUM. Requires new tables: `polls` (question, message_id, created_by, closed_at) and `poll_votes` (poll_id, user_id, option_index). RPC or RLS for vote enforcement. A new `PollCard` component for in-chat rendering. Realtime subscription for vote count updates is the trickiest part — decide whether to use message-level Realtime (already subscribed) or a separate subscription on `poll_votes`. Given Supabase's 200-connection limit on free tier, piggybacking on the existing chat channel subscription is preferable.

---

## Feature E: Profile Rework

### Table Stakes (the cleanup that makes the rest coherent)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Remove status display from Profile screen | Home screen is the authoritative status surface (v1.3 decision). Showing status again in Profile creates confusion: "Which one is current?" Users expect one source of truth. | LOW | Remove the status row from ProfileScreen. No DB change needed. |
| Notifications section grouped and labeled | Profile currently has notification toggles scattered. Users expect a labeled "Notifications" section as a coherent group, not individual items mixed with account info. | LOW | UI reorganization: wrap toggles in a `<SectionHeader title="Notifications" />`. No state change. |
| Edit details separate from photo edit | Tapping the avatar should not also navigate to a form for display name, username, etc. Editing a photo and editing account details are distinct intentions. Mixing them makes the edit flow confusing. | LOW | Separate entry points: avatar tap → photo picker; "Edit Profile" button → text field form. Already built, may need routing separation only. |
| Cleaner layout overall | Users expect the profile to be scannable in seconds: who am I, what are my settings. | LOW | Section grouping: ACCOUNT (email, member since), NOTIFICATIONS, PREFERENCES (morning prompt, etc.), DANGER ZONE (sign out). |

---

## Feature F: Friend Profile Page

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Avatar (large, full-quality) | The first thing users expect when tapping a friend — a large version of their avatar, not the small bubble they see elsewhere. | LOW | Reuse `expo-image` for loading + fallback initials avatar. |
| Display name + username | Identity confirmation: "Is this the right Sam?" Display name + @username distinguishes friends with the same first name. | LOW | Static display from friends table / profiles join. |
| Current status (mood + context + freshness) | In a "friendship OS," seeing a friend's current status is the primary value. Users tapping a friend's card expect to see if they're Free/Busy/Maybe and what they're up to — the same data the home screen shows. | LOW | Use `effective_status` view (already exists, already scoped by RLS to friends). |
| Birthday (month + day) | Campfire has birthday data. Showing it on the friend profile page makes it discoverable outside of the birthday dashboard. Users expect: "When's her birthday?" answered on the profile. | LOW | Display `birthday_month` / `birthday_day` in human-readable format ("April 15"). Do not show year unless you make a conscious call — years can feel intrusive. |
| Wish list | Campfire v1.4 introduced wish lists. A friend's profile page is the natural place to browse their wish list outside of birthday group chat. This extends the wish list's utility beyond its current narrow context. | MEDIUM | Reuse the wish list fetch logic from `useFriendWishList` hook (already exists). Render as a scrollable list section. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Quick DM entry point on friend profile | Tap a friend's profile → immediately start a DM with one tap. Reduces friction from "find friend → navigate to Chats → find DM" to "find friend → DM button." | LOW | "Message [Name]" button navigates to the existing DM chat room. `dmChannelId` can be derived from the `least()/greatest()` pattern already in place. |
| Mutual plans display | "What plans do we have together?" — shows upcoming plans where both the viewer and the friend are participants. Reinforces the coordination identity of the app. | MEDIUM | Query `plan_invitations` joined to `plans` filtered by friend_id. Limit to upcoming (not past) plans. |

### Anti-Features / Explicit Defers

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Edit another friend's profile | Only the user can edit their own profile. Friend profiles are read-only. | Read-only view. |
| Social stats (mutual friends count, "member since") | This is a friend group of 3–15 people. You already know your friends. Stats add a social-network feel that conflicts with the intimate tone. | Omit. |
| "Follow" or "Unfollow" actions | Campfire uses a bilateral friendship model, not follow. | Unfriend action is the only destructive option — and even that should be subtle or deferred to settings. |
| Public profile shareable link | Campfire is friends-only. Profile URLs outside the app are not a use case. | Not applicable. |
| Feed of friend's activity (posts, check-ins) | Campfire is not a social feed app. This is a coordination tool, not Instagram. | Out of scope. |

**Complexity note:** LOW–MEDIUM. No new tables needed. The page is an assembly of existing data sources: `profiles` join + `effective_status` view + `birthday` columns + `wish_list_items`. The `useFriendWishList` hook already exists. The main work is building the screen layout and hooking up navigation from friend cards (HomeFriendCard, FriendsList, etc.).

---

## Cross-Cutting Concerns

### Feature Dependencies

```
Message Reactions
  └── requires: messages table (exists), new message_reactions table, Realtime update

Media Sharing
  └── requires: messages table media_url column, chat-media Storage bucket
  └── uses: expo-image-picker (exists for plan covers), expo-image-manipulator (new), arrayBuffer upload pattern (proven)

Reply Threading
  └── requires: messages table reply_to_message_id + denormalized snippet columns
  └── uses: existing message render pipeline (MessageBubble extension)

Polls
  └── requires: new polls + poll_votes tables
  └── entry point: existing attachment menu (built in v1.4)
  └── uses: existing chat Realtime subscription (piggyback, don't add new channel)

Friend Profile Page
  └── requires: no new tables
  └── uses: effective_status view (exists), useFriendWishList hook (exists), profiles table (exists)

Profile Rework
  └── requires: no DB changes
  └── UI reorganization only
```

### Supabase Free Tier Budget Implications

| Feature | DB Impact | Storage Impact | Realtime Impact |
|---------|-----------|----------------|-----------------|
| Reactions | ~1 row per reaction. Low. | None. | Low — piggybacking on chat subscription. |
| Media | Low (URL column only). | HIGH — 420 KB per image. Monitor 1 GB budget. | None for storage. |
| Threading | ~2 extra columns per message. Negligible. | None. | None (existing subscription). |
| Polls | New tables: polls + poll_votes. Low row count. | None. | Low — piggyback on chat subscription. |
| Friend Profile | No new data. | None. | None (point-in-time fetch). |

### MVP Recommendation for v1.5

Build in this order based on dependency graph and user value:

1. **Profile Rework + Friend Profile Page** — Zero DB migrations, high UX payoff, establishes clean foundation. Ship first.
2. **Message Reactions** — Single highest-requested chat feature. Requires one new table. Validate the Realtime update pattern before tackling heavier features.
3. **Reply Threading** — Extends the message model. Inline only. Validates the message-column-extension approach before polls.
4. **Media Sharing** — The image upload pipeline is the most technically novel piece (building on proven arrayBuffer pattern). Independent of reactions/threading.
5. **Polls** — Most complex (two new tables, new message type, Realtime vote sync). Build last when the chat render pipeline is already extended by reactions + threading.

### Explicit Defers (not in v1.5)

| Deferred Feature | Reason |
|-----------------|--------|
| Video sharing | Supabase 1 GB free storage budget, 50 MB per-file limit. V2. |
| Read receipts | Out of scope (listed in PROJECT.md constraints). |
| Full emoji picker for reactions | Decision overhead > expressiveness gain for 3–15 people. Start curated. |
| Separate thread view (Slack-style) | Wrong pattern for 3–15 person intimate groups. |
| Multiple-choice poll voting | Ambiguous results, added complexity. |
| Anonymous polls | Unnecessary in close-friend context. |
| Push notifications for reactions | Would be noise at this group size. |
| Image deletion / message unsend | Immutable messages in v1.5. |
| Mutual plans on friend profile | Defer if timeline is tight — nice-to-have, not table stakes. |

---

## Sources

- iMessage tapback / iOS 18 emoji expansion: [MacRumors iOS 18 Tapback](https://www.macrumors.com/how-to/ios-use-new-tapback-reactions-messages/)
- WhatsApp threading in 2025: [9to5Mac WhatsApp Threaded Replies](https://9to5mac.com/2025/07/08/whatsapp-is-working-on-threaded-replies-in-group-chats/)
- React Native image compression: [GetStream Compress File Guide](https://getstream.io/chat/docs/sdk/react-native/guides/file-compression/)
- Supabase Storage file size limits (50 MB per file, 1 GB free tier): [Supabase Storage Limits Docs](https://supabase.com/docs/guides/storage/uploads/file-limits)
- Poll design best practices (binary vs multi-option, 3-5 options): [WhatsApp Polls Guide](https://chatfuel.com/blog/create-whatsapp-polls)
- WhatsApp full thread view (Nov 2025): [BetaNews WhatsApp Threads](https://betanews.com/2025/09/15/whatsapp-threaded-messages-make-for-easier-reading/)
- React Native media upload mastering guide: [DEV Community 2026 Guide](https://dev.to/fasthedeveloper/mastering-media-uploads-in-react-native-images-videos-smart-compression-2026-guide-5g2i)
