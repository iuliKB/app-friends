import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '@/constants/colors';
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
          <ActivityIndicator color={COLORS.textPrimary} size="large" />
        ) : (
          <QRCode
            value={session.user.id}
            size={240}
            color={COLORS.textPrimary}
            backgroundColor={COLORS.dominant}
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
    backgroundColor: COLORS.dominant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 16,
  },
  username: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  hint: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 24,
  },
});
