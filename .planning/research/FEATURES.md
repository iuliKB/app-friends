# Feature Landscape: v1.8 UI/UX Screen Overhaul

**Domain:** Consumer mobile social coordination app — close friend groups (3–15 people)
**Researched:** 2026-05-06
**Milestone:** v1.8 Deep UI Refinement & Screen Overhaul
**Confidence:** HIGH for auth/onboarding patterns (well-established, NNG + Authgear confirmed); HIGH for map patterns (MapUIPatterns.com + NNG verified); MEDIUM for friend-status home screen (domain-specific, cross-referenced Locket/BeReal/Bumble patterns); HIGH for card dashboard patterns (Material Design + eleken confirmed).

---

## Screen 1: Home Screen

The home screen is the daily driver. It must answer "who's free right now?" in under 2 seconds. Currently has: radar bubble view, swipeable card stack, status pill in header, upcoming events horizontal scroll, re-engagement banner.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Immediate friend-status legibility | Users open the app to see who's around — if the first glance doesn't answer this, they close the app | Low | Radar has this but visual hierarchy must be checked — ALIVE vs FADING vs DEAD needs instant readability |
| Status freshness signal at a glance | Stale status is worse than no status — users need to know if data is current | Low | Heartbeat freshness (ALIVE/FADING/DEAD) is built but must translate visually without requiring close inspection |
| One-tap status update | Setting status is the app's core daily action — friction here kills DAU | Low | Status pill in header is built; bottom sheet must open in <200ms and confirm in <100ms |
| Empty state with CTA for no friends | First-time users or users before friends join need direction, not a blank screen | Low | "Invite friends" CTA must be prominent, not a footnote |
| Scrollable without layout thrash | iOS rubber-band scroll should feel native; FlatList/SectionList composition must be consistent | Low | Already using FlatList; verify header doesn't clip during overscroll |
| Pull-to-refresh | Users expect this to force-refresh status data | Low | Already standardized; confirm it's present on the home screen's main list |
| Tappable friend row goes somewhere useful | Every friend shown should be a navigation entry point (DM, profile) | Low | HomeFriendCard DM entry is built |
| Visible "nudge" action | The primary social action from the home screen — tapping to nudge a friend — must be obvious | Low | Card stack has this; radar view may not |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Radar view with ambient motion | Subtle animations (pulse on ALIVE status, fade on DEAD) make the home screen feel alive without being noisy | Medium | Currently static bubbles — adding a gentle pulse for ALIVE and a greyed-out look for DEAD would differentiate significantly |
| View mode persistence | Remembering whether the user prefers Radar or Card view across sessions | Low | AsyncStorage key — no backend needed |
| Event card thumbnail | Upcoming events horizontal scroll is more scannable with cover images or venue type icons | Medium | Plans with cover images should surface the image in the scroll card |
| Status context visible without tapping | Showing the mood emoji + context chip inline on friend bubbles/cards rather than requiring a tap | Low | Would reduce tap-to-learn friction |
| Re-engagement banner polish | The FADING heartbeat banner should feel warm and personal ("You haven't checked in today"), not a generic nudge | Low | Copy and visual design work, not new logic |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-playing animations on every friend bubble | Cognitive overload — 8–15 animated elements simultaneously is visually exhausting | Animate only ALIVE-status friends with a subtle pulse; FADING/DEAD are static |
| Feed-style infinite scroll | This is not a content feed — it's a presence view for 3–15 people | Keep it bounded; all friends visible without scrolling if possible |
| Numeric unread badge on home tab | Creates anxiety; the app is about ambient presence, not message counts | Use warm status colors, not red badge numbers |
| Stale status shown without a staleness indicator | A "Free" status from 10 hours ago is actively misleading | Enforce DEAD status graying; never show ALIVE treatment for expired heartbeats |
| Hiding the status pill behind an interaction | The status pill is the primary control — it must be visible in the header at all times, not collapsed | Keep it in the header; do not hide behind a hamburger or profile tap |

