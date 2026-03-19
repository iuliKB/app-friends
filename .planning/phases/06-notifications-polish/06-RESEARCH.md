# Phase 6: Notifications + Polish - Research

**Researched:** 2026-03-19
**Domain:** expo-notifications (EAS push), Supabase Edge Functions (Deno webhooks), expo-image-picker (avatar edit), shared UI components (EmptyState/LoadingIndicator), deep link cold-start handling
**Confidence:** HIGH (stack verified against live npm registry, official Expo/Supabase docs, and existing project code)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Push Notifications:** Full push with EAS build — expo-notifications fully configured, push token registration, Supabase Edge Function trigger
- **Supabase Edge Function** triggered by database webhook on `plan_members` INSERT — sends push via Expo Push API
- **New `push_tokens` table**: user_id + token + platform. Supports multiple devices per user.
- Notification content: "[Name] invited you to [Plan Title]" — personalized with inviter's display name and plan title
- Deep link on tap: navigate to plan dashboard (`/plans/[id]`), including cold-start from killed state
- Permission request: on first plan interaction (create or invited) — contextual, not on first launch
- **Simple on/off toggle** in Profile tab for notifications — one toggle, enables/disables all push
- No notification settings granularity in V1
- **Separate edit screen** — "Edit Profile" accessible from Profile tab
- Profile tab top section: large avatar (80px) + display name + pencil edit icon. Replaces current email-only header.
- Edit screen fields: display name + avatar only. Username is not editable.
- Avatar picker: gallery + camera — action sheet with "Choose from Library" / "Take Photo". Uses expo-image-picker.
- Upload to Supabase Storage (same pattern as profile creation in Phase 1).
- Validation: non-empty display name, max 50 chars. Disable save button when empty. Show char count.
- Save with server confirmation pattern.
- **Profile screen** (other users): large avatar, display name, @username, current status with emoji tag, action buttons (Start DM, Remove Friend)
- No mutual plans — keep it simple for V1
- Access: "View Profile" in FriendActionSheet. Also accessible from member lists in plan dashboard.
- **Full UI audit scope**: review spacing, typography, and visual consistency across ALL screens
- **Shared EmptyState component**: reusable with icon/emoji + heading + body + optional CTA button props
- **Shared LoadingIndicator component**: consistent ActivityIndicator placement and styling
- **Status colour audit**: verify Free=#22c55e, Busy=#ef4444, Maybe=#eab308 used consistently everywhere
- **Screens to audit**: Home, Plans list, Plan dashboard, Chat list, Chat room, Friends list, Friend requests, Profile tab, Add Friend, QR Code

### Claude's Discretion
- Edge Function implementation details (Deno runtime, webhook configuration)
- Push token refresh strategy
- Cold-start deep link handling implementation
- Profile edit screen save/cancel button placement
- Exact audit checklist (which screens need what fixes)
- Shared component API design (EmptyState/LoadingIndicator props)
- Notification toggle storage mechanism (AsyncStorage vs Supabase column)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NOTF-01 | User receives push notifications for plan invites via expo-notifications | expo-notifications push token registration + Supabase Edge Function webhook trigger on plan_members INSERT |
| NOTF-02 | Push notification setup uses expo-notifications (Expo Go for local, EAS build for remote) | expo-notifications ~55.0.13 — already in package.json; EAS build required for remote push; Android channel required |
| PROF-03 | User can edit display name and change avatar | expo-image-picker already installed (55.0.12); existing upload pattern in ProfileSetup.tsx is the exact template |
| PROF-04 | User can view other users' profiles | New route /friends/[id] or /profile/[id]; data from existing profiles + statuses tables; wire from FriendActionSheet (stub already present) |
| UIPOL-01 | Consistent spacing and styling across all screens | Full audit of 10 screens listed in CONTEXT.md |
| UIPOL-02 | Loading states on all async operations | Shared LoadingIndicator component replaces inline ActivityIndicators |
| UIPOL-03 | Empty states for all list screens | Shared EmptyState component with icon/heading/body/CTA props |
| UIPOL-04 | Status colours Free=#22c55e, Busy=#ef4444, Maybe=#eab308 consistent everywhere | COLORS.status.* already defined in colors.ts — audit references only |
</phase_requirements>

