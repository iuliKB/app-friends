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
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { APP_CONFIG } from '@/constants/config';
import { COLORS } from '@/constants/colors';
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

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setDisplayName(data.display_name ?? '');
          setAvatarUrl(data.avatar_url ?? null);
          setOriginalDisplayName(data.display_name ?? '');
          setOriginalAvatarUrl(data.avatar_url ?? null);
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

      setAvatarUrl(publicUrl);
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
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
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

  const isDirty = displayName.trim() !== originalDisplayName || avatarUrl !== originalAvatarUrl;
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
              <ActivityIndicator color={COLORS.textPrimary} size="small" />
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
        placeholderTextColor={COLORS.textSecondary}
        maxLength={APP_CONFIG.displayNameMaxLength}
        editable={!saving}
      />
      <Text style={styles.charCount}>
        {displayName.length}/{APP_CONFIG.displayNameMaxLength}
      </Text>

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
    backgroundColor: COLORS.dominant,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoButton: {
    marginTop: 8,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.accent,
  },
  textInput: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  buttonWrapper: {
    marginTop: 24,
  },
});
