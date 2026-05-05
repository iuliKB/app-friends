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
import { useCallback, useMemo, useState } from 'react';
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
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { APP_CONFIG } from '@/constants/config';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { ThemeSegmentedControl } from '@/components/common/ThemeSegmentedControl';
import {
  registerForPushNotifications,
  unregisterForPushNotifications,
  getNotificationsEnabled,
} from '@/hooks/usePushNotifications';
import { ensureMorningPromptScheduled, cancelMorningPrompt } from '@/lib/morningPrompt';
import { PrePromptModal } from '@/components/notifications/PrePromptModal';

export default function ProfileScreen() {
  const { colors } = useTheme();
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
    setNotificationsEnabledState(value);
    if (value) {
      const result = await registerForPushNotifications(session.user.id, {
        skipEligibilityCheck: true,
      });
      if (result === 'permission_denied') {
        setNotificationsEnabledState(false);
        Alert.alert(
          'Notifications blocked',
          'Notifications are turned off in iOS Settings. Open Settings → Campfire → Notifications to re-enable.'
        );
      }
    } else {
      await unregisterForPushNotifications(session.user.id);
    }
  }

  async function handleToggleFriendFree(value: boolean) {
    if (!session?.user?.id) return;
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
    setLoggingOut(false);
  }

  function formatMemberSince(isoDate: string): string {
    const date = new Date(isoDate);
    return `Member since ${date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        scrollContent: {
          paddingBottom: SPACING.xxl * 2,
        },

        // ── Header ───────────────────────────────────────────────
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.sm,
        },
        headerTitle: {
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        headerIconBtn: {
          width: 36,
          height: 36,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.card,
          alignItems: 'center',
          justifyContent: 'center',
        },

        // ── Hero (new design — keep as-is) ───────────────────────
        hero: {
          alignItems: 'center',
          paddingTop: SPACING.xl,
          paddingBottom: SPACING.xl,
          paddingHorizontal: SPACING.lg,
        },
        avatarRing: {
          borderWidth: 3,
          borderColor: colors.interactive.accent,
          borderRadius: RADII.full,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          padding: 3,
          shadowColor: colors.interactive.accent,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
        },
        avatarOverlay: {
          position: 'absolute',
          top: 3,
          left: 3,
          right: 3,
          bottom: 3,
          borderRadius: RADII.full,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        cameraButton: {
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: 28,
          height: 28,
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.surface.base,
        },
        displayName: {
          fontSize: FONT_SIZE.xxl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          marginTop: SPACING.md,
          textAlign: 'center',
        },
        username: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: SPACING.xs,
          textAlign: 'center',
        },
        editButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: RADII.full,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.xs + 2,
          marginTop: SPACING.md,
        },
        editButtonText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },

        // ── Original list style below ─────────────────────────────
        sectionHeader: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: SPACING.xl,
          marginBottom: SPACING.md,
          paddingHorizontal: SPACING.lg,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          paddingHorizontal: SPACING.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        rowIcon: {
          marginRight: SPACING.md,
        },
        rowLabel: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        rowRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        rowDisabled: {
          opacity: 0.4,
        },
        rowTrailingText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
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
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.destructive,
        },
        versionText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
          marginTop: SPACING.xxl,
        },
        morningHint: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.md,
        },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: SPACING.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ width: 36 }} />
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/qr-code' as never)}
            accessibilityLabel="My QR Code"
            accessibilityRole="button"
          >
            <Ionicons name="qr-code-outline" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Hero (new — kept as-is) ── */}
        <View style={styles.hero}>
          <TouchableOpacity
            onPress={avatarLoading ? undefined : handleChangeAvatar}
            activeOpacity={0.85}
            style={{ position: 'relative' }}
            accessibilityLabel="Change profile photo"
          >
            <View style={styles.avatarRing}>
              <AvatarCircle
                size={110}
                imageUri={avatarUrl ?? profile?.avatar_url}
                displayName={profile?.display_name || 'U'}
              />
            </View>
            {avatarLoading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={colors.text.primary} size="small" />
              </View>
            )}
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={13} color={colors.surface.base} />
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{profile?.display_name || ''}</Text>
          <Text style={styles.username}>@{profile?.username ?? ''}</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/profile/edit' as never)}
            activeOpacity={0.7}
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
          >
            <Ionicons name="pencil-outline" size={13} color={colors.text.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Links (original flat list style) ── */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/profile/wish-list' as never)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="gift-outline"
            size={FONT_SIZE.xl}
            color={colors.text.secondary}
            style={styles.rowIcon}
          />
          <Text style={styles.rowLabel}>My Wish List</Text>
          <View style={styles.rowRight}>
            <Ionicons name="chevron-forward" size={SPACING.lg} color={colors.border} />
          </View>
        </TouchableOpacity>

        {/* ── Account ── */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>

        <View style={styles.row}>
          <Ionicons
            name="mail-outline"
            size={FONT_SIZE.xl}
            color={colors.text.secondary}
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
            color={colors.text.secondary}
            style={styles.rowIcon}
          />
          <Text style={styles.rowLabel}>
            {profile?.created_at ? formatMemberSince(profile.created_at) : ''}
          </Text>
        </View>

        {/* ── Appearance ── */}
        <Text style={styles.sectionHeader}>APPEARANCE</Text>
        <View style={{ paddingVertical: SPACING.md }}>
          <ThemeSegmentedControl />
        </View>

        {/* ── Notifications ── */}
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>

        <View style={styles.row}>
          <Ionicons
            name="notifications-outline"
            size={FONT_SIZE.xl}
            color={colors.text.secondary}
            style={styles.rowIcon}
          />
          <Text style={styles.rowLabel}>Plan invites</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: colors.border, true: colors.interactive.accent + '40' }}
            thumbColor={notificationsEnabled ? colors.interactive.accent : colors.border}
          />
        </View>

        <View style={styles.row}>
          <Ionicons
            name="people-outline"
            size={FONT_SIZE.xl}
            color={colors.text.secondary}
            style={styles.rowIcon}
          />
          <Text style={styles.rowLabel}>Friend availability</Text>
          <Switch
            value={friendFreeEnabled}
            onValueChange={handleToggleFriendFree}
            trackColor={{ false: colors.border, true: colors.interactive.accent + '40' }}
            thumbColor={friendFreeEnabled ? colors.interactive.accent : colors.border}
          />
        </View>

        <View style={styles.row}>
          <Ionicons
            name="sunny-outline"
            size={FONT_SIZE.xl}
            color={colors.text.secondary}
            style={styles.rowIcon}
          />
          <Text style={styles.rowLabel}>Morning prompt</Text>
          <Switch
            value={morningEnabled}
            onValueChange={handleToggleMorning}
            trackColor={{ false: colors.border, true: colors.interactive.accent + '40' }}
            thumbColor={morningEnabled ? colors.interactive.accent : colors.border}
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
            color={colors.text.secondary}
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

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator color={colors.interactive.destructive} />
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
    </View>
  );
}
