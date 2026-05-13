import '@/lib/notifications-init';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ActivityIndicator, AppState, type AppStateStatus, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { createQueryClient } from '@/lib/queryClient';
import { attachAuthBridge } from '@/lib/authBridge';
import { useAuthStore } from '@/stores/useAuthStore';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { DARK, SPACING, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, ThemeProvider, useTheme } from '@/theme';
import { useStatusStore } from '@/stores/useStatusStore';
import { computeWindowExpiry, nextLargerWindow } from '@/lib/windows';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { openChat } from '@/lib/openChat';
import type { WindowId } from '@/types/app';

SplashScreen.setOptions({
  duration: 400,
  fade: true,   // iOS only — Android fade is always present
});
SplashScreen.preventAutoHideAsync();

// Phase 3 — Shared dispatcher for notification response routing. Runs outside
// React render tree, so it can NOT use hooks. Reach into Zustand via getState().
// See .planning/phases/03-friend-went-free-loop/03-RESEARCH.md §Pattern 5 + Pitfall 3.
async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  router: ReturnType<typeof useRouter>
): Promise<void> {
  const category = response.notification.request.content.categoryIdentifier;
  const action = response.actionIdentifier;
  const data = response.notification.request.content.data as
    | { kind?: string; senderId?: string; senderName?: string; planId?: string }
    | undefined;

  // --- Plan invite (Phase 1 legacy — keep working) ---
  if (data?.planId) {
    router.push(`/plans/${data.planId}` as never);
    return;
  }

  // --- Friend Went Free (FREE-09) ---
  if (category === 'friend_free' && data?.senderId) {
    await openChat(
      router,
      { kind: 'dmFriend', friendId: data.senderId, friendName: data.senderName ?? 'Friend' },
      { silentError: true }
    );
    return;
  }

  // --- Expiry warning action buttons (EXPIRY-01 / D-03, D-05) ---
  if (category === 'expiry_warning') {
    const current = useStatusStore.getState().currentStatus;
    if (!current) return;

    // Look up the authenticated user via supabase.auth.getSession
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return;

    // Body-tap (DEFAULT_ACTION_IDENTIFIER) on expiry_warning is unspecified by CONTEXT D-05.
    // D-05 only defines KEEP_IT and HEADS_DOWN as explicit action-button behaviors.
    // Silently dispatching a status change on body-tap would surprise the user — instead,
    // bring the app to foreground and navigate to Home (which hosts MoodPicker).
    if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      router.push('/(tabs)/' as never);
      return;
    }

    if (action === 'KEEP_IT') {
      const nextWindowId: WindowId = nextLargerWindow(current.window_id ?? null);
      const now = new Date();
      const expiry = computeWindowExpiry(nextWindowId, now);
      const nowIso = now.toISOString();
      const expiryIso = expiry.toISOString();

      const { error: upsertErr } = await supabase.from('statuses').upsert(
        {
          user_id: userId,
          status: current.status,
          context_tag: current.context_tag,
          status_expires_at: expiryIso,
          last_active_at: nowIso,
        },
        { onConflict: 'user_id' }
      );
      if (!upsertErr) {
        useStatusStore.getState().setCurrentStatus({
          status: current.status,
          context_tag: current.context_tag,
          status_expires_at: expiryIso,
          last_active_at: nowIso,
          window_id: nextWindowId,
        });
      }
      return;
    }

    if (action === 'HEADS_DOWN') {
      const now = new Date();
      const expiry = computeWindowExpiry('3h', now);
      const nowIso = now.toISOString();
      const expiryIso = expiry.toISOString();

      const { error: upsertErr } = await supabase.from('statuses').upsert(
        {
          user_id: userId,
          status: 'busy',
          context_tag: null,
          status_expires_at: expiryIso,
          last_active_at: nowIso,
        },
        { onConflict: 'user_id' }
      );
      if (!upsertErr) {
        useStatusStore.getState().setCurrentStatus({
          status: 'busy',
          context_tag: null,
          status_expires_at: expiryIso,
          last_active_at: nowIso,
          window_id: '3h',
        });
      }
      return;
    }
  }

  // --- Morning prompt action buttons (MORN-01..06 / D-24..D-28) ---
  if (category === 'morning_prompt') {
    // D-24: 12h validity guard derived from notification fire time (NOT payload).
    // response.notification.date is Unix ms per Expo SDK 55 typings.
    const firedAt = response.notification.date;
    if (Date.now() - firedAt > 12 * 60 * 60 * 1000) return;

    // D-27: body-tap opens Home, never mutates status.
    if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      router.push('/(tabs)/' as never);
      return;
    }

    // D-25: resolve mood from lowercase action identifiers (see notifications-init.ts).
    const mood =
      action === 'free' ? 'free' :
      action === 'busy' ? 'busy' :
      action === 'maybe' ? 'maybe' : null;
    if (!mood) return;

    // D-25 / MORN-06: tap-time DEAD check. If user is already ALIVE or FADING, no-op.
    const current = useStatusStore.getState().currentStatus;
    const heartbeat = current
      ? computeHeartbeatState(current.status_expires_at, current.last_active_at)
      : 'dead';
    if (heartbeat !== 'dead') return;

    // D-25: resolve userId via existing authenticated session (MORN-04 — no public endpoint).
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return;

    // D-26: window_id='rest_of_day', context_tag=null. Nuance happens in MoodPicker later.
    const now = new Date();
    const expiry = computeWindowExpiry('rest_of_day', now);
    const nowIso = now.toISOString();
    const expiryIso = expiry.toISOString();

    const { error: upsertErr } = await supabase.from('statuses').upsert(
      {
        user_id: userId,
        status: mood,
        context_tag: null,
        status_expires_at: expiryIso,
        last_active_at: nowIso,
      },
      { onConflict: 'user_id' }
    );
    if (!upsertErr) {
      // D-28: optimistic store update on success; silent on failure.
      useStatusStore.getState().setCurrentStatus({
        status: mood,
        context_tag: null,
        status_expires_at: expiryIso,
        last_active_at: nowIso,
        window_id: 'rest_of_day',
      });
    }
    return;
  }
}

