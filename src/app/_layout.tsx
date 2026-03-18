import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { COLORS } from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, setSession, setLoading, needsProfileSetup, setNeedsProfileSetup } =
    useAuthStore();
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <LinearGradient
        colors={[COLORS.splashGradientStart, COLORS.splashGradientEnd]}
        style={styles.splash}
      >
        <Text style={styles.splashEmoji}>🔥</Text>
        <Text style={styles.splashTitle}>Campfire</Text>
        <ActivityIndicator color={COLORS.splashText} style={styles.splashLoader} />
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dominant }}>
      <OfflineBanner />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.dominant } }}
      >
        <Stack.Protected guard={!!session && !needsProfileSetup}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="plan-create" options={{ presentation: 'modal', headerShown: false }} />
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
    fontSize: 64,
    marginBottom: 8,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.splashText,
    marginBottom: 48,
  },
  splashLoader: {
    marginTop: 0,
  },
});
