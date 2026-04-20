import {
  ActivityIndicator,
  Alert,
  Platform,
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
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { APP_CONFIG } from '@/constants/config';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import {
  registerForPushNotifications,
  unregisterForPushNotifications,
  getNotificationsEnabled,
} from '@/hooks/usePushNotifications';
import { ensureMorningPromptScheduled, cancelMorningPrompt } from '@/lib/morningPrompt';
import { PrePromptModal } from '@/components/notifications/PrePromptModal';

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    display_name: string;
    avatar_url: string | null;
    username: string | null;
    created_at: string | null;
  } | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [friendFreeEnabled, setFriendFreeEnabled] = useState(true);
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningHour, setMorningHour] = useState(9);
  const [morningMinute, setMorningMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMorningPrePrompt, setShowMorningPrePrompt] = useState(false);
  const [morningDeniedHint, setMorningDeniedHint] = useState(false);

  // Refetch profile every time Profile tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      loadNotificationsEnabled();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function fetchProfile() {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, username, created_at, notify_friend_free')
      .eq('id', session.user.id)
      .single();
    if (data) {
      setProfile({
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        username: data.username,
        created_at: data.created_at,
      });
      // Phase 3 FREE-07 — hydrate toggle from profiles.notify_friend_free
      setFriendFreeEnabled(data.notify_friend_free ?? true);
    }
  }

  async function uploadAvatar(asset: ImagePicker.ImagePickerAsset) {
    if (!session || !asset.base64) return;
    setAvatarLoading(true);
    try {
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const filePath = `${session.user.id}/avatar.${fileExt}`;
      await supabase.storage.from('avatars').upload(filePath, decode(asset.base64), {
        contentType: `image/${fileExt}`,
        upsert: true,
      });
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);
      if (dbError) {
        Alert.alert('Error', "Photo uploaded but couldn't save to profile. Try again.");
      }
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    } catch {
      Alert.alert(
        'Error',
        "Couldn't upload photo. Make sure the image is under 5MB and try again."
      );
    } finally {
      setAvatarLoading(false);
    }
  }

  function handleChangeAvatar() {
    Alert.alert('Change Photo', undefined, [
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images' as ImagePicker.MediaType,
            allowsEditing: true,
            aspect: APP_CONFIG.avatarAspect,
            quality: APP_CONFIG.avatarQuality,
            base64: true,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0]);
          }
        },
      },
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images' as ImagePicker.MediaType,
            allowsEditing: true,
            aspect: APP_CONFIG.avatarAspect,
            quality: APP_CONFIG.avatarQuality,
            base64: true,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function loadNotificationsEnabled() {
    const enabled = await getNotificationsEnabled();
    setNotificationsEnabledState(enabled);

    // Phase 4 D-34 — hydrate morning prompt config from AsyncStorage with defaults.
    try {
      const mEnabled = (await AsyncStorage.getItem('campfire:morning_prompt_enabled')) ?? 'true';
      const mHourRaw = (await AsyncStorage.getItem('campfire:morning_prompt_hour')) ?? '9';
      const mMinuteRaw = (await AsyncStorage.getItem('campfire:morning_prompt_minute')) ?? '0';
      setMorningEnabled(mEnabled === 'true');
      const mHour = Number(mHourRaw);
      const mMinute = Number(mMinuteRaw);
      if (Number.isFinite(mHour)) setMorningHour(mHour);
      if (Number.isFinite(mMinute)) setMorningMinute(mMinute);
    } catch {
      // AsyncStorage unavailable — use defaults already in state.
    }
  }

  async function handleToggleNotifications(value: boolean) {
    if (!session?.user?.id) return;
    // Optimistic UI flip — revert on permission failure (D-13)
    setNotificationsEnabledState(value);

    if (value) {
      // Toggle ON: silent re-register, bypassing the eligibility gate AND pre-prompt gate (D-13).
      // The Profile toggle is itself an explicit user action — no value-led modal needed.
      const result = await registerForPushNotifications(session.user.id, {
        skipEligibilityCheck: true,
      });
      if (result === 'permission_denied') {
        // OS-level permission was revoked — revert switch and explain
        setNotificationsEnabledState(false);
        Alert.alert(
          'Notifications blocked',
          'Notifications are turned off in iOS Settings. Open Settings → Campfire → Notifications to re-enable.'
        );
      }
    } else {
      // Toggle OFF: hard-delete server row + set local opt-out (D-12)
      await unregisterForPushNotifications(session.user.id);
    }
  }

  async function handleToggleFriendFree(value: boolean) {
    if (!session?.user?.id) return;
    // Optimistic flip; revert on server error
    setFriendFreeEnabled(value);
    const { error } = await supabase
      .from('profiles')
      .update({ notify_friend_free: value })
      .eq('id', session.user.id);
    if (error) {
      setFriendFreeEnabled(!value);
      Alert.alert('Update failed', error.message);
    }
  }

  async function handleToggleMorning(value: boolean) {
    setMorningEnabled(value);
    setMorningDeniedHint(false);
    await AsyncStorage.setItem('campfire:morning_prompt_enabled', value ? 'true' : 'false');

    if (!value) {
      await cancelMorningPrompt();
      return;
    }

    // Toggling ON — check permission state first (D-30).
    const perms = await Notifications.getPermissionsAsync().catch(() => ({
      status: 'undetermined' as const,
    }));
    if (perms.status === 'granted') {
      await ensureMorningPromptScheduled();
      return;
    }
    if (perms.status === 'undetermined') {
      setShowMorningPrePrompt(true);
      return;
    }
    // perms.status === 'denied'
    setMorningEnabled(false);
    setMorningDeniedHint(true);
    await AsyncStorage.setItem('campfire:morning_prompt_enabled', 'false');
  }

  async function handleMorningPrePromptAccept() {
    setShowMorningPrePrompt(false);
    const result = await Notifications.requestPermissionsAsync().catch(() => ({
      status: 'denied' as const,
    }));
    if (result.status === 'granted') {
      await ensureMorningPromptScheduled();
    } else {
      setMorningEnabled(false);
      setMorningDeniedHint(true);
      await AsyncStorage.setItem('campfire:morning_prompt_enabled', 'false');
    }
  }

  async function handleMorningPrePromptDecline() {
    setShowMorningPrePrompt(false);
    setMorningEnabled(false);
    await AsyncStorage.setItem('campfire:morning_prompt_enabled', 'false');
  }

  function handleMorningTimeChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!selectedDate) return;
    const h = selectedDate.getHours();
    const m = selectedDate.getMinutes();
    setMorningHour(h);
    setMorningMinute(m);
    AsyncStorage.multiSet([
      ['campfire:morning_prompt_hour', String(h)],
      ['campfire:morning_prompt_minute', String(m)],
    ])
      .then(() => ensureMorningPromptScheduled())
      .catch(() => {});
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    // Stack.Protected guard handles navigation automatically
    setLoggingOut(false);
  }

  function formatMemberSince(isoDate: string): string {
    const date = new Date(isoDate);
    return `Member since ${date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg }]}
    >
      {/* Screen title */}
      <View style={styles.headerWrapper}>
        <ScreenHeader title="Profile" />
      </View>

      {/* Avatar header */}
      <View style={styles.avatarHeader}>
        <View style={{ position: 'relative' }}>
          <AvatarCircle
            size={80}
            imageUri={avatarUrl ?? profile?.avatar_url}
            displayName={profile?.display_name || 'U'}
            onPress={avatarLoading ? undefined : handleChangeAvatar}
          />
          {avatarLoading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color={COLORS.text.primary} size="small" />
            </View>
          )}
          <View style={styles.pencilOverlay}>
            <Ionicons name="pencil-outline" size={SPACING.lg} color={COLORS.interactive.accent} />
          </View>
        </View>
        <Text style={styles.displayName}>{profile?.display_name || ''}</Text>
        <Text style={styles.username}>@{profile?.username ?? ''}</Text>
      </View>

      {/* Edit Profile row (D-04) */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/profile/edit' as never)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="person-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>Edit Profile</Text>
        <View style={styles.rowRight}>
          <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
        </View>
      </TouchableOpacity>

      {/* My Wish List row (D-07) */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/profile/wish-list' as never)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="gift-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>My Wish List</Text>
        <View style={styles.rowRight}>
          <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
        </View>
      </TouchableOpacity>

      {/* QR Code */}
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

      {/* Account section */}
      <Text style={styles.sectionHeader}>ACCOUNT</Text>

      <View style={styles.row}>
        <Ionicons
          name="mail-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">
          {session?.user?.email ?? ''}
        </Text>
      </View>

      <View style={styles.row}>
        <Ionicons
          name="calendar-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>
          {profile?.created_at ? formatMemberSince(profile.created_at) : ''}
        </Text>
      </View>

      {/* Notifications section (D-02) */}
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

      <View style={styles.row}>
        <Ionicons
          name="people-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>Friend availability</Text>
        <Switch
          value={friendFreeEnabled}
          onValueChange={handleToggleFriendFree}
          trackColor={{ false: COLORS.border, true: COLORS.interactive.accent + '40' }}
          thumbColor={friendFreeEnabled ? COLORS.interactive.accent : COLORS.border}
        />
      </View>

      <View style={styles.row}>
        <Ionicons
          name="sunny-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>Morning prompt</Text>
        <Switch
          value={morningEnabled}
          onValueChange={handleToggleMorning}
          trackColor={{ false: COLORS.border, true: COLORS.interactive.accent + '40' }}
          thumbColor={morningEnabled ? COLORS.interactive.accent : COLORS.border}
        />
      </View>

      <TouchableOpacity
        style={[styles.row, !morningEnabled && styles.rowDisabled]}
        onPress={() => morningEnabled && setShowTimePicker((v) => !v)}
        disabled={!morningEnabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="time-outline"
          size={FONT_SIZE.xl}
          color={COLORS.text.secondary}
          style={styles.rowIcon}
        />
        <Text style={styles.rowLabel}>Time</Text>
        <Text style={styles.rowTrailingText}>
          {new Date(2000, 0, 1, morningHour, morningMinute).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={new Date(2000, 0, 1, morningHour, morningMinute)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleMorningTimeChange}
        />
      )}

      {morningDeniedHint && (
        <Text style={styles.morningHint}>
          Enable notifications in iOS Settings to receive morning prompts.
        </Text>
      )}

      {/* Logout row per UI-SPEC: full width, 52px, destructive color */}
      <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut ? (
          <ActivityIndicator color={COLORS.interactive.destructive} />
        ) : (
          <Text style={styles.logoutText}>Log out</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.versionText}>Campfire v{Constants.expoConfig?.version ?? ''}</Text>

      <PrePromptModal
        visible={showMorningPrePrompt}
        onAccept={handleMorningPrePromptAccept}
        onDecline={handleMorningPrePromptDecline}
      />
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
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: 'rgba(0,0,0,0.5)', // no exact token for avatar upload scrim
    alignItems: 'center',
    justifyContent: 'center',
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
  username: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
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
  versionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xxl,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowTrailingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text.secondary,
  },
  morningHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
});
