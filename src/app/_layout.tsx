import '@/lib/notifications-init';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { useStatusStore } from '@/stores/useStatusStore';
import { computeWindowExpiry, nextLargerWindow } from '@/lib/windows';
import { computeHeartbeatState } from '@/lib/heartbeat';
import type { WindowId } from '@/types/app';

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
    // Resolve the DM channel lazily via the existing RPC; we do NOT cache in the push payload.
    const { data: dmChannelId, error } = await supabase.rpc('get_or_create_dm_channel', {
      other_user_id: data.senderId,
    });
    if (error || !dmChannelId) return;
    const friendName = encodeURIComponent(data.senderName ?? 'Friend');
    router.push(`/chat/room?dm_channel_id=${dmChannelId}&friend_name=${friendName}` as never);
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

export default function RootLayout() {
  const { session, setSession, setLoading, needsProfileSetup, setNeedsProfileSetup } =
    useAuthStore();
  const [ready, setReady] = useState(false);
  const router = useRouter();

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
      SplashScreen.hideAsync();
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

  if (!ready) {
    return (
      <LinearGradient
        colors={[COLORS.splash.gradientStart, COLORS.splash.gradientEnd]}
        style={styles.splash}
      >
        <Text style={styles.splashEmoji}>🔥</Text>
        <Text style={styles.splashTitle}>Campfire</Text>
        <ActivityIndicator color={COLORS.splash.text} style={styles.splashLoader} />
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.surface.base }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.surface.base },
        }}
      >
        <Stack.Protected guard={!!session && !needsProfileSetup}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="plan-create"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen name="plans" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session && needsProfileSetup}>
          <Stack.Screen name="profile-setup" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
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
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.splash.text,
    marginBottom: SPACING.xxl,
  },
  splashLoader: {
    marginTop: 0,
  },
});
