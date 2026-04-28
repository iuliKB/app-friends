import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FormField } from '@/components/common/FormField';
import { UsernameField } from '@/components/auth/UsernameField';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { APP_CONFIG } from '@/constants/config';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { supabase } from '@/lib/supabase';
import { generateUsername } from '@/lib/username';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ProfileSetup() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const setNeedsProfileSetup = useAuthStore((s) => s.setNeedsProfileSetup);

  const metadata = session?.user.user_metadata;
  const initialDisplayName: string =
    (metadata?.full_name as string | undefined) || (metadata?.name as string | undefined) || '';
  const initialUsername = initialDisplayName.length > 0 ? generateUsername(initialDisplayName) : '';

  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();

  const handleAvailabilityChange = useCallback((available: boolean) => {
    setUsernameAvailable(available);
  }, []);

  async function pickAvatar() {
    if (!session) return;
    setAvatarLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as ImagePicker.MediaType,
        allowsEditing: true,
        aspect: APP_CONFIG.avatarAspect,
        quality: APP_CONFIG.avatarQuality,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) return;

      const fileExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const filePath = `${session.user.id}/avatar.${fileExt}`;

      await supabase.storage.from('avatars').upload(filePath, decode(asset.base64), {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch {
      // Silent fail — avatar is optional
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!session) return;

    setDisplayNameError(undefined);
    setSaveError(undefined);

    if (!displayName.trim()) {
      setDisplayNameError("Display name can't be empty");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.toLowerCase(),
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        setSaveError('Something went wrong. Please try again.');
        return;
      }

      setNeedsProfileSetup(false);
    } catch {
      setSaveError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const canSave = usernameAvailable && displayName.trim().length > 0 && !saving;

  const styles = useMemo(() => StyleSheet.create({
    keyboardView: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    title: {
      fontSize: FONT_SIZE.xl,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingTop: 48, // no exact token
      marginBottom: SPACING.xxl,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: SPACING.xxl,
    },
    addPhoto: {
      marginTop: SPACING.sm,
      minHeight: 32, // no exact token — not flagged by rule
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPhotoText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.interactive.accent,
    },
    fieldGap: {
      height: SPACING.lg,
    },
    saveError: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.interactive.destructive,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
    buttonTop: {
      marginTop: SPACING.xl,
    },
  }), [colors]);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Set up your profile</Text>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <AvatarCircle
            size={80}
            imageUri={avatarUrl}
            displayName={displayName || 'U'}
            onPress={pickAvatar}
          />
          <TouchableOpacity onPress={pickAvatar} disabled={avatarLoading} style={styles.addPhoto}>
            {avatarLoading ? (
              <ActivityIndicator color={colors.interactive.accent} size="small" />
            ) : (
              <Text style={styles.addPhotoText}>Add photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Username Field */}
        <UsernameField
          value={username}
          onChangeText={setUsername}
          onAvailabilityChange={handleAvailabilityChange}
        />

        <View style={styles.fieldGap} />

        {/* Display Name Field */}
        <FormField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          error={displayNameError}
          placeholder="Your name"
          helperText="How your friends will see you"
        />

        {!!saveError && <Text style={styles.saveError}>{saveError}</Text>}

        <View style={styles.buttonTop}>
          <PrimaryButton
            title="Save Profile"
            onPress={handleSaveProfile}
            loading={saving}
            disabled={!canSave}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
