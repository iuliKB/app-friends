import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

interface OAuthButtonProps {
  provider: 'google' | 'apple';
  onPress: () => void;
  loading?: boolean;
}

const PROVIDER_CONFIG = {
  google: {
    icon: 'logo-google' as const,
    label: 'Continue with Google',
  },
  apple: {
    icon: 'logo-apple' as const,
    label: 'Continue with Apple',
  },
};

export function OAuthButton({ provider, onPress, loading = false }: OAuthButtonProps) {
  const { colors } = useTheme();
  const config = PROVIDER_CONFIG[provider];

  const styles = useMemo(() => StyleSheet.create({
    button: {
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADII.lg,
      height: 52, // no exact token — matches FormField minHeight
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
    },
    text: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.regular,
      color: colors.text.primary,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.primary} />
      ) : (
        <View style={styles.content}>
          <Ionicons name={config.icon} size={20} color={colors.text.primary} />
          <Text style={styles.text}>{config.label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