// Inner component lives inside ThemeProvider — safe to call useTheme()
function RootLayoutStack({
  session,
  needsProfileSetup,
}: {
  session: { user: { id: string } } | null;
  needsProfileSetup: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface.base },
      }}
    >
      <Stack.Protected guard={!!session && !needsProfileSetup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="plan-create"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="plans" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session && needsProfileSetup}>
        <Stack.Screen name="profile-setup" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { session, setSession, setLoading, needsProfileSetup, setNeedsProfileSetup } =
    useAuthStore();
  const [ready, setReady] = useState(false);
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Phase 31 — TanStack Query foundation.
  // Lazy initialiser keeps the cache instance tied to RootLayout's lifetime, so an
  // HMR-driven double-mount cannot accidentally share a stale cache.
  const [queryClient] = useState(() => createQueryClient());

  // Phase 31 Plan 08 — persistence. AsyncStorage-backed persister with selective
  // dehydration: 'chat' root and 'plans/photos' + 'plans/allPhotos' are excluded.
  // - Chat: high-volume + most-sensitive; survives only in memory.
  // - Plan photos: signed URLs have a ~1h TTL — persisting would surface expired URLs
  //   on cold start (Phase 22 STATE decision).
  // The persister `key` is bumpable on shape-breaking cache changes; `buster` is the
  // app version so persistence is reset across app updates without a manual flush.
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: AsyncStorage,
      key: 'campfire-query-cache-v1',
      throttleTime: 1000,
    }),
  );
  const APP_VERSION = Constants.expoConfig?.version ?? 'dev';

  // Dev-only — auto-gated on __DEV__ by the plugin itself (TSQ-09). Never ships to prod.
  useReactQueryDevTools(queryClient);

  // focusManager — pause/resume queries when the OS surfaces or backgrounds the app.
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    }
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  // onlineManager — refetch on reconnect via NetInfo.
  useEffect(() => {
    const unsubscribe = onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
    );
    return unsubscribe;
  }, []);

  // Auth bridge — clears query cache on SIGNED_OUT (TSQ-10, T-31-04 mitigation).
  useEffect(() => {
    const off = attachAuthBridge(queryClient);
    return off;
  }, [queryClient]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);

      if (s) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', s.user.id)
          .maybeSingle();

        if (!profile?.username) {
          setNeedsProfileSetup(true);
        }
      }

      setReady(true);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);

      if (event === 'SIGNED_IN' && s) {
        // Profile check must NOT block the auth state change callback —
        // setSession waits for all listeners to complete, causing a deadlock
        // if we await a Supabase query here. Fire-and-forget instead.
        supabase
          .from('profiles')
          .select('username')
          .eq('id', s.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            setNeedsProfileSetup(!profile?.username);
          });
      }

      if (event === 'SIGNED_OUT') {
        setNeedsProfileSetup(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading, setNeedsProfileSetup]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // CASE 1: App running/backgrounded — user taps notification or action button.
    // Delegates to module-scope handler so it is never stale (no closure capture).
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, router).catch(() => {
        // Silent — don't crash the app on notification routing failure
      });
    });

    // CASE 2: Cold start — app was killed, launched by tapping notification.
    // Delay to ensure navigation tree is mounted (T-03-37 mitigation).
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      setTimeout(() => {
        handleNotificationResponse(response, router).catch(() => {});
      }, 150);
    });

    return () => responseSub.remove();
  }, [router]);

  useEffect(() => {
    if (ready && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) {
    return (
      <LinearGradient
        colors={[DARK.splash.gradientStart, DARK.splash.gradientEnd]}
        style={styles.splash}
      >
        <Ionicons
          name="flame"
          size={64}
          color={DARK.splash.text}
          style={styles.splashEmoji}
        />
        <Text style={styles.splashTitle}>Campfire</Text>
        <ActivityIndicator color={DARK.splash.text} style={styles.splashLoader} />
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: DARK.surface.base }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          buster: APP_VERSION,
          dehydrateOptions: {
            // Exclude high-churn / sensitive / TTL-bound queries from persistence.
            // 'chat' root: high-volume and sensitive — stays in memory only.
            // 'plans/photos' + 'plans/allPhotos': 1h signed URLs expire on cold start.
            shouldDehydrateQuery: (query) => {
              const [root, sub] = query.queryKey as readonly string[];
              if (root === 'chat') return false;
              if (root === 'plans' && (sub === 'photos' || sub === 'allPhotos')) return false;
              return true;
            },
          },
        }}
      >
        <ThemeProvider>
          <OfflineBanner />
          <RootLayoutStack session={session} needsProfileSetup={needsProfileSetup} />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashEmoji: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 64,
    marginBottom: SPACING.sm,
  },
  splashTitle: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 28,
    fontFamily: FONT_FAMILY.display.extrabold,
    color: DARK.splash.text,
    marginBottom: SPACING.xxl,
  },
  splashLoader: {
    marginTop: 0,
  },
});
