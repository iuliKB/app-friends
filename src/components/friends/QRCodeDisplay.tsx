import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

interface ProfileData {
  username: string | null;
  display_name: string;
}

export function QRCodeDisplay() {
  const session = useAuthStore((s) => s.session);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', session.user.id)
        .single();
      if (data) {
        setProfile(data);
      }
      setLoading(false);
    }
    loadProfile();
  }, [session]);

  if (!session?.user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color={COLORS.text.primary} size="large" />
        ) : (
          <QRCode
            value={session.user.id}
            size={240}
            color={COLORS.text.primary}
            backgroundColor={COLORS.surface.base}
            ecl="M"
          />
        )}
        {profile && (
          <>
            <Text style={styles.displayName}>{profile.display_name}</Text>
            {profile.username && <Text style={styles.username}>@{profile.username}</Text>}
          </>
        )}
      </View>
      <Text style={styles.hint}>Ask a friend to scan this to add you on Campfire.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  displayName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  username: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  hint: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.xl,
  },
});
