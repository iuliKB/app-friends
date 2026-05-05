# Phase 25: Auth, Onboarding & Errors - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 18 (3 new/modified primary targets + 3 hook changes + 12 screen error-audit targets)
**Analogs found:** 18 / 18

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/screens/auth/AuthScreen.tsx` | screen | request-response | `src/screens/auth/AuthScreen.tsx` (self — additive) | exact |
| `src/components/onboarding/OnboardingHintSheet.tsx` | component | event-driven | `src/components/status/StatusPickerSheet.tsx` | exact |
| `src/app/(tabs)/index.tsx` | route | event-driven | `src/app/(tabs)/index.tsx` (self — thin wrapper) | exact |
| `src/screens/home/HomeScreen.tsx` | screen | request-response | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/hooks/useHomeScreen.ts` | hook | request-response | `src/hooks/usePlans.ts` | exact |
| `src/hooks/useFriends.ts` | hook | CRUD | `src/hooks/useHomeScreen.ts` | exact |
| `src/hooks/useChatRoom.ts` | hook | event-driven | `src/hooks/useHomeScreen.ts` | role-match |
| `src/screens/friends/FriendsList.tsx` | screen | CRUD | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/screens/friends/FriendRequests.tsx` | screen | CRUD | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/screens/friends/AddFriend.tsx` | screen | CRUD | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/screens/chat/ChatListScreen.tsx` | screen | request-response | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/screens/chat/ChatRoomScreen.tsx` | screen | event-driven | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/screens/plans/PlansListScreen.tsx` | screen | CRUD | `src/screens/plans/PlanDashboardScreen.tsx` | exact |
| `src/screens/plans/PlanDashboardScreen.tsx` | screen | CRUD | self — upgrade bespoke error view | exact |
| `src/app/(tabs)/squad.tsx` | screen | request-response | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/app/(tabs)/wish-list.tsx` | screen | CRUD | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/app/squad/birthday/[id].tsx` | screen | request-response | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |
| `src/components/home/MemoriesTabContent.tsx` | component | request-response | `src/screens/plans/PlanDashboardScreen.tsx` | role-match |

---

## Pattern Assignments

### `src/screens/auth/AuthScreen.tsx` — AUTH-01 + AUTH-02 (screen, request-response)

**Analog:** Self — additive changes to existing file

**Existing imports to extend** (`src/screens/auth/AuthScreen.tsx` lines 1–15):
```typescript
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo, useState } from 'react';
import { ..., Text, TouchableOpacity, View } from 'react-native';
import { FormField } from '@/components/common/FormField';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { supabase } from '@/lib/supabase';
```
No new imports needed — `WebBrowser` and `supabase` are already imported.

**AUTH-01: Forgot-password state machine** (extend existing `useState` block, lines 53–64):
```typescript
// Add alongside existing Tab state
type AuthMode = 'login' | 'reset' | 'reset-sent';
const [authMode, setAuthMode] = useState<AuthMode>('login');
const [resetEmail, setResetEmail] = useState('');
const [resetError, setResetError] = useState<string | undefined>();
const [resetLoading, setResetLoading] = useState(false);
```

**AUTH-01: Reset on tab change** (extend existing `handleTabChange`, lines 72–75):
```typescript
function handleTabChange(tab: Tab) {
  setActiveTab(tab);
  setAuthMode('login');   // reset mode when switching tabs
  clearErrors();
}
```

**AUTH-01: Supabase password reset call** (new async function, follows `handleEmailAuth` pattern, lines 77–112):
```typescript
async function handleSendResetLink() {
  const emailErr = validateEmail(resetEmail); // reuse existing validateEmail (line 21)
  if (emailErr) { setResetError(emailErr); return; }

  setResetLoading(true);
  setResetError(undefined);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    if (error) {
      setResetError(mapAuthError(error.message)); // reuse existing mapAuthError (line 41)
    } else {
      setAuthMode('reset-sent');
    }
  } catch {
    setResetError('Something went wrong. Check your connection and try again.');
  } finally {
    setResetLoading(false);
  }
}
```

**AUTH-01: Fade animation for mode toggle** (use ANIMATION tokens from `src/theme/animation.ts` lines 96–109):
```typescript
import { ANIMATION } from '@/theme/animation';
// For Animated.timing calls on the login/reset form opacity values:
Animated.timing(formOpacity, {
  toValue: 0,
  duration: ANIMATION.duration.fast,  // 200ms
  easing: ANIMATION.easing.standard(),
  useNativeDriver: true,
}).start(() => {
  setAuthMode('reset');
  Animated.timing(formOpacity, { toValue: 1, duration: ANIMATION.duration.fast, easing: ANIMATION.easing.standard(), useNativeDriver: true }).start();
});
```

**AUTH-02: WebBrowser links** (follows existing Google OAuth usage, line 129):
```typescript
// Below sign-up PrimaryButton — new inline JSX:
const TOS_URL = 'https://campfire.app/tos';
const PRIVACY_URL = 'https://campfire.app/privacy';

