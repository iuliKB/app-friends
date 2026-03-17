import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/constants/colors';
import { useStatus } from '@/hooks/useStatus';
import { SegmentedControl } from '@/components/status/SegmentedControl';
import { EmojiTagPicker } from '@/components/status/EmojiTagPicker';
import type { EmojiTag, StatusValue } from '@/types/app';

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const [loggingOut, setLoggingOut] = useState(false);
  const { status, contextTag, loading, saving, updateStatus, updateContextTag } = useStatus();
  const [savingTag, setSavingTag] = useState<EmojiTag>(null);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    // Stack.Protected guard handles navigation automatically
    setLoggingOut(false);
  }

  async function handleStatusChange(newStatus: StatusValue) {
    const { error } = await updateStatus(newStatus);
    if (error) Alert.alert('Error', "Couldn't update status. Try again.");
  }

  async function handleTagChange(emoji: EmojiTag) {
    setSavingTag(emoji);
    const { error } = await updateContextTag(emoji);
    setSavingTag(null);
    if (error) Alert.alert('Error', "Couldn't update status. Try again.");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Profile</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      {/* Your Status section */}
      <Text style={styles.sectionHeader}>YOUR STATUS</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.textSecondary} style={styles.loader} />
      ) : (
        <>
          <SegmentedControl value={status} onValueChange={handleStatusChange} saving={saving} />
          <EmojiTagPicker
            selectedTag={contextTag}
            onTagChange={handleTagChange}
            currentStatus={status}
            saving={saving}
            savingTag={savingTag}
          />
        </>
      )}

      {/* Friends section rows added in Plan 01 */}

      {/* Logout row per UI-SPEC: full width, 52px, destructive color */}
      <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut ? (
          <ActivityIndicator color={COLORS.destructive} />
        ) : (
          <Text style={styles.logoutText}>Log out</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  content: {
    paddingTop: 64,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  email: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  loader: {
    marginTop: 24,
  },
  logoutRow: {
    height: 52,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginTop: 48,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.destructive,
  },
});
