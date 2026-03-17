# Pitfalls Research

**Domain:** React Native + Expo (managed) + Supabase social coordination app
**Researched:** 2026-03-17
**Confidence:** HIGH (multiple authoritative sources: official docs, verified GitHub issues, known CVEs)

---

## Critical Pitfalls

### Pitfall 1: RLS Disabled on New Tables — Silent Data Exposure

**What goes wrong:** Every Supabase table is created with RLS disabled by default. Any table without an explicit `ALTER TABLE x ENABLE ROW LEVEL SECURITY` is fully public through the REST API — any anon-keyed request reads everything. The CVE-2025-48757 incident exposed 170+ apps this way.

**Why it happens:** Developers create tables, test via the SQL Editor (which bypasses RLS as a superuser), see queries work, and ship. RLS is opt-in, not opt-out.

**How to avoid:**
- Write a migration convention: every `CREATE TABLE` statement must be immediately followed by `ALTER TABLE x ENABLE ROW LEVEL SECURITY` and at least one policy.
- Add a CI check or post-migration script that queries `pg_tables` for tables where `rowsecurity = false` (excluding system schemas).
- Never test queries from the Supabase SQL Editor and assume they reflect what the client sees — the SQL Editor runs as `postgres` superuser and bypasses all RLS.

**Warning signs:**
- A table can be created without corresponding migration steps for RLS.
- Reading user data in the browser console without being authenticated.
- No index exists on `user_id` or equivalent policy column.

**Phase to address:** Phase 1 (database foundation). Establish the convention before any table is created.

---

### Pitfall 2: RLS Infinite Recursion on Friendship/Social Relationship Tables

**What goes wrong:** Writing a SELECT policy on the `friendships` table that itself queries `friendships` to determine whether the current user can see a row. Postgres detects the cycle and returns HTTP 500 with `"infinite recursion detected in policy"`.

**Why it happens:** The natural way to check "can user A see user B's status?" is to query the friendships table — but if the friends table itself is protected by a policy that also queries friends, the evaluation recurses infinitely.

**How to avoid:**
- Use a `SECURITY DEFINER` function that bypasses RLS to perform the friendship check. The function runs with the creator's privileges and does not invoke policies on the table it reads.
- Pattern:
  ```sql
  CREATE OR REPLACE FUNCTION are_friends(user_a uuid, user_b uuid)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE (least(user_id, friend_id) = least(user_a, user_b))
        AND (greatest(user_id, friend_id) = greatest(user_a, user_b))
        AND status = 'accepted'
    );
  $$;
  ```
- Then reference `are_friends(auth.uid(), other_col)` in policies on other tables like `statuses`, `messages`.

**Warning signs:**
- HTTP 500 errors when querying any table whose policy references the same table or another table that references back.
- Policy logic that reads `friendships` from within a `friendships` policy.

**Phase to address:** Phase 1–2 (when friendship schema and status visibility are being designed).

---

### Pitfall 3: Google OAuth Broken in Expo Go — Silently Works in Dev, Fails in Production

**What goes wrong:** Google Sign-In via native `expo-google-sign-in` or `@react-native-google-signin/google-signin` requires native configuration files (`google-services.json`, `GoogleService-Info.plist`) and custom native modules. These are incompatible with Expo Go's managed workflow. The app appears to work in development simulator using browser-based fallbacks, then silently breaks on a real device using Expo Go or when going through a standalone build with the wrong approach.

**Why it happens:** Expo Go cannot load custom native modules. The managed-workflow-compatible approach uses `expo-auth-session` with the Supabase OAuth flow through a web browser redirect, not the native SDK.

**How to avoid:**
- Use `supabase.auth.signInWithOAuth({ provider: 'google' })` with `expo-web-browser` and `expo-linking`, which works in Expo Go.
- Configure the custom URI scheme in `app.json` (`scheme: "campfire"`) and add `campfire://` as a redirect URL in both the Supabase Auth settings and the Google OAuth consent screen.
- Test Google OAuth on a **physical device** through Expo Go explicitly before shipping Phase 1.
- Never use `@react-native-google-signin` in a managed workflow — it requires `expo prebuild`.

**Warning signs:**
- Google sign-in works in iOS Simulator/Android Emulator but not physical devices.
- OAuth redirect returns to the browser but the app does not re-open.
- `exp://` scheme appears in redirect URLs instead of `campfire://`.

**Phase to address:** Phase 1 (auth). Test on physical device before merging auth feature.

---

### Pitfall 4: Session Lost Offline on App Launch