// In JSX (sign-up tab only):
{activeTab === 'signup' && (
  <View style={styles.tosContainer}>
    <Text style={styles.tosText}>
      {'By creating an account you agree to our '}
      <Text style={styles.tosLink} onPress={() => WebBrowser.openBrowserAsync(TOS_URL)}>
        Terms of Service
      </Text>
      {' and '}
      <Text style={styles.tosLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
        Privacy Policy
      </Text>
      {'.'}
    </Text>
  </View>
)}
```

**AUTH-02: Style tokens for ToS text** (follow existing `bottomLinkText` / `bottomLinkAction` style pattern, lines 265–278):
```typescript
tosContainer: {
  marginTop: SPACING.lg,
  alignItems: 'center',
},
tosText: {
  fontSize: FONT_SIZE.sm,
  fontFamily: FONT_FAMILY.body.regular,
  color: colors.text.secondary,
  textAlign: 'center',
},
tosLink: {
  color: colors.interactive.accent,
},
```

**Error display for reset form** (follow existing `generalError` pattern, line 237):
```typescript
// Use existing generalError style; for reset-mode errors use resetError state:
{!!resetError && <Text style={styles.generalError}>{resetError}</Text>}
```

**Styles — must be inside useMemo** (follow lines 193–278 exactly):
```typescript
const styles = useMemo(() => StyleSheet.create({
  // ... all style definitions inside useMemo([colors])
}), [colors]);
```

---

### `src/components/onboarding/OnboardingHintSheet.tsx` — AUTH-04 (component, event-driven)

**Analog:** `src/components/status/StatusPickerSheet.tsx`

**Imports pattern** (`StatusPickerSheet.tsx` lines 1–11):
```typescript
import React, { useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
// NOTE: No PanResponder, no TouchableWithoutFeedback — D-11: no swipe-to-dismiss, no backdrop tap
import { useTheme, SPACING, RADII, FONT_FAMILY, FONT_SIZE } from '@/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
```

**Props interface** (model on `StatusPickerSheetProps`):
```typescript
interface OnboardingHintSheetProps {
  visible: boolean;
  onDismiss: () => void;
}
```

**Sheet slide-in animation** (`StatusPickerSheet.tsx` lines 22–23 + 53–63 — exact copy, no PanResponder):
```typescript
export function OnboardingHintSheet({ visible, onDismiss }: OnboardingHintSheetProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(600)).current;

  // Slide animation — copy StatusPickerSheet motion model exactly
  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(600); // instant reset on close
    }
  }, [visible, translateY]);
```

**Modal structure** (`StatusPickerSheet.tsx` lines 121–138 — simplified: no backdrop tap, no drag handle):
```typescript
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      {/* Semi-transparent backdrop — NOT tappable (D-11: no swipe-to-dismiss) */}
      <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.heading}>Welcome to Campfire!</Text>
          <Text style={styles.body}>Tap your status above to let friends know if you're free.</Text>
          <Text style={styles.body}>Head to Squad to add friends.</Text>
          <View style={styles.ctaContainer}>
            <PrimaryButton title="Get Started" onPress={onDismiss} />
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
```

**Styles pattern** (inside `useMemo([colors])` — mandatory per project rule):
```typescript
  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      backgroundColor: colors.overlay,    // from StatusPickerSheet line 27
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface.card,
      borderTopLeftRadius: RADII.xl,
      borderTopRightRadius: RADII.xl,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.xxl,
      paddingHorizontal: SPACING.lg,
    },
    heading: {
      fontSize: FONT_SIZE.xl,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      marginBottom: SPACING.md,
    },
    body: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginBottom: SPACING.sm,
    },
    ctaContainer: {
      marginTop: SPACING.xl,
    },
  }), [colors]);