---

## Summary

Phase 6 completes the Campfire v1 feature set across four parallel tracks: push notifications, profile editing, viewing other users' profiles, and a full UI consistency pass. All four tracks leverage existing project infrastructure heavily — expo-image-picker is already installed, the avatar upload pattern exists verbatim in `ProfileSetup.tsx`, and the FriendActionSheet already has a "View Profile" stub action.

The highest technical complexity lives in push notifications. `expo-notifications` is already present in `package.json` (55.0.13) but is not yet configured. The EAS build requirement means a real device and an EAS development build are mandatory — the Expo Go simulator path only works for local notifications. The Supabase Edge Function is the push delivery mechanism: a database webhook on `plan_members` INSERT calls a Deno function that queries the invitee's push tokens and calls the Expo Push API. The cold-start deep link case requires `getLastNotificationResponseAsync()` at app root layout mount in addition to the standard `addNotificationResponseReceivedListener`.

The UI polish track is the broadest in scope (10 screens) but lowest in technical risk — it requires two new shared components (`EmptyState`, `LoadingIndicator`) and a systematic audit pass. `COLORS.status` is already correctly defined in `colors.ts`; the audit only needs to confirm all screens reference it.

**Primary recommendation:** Sequence the work as (1) push token infrastructure + Edge Function, (2) profile editing, (3) other-user profiles, (4) UI audit — this order surfaces the EAS build dependency early and lets UI work proceed in parallel once the shared components exist.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | ~55.0.13 | Push token registration, local + remote notifications, response listeners | Official Expo SDK; already in package.json |
| expo-image-picker | ~55.0.12 | Gallery + camera access for avatar picker | Official Expo SDK; already in package.json; same version used in ProfileSetup |
| expo-constants | ~55.0.7 | Access `Constants.easConfig.projectId` for push token registration | Already installed |
| expo-device | ~55.0.9 | `Device.isDevice` guard — push tokens only work on real devices | Already installed |
| base64-arraybuffer | ^1.0.2 | `decode()` to convert base64 image to ArrayBuffer for Supabase Storage upload | Already installed; already used in ProfileSetup |
| @react-native-async-storage/async-storage | 2.2.0 | Persist notification-enabled toggle preference locally | Already installed |

### Supporting (Edge Function, server-side)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Edge Functions (Deno) | Supabase-managed | Webhook receiver that calls Expo Push API | Deploy via `supabase functions deploy` |
| Expo Push API | `https://exp.host/--/api/v2/push/send` | Send remote push notifications to Expo tokens | Called from Edge Function; no separate library needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AsyncStorage for toggle | Supabase `profiles` column | Supabase column syncs across devices; AsyncStorage is simpler and sufficient for V1 since toggle is per-device preference |
| Expo Push API directly | FCM/APNs directly | Expo Push API abstracts both platforms; only reason to go direct is if leaving the Expo ecosystem — not applicable here |

**Installation:** No new client packages required. expo-notifications and expo-image-picker are already in `package.json`. The only new install needed is the `expo-notifications` config plugin registration in `app.config.ts`.

**Version verification (confirmed 2026-03-19):**
- `expo-notifications`: 55.0.13 (current for SDK 55 — confirmed via `npm view expo-notifications version`)
- `expo-image-picker`: 55.0.12 (confirmed present in package.json)

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (tabs)/
│   │   └── profile.tsx          # Redesign: avatar header + edit button + notification toggle
│   ├── profile/
│   │   └── edit.tsx             # New: edit display name + avatar (separate screen)
│   └── friends/
│       └── [id].tsx             # New: other-user profile screen
├── components/
│   └── common/
│       ├── EmptyState.tsx       # New shared component
│       ├── LoadingIndicator.tsx # New shared component
│       └── AvatarCircle.tsx     # Existing — use at 80px for profile headers
├── hooks/
│   └── usePushNotifications.ts  # New: token registration, permission request, toggle
└── supabase/
    ├── migrations/
    │   └── 0003_push_tokens.sql # New: push_tokens table
    └── functions/
        └── notify-plan-invite/
            └── index.ts         # New: Deno Edge Function
