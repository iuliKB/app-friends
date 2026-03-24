import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { useStatus } from '@/hooks/useStatus';
import { useFriends } from '@/hooks/useFriends';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SegmentedControl } from '@/components/status/SegmentedControl';
import { EmojiTagPicker } from '@/components/status/EmojiTagPicker';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import {
  registerForPushNotifications,
  getNotificationsEnabled,
  setNotificationsEnabled,
} from '@/hooks/usePushNotifications';
import type { EmojiTag, StatusValue } from '@/types/app';

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  const { status, contextTag, loading, saving, updateStatus, updateContextTag } = useStatus();
  const [savingTag, setSavingTag] = useState<EmojiTag>(null);
  const { friends, fetchFriends } = useFriends();
  const { count: pendingCount } = usePendingRequestsCount();
  const [profile, setProfile] = useState<{
    display_name: string;
    avatar_url: string | null;
  } | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);

  // Refetch friends count and profile every time Profile tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchFriends();
      fetchProfile();
      loadNotificationsEnabled();
    }, [fetchFriends])
  );

  async function fetchProfile() {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', session.user.id)
      .single();
    if (data) setProfile(data);
  }

  async function loadNotificationsEnabled() {
    const enabled = await getNotificationsEnabled();
    setNotificationsEnabledState(enabled);
  }

  async function handleToggleNotifications(value: boolean) {
    await setNotificationsEnabled(value);
    setNotificationsEnabledState(value);
    if (value && session?.user?.id) {
      await registerForPushNotifications(session.user.id);
    }
  }

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
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg }]}>
      {/* Screen title */}
      <View style={styles.headerWrapper}>
        <ScreenHeader title="Profile" />
      </View>

      {/* Avatar header */}
      <TouchableOpacity
        style={styles.avatarHeader}
        onPress={() => router.push('/profile/edit' as never)}
        activeOpacity={0.8}
      >
        <View style={{ position: 'relative' }}>
          <AvatarCircle
            size={80}
            imageUri={profile?.avatar_url}
            displayName={profile?.display_name || 'U'}
          />
          <View style={styles.pencilOverlay}>
            <Ionicons name="pencil-outline" size={SPACING.lg} color={COLORS.interactive.accent} />
          </View>
        </View>
        <Text style={styles.displayName}>{profile?.display_name || ''}</Text>
      </TouchableOpacity>

      {/* Your Status section */}
      <Text style={styles.sectionHeader}>YOUR STATUS</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.text.secondary} style={styles.loader} />
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

      {/* Friends section */}
      <Text style={styles.sectionHeader}>FRIENDS</Text>

      {/* My Friends row */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/friends')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="people-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>My Friends</Text>
        <View style={styles.rowRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{friends.length}</Text>
          </View>
          <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
        </View>
      </TouchableOpacity>

      {/* Friend Requests row */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/friends/requests')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="person-add-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>Friend Requests</Text>
        <View style={styles.rowRight}>
          <View style={[styles.countBadge, pendingCount > 0 && styles.countBadgeAlert]}>
            <Text style={[styles.countBadgeText, pendingCount > 0 && styles.countBadgeAlertText]}>
              {pendingCount}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
        </View>
      </TouchableOpacity>

      {/* My QR Code row */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/qr-code' as never)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="qr-code-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>My QR Code</Text>
        <View style={styles.rowRight}>
          <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
        </View>
      </TouchableOpacity>

      {/* Notifications section */}
      <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>

      <View style={styles.row}>
        <Ionicons
          name="notifications-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>Plan invites</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: COLORS.border, true: COLORS.interactive.accent + '40' }}
          thumbColor={notificationsEnabled ? COLORS.interactive.accent : COLORS.border}
        />
      </View>

      {/* Logout row per UI-SPEC: full width, 52px, destructive color */}
      <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut ? (
          <ActivityIndicator color={COLORS.interactive.destructive} />
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
    backgroundColor: COLORS.surface.base,
  },
  content: {
    paddingBottom: SPACING.xxl,
  },
  headerWrapper: {
    paddingHorizontal: SPACING.lg,
  },
  avatarHeader: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  pencilOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: SPACING.xl,
    height: SPACING.xl,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  loader: {
    marginTop: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowIcon: {
    marginRight: SPACING.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  countBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADII.full,
    backgroundColor: COLORS.border,
    minWidth: FONT_SIZE.xl,
    alignItems: 'center',
  },
  countBadgeText: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 12,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
  },
  countBadgeAlert: {
    backgroundColor: COLORS.interactive.destructive,
  },
  countBadgeAlertText: {
    color: COLORS.text.primary,
  },
  logoutRow: {
    height: 52,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginTop: 48,
  },
  logoutText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.destructive,
  },
});