### Notes

The radar and card views compete for the same space. The view toggle must be immediately discoverable (not buried in settings). The biggest risk on this screen is information density: 15 friends + events + a status composer is a lot. The guiding principle from Locket/BeReal/Snapchat is that presence-focused apps succeed by showing fewer things more clearly, not more things at once.

---

## Screen 2: Squad Screen

The Squad screen is the social hub: friends list, birthdays, IOUs, streak. Currently a tabbed layout (Dashboard cards + Friends/Goals tabs).

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Dashboard cards are scannable in 5 seconds | The streak, upcoming birthday, and net IOU balance must be readable at a glance without expansion | Low | Cards must show the single most important number prominently (streak count, days until next birthday, net balance in dollars) |
| Net IOU balance is the hero metric on the IOUCard | Users don't want to read a ledger — they want to know "do I owe someone money?" | Low | Show net balance per friend, not a list of individual transactions |
| "Take action" CTA on each card | Streak card → view goals; Birthday card → open birthday chat; IOU card → create or settle | Low | Each card must have an obvious next-step tap target |
| Friends list with avatar + status indicator | Status should be visible inline on the friends list, not requiring a tap to each friend | Low | Currently unknown if status shows inline in the friends list |
| Pull-to-refresh on all tabs | Expected on every list surface | Low | Already standardized per v1.1 — verify Squad tabs are covered |
| Pending friend request badge visible | The pending requests indicator must be visible without entering the Friends tab | Low | Tab-level badge already built |
| Consistent empty states per card | No birthday saved, no IOUs, no streak — each needs a warm, action-oriented empty message | Low | Required for users early in their Campfire lifecycle |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Birthday countdown on BirthdayCard | "3 days until Maya's birthday" is more actionable than a bare date | Low | Computed from stored month/day — no backend change |
| IOU card shows who owes whom directionally | "You owe 2 people / 1 person owes you" split is clearer than a single net figure | Low | Display logic only |
| Streak card with week-by-week mini calendar | A 4-week grid showing which weeks the squad checked in creates the "streak anxiety bypass" the app intentionally avoids — keeps it motivating not punishing | Medium | Visual only; logic already built via get_squad_streak |
| Collapsible dashboard section | Power users who have memorized their status may want a compact view | Medium | Not essential for MVP of this milestone |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Showing full IOU transaction history on the dashboard card | Cognitive overload on a glance-level surface | Show net balance + "View all" tap; full ledger is one level deeper |
| Streak count displayed as failure ("1 streak missed!") | The app explicitly chose anti-Snapchat mechanics — negative framing violates this | Positive-only streak copy; if streak broken, show "Start a new streak" not "You broke it" |
| Nested scroll inside a ScrollView | FlatList inside ScrollView breaks Android scroll silently (known issue per PROJECT.md v1.4) | Use ListFooterComponent pattern already established; no nested scrolls |
| Too many cards on the dashboard requiring scroll to see first meaningful content | Users must see at least 1.5 cards below the fold to know there's more — more than 3 cards is hard to browse | Cap visible dashboard area; use horizontal scroll if more than 3 cards |
| Friend search buried in the list | With 3–15 friends, search isn't needed, but "Add Friend" action must be immediately visible | Keep the FAB for Add Friend; don't add a search bar that implies larger group sizes |

### Notes

The Squad screen is the highest-density screen in the app. The risk is that it tries to be a mini-app for each feature (IOU tracker, birthday planner, streak gamification) and ends up feeling like a cluttered dashboard. The reference pattern here is Splitwise (net balance hero metric) and Duolingo (streak card is motivational, not punishing). Each card should feel like a compact widget, not a mini-screen.

---

## Screen 3: Explore Screen