```

---

### Pattern 1: expo-notifications Setup (app.config.ts + app root)

**What:** The config plugin must be added to `app.config.ts` plugins array. An Android notification channel must be created at app startup. Push token registration uses `Constants.easConfig.projectId` as the identifier.

**When to use:** Once during app initialisation (`_layout.tsx` root), guarded by `Device.isDevice`.

```typescript
// app.config.ts — add to plugins array
plugins: [
  'expo-router',
  '@react-native-community/datetimepicker',
  'expo-notifications',           // ADD THIS
],
// Also add inside extra.eas:
extra: {
  eas: { projectId: 'YOUR_EAS_PROJECT_UUID' },
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
},
```

```typescript
// Source: https://docs.expo.dev/push-notifications/push-notifications-setup/
// Initialise in src/app/_layout.tsx useEffect

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// 1. Set foreground handler (show banner while app is open)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Android channel (required for Android 8+)
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Plan invites',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

// 3. Get push token (real device only)
async function registerPushToken(userId: string) {
  if (!Device.isDevice) return; // simulators cannot receive push
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  // Upsert to push_tokens table
  await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform: Platform.OS },
    { onConflict: 'user_id,token' }
  );
}
```

---

### Pattern 2: Cold-Start Deep Link Handling

**What:** Two listeners are needed — one for when app is running/backgrounded, one for when app is launched from a killed state.

**When to use:** Both set up in the root `_layout.tsx`.

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/notifications/
import { useRouter } from 'expo-router';

// In root _layout.tsx useEffect:

// CASE 1: App running/backgrounded — user taps notification
const responseSub = Notifications.addNotificationResponseReceivedListener(
  (response) => {
    const planId = response.notification.request.content.data?.planId as string;
    if (planId) router.push(`/plans/${planId}` as never);
  }
);

// CASE 2: Cold start — app was killed, launched BY tapping notification
Notifications.getLastNotificationResponseAsync().then((response) => {
  if (!response) return;
  const planId = response.notification.request.content.data?.planId as string;
  if (planId) router.push(`/plans/${planId}` as never);
});

return () => responseSub.remove();
```

**Known issue (MEDIUM confidence):** There are open GitHub issues (expo/expo #37028, #40590) reporting cold-start deep link unreliability in SDK 53+ production builds specifically on iOS. `getLastNotificationResponseAsync` is the correct API but may require retrying with a short delay if navigation is not yet mounted. Wrap with a `setTimeout(..., 100)` fallback if cold-start navigation fails in testing.

---

### Pattern 3: Supabase Edge Function — plan_members Webhook

**What:** A Deno function at `supabase/functions/notify-plan-invite/index.ts` receives a webhook POST from the database trigger on `plan_members` INSERT. It looks up the invitee's push tokens and calls the Expo Push API.

**When to use:** Deployed once; triggered automatically by database webhook.

```typescript
// Source: https://supabase.com/docs/guides/functions/examples/push-notifications
// supabase/functions/notify-plan-invite/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    plan_id: string;
    user_id: string;      // invitee
    invited_by: string;   // inviter user_id
    rsvp_status: string;
  };
  schema: 'public';
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  const { record } = payload;

  // Skip if user added themselves (plan creator)
  if (record.user_id === record.invited_by) {
    return new Response('self-invite skipped', { status: 200 });
  }

  // Fetch inviter display_name and plan title in parallel
  const [inviterResult, planResult, tokensResult] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', record.invited_by).single(),
    supabase.from('plans').select('title').eq('id', record.plan_id).single(),
    supabase.from('push_tokens').select('token').eq('user_id', record.user_id),
  ]);

  const inviterName = inviterResult.data?.display_name ?? 'Someone';
  const planTitle = planResult.data?.title ?? 'a plan';
  const tokens = (tokensResult.data ?? []).map((r) => r.token);

  if (tokens.length === 0) {
    return new Response('no tokens', { status: 200 });
  }

  // Batch push via Expo Push API
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: 'Plan invite',
    body: `${inviterName} invited you to ${planTitle}`,
    data: { planId: record.plan_id },
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify(messages),
  });

  return new Response(await res.text(), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Webhook SQL migration (creates the trigger):**
```sql
-- supabase/migrations/0004_notify_plan_invite_webhook.sql
-- Requires pg_net extension (enabled by default on Supabase)

CREATE OR REPLACE TRIGGER notify_plan_invite_webhook
AFTER INSERT ON public.plan_members
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://<PROJECT_REF>.supabase.co/functions/v1/notify-plan-invite',
  'POST',
  '{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_ANON_KEY>"}',
  '{}',
  '5000'
);
```

> Note: For local dev, replace the URL with `http://host.docker.internal:54321/functions/v1/notify-plan-invite`.