**What goes wrong:** Even with `persistSession: true` and AsyncStorage configured, launching the app without network connectivity logs the user out. Supabase's `startAutoRefresh()` attempts a token refresh immediately on foreground, fails, and clears the stored session.

**Why it happens:** The `AppState.addEventListener` pattern (from official Supabase RN docs) calls `supabase.auth.startAutoRefresh()` every time the app comes to foreground. If the device is offline, the refresh request fails and the auth state is reset.

**How to avoid:**
- Only call `startAutoRefresh()` when there is confirmed network connectivity. Check `NetInfo.fetch()` before invoking refresh.
- Alternatively, initialize the app from the stored session in AsyncStorage first, render the home screen, then attempt background refresh — treat a failed refresh as a non-fatal warning unless the token is actually expired.
- Do not block app render on session validation. Show cached state immediately, gate mutations behind confirmed auth.

**Warning signs:**
- Users report being logged out after the app is opened on an airplane or in low-connectivity areas.
- Session-related errors appear in the auth log on app open, not on explicit logout.

**Phase to address:** Phase 1 (auth setup). Handle before shipping to testers.

---

### Pitfall 5: Realtime Message Budget Exhaustion — Chat Blows the Free Tier

**What goes wrong:** The Supabase free tier allows 2M realtime messages/month. With Postgres Changes, every DB change event is checked against RLS for every subscribed client. If 10 users are subscribed to a chat channel and one message is sent, Supabase may fire 10 separate check events. With active chat usage across 5–10 friend groups this budget vanishes quickly.

**Why it happens:** Postgres Changes does not filter server-side by subscriber — it evaluates access for every connected client per event. The multiplier is `events × subscribers`.

**How to avoid:**
- Filter Realtime subscriptions to the narrowest possible scope. For statuses, filter by `user_id=in.(friend_id_1,friend_id_2,...)` rather than subscribing to the entire `statuses` table.
- For chat messages, subscribe per-channel (`channel_id=eq.xxx`) not globally.
- Do NOT use `SELECT *` in Realtime subscription filters or queries — return only the columns needed.
- Monitor Realtime usage in Supabase dashboard early (weekly during development).
- Use the `private: true` channel option so RLS gates which clients can subscribe at all, preventing unnecessary event delivery.

**Warning signs:**
- Realtime usage graph in Supabase dashboard climbing faster than expected during testing.
- Multiple channels subscribed per screen rather than one channel per logical entity.
- No `filter` clause on `postgres_changes` subscriptions.

**Phase to address:** Phase 2 (home screen realtime) and Phase 5 (chat). Design the subscription shape before implementing, not after.

---

### Pitfall 6: Duplicate Realtime Subscriptions — Memory and Message Leak

**What goes wrong:** Subscriptions are created in `useEffect` but the cleanup function does not call `supabase.removeChannel(channel)`. Every navigation away from and back to the screen creates a new subscription without removing the old one. This causes steady memory growth and multiplies inbound message events (the same message is processed N times, one per orphaned subscription).

**Why it happens:** React's `useEffect` cleanup is easy to omit, especially during early development. Expo Go's fast-reload can also mask the problem by resetting state. There is also a known issue where React Strict Mode causes `useEffect` to fire twice in development, creating duplicate channels.

**How to avoid:**
- Every Supabase channel must be cleaned up in the `useEffect` return function:
  ```typescript
  useEffect(() => {
    const channel = supabase.channel('statuses').on(...).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  ```
- Use a consistent naming convention for channels (e.g., `statuses-{userId}`) and check that the same channel name is never created twice.
- In development, watch the Supabase Realtime Inspector dashboard for duplicate channel joins.

**Warning signs:**
- The same message handler fires 2× or 3× for a single DB event.
- Memory grows noticeably during a session without heavy data loading.
- Realtime Inspector shows the same channel open multiple times.

**Phase to address:** Phase 2 (first Realtime usage). Lock in the pattern so it does not spread.

---

### Pitfall 7: OTA Update Strips Environment Variables

