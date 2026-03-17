import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/constants/colors';

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    // Stack.Protected guard handles navigation automatically
    setLoggingOut(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profile</Text>
      <Text style={styles.email}>{session?.user.email}</Text>
      {/* Logout row per UI-SPEC: full width, 52px, destructive color */}
      <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut ? (
          <ActivityIndicator color={COLORS.destructive} />
        ) : (
          <Text style={styles.logoutText}>Log out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dominant,
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  logoutRow: {
    height: 52,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.destructive,
  },
});