---

### Pattern 4: push_tokens Table Migration

```sql
-- supabase/migrations/0003_push_tokens.sql

CREATE TABLE public.push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own tokens
CREATE POLICY "Users manage own push tokens"
  ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### Pattern 5: Avatar Edit — Reuse ProfileSetup Pattern

The exact pattern from `src/screens/auth/ProfileSetup.tsx` is the template for the edit screen. Key points:
- `ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: APP_CONFIG.avatarAspect, quality: APP_CONFIG.avatarQuality, base64: true })`
- `decode(asset.base64)` from `base64-arraybuffer` to get ArrayBuffer
- `supabase.storage.from('avatars').upload(filePath, decoded, { contentType, upsert: true })`
- `filePath = `${userId}/avatar.${fileExt}`` (same path overwrites existing avatar)
- Camera differs only in the launch call: `ImagePicker.launchCameraAsync(sameOptions)`
- Present picker choice via `Alert.alert` with two options: "Choose from Library" / "Take Photo"

**Camera permission requirement:** `await ImagePicker.requestCameraPermissionsAsync()` before `launchCameraAsync`. Media library permissions are auto-prompted by `launchImageLibraryAsync` — no explicit request needed for gallery.

---

### Pattern 6: Shared EmptyState Component

```typescript
// src/components/common/EmptyState.tsx
interface EmptyStateProps {
  icon: string;        // emoji or Ionicons name
  iconType?: 'emoji' | 'ionicons';
  heading: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}
