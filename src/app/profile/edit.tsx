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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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

    const saveMonth = birthdayMonth;
    const saveDay = birthdayMonth === 2 && birthdayDay === 29 ? 28 : birthdayDay;
    const finalMonth = saveMonth !== null && saveDay !== null ? saveMonth : null;
    const finalDay = saveMonth !== null && saveDay !== null ? saveDay : null;

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1, backgroundColor: colors.surface.base },
        scroll: { flex: 1 },
        scrollContent: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.xxl * 2,
        },

        // ── Single unified card ───────────────────────────────────
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          overflow: 'hidden',
          marginTop: SPACING.lg,
        },

        // Field: tiny label above + input below
        fieldLabelRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.md,
          paddingTop: SPACING.sm,
          gap: SPACING.xs,
        },
        fieldLabel: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
        },
        textInput: {
          height: 40,
          paddingHorizontal: SPACING.md,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        inputDisabled: { opacity: 0.5 },
        charCount: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'right',
          paddingHorizontal: SPACING.md,
          paddingBottom: SPACING.sm,
        },

        // ── Divider between fields ────────────────────────────────
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: SPACING.md,
        },

        // ── Read-only username field ──────────────────────────────
        readOnlyRow: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 40,
          paddingHorizontal: SPACING.md,
          gap: SPACING.sm,
          opacity: 0.6,
          paddingBottom: SPACING.sm,
        },
        readOnlyText: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },

        // ── Birthday field (inside same card) ─────────────────────
        birthdayRow: {
          paddingHorizontal: SPACING.md,
          paddingBottom: SPACING.md,
        },

        // ── Save button ───────────────────────────────────────────
        buttonWrapper: { marginTop: SPACING.lg },
        hintText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
          marginTop: SPACING.sm,
        },
      }),
    [colors]
  );

  if (loading) return <LoadingIndicator />;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Edit Profile" />

        {/* ── Single card: Display name / Username / Birthday ── */}
        <View style={styles.card}>
          {/* Display name */}
          <View style={styles.fieldLabelRow}>
            <Ionicons name="person-outline" size={12} color={colors.text.secondary} />
            <Text style={styles.fieldLabel}>Display name</Text>
          </View>
          <TextInput
            style={[styles.textInput, saving && styles.inputDisabled]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.text.secondary}
            maxLength={APP_CONFIG.displayNameMaxLength}
            editable={!saving}
          />
          <Text style={styles.charCount}>
            {displayName.length}/{APP_CONFIG.displayNameMaxLength}
          </Text>

          <View style={styles.divider} />

          {/* Username (read-only) */}
          <View style={styles.fieldLabelRow}>
            <Ionicons name="at-outline" size={12} color={colors.text.secondary} />
            <Text style={styles.fieldLabel}>Username</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.readOnlyText}>@{username ?? ''}</Text>
          </View>

          <View style={styles.divider} />

          {/* Birthday */}
          <View style={styles.fieldLabelRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.text.secondary} />
            <Text style={styles.fieldLabel}>Birthday</Text>
          </View>
          <View style={styles.birthdayRow}>
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
          </View>
        </View>

        {/* ── Save ── */}
        <View style={styles.buttonWrapper}>
          <PrimaryButton
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={!canSave}
          />
        </View>
        {!isDirty && <Text style={styles.hintText}>Make a change to enable saving</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