The Explore screen combines plan discovery (list view + map view) with a challenges feature that is partially built. It currently has a map with friend plan pins and a 25km GPS filter.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Map loads with user's location centered immediately | Users expect GPS-centered maps — a map that opens to a random location feels broken | Low | Already uses GPS filter; verify the camera starts at user location |
| Plan pins are tappable with a preview | Tapping a map pin should show a bottom-sheet peek (title, time, host avatar) — not navigate away from the map | Medium | Current implementation unknown; Google Maps / Airbnb pattern requires a peek state |
| List / Map view toggle is visible and persistent | Users need both a spatial and a list mental model; the toggle must be immediate | Low | Must be visible in the screen header or as a prominent segmented control |
| Empty state for no plans nearby | "No plans in your area" needs an obvious CTA to create a plan or zoom out | Low | With a 25km filter, this will be common for new squads |
| Plan creation entry point on the Explore tab | The FAB or a prominent "+" must be reachable from the map view | Low | FAB may already exist; verify it's visible over the map layer |
| Clustering for overlapping pins | Multiple plans at the same location must not render as overlapping circles | Medium | At 3–15 friends with occasional co-location, clusters will occur |
| Filter / zoom feedback | When the GPS 25km filter is active, users must know the constraint ("Showing plans within 25km") | Low | An inline chip or subtitle makes this legible |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Three-state bottom sheet on map view | Peek (40dp, shows pin count + create CTA) → Half (plan list) → Full (full list with filters) mirrors Google Maps / Airbnb and keeps the map always partially visible | High | This is the gold-standard pattern for map + list coexistence; worth the complexity |
| Pin color by RSVP status | Pins in one color for "you're going," another for "you're invited" creates immediate spatial awareness of your calendar | Low | Purely visual; driven by existing RSVP data |
| "Near me" quick filter chip | One-tap shortcut to reset to GPS-centered view after manual panning | Low | Single chip below the map header |
| Challenges tab integration | A secondary tab for group challenges within the Explore screen fits the "discovery" theme | Medium | Feature is partially built; needs completion but shouldn't block map overhaul |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Navigating away from the map on pin tap | Destroys the map context; users lose their scroll position and spatial understanding | Use a bottom-sheet peek or modal overlay; keep map in background |
| Stacking multiple bottom sheets | NNG explicitly calls this out as a failure mode — users can't predict dismissal behavior | One sheet at a time; tapping a plan opens it in a new screen, not a second sheet |
| Full-screen map with no persistent create entry point | A map with no way to create a plan from it defeats the "spin up spontaneous plans" value prop | FAB must float above the map at all times |
| Loading all plan pins synchronously | With many plans, blocking the map render on a full fetch kills perceived performance | Paginate or lazy-load pins; show the map frame immediately |
| Public discovery framing | The app is friends-only by design — the map must never suggest or show plans from strangers | No "Explore nearby" beyond current friend group scope (explicitly out of scope in PROJECT.md) |

### Notes

The reference pattern for Explore map UX is Google Maps + Airbnb: a persistent map with a draggable bottom sheet that shows the list without hiding the map. The key principle from mapuipatterns.com: exploring the map and exploring objects on the map are two different interaction patterns that must coexist without fighting each other. The 25km GPS filter is a strong default but users who pan far away need a "reset to my location" anchor.

---

## Screen 4: Auth Screen