```

---

### `src/app/(tabs)/index.tsx` — AUTH-04 flag check trigger (route, event-driven)

**Analog:** Self — currently a one-liner thin wrapper. The onboarding logic lives in `HomeScreen.tsx`.

**Current file** (`src/app/(tabs)/index.tsx` lines 1–5):
```typescript
import { HomeScreen } from '@/screens/home/HomeScreen';

export default function HomeTab() {
  return <HomeScreen />;
}
```
No changes needed here — the flag check and `OnboardingHintSheet` render go in `HomeScreen.tsx`.

---

### `src/screens/home/HomeScreen.tsx` — AUTH-04 flag check + AUTH-03 ErrorDisplay (screen, request-response)

**Analog:** `src/screens/plans/PlanDashboardScreen.tsx` (error pattern) + `src/theme/ThemeContext.tsx` (AsyncStorage pattern)

**AsyncStorage import to add** (follow `ThemeContext.tsx` line 3):
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingHintSheet } from '@/components/onboarding/OnboardingHintSheet';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
```

**AUTH-04: Onboarding flag check on mount** (follow `ThemeContext.tsx` lines 24–31):
```typescript
const ONBOARDING_FLAG_KEY = '@campfire/onboarding_hint_shown';
const [onboardingVisible, setOnboardingVisible] = useState(false);

// Run after friends data settles — guard with !loading to avoid race (Assumption A3)
useEffect(() => {
  if (loading) return;
  AsyncStorage.getItem(ONBOARDING_FLAG_KEY)
    .then((value) => {
      if (!value && friends.length === 0) {
        setOnboardingVisible(true);
      }
    })
    .catch(() => {}); // silent — worst case: sheet not shown
}, [loading, friends.length]);

function handleOnboardingDismiss() {
  AsyncStorage.setItem(ONBOARDING_FLAG_KEY, 'true').catch(() => {});
  setOnboardingVisible(false);
}
```

**AUTH-03: ErrorDisplay for useHomeScreen error** (follow `PlanDashboardScreen.tsx` lines 446–454, upgrading existing inline text on line 172):

Replace existing:
```typescript
{error !== null && (
  <Text style={styles.errorText}>{"Couldn't load friends. Pull down to try again."}</Text>
)}
```

With:
```typescript
if (error) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
      <ErrorDisplay
        mode="screen"
        message="Couldn't load your friends."
        onRetry={fetchAllFriends}
      />
    </View>
  );
}
```

Note: `fetchAllFriends` is already returned by `useHomeScreen` (line 159). Destructure it: `const { friends, error, loading, refreshing, handleRefresh, fetchAllFriends } = useHomeScreen();`

**OnboardingHintSheet render** (at bottom of component return, before closing tag):
```typescript
<OnboardingHintSheet visible={onboardingVisible} onDismiss={handleOnboardingDismiss} />
```

---

### `src/hooks/useHomeScreen.ts` — AUTH-03 refetch alias (hook, request-response)

**Analog:** Self — additive change only

**Current return** (`useHomeScreen.ts` lines 153–160):
```typescript
return {
  friends,
  loading,
  error,
  refreshing,
  handleRefresh,
  fetchAllFriends,
};
```

**Change:** Add `refetch` alias alongside existing `fetchAllFriends`:
```typescript
return {
  friends,
  loading,
  error,
  refreshing,
  handleRefresh,
  fetchAllFriends,
  refetch: fetchAllFriends,  // AUTH-03 standard shape alias
};
```

---

### `src/hooks/useFriends.ts` — AUTH-03 top-level error state (hook, CRUD)

**Analog:** `src/hooks/useHomeScreen.ts` (error state pattern, lines 20–22 + 56–63)

**Problem:** `useFriends` returns errors only from `fetchFriends()` call result — no top-level `error` state variable. Screens cannot conditionally render `ErrorDisplay` without this.

**Add top-level error state** (follow `useHomeScreen.ts` pattern, lines 19–22):
```typescript
// Add after existing useState declarations (lines 33–36):
const [error, setError] = useState<string | null>(null);
```

**Set error inside fetchFriends** (follow `useHomeScreen.ts` lines 56–63):
```typescript
async function fetchFriends(): Promise<{ data: FriendWithStatus[] | null; error: Error | null }> {
  // ...existing auth guard...
  setLoadingFriends(true);
  setError(null);  // clear on each fetch
  try {
    const { data: friendRows, error: rpcError } = await supabase.rpc('get_friends');
    if (rpcError) {
      setError(rpcError.message);  // surface at hook level
      setLoadingFriends(false);
      return { data: null, error: rpcError };
    }
    // ...existing success path...
    setLoadingFriends(false);
    return { data: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setError(message);  // surface at hook level
    setLoadingFriends(false);
    return { data: null, error: err as Error };
  }
}
```

