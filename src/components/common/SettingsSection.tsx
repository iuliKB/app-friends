// Uppercase section header + a group of SettingsRow children, matching the
// own-profile page (src/app/(tabs)/profile.tsx) section style. Full-bleed, no
// card wrapper — the rows' own bottom hairlines provide the separators.
//
// Pass an already-uppercase title (e.g. "ACCOUNT", "INFO"); the header is not
// transformed, mirroring the profile screen convention.

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: SPACING.xl,
          marginBottom: SPACING.md,
          paddingHorizontal: SPACING.lg,
        },
      }),
    [colors]
  );

  return (
    <View>
      <Text style={styles.header}>{title}</Text>
      {children}
    </View>
  );
}