The Auth screen covers login and signup. Currently has: email/password, Google OAuth, Apple Sign-In, forgot password, ToS/Privacy links, profile setup.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Social login buttons above the fold | For a consumer social app, Google and Apple Sign-In should be primary CTAs — email is secondary | Low | Button hierarchy must be: Apple Sign-In → Google → divider → Email (iOS convention; Apple requires Apple button to be at least as prominent as other OAuth) |
| Password show/hide toggle | Typing passwords on mobile is painful; users expect an eye icon | Low | Without this, users abandon or mistype |
| Correct keyboard type per field | Email field → email keyboard; password field → secure text | Low | Missing this makes the form feel broken on every keystroke |
| Inline error messages on field blur | Errors must appear next to the field that caused them, immediately after the user leaves | Low | "Invalid email" under the email field, not a toast at the bottom |
| "Forgot password?" link visible without scrolling | Recovery path must always be in view on the login screen | Low | Should be adjacent to the password field |
| Auto-fill / password manager support | iOS Keychain and Android autofill must work — disabled paste or missing autocomplete attributes break this | Low | Verify textContentType on iOS (username, password, newPassword as appropriate) |
| Loading state on auth button | After tapping "Sign In," the button must show a spinner — not a frozen UI | Low | Without this, users tap multiple times and generate duplicate auth requests |
| Apple Sign-In button conforms to HIG | Apple requires a black or white button with the Apple logo in a specific format — custom styled buttons get rejected from the App Store | Low | Use the official expo-apple-authentication component unchanged |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Animated screen transition from auth to onboarding | A smooth cross-fade or slide into the onboarding flow makes the brand feel polished rather than jarring | Low | expo-router stack animation config |
| Single-screen toggle between login and signup | Instead of separate routes, a tab or link that morphs the form (email → add name) reduces navigation overhead | Medium | Higher implementation cost; acceptable to keep as separate screens if the route transition is smooth |
| Visible progress through profile setup | If profile setup is step 3 of a broader onboarding funnel, showing "Step 3 of 4" anchors the user | Low | Connects auth to onboarding without requiring the user to infer the flow |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Requiring email confirmation before first use | Auth funnel data shows 8% abandonment at the confirmation step — for a social app this is a fatal friction point | Use magic links or skip confirmation in MVP; the Supabase email-confirmed flow can be deferred |
| Password confirm field ("enter password twice") | Causes more typo errors than it prevents on mobile | Use a single password field with a show/hide toggle |
| CAPTCHA on every login | Destroys the UX for a private social app with trusted users | Reserve CAPTCHA for suspicious signals (rapid failures, unusual IPs) — not standard login |
| Generic error messages ("Login failed") | Users don't know if they mistyped their email, their password, or the account doesn't exist | Specific messages: "No account found for this email — try signing up" vs "Incorrect password" |
| Heavy background image on the auth screen | Slows the initial render; the first screen load is the highest-stakes moment | Use a brand color background or subtle illustration; no photo backgrounds |
| Disabling the back button during profile setup | Users need a way to go back and correct a mistake in prior steps | Allow back navigation; use server-side draft state if needed |

### Notes