**Expose in return** (additive — no breaking changes to existing callers):
```typescript
return {
  friends,
  pendingRequests,
  loadingFriends,
  loadingPending,
  error,           // AUTH-03: new top-level field
  fetchFriends,
  refetch: fetchFriends,  // AUTH-03: standard shape alias
  fetchPendingRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  searchUsers,
};
```

---

### `src/hooks/useChatRoom.ts` — AUTH-03 expose refetch (hook, event-driven)

**Analog:** `src/hooks/useHomeScreen.ts` (fetchAllFriends is internal but exposed in return)

**Problem:** `fetchMessages` is defined internally (line 69) but not in the return shape (lines 774–785). `useChatRoom` already has `error: string | null` state (line 44).

**Change:** Add `refetch` to the return object (additive — no changes to function body):
```typescript
// Current return (lines 774–785):
return {
  messages,
  loading,
  error,
  sendMessage,
  sendImage,
  sendPoll,
  deleteMessage,
  addReaction,
  removeReaction,
  lastPollVoteEvent,
};

// Updated return — add refetch alias:
return {
  messages,
  loading,
  error,
  refetch: fetchMessages,  // AUTH-03: expose for retry button
  sendMessage,
  sendImage,
  sendPoll,
  deleteMessage,
  addReaction,
  removeReaction,
  lastPollVoteEvent,
};
```

Note: `fetchMessages` is already an `async function` at line 69 with the correct signature. Exposing it as `refetch` does not interfere with the realtime subscription (subscription is set up independently in `subscribeRealtime()` called from `useEffect`).

---

### Screens needing ErrorDisplay — AUTH-03 (12 screens)

All screens follow the identical pattern. The primary analog is `src/screens/plans/PlanDashboardScreen.tsx` lines 446–454 (existing bespoke error view), upgraded to the standard `ErrorDisplay` component.

**Standard ErrorDisplay screen-mode pattern** to apply to every screen:

```typescript
// 1. Import at top of file
import { ErrorDisplay } from '@/components/common/ErrorDisplay';

// 2. Destructure error + refetch from hook
const { data, loading, error, refetch } = useSomeHook();

// 3. Guard before main return — after loading guard, before content
if (error) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
      <ErrorDisplay
        mode="screen"
        message="[Screen-specific copy — see Copywriting Contract below]"
        onRetry={refetch}
      />
    </View>
  );
}
```

**Per-screen details:**

| Screen | Hook | `refetch` call | Suggested message |
|---|---|---|---|
| `FriendsList.tsx` | `useFriends` | `fetchFriends` (now aliased as `refetch`) | `"Couldn't load your friends."` |
| `FriendRequests.tsx` | `useFriends` | `fetchPendingRequests` | `"Couldn't load friend requests."` |
| `AddFriend.tsx` | `useFriends` | `fetchFriends` | `"Couldn't load results."` |
| `ChatListScreen.tsx` | `useChatList` | `handleRefresh` (alias as `refetch`) | `"Couldn't load your chats."` |
| `ChatRoomScreen.tsx` | `useChatRoom` | `refetch` (newly exposed) | `"Couldn't load messages."` |
| `PlansListScreen.tsx` | `usePlans` | `refetch: fetchPlans` (already standard) | `"Couldn't load your plans."` |
| `PlanDashboardScreen.tsx` | `usePlanDetail` | `refetch` (already standard) | upgrade existing text to `<ErrorDisplay>` |
| `squad.tsx` | `useStreakData` | `refetch` (already standard) | `"Couldn't load streak data."` |
| `wish-list.tsx` | `useMyWishList` | `refetch` (already standard) | `"Couldn't load your wish list."` |
| `squad/birthday/[id].tsx` | `useFriendsOfFriend` | `refetch` (already standard) | `"Couldn't load this profile."` |
| `MemoriesTabContent.tsx` | `useAllPlanPhotos` | `refetch` (already standard) | `"Couldn't load memories."` |
| `HomeScreen.tsx` | `useHomeScreen` | `fetchAllFriends` | `"Couldn't load your friends."` |