```

Render: vertically centered in flex:1 container, icon at top, heading (textPrimary, 18px semibold), body (textSecondary, 14px), optional PrimaryButton for CTA. Used on: Home (no free friends), Plans list (no plans), Chat list (no conversations), Friends list (no friends), Friend requests (no requests).

---

### Pattern 7: Shared LoadingIndicator Component

```typescript
// src/components/common/LoadingIndicator.tsx
interface LoadingIndicatorProps {
  color?: string;   // default: COLORS.textSecondary
  size?: 'small' | 'large';  // default: 'large'
  style?: ViewStyle;
}
```

Render: `<ActivityIndicator>` centred in flex:1. Replaces all inline `<ActivityIndicator style={styles.loader} />` patterns. Full-screen variant: `flex: 1, alignItems: 'center', justifyContent: 'center'`.

---

### Anti-Patterns to Avoid

- **Requesting push permissions on app launch:** Kills acceptance rate. The decision is contextual (first plan interaction). Don't move this.
- **Storing push token in `profiles` table:** The `push_tokens` table with multi-device support is the correct design. Don't add `expo_push_token` directly to profiles.
- **Calling `getExpoPushTokenAsync` on simulator:** Always guard with `Device.isDevice` — it throws on simulators/emulators.
- **One subscription per notification action:** Listeners returned by `addNotificationResponseReceivedListener` must be removed on cleanup. Always return `subscription.remove()` from useEffect.
- **Storing the raw notification response in React state across renders:** Call `getLastNotificationResponseAsync` once on mount, act on it, do not store it — it will fire every time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push token generation | Custom device ID scheme | `Notifications.getExpoPushTokenAsync()` | Handles APNs/FCM device registration, token rotation, platform abstraction |
| Cross-platform push delivery | Direct FCM/APNs API calls | Expo Push API (`exp.host/--/api/v2/push/send`) | Handles both platforms, batching, error responses, receipt validation |
| Image crop UI | Custom gesture-based crop | `allowsEditing: true` in ImagePicker options | System UI, no extra dependency |
| Base64 → binary for storage upload | Manual Buffer construction | `decode()` from `base64-arraybuffer` | Already installed; handles the ArrayBuffer conversion correctly |
| Android notification channel | Custom notification styling | `Notifications.setNotificationChannelAsync` | Required by Android 8+ OS; cannot skip |

**Key insight:** The Expo push notification stack (expo-notifications + Expo Push API) abstracts away platform credential management entirely. The only platform-specific step is configuring FCM V1 credentials in EAS — the code itself is identical for iOS and Android.

---

## Common Pitfalls

### Pitfall 1: Push Token Registration on Simulator/Emulator
**What goes wrong:** `getExpoPushTokenAsync` throws "Must be a physical device to use push notifications" — crashes the registration flow.
**Why it happens:** APNs and FCM tokens require actual device hardware.
**How to avoid:** Guard every call with `if (!Device.isDevice) return;`.
**Warning signs:** Any crash in the notification setup path during Expo Go development on a simulator.

### Pitfall 2: Missing `projectId` in `app.config.ts`
**What goes wrong:** `getExpoPushTokenAsync()` fails or returns tokens tied to the wrong project, causing push delivery failures in production.
**Why it happens:** Without explicit `extra.eas.projectId`, the SDK may fall back to an unstable ID.
**How to avoid:** Add `extra: { eas: { projectId: 'UUID-from-eas-dashboard' } }` to `app.config.ts` and use `Constants?.easConfig?.projectId ?? Constants?.expoConfig?.extra?.eas?.projectId` in registration code.
**Warning signs:** Push notifications work in dev but fail in production builds.

### Pitfall 3: Cold-Start Navigation Fires Before Router Is Ready
**What goes wrong:** `router.push()` called in `getLastNotificationResponseAsync` resolves before Expo Router has mounted the navigation tree — navigation is silently ignored.
**Why it happens:** Async resolution of `getLastNotificationResponseAsync` races with router initialisation.
**How to avoid:** Wrap the navigation call in a short `setTimeout(() => router.push(...), 150)` or trigger it after a navigation-ready gate. Test on real device in production/release mode.
**Warning signs:** Works in dev builds, fails in TestFlight/production builds.

### Pitfall 4: Edge Function Webhook Fires for Self-Invited Creator
**What goes wrong:** Plan creator (who is also added to `plan_members` as first member) receives a push notification for their own plan.
**Why it happens:** The webhook fires on every INSERT, including the creator's own membership row.
**How to avoid:** In the Edge Function, check `if (record.user_id === record.invited_by) return early`.
**Warning signs:** Creator receives "You invited you to..." notification immediately after creating a plan.

### Pitfall 5: `expo-notifications` Plugin Not in `app.config.ts`
**What goes wrong:** Push notifications work in Expo Go (which bundles the plugin) but fail completely after `eas build` — no permissions prompt, no token.
**Why it happens:** Native modules require the config plugin for native code injection at build time.
**How to avoid:** Add `'expo-notifications'` to the `plugins` array in `app.config.ts` before running `eas build`.
**Warning signs:** `getExpoPushTokenAsync` returns null or permissions dialog never appears after a production build.

### Pitfall 6: Avatar Upload Overwrites with Wrong File Path
**What goes wrong:** New avatar upload creates a second file instead of replacing the existing one, leading to orphaned storage files.
**Why it happens:** Different file extensions (jpg vs jpeg vs png) create different `filePath` values.
**How to avoid:** Use a fixed path `${userId}/avatar` (no extension) with `contentType` set explicitly, OR normalise the extension. The existing `ProfileSetup` pattern uses `upsert: true` — follow it exactly.
**Warning signs:** Multiple avatar files per user in Supabase Storage `avatars` bucket.

### Pitfall 7: Notification Toggle — AsyncStorage vs Supabase Column
**What goes wrong (if using Supabase):** Toggle state requires an extra RLS policy and a profiles table migration. Value is synced to server on every toggle change, adding latency.
**Recommended approach:** Use AsyncStorage — the toggle is a per-device UI preference, not profile data. Store as `'notifications_enabled'` boolean key. On token registration, check this key before calling `getExpoPushTokenAsync`.
**Warning signs:** Unnecessary network call on every toggle interaction.

---

## Code Examples

### Registering for Push + Saving Token
```typescript
// Source: https://docs.expo.dev/push-notifications/push-notifications-setup/
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Plan invites',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId =
    Constants?.easConfig?.projectId ??
    Constants?.expoConfig?.extra?.eas?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform: Platform.OS },
    { onConflict: 'user_id,token' }
  );
}
```

### Camera Picker with Action Sheet
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/imagepicker/
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

async function handleChangeAvatar(userId: string, onUploadComplete: (url: string) => void) {
  Alert.alert('Change Photo', undefined, [
    {
      text: 'Choose from Library',
      onPress: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images' as ImagePicker.MediaType,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
        if (!result.canceled && result.assets[0]?.base64) {
          await uploadAvatar(userId, result.assets[0], onUploadComplete);
        }
      },
    },
    {
      text: 'Take Photo',
      onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
        if (!result.canceled && result.assets[0]?.base64) {
          await uploadAvatar(userId, result.assets[0], onUploadComplete);
        }
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mediaTypes: ImagePicker.MediaTypeOptions.Images` | `mediaTypes: 'images'` (string literal) | SDK 52+ | MediaTypeOptions enum deprecated; use string literals |
| Separate `addNotificationResponseReceivedListener` only | Add `getLastNotificationResponseAsync()` for cold-start | SDK 44+ | Cold-start handling requires both APIs |
| `Constants.manifest.extra.eas.projectId` | `Constants.easConfig.projectId ?? Constants.expoConfig.extra.eas.projectId` | SDK 49+ | `manifest` deprecated; use `easConfig` with fallback |
| FCM Legacy API | FCM v1 API for Android push credentials | 2024 | Google deprecated FCM Legacy; EAS Dashboard requires FCM v1 setup |

