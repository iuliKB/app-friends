import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BirthdayPicker } from '@/components/common/BirthdayPicker';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { APP_CONFIG } from '@/constants/config';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  const [displayName, setDisplayName] = useState('');
  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [birthdayMonth, setBirthdayMonth] = useState<number | null>(null);
  const [birthdayDay, setBirthdayDay] = useState<number | null>(null);
  const [birthdayYear, setBirthdayYear] = useState<number | null>(null);
  const [originalBirthdayMonth, setOriginalBirthdayMonth] = useState<number | null>(null);
  const [originalBirthdayDay, setOriginalBirthdayDay] = useState<number | null>(null);
  const [originalBirthdayYear, setOriginalBirthdayYear] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('display_name, avatar_url, birthday_month, birthday_day, birthday_year, username')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setDisplayName(data.display_name ?? '');
          setOriginalDisplayName(data.display_name ?? '');
          setBirthdayMonth(data.birthday_month ?? null);
          setBirthdayDay(data.birthday_day ?? null);
          setBirthdayYear(data.birthday_year ?? null);
          setOriginalBirthdayMonth(data.birthday_month ?? null);
          setOriginalBirthdayDay(data.birthday_day ?? null);
          setOriginalBirthdayYear(data.birthday_year ?? null);
          setUsername(data.username ?? null);
        }
        setLoading(false);
      });
  }, [session]);

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

    // Birthday year required when month+day are set (D-01)
    if (finalMonth !== null && finalDay !== null && birthdayYear === null) {
      Alert.alert('Birthday incomplete', 'Please add your birth year to save your birthday.');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        birthday_month: finalMonth,
        birthday_day: finalDay,
        birthday_year: finalMonth !== null ? birthdayYear : null,
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
    birthdayMonth !== originalBirthdayMonth ||
    birthdayDay !== originalBirthdayDay ||
    birthdayYear !== originalBirthdayYear;
  const canSave = displayName.trim().length > 0 && isDirty && !saving;

  const styles = useMemo(() => StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    scrollContent: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xxl,
      paddingBottom: SPACING.xxl,
    },
    textInput: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      height: 52,
      paddingHorizontal: SPACING.lg,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    inputDisabled: {
      opacity: 0.5,
    },
    charCount: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      fontSize: 12,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      textAlign: 'right',
      marginTop: SPACING.xs,
    },
    fieldLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xl,
      marginBottom: SPACING.sm,
    },
    usernameValue: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      paddingHorizontal: SPACING.lg,
    },
    birthdayLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xl,
      marginBottom: SPACING.sm,
    },
    buttonWrapper: {
      marginTop: SPACING.xl,
    },
  }), [colors]);

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Edit Profile" />

        {/* Display name field */}
        <TextInput
          style={[styles.textInput, saving && styles.inputDisabled]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={colors.text.secondary}
          maxLength={APP_CONFIG.displayNameMaxLength}
          editable={!saving}
        />
        <Text style={styles.charCount}>
          {displayName.length}/{APP_CONFIG.displayNameMaxLength}
        </Text>

        {/* Read-only username display (D-06) */}
        <Text style={styles.fieldLabel}>Username</Text>
        <Text style={styles.usernameValue}>@{username ?? ''}</Text>

        {/* Birthday field (D-03: below display name, above Save) */}
        <Text style={styles.birthdayLabel}>Birthday</Text>
        <BirthdayPicker
          month={birthdayMonth}
          day={birthdayDay}
          year={birthdayYear}
          onChange={(m, d, y) => {
            setBirthdayMonth(m);
            setBirthdayDay(d);
            setBirthdayYear(y);
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
    </KeyboardAvoidingView>
  );
}