**LoadingIndicator guard pattern** (already established in `PlanDashboardScreen.tsx` lines 442–444 — keep before error guard):
```typescript
if (loading && !data) {
  return <LoadingIndicator />;
}
if (error) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
      <ErrorDisplay mode="screen" message="..." onRetry={refetch} />
    </View>
  );
}
```

---

## Shared Patterns

### Pattern A: useTheme + useMemo styles (mandatory for all new/modified components)

**Source:** `src/screens/auth/AuthScreen.tsx` lines 52 + 193–278
```typescript
// At top of component:
const { colors } = useTheme();

// Styles block — ALWAYS inside useMemo:
const styles = useMemo(() => StyleSheet.create({
  container: {
    backgroundColor: colors.surface.base,
    // ...
  },
}), [colors]);
```
**Apply to:** `OnboardingHintSheet.tsx` (new), any new JSX added to `AuthScreen.tsx`, `HomeScreen.tsx` additions.

---

### Pattern B: Supabase auth call shape

**Source:** `src/screens/auth/AuthScreen.tsx` lines 94–99
```typescript
setLoading(true);
try {
  const { error } = await supabase.auth.[method](args);
  if (error) {
    setGeneralError(mapAuthError(error.message));
  }
} catch {
  setGeneralError('Something went wrong. Check your connection and try again.');
} finally {
  setLoading(false);
}
```
**Apply to:** `handleSendResetLink` in `AuthScreen.tsx` (AUTH-01).

---

### Pattern C: AsyncStorage flag read/write

**Source:** `src/theme/ThemeContext.tsx` lines 24–38
```typescript
// Read (on mount — in useEffect):
AsyncStorage.getItem(KEY)
  .then((stored) => {
    if (!stored) { /* show thing */ }
  })
  .catch(() => {}); // silent — never crash for a cosmetic flag

// Write (on dismiss):
AsyncStorage.setItem(KEY, 'true').catch(() =>
  console.warn('[Component] Failed to persist flag'),
);
```
**Apply to:** `HomeScreen.tsx` onboarding flag check + `handleOnboardingDismiss` (AUTH-04).

---

### Pattern D: Custom bottom sheet (Animated + Modal)

**Source:** `src/components/status/StatusPickerSheet.tsx` lines 22–23 + 53–63 + 121–138

Core invariants:
- `translateY = useRef(new Animated.Value(600)).current` — starts off-screen
- `Animated.timing(..., { toValue: 0, duration: 250, useNativeDriver: true })` — slide in
- `translateY.setValue(600)` — instant reset on close (no animation out needed for dismiss-only sheets)
- `Modal transparent animationType="none"` — modal handles overlay; animation is manual
- Backdrop: `View style={[StyleSheet.absoluteFillObject, styles.backdrop]}` with `backgroundColor: colors.overlay`

**Apply to:** `OnboardingHintSheet.tsx` (AUTH-04). Omit `PanResponder` and `TouchableWithoutFeedback` backdrop (D-11).

---

### Pattern E: ErrorDisplay screen mode wrapper

**Source:** `src/components/common/ErrorDisplay.tsx` lines 59–70 (component interface)

Mandatory wrapper constraint (Pitfall 5 in RESEARCH.md):
```typescript
// Outer View MUST have flex: 1 — ErrorDisplay uses flex: 1 to center content
<View style={{ flex: 1, backgroundColor: colors.surface.base }}>
  <ErrorDisplay
    mode="screen"
    message="[copy]"
    onRetry={refetch}
  />
</View>
```
**Apply to:** All 12 screen error-audit targets (AUTH-03).

---

### Pattern F: mapAuthError + validateEmail reuse

**Source:** `src/screens/auth/AuthScreen.tsx` lines 21–49

These functions are already defined at module scope in `AuthScreen.tsx`. Do NOT duplicate them for the reset form. Call them directly:
```typescript
const emailErr = validateEmail(resetEmail);
// ...
setResetError(mapAuthError(error.message));
```
**Apply to:** `handleSendResetLink` in `AuthScreen.tsx` (AUTH-01).

---

## No Analog Found

All files have close analogs in the codebase. No entries.

---

## Metadata

**Analog search scope:** `src/screens/`, `src/hooks/`, `src/components/`, `src/theme/`, `src/app/(tabs)/`
**Files scanned:** 18 analog files read in full
**Pattern extraction date:** 2026-05-05