For a consumer social app aimed at 18–30 year olds, Apple Sign-In is the primary auth method on iOS and should be visually dominant. The reference pattern is Clubhouse, Locket, and BeReal — all lead with one-tap social auth, treat email as a fallback, and have no password confirm field. The biggest risk on the auth screen is form friction compounding with the onboarding flow that follows — the user must get to their first meaningful action (seeing their friends' status) within 60 seconds of their first session.

---

## Screen 5: Welcome / Onboarding

This is a brand-new 3-screen slide flow replacing the existing single-dismiss OnboardingHintSheet. It runs first-launch only.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Exactly 3–5 slides maximum | Research consensus: more than 5 slides is abandoned; 3 is the sweet spot for a focused value prop | Low | 3 screens is already the plan; do not expand |
| Progress dots (or equivalent indicator) | Users must know how many slides remain — "step 2 of 3" completion rates are measurably higher than open-ended flows | Low | Dots must be large enough to tap (44x44pt minimum per Apple HIG), not decorative specks |
| "Skip" button that actually works | Users who've been invited by a friend and already understand the app should be able to dismiss immediately | Low | Skip must jump to the main app, not to slide 3 — it must be a complete bypass |
| Swipe-to-advance gesture | Mobile users expect to swipe between slides — tap-only navigation feels outdated | Low | Pair swipe with visible next/prev affordance for discoverability |
| Each slide has one clear value message | "One idea per slide" — the slide is not a feature list, it's a proof of value | Low | Slide 1: what Campfire is ("See who's free"); Slide 2: how the squad works; Slide 3: first action |
| "Get Started" CTA on the final slide | The last slide must drive the user to their first action — not just dismiss the onboarding | Low | CTA should say something like "Set your status" or "Invite your friends" — not a generic "Done" |
| Accessible touch targets | Progress dots, next/prev buttons, and the skip link must be at minimum 44x44pt | Low | Tiny dots are a documented failure mode — use a tab-strip style or enlarged dots |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Campfire-branded illustration per slide | Custom illustrations outperform generic stock or screenshots for conveying brand personality in onboarding | Medium | One illustration per slide; can be simple and brand-colored — does not need to be photorealistic |
| Animated slide transitions with subtle parallax | A gentle parallax between the background and foreground on slide advance communicates depth and spatial progression | Medium | react-native-reanimated Animated.spring on translateX; keep subtle — no 3D flips |
| "Your squad is waiting" framing on slide 1 | If the user was invited by a friend, the onboarding should acknowledge the invite context, making slide 1 feel personal | Medium | Requires knowing at session-start whether user arrived via invite link — medium complexity |
| Final slide shows the real home screen (preview) | Instead of a generic CTA, showing a blurred/dimmed preview of the home screen behind a "Get Started" button gives users a taste of what they're about to see | Low | Achievable with a static screenshot composited behind the CTA |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Asking for permissions during onboarding (push notifications, location, contacts) | Permission prompts during a first-run tour are rejected at high rates because users haven't yet seen value | Ask for notifications after first status set; ask for location when user first opens the Explore map |
| More than 5 slides | Drop-off accelerates exponentially after slide 3; users feel trapped | Hard limit: 3 slides for v1.8 |
| Autoplay / timer-advancing slides | Users read at different speeds; auto-advance creates anxiety and causes slides to be skipped unread | Never auto-advance; all navigation must be user-initiated |
| Using the onboarding to explain every feature | This is a value pitch, not a user manual | Onboarding answers "why should I care?" not "here's how every screen works" |
| Requiring a gesture tutorial ("swipe left to continue!") | Users already know how to swipe; gesture tutorials are condescending and slow | Show dots + a subtle arrow or "→ Swipe" label on slide 1 only; remove it on subsequent slides |
| Returning to onboarding on second launch | First-run only is the universal expectation; showing onboarding again after the user completed it is disorienting | Gate on AsyncStorage flag set at completion; never re-show to returning users |
| Progress dots so small they require precise tapping | Documented failure mode — "rage clicks and unexpected jumps" per Smashing Magazine carousel research | Use dots at minimum 8dp diameter with 12dp spacing, or a segmented bar indicator |
| "Get Started" → landing on an empty app | If the user has no friends yet, they should land on the "Add Friends" flow, not a blank home screen | Route based on friend count: zero friends → Squad → Friends tab with Add Friend prominent |

### Notes

The reference patterns for 3-screen onboarding are Locket (minimalist, widget-focused, gets to the action in 30 seconds), Duolingo (character-driven, one value per screen, final screen drives first real action), and Cash App (almost no onboarding — leads with the product immediately). The common thread: the fastest path to the user's first meaningful interaction wins. For Campfire, that first action is setting their status and seeing their friends. Onboarding should create anticipation for that moment, not delay it.

The OnboardingHintSheet replacement should not feel heavier than what it replaces — if the 3-slide flow requires more cognitive work than a single "Get Started" sheet, it's failing. The test: can a new user complete onboarding and set their first status within 60 seconds of opening the app for the first time?

---

## Cross-Screen Patterns

These apply to all 5 screens and should be audited holistically during the overhaul.

### Table Stakes (Cross-Screen)

| Pattern | Why | Notes |
|---------|-----|-------|
| Dark mode on all overhaul screens | Light/Dark theme is already built (v1.6); any new components must use useTheme() from day one | ESLint enforces design tokens — zero raw hex values |
| Haptic feedback on primary actions | Status set, IOU settle, RSVP — all primary commits should have a light haptic confirmation | Expo Haptics is available; use impactLight for confirmations, impactMedium for destructive |
| Loading skeletons over spinners for list content | Skeletons maintain layout stability and reduce perceived load time | Use placeholder shimmer on friend cards, event cards, and map list items |
| Consistent 44x44pt minimum tap targets | Apple HIG requirement; failing this causes App Store review feedback | Audit all icon-only buttons across all 5 screens |
| Safe area insets on all screens | Bottom navigation must not clip behind home indicator; content must not clip behind Dynamic Island or notch | Use useSafeAreaInsets() from expo, already in use |

### Anti-Features (Cross-Screen)

| Anti-Feature | Why | Instead |
|-------------|-----|---------|
| Toast/snackbar for navigation errors | Toasts are missed; errors that require action need inline placement | Inline error under the relevant UI element |
| Full-screen loading spinners on refresh | Pull-to-refresh should show the refresh control, not a full-screen overlay | React Native RefreshControl on pull-to-refresh; never replace the screen content with a spinner |
| Modals for simple confirmations | iOS-style action sheets are idiomatic for "are you sure?" — Alert.alert() is table stakes | Use Alert.alert() for destructive confirms; reserve modals for complex forms |

---

## Feature Priority Summary

| Screen | MVP Priority | Biggest Risk | Effort |
|--------|-------------|--------------|--------|
| Home | Freshen visual hierarchy of Radar view; status legibility audit | Over-animating bubbles creates visual noise | Medium |
| Squad | Dashboard card scannability; IOU card hero metric | Nested scroll breaking on Android | Low-Medium |
| Explore | Bottom sheet peek pattern for map + plan list | Map/sheet scroll conflict; pan-vs-select interaction | High |
| Auth | Button hierarchy (Apple > Google > Email); error messages | Apple HIG compliance for Apple Sign-In button | Low |
| Onboarding | 3-slide flow with skip + progress dots + clear CTA | Overloading slides with feature explanations | Low-Medium |

---

## Sources

- [Nielsen Norman Group — Bottom Sheet UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/)
- [Map UI Patterns](https://mapuipatterns.com/) — 60+ patterns across 7 chapters, including clustering, discovery, and mobile-specific patterns
- [Eleken — Map UI Design](https://www.eleken.co/blog-posts/map-ui-design)
- [Authgear — Login & Signup UX Guide 2025](https://www.authgear.com/post/login-signup-ux-guide)
- [NextNative — 7 Mobile Onboarding Best Practices for 2025](https://nextnative.dev/blog/mobile-onboarding-best-practices)
- [Smashing Magazine — Usability Guidelines For Better Carousels UX](https://www.smashingmagazine.com/2022/04/designing-better-carousel-ux/)
- [UXCam — 12 Apps with Great User Onboarding](https://uxcam.com/blog/10-apps-with-great-user-onboarding/)
- [LogRocket — Bottom Sheets Optimized UX](https://blog.logrocket.com/ux-design/bottom-sheets-optimized-ux/)
- [LearnUI — 15 Tips for Better Signup/Login UX](https://www.learnui.design/blog/tips-signup-login-ux.html)
- [Eleken — Card UI Examples and Best Practices](https://www.eleken.co/blog-posts/card-ui-examples-and-best-practices-for-product-owners)
- [Nielsen Norman Group — Empty States in Complex Applications](https://www.nngroup.com/articles/empty-state-interface-design/)
- [AppSamurai — Designing Mobile User Onboarding Flow](https://appsamurai.com/blog/designing-mobile-user-onboarding-flow-dos-and-donts/)