**What goes wrong:** `eas update` (Expo OTA updates) only ships JavaScript and assets — it does not rebuild the native binary. If `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are not baked into the initial native build (via `app.config.ts` `extra` field), a JS-only update will resolve them as `undefined`. The Supabase client silently initializes with `undefined` base URL.

**Why it happens:** Expo env vars must be prefixed `EXPO_PUBLIC_` and referenced via `Constants.expoConfig.extra` to survive OTA updates. Regular `process.env` usage in a standalone build may work initially but break after an OTA update if the variables were only set at build time in certain configurations.

**How to avoid:**
- Configure Supabase credentials in `app.config.ts` via the `extra` field:
  ```typescript
  export default { extra: { supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL } }
  ```
- Access in app via `Constants.expoConfig?.extra?.supabaseUrl`.
- Add an assertion at Supabase client initialization: throw early if URL or key is undefined rather than letting the app run silently broken.

**Warning signs:**
- Auth calls return 404 or connection refused after an OTA update.
- `Constants.expoConfig.extra` contains undefined values.

**Phase to address:** Phase 1 (initial project setup, before any deployment).

---

## Technical Debt Patterns

| Pattern | What Accumulates | Why It Happens | Consequence |
|---------|-----------------|----------------|-------------|
| Overly permissive RLS policies | Security debt | "I'll tighten this later" during early dev | Data accessible to wrong users in production |
| Missing `(select auth.uid())` wrapper | Query performance debt | Copy-pasting from examples that use bare `auth.uid()` | Each row evaluation re-calls the function; 100× slower on large tables |
| `SELECT *` in queries and subscriptions | Data egress + bandwidth debt | Laziness during early development | Blows Supabase egress limits; leaks schema |
| Non-memoized `renderItem` in FlatList | Re-render debt | Inline arrow functions in JSX | Chat list re-renders on every state change |
| Zustand store holding server state | Cache staleness debt | Convenience — one store for everything | Stale status data shown after background refresh fails |
| No TypeScript type generation script | Type drift debt | Types generated once and forgotten | DB schema changes break silently at runtime |
| Hardcoded test user IDs | Seed data debt | "Just for dev" | Seed bleeds into staging; deleting is manual |

---

## Integration Gotchas

| Area | Gotcha | Impact | Fix |
|------|--------|--------|-----|
| Supabase Auth + Expo | Deep link `exp://` host blocked by Supabase redirect URL validator | OAuth redirect fails silently | Register `campfire://` scheme; never rely on `exp://` for production |
| Supabase Auth + Expo | Email verification link opens in browser, not app | User sees "success" in browser but app does not log them in | Configure `emailRedirectTo` deep link; test full email flow on device |
| AsyncStorage + Supabase | Session cleared when app launches offline | User force-logged-out on airplane mode | Gate `startAutoRefresh` on network availability |
| Supabase Realtime + RN | `ws` module import error on older supabase-js versions | App crashes on import | Pin to `@supabase/supabase-js` ≥ 2.45 which resolves Node-only module issue |
| Supabase Types + TS strict | View columns typed as nullable even when NOT NULL | `noUncheckedIndexedAccess` forces `?? undefined` chains everywhere | Use `Database['public']['Views']` with explicit `NonNullable<>` wrappers where known |
| Supabase Realtime + RLS | `private: false` channel ignores RLS — any user can subscribe | Unauthorized users receive status updates | Always set `private: true` on channels touching user data |
| Supabase Postgres Changes | Payload truncated at 64 bytes per field when limit exceeded | Silent data loss in realtime event | Keep realtime payloads small; only broadcast IDs and fetch full row if needed |
| `least()`/`greatest()` friendship pair | Query must also use `least()`/`greatest()` to find a row | Queries that compare `user_id = A AND friend_id = B` miss reverse pairs | Standardize all friendship queries to use the canonical pair form |
| Expo Go + Google OAuth | `expo-auth-session` deprecated wording causes confusion | Developers use wrong package | Use `supabase.auth.signInWithOAuth` + `expo-web-browser`; ignore deprecated `expo-google-app-auth` |
| Push notifications + killed app | `addNotificationResponseReceivedListener` does not fire when app is fully terminated on iOS | Notification tap does nothing | Use `Notifications.getLastNotificationResponseAsync()` on app start to handle cold-start taps |

---

## Performance Traps

| Trap | Symptom | Root Cause | Fix |
|------|---------|------------|-----|
| Bare `auth.uid()` in RLS policy | Queries slow on tables >5K rows | Function called once per row during sequential scan | Wrap in `(select auth.uid())` to enable plan caching |
| No index on `user_id` / `friend_id` / `channel_id` | Page loads degrade as data grows | Sequential scan on policy column | `CREATE INDEX` on every column referenced in RLS policies |
| `SELECT *` on statuses or messages | Excessive egress; slow renders | Laziness | Explicit column list in every query |
| Unfiltered Realtime subscription (entire table) | Realtime budget consumed in days | `postgres_changes` without filter fires for every row change | Filter subscription: `filter: 'user_id=in.(a,b,c)'` |
| Inline `renderItem` function in FlatList | Chat list re-renders on every keystroke | New function reference on each render triggers FlatList diff | `useCallback` + `React.memo` on item component |
| Missing `getItemLayout` in chat FlatList | Janky scroll, slow `scrollToEnd` | Layout calculations async per item | Provide `getItemLayout` when message bubble height is fixed or bounded |
| N+1 queries in friend status loading | Home screen hangs | Fetching each friend's status in a loop | Single query with `user_id=in.(...)` filter |
| Realtime reconnect storm | Burst of duplicate messages on foreground | Multiple channels reconnect simultaneously after background | Stagger reconnects; use exponential backoff in channel error handler |
| Zustand triggering full re-render | All friends re-render when one status changes | Store slice not granular enough | Use per-user selectors: `useStore(s => s.statuses[userId])` |

