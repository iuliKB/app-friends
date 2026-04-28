import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

interface ProfileData {
  username: string | null;
  display_name: string;
}

export function QRCodeDisplay() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.xl,
      padding: SPACING.xl,
      alignItems: 'center',
    },
    displayName: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.primary,
      textAlign: 'center',
      marginTop: SPACING.lg,
    },
    username: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: SPACING.xs,
    },
    hint: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      textAlign: 'center',
      paddingHorizontal: SPACING.xxl,
      marginTop: SPACING.xl,
    },
  }), [colors]);

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
          <ActivityIndicator color={colors.text.primary} size="large" />
        ) : (
          <QRCode
            value={session.user.id}
            size={240}
            color={colors.text.primary}
            backgroundColor={colors.surface.base}
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