**Deprecated/outdated:**
- `ImagePicker.MediaTypeOptions`: Deprecated in SDK 52, removed in SDK 55. Use string `'images'` instead. The existing `ProfileSetup.tsx` already uses the correct cast `'images' as ImagePicker.MediaType`.
- `Constants.manifest`: Deprecated. Use `Constants.expoConfig` or `Constants.easConfig`.

---

## Open Questions

1. **EAS Project UUID availability**
   - What we know: `app.config.ts` has `extra: { supabaseUrl, supabaseAnonKey }` but no `extra.eas.projectId` field yet.
   - What's unclear: Whether an EAS project has been created for this app — this UUID is obtained from the EAS Dashboard.
   - Recommendation: The planner should include a Wave 0 task to run `eas init` and capture the project ID, or verify via `eas project:info`. Without this, push token registration will fail silently.

2. **FCM V1 Credentials for Android**
   - What we know: EAS handles credential management; FCM V1 requires a Google Service Account JSON key from Firebase Console.
   - What's unclear: Whether the developer has a Firebase project set up.
   - Recommendation: Include as a pre-condition for the EAS build plan. This is a one-time setup step outside of code.

3. **Supabase Edge Function deployment workflow**
   - What we know: `supabase CLI` is in devDependencies (^2.81.1). `supabase/functions/` directory does not yet exist.
   - What's unclear: Whether the developer's local Supabase CLI is linked to the remote project.
   - Recommendation: The planner should include a step for `supabase functions deploy notify-plan-invite` as a deployment task, not just implementation.