---

## Security Mistakes

| Mistake | Severity | What It Exposes | Prevention |
|---------|----------|-----------------|------------|
| Table without RLS enabled | Critical | All rows to all anon requests | Convention: RLS + policy in every migration |
| `INSERT` policy without `WITH CHECK` | Critical | Users can insert rows with arbitrary `user_id` (row ownership spoofing) | Every INSERT/UPDATE policy must have `WITH CHECK (auth.uid() = user_id)` |
| `UPDATE` policy without `WITH CHECK` | Critical | User can change `user_id` to steal row ownership | Same fix: `WITH CHECK` required |
| Reading `user_metadata` in RLS policy | High | User-controlled metadata used for access control | Use `raw_app_meta_data` (set server-side only) not `raw_user_meta_data` |
| `private: false` Realtime channel | High | Status/presence data broadcast to unsubscribed users | Always `private: true` for channels with user data |
| Service role key in client bundle | Critical | Full DB access bypasses all RLS | Service role key is server-only; never ship in mobile app; only in Supabase Edge Functions |
| Supabase anon key in plain `.env` committed to git | Medium | Key exposed in repo history | `.gitignore` `.env`; use `.env.example`; rotate if committed |
| Schema exposed via REST introspection | Low | Table/column names visible to anon key | Mitigated by Supabase's 2025 schema-hiding change; still avoid meaningful names in schema |
| No RLS on `storage.objects` | High | Avatar images of all users accessible | Add storage policies restricting bucket access to authenticated + friend-visible |
| Symmetric friendship check bug | Medium | User can read data of non-friends | Always verify both directions: `least(a,b) = least(auth.uid(), other)` |

---

## UX Pitfalls

| Pitfall | What Users Experience | Why It Happens | Fix |
|---------|-----------------------|----------------|-----|
| Home screen blocks on Supabase fetch | Spinner on every app open | State not persisted; always fetches fresh | Render from Zustand cache immediately, revalidate in background |
| Status resets to default on app restart | User's status forgotten | Status not persisted locally | Cache last known status in Zustand + AsyncStorage; rehydrate on start |
| Empty home screen with no friends | "Nothing here yet" confusion | No empty state guidance | Inline empty state: "Add a friend to see who's free" with CTA button |
| Google sign-in opens browser, user confused | Feels broken | Redirect-based OAuth flow | Copy: "You'll be redirected to sign in with Google" before tap |
| Push notification tapped when app killed | Nothing happens | Cold-start notification response not handled | Check `getLastNotificationResponseAsync()` on app mount |
| Quick Plan creation takes >10 seconds | Abandoned plan creation | Too many required fields; no pre-fill | Pre-fill title placeholder, pre-select free friends, default time = +1hr |
| Nudge DM looks like a new chat | User doesn't know what "nudge" is | Undifferentiated UI | Distinguish nudge messages visually (emoji, label "sent you a nudge") |
| Status emoji tags hidden behind scroll | Low engagement with emoji context | UI buries secondary affordance | Show first 3 tags inline without scroll; scrollable overflow |
| Friend request accepted but no feedback | User wonders if it worked | No success state after action | Show confirmation toast "You're now friends with X" |
| Chat keyboard overlap | Messages hidden behind keyboard | `KeyboardAvoidingView` misconfigured | Use `behavior='padding'` on iOS, `behavior='height'` on Android |

---

## "Looks Done But Isn't" Checklist

These items appear complete but have hidden failure modes:

- [ ] **Auth flow** — Works in simulator with email but Google OAuth untested on physical device
- [ ] **Session persistence** — Works online but silently logs user out on offline launch
- [ ] **RLS policies** — Tested in SQL Editor (superuser, bypasses RLS) not via app client
- [ ] **Friend status visibility** — RLS policy exists but uses bare `auth.uid()` (slow) and no index on `friend_id`
- [ ] **Realtime subscription** — Subscribes on mount but no cleanup in `useEffect` return
- [ ] **Chat message rendering** — Works with 10 messages; `FlatList` performance untested with 500+ messages
- [ ] **Push notifications** — Fires in foreground but tap-to-open from killed app state unverified
- [ ] **Type safety** — Supabase types generated once; schema changed since without regenerating
- [ ] **Friendship query** — Works when current user initiated the request; fails when they are `friend_id` not `user_id`
- [ ] **Realtime budget** — Subscription subscribes to entire table instead of filtered friend IDs
- [ ] **Storage RLS** — Avatar upload works but any user can read any other user's avatar URL directly
- [ ] **OTA updates** — Env vars present in first build but untested after `eas update`
- [ ] **Empty states** — Loading state exists; zero-data state with no friends is a blank screen
- [ ] **Keyboard handling** — Chat input visible in portrait; untested in landscape or with large keyboard (accessibility fonts)
- [ ] **Seed data leaks** — Test user accounts accessible from production Supabase project

---

## Pitfall-to-Phase Mapping

| Phase Topic | Likely Pitfall | Mitigation | Priority |
|-------------|---------------|------------|----------|
| Phase 1: DB schema + RLS | Tables without RLS; recursive friend policies | RLS convention in migration; SECURITY DEFINER for friendship checks | Critical — do before any other phase |
| Phase 1: Auth | Google OAuth in Expo Go; session lost offline; env var OTA issue | Use web-browser OAuth flow; network-gated refresh; `app.config.ts` extra | Critical — test on device before shipping |
| Phase 2: Home screen + statuses | Unfiltered Realtime; bare `auth.uid()`; N+1 status queries | Filter to friend IDs; `(select auth.uid())`; single batched query | High |
| Phase 2: Realtime subscriptions | Duplicate channels; memory leak | `useEffect` cleanup pattern; channel naming convention | High |
| Phase 3: Friend system | Symmetric pair query bugs; RLS recursion on friendship table | `least()`/`greatest()` everywhere; SECURITY DEFINER function | High |
| Phase 4: Plans + RSVP | INSERT/UPDATE policies missing WITH CHECK | Template policy with WITH CHECK for every mutation | Medium |
| Phase 5: Chat | FlatList performance; realtime budget; duplicate subscriptions | `useCallback`+`React.memo`; per-channel subscription; filter on channel_id | High |
| Phase 6: Push notifications | Cold-start tap handling; background delivery not guaranteed | `getLastNotificationResponseAsync()` on mount; no hard dependency on delivery | Medium |
| All phases | `SELECT *` queries | Explicit column lists from the start | Medium |
| All phases | TypeScript type drift | `supabase gen types` in CI or pre-commit | Low-Medium |

---

## Sources

- [Supabase Security Flaw: 170+ Apps Exposed (CVE-2025-48757)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [RLS Performance and Best Practices — Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Optimize RLS Policies for Performance — SupaExplorer](https://supaexplorer.com/best-practices/supabase-postgres/security-rls-performance/)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Manage Realtime Messages Usage](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages)
- [Native Mobile Deep Linking — Supabase Docs](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Using Google Authentication — Expo Docs](https://docs.expo.dev/guides/google-authentication/)
- [Supabase Auth with React Native — Supabase Docs](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Session Lost When Starting App Offline — Supabase Discussion #36906](https://github.com/orgs/supabase/discussions/36906)
- [Supabase Realtime Memory Leak — GitHub Issue #1204](https://github.com/supabase/supabase-js/issues/1204)
- [React Strict Mode Realtime Subscription Bug — realtime-js Issue #169](https://github.com/supabase/realtime-js/issues/169)
- [Infinite Recursion in RLS Policy — Supabase Discussion #3328](https://github.com/orgs/supabase/discussions/3328)
- [Supabase Config in Expo — The Proper Way (DEV Community)](https://dev.to/cathylai/supabase-config-in-your-expo-project-the-proper-way-kp0)
- [Optimizing FlatList Configuration — React Native Docs](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [Push Notification Deep Linking Pitfalls — Expo Issues #785](https://github.com/expo/expo/issues/785)
- [IP Detection in Redirect URL Breaks Expo Go — Supabase Auth Issue #2039](https://github.com/supabase/auth/issues/2039)
- [Supabase Security: Hidden Dangers of RLS (DEV Community)](https://dev.to/fabio_a26a4e58d4163919a53/supabase-security-the-hidden-dangers-of-rls-and-how-to-audit-your-api-29e9)
- [Understanding Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
