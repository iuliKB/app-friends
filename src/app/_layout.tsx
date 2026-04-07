import '@/lib/notifications-init';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';

SplashScreen.preventAutoHideAsync();

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

    // CASE 1: App running/backgrounded — user taps notification
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const planId = response.notification.request.content.data?.planId as string;
      if (planId) router.push(`/plans/${planId}` as never);
    });

    // CASE 2: Cold start — app was killed, launched by tapping notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const planId = response.notification.request.content.data?.planId as string;
      if (planId) {
        // Delay to ensure navigation tree is mounted
        setTimeout(() => router.push(`/plans/${planId}` as never), 150);
      }
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
    <View style={{ flex: 1, backgroundColor: COLORS.surface.base }}>
      <OfflineBanner />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.surface.base } }}
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
    </View>
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
