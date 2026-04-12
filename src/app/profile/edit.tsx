import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AvatarCircle } from '@/components/common/AvatarCircle';
import { BirthdayPicker } from '@/components/common/BirthdayPicker';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { APP_CONFIG } from '@/constants/config';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export default function EditProfileScreen() {
  const session = useAuthStore((s) => s.session);

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [birthdayMonth, setBirthdayMonth] = useState<number | null>(null);
  const [birthdayDay, setBirthdayDay] = useState<number | null>(null);
  const [originalBirthdayMonth, setOriginalBirthdayMonth] = useState<number | null>(null);
  const [originalBirthdayDay, setOriginalBirthdayDay] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('display_name, avatar_url, birthday_month, birthday_day')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setDisplayName(data.display_name ?? '');
          setAvatarUrl(data.avatar_url ?? null);
          setOriginalDisplayName(data.display_name ?? '');
          setOriginalAvatarUrl(data.avatar_url ?? null);
          setBirthdayMonth(data.birthday_month ?? null);
          setBirthdayDay(data.birthday_day ?? null);
          setOriginalBirthdayMonth(data.birthday_month ?? null);
          setOriginalBirthdayDay(data.birthday_day ?? null);
        }
        setLoading(false);
      });
  }, [session]);

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

      // Append cache-buster so React Native reloads the image
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

  async function handleSave() {
    if (!session) return;
    setSaving(true);

    // Feb 29 → Feb 28 normalization (D-02): DB allows birthday_day=29 for month=2,
    // but business rule is to store Feb 28 so the value is valid in non-leap years.
    const saveMonth = birthdayMonth;
    const saveDay = birthdayMonth === 2 && birthdayDay === 29 ? 28 : birthdayDay;

    // Partial birthday guard (Pitfall 5): if exactly one field is set, treat as no birthday.
    const finalMonth = saveMonth !== null && saveDay !== null ? saveMonth : null;
    const finalDay = saveMonth !== null && saveDay !== null ? saveDay : null;

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        birthday_month: finalMonth,
        birthday_day: finalDay,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (error) {
      Alert.alert('Error', "Couldn't save your profile. Check your connection and try again.");
      setSaving(false);
      return;
    }

    router.back();
  }

  const isDirty =
    displayName.trim() !== originalDisplayName ||
    avatarUrl !== originalAvatarUrl ||
    birthdayMonth !== originalBirthdayMonth ||
    birthdayDay !== originalBirthdayDay;
  const canSave = displayName.trim().length > 0 && isDirty && !saving;

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title="Edit Profile" />

      {/* Avatar section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <AvatarCircle
            size={80}
            imageUri={avatarUrl}
            displayName={displayName || 'U'}
            onPress={avatarLoading ? undefined : handleChangeAvatar}
          />
          {avatarLoading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color={COLORS.text.primary} size="small" />
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={avatarLoading ? undefined : handleChangeAvatar}
          disabled={avatarLoading}
          style={styles.changePhotoButton}
        >
          <Text style={styles.changePhotoText}>
            {avatarLoading ? 'Uploading...' : 'Change Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Display name field */}
      <TextInput
        style={[styles.textInput, saving && styles.inputDisabled]}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Display name"
        placeholderTextColor={COLORS.text.secondary}
        maxLength={APP_CONFIG.displayNameMaxLength}
        editable={!saving}
      />
      <Text style={styles.charCount}>
        {displayName.length}/{APP_CONFIG.displayNameMaxLength}
      </Text>

      {/* Birthday field (D-03: below display name, above Save) */}
      <Text style={styles.birthdayLabel}>Birthday</Text>
      <BirthdayPicker
        month={birthdayMonth}
        day={birthdayDay}
        onChange={(m, d) => {
          setBirthdayMonth(m);
          setBirthdayDay(d);
        }}
        disabled={saving}
      />

      {/* Save button */}
      <View style={styles.buttonWrapper}>
        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  avatarWrapper: {
    position: 'relative',
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
  changePhotoButton: {
    marginTop: SPACING.sm,
    minHeight: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.accent,
  },
  textInput: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    height: 52,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.primary,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  charCount: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 12,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  birthdayLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  buttonWrapper: {
    marginTop: SPACING.xl,
  },
});