4. **Notification toggle storage (AsyncStorage recommended)**
   - What we know: Both AsyncStorage and a Supabase profiles column are viable; CONTEXT.md marks this as Claude's Discretion.
   - Recommendation: Use AsyncStorage. The toggle is per-device preference, not synced profile data. Key: `'campfire:notifications_enabled'`. On `registerForPushNotifications`, check this key before requesting permission.

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest/vitest config, no test directories, no test scripts in package.json |
| Config file | None — Wave 0 gap |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTF-01 | Push token upserted to push_tokens table on registration | unit (hook logic) | `jest src/hooks/usePushNotifications.test.ts` | Wave 0 |
| NOTF-01 | Deep link navigates to /plans/[id] on notification tap | manual-only | manual — requires real device + EAS build | N/A |
| NOTF-02 | Edge Function returns 200 for valid plan_members INSERT payload | integration (Edge Function) | manual-only — `supabase functions serve` + curl | N/A |
| PROF-03 | Edit profile saves display name and avatar_url to profiles | unit (hook/screen logic) | `jest src/screens/profile/EditProfile.test.ts` | Wave 0 |
| PROF-04 | FriendProfile screen renders display_name, username, status | unit (component render) | `jest src/screens/friends/FriendProfile.test.ts` | Wave 0 |
| UIPOL-01 | N/A — visual consistency; no automated test | manual-only | manual screen review | N/A |
| UIPOL-02 | LoadingIndicator renders when loading=true | unit | `jest src/components/common/LoadingIndicator.test.ts` | Wave 0 |
| UIPOL-03 | EmptyState renders heading, body, CTA when provided | unit | `jest src/components/common/EmptyState.test.ts` | Wave 0 |
| UIPOL-04 | N/A — colour values already defined in colors.ts; audit is manual | manual-only | manual audit | N/A |

**Note:** NOTF-01 deep link, NOTF-02 Edge Function, UIPOL-01, and UIPOL-04 are manual-only because they require a physical device with EAS build, a live Supabase project, or visual inspection respectively. Unit tests cover the logic layer only.

### Sampling Rate
- **Per task commit:** `expo lint` (no unit test framework yet)
- **Per wave merge:** `expo lint` + manual smoke test on device
- **Phase gate:** All list screens showing EmptyState, all async ops showing LoadingIndicator, push notification received on real device

### Wave 0 Gaps
- [ ] Install test framework: `npx expo install jest-expo @testing-library/react-native` and add `"test": "jest"` script
- [ ] `src/components/common/EmptyState.test.ts` — covers UIPOL-03
- [ ] `src/components/common/LoadingIndicator.test.ts` — covers UIPOL-02
- [ ] `src/hooks/usePushNotifications.test.ts` — covers NOTF-01 token registration logic
- [ ] `jest.config.js` or `jest` key in `package.json` with `jest-expo` preset

---

## Sources

### Primary (HIGH confidence)
- `https://docs.expo.dev/push-notifications/push-notifications-setup/` — EAS push setup, app.config.ts plugin, projectId, Android channel
- `https://docs.expo.dev/versions/latest/sdk/notifications/` — `addNotificationResponseReceivedListener`, `getLastNotificationResponseAsync`, `getExpoPushTokenAsync` API
- `https://docs.expo.dev/versions/latest/sdk/imagepicker/` — `launchImageLibraryAsync`, `launchCameraAsync`, result.assets structure, permission APIs
- `https://supabase.com/docs/guides/functions/examples/push-notifications` — Edge Function pattern, Expo Push API call, EXPO_ACCESS_TOKEN env var
- `https://supabase.com/docs/guides/database/webhooks` — `supabase_functions.http_request` SQL trigger syntax
- `/Users/iulian/Develop/campfire/src/screens/auth/ProfileSetup.tsx` — canonical avatar upload pattern for this project (base64 + Supabase Storage)
- `/Users/iulian/Develop/campfire/src/constants/colors.ts` — status colour definitions already correct
- `npm view expo-notifications version` → 55.0.13 (confirmed 2026-03-19)

### Secondary (MEDIUM confidence)
- `https://docs.expo.dev/push-notifications/overview/` — Overview of Expo push notification architecture
- Expo GitHub issues #37028, #40590 — cold-start deep link known issues on iOS (SDK 53+)

### Tertiary (LOW confidence)
- Medium articles on React Native push notification implementation patterns — informational only, not used as spec

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in package.json at correct SDK 55 versions; verified via npm registry
- Architecture: HIGH — patterns drawn directly from official Expo/Supabase docs and existing project code
- Pitfalls: HIGH (logic pitfalls) / MEDIUM (cold-start iOS reliability) — logic pitfalls from docs; iOS cold-start issue from verified GitHub issues
- Edge Function pattern: HIGH — official Supabase example matches exactly the required use case

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable stack; expo-notifications SDK 55 lifecycle stable)
