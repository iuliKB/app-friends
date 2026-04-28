import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { APP_CONFIG } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import { FormField } from '@/components/common/FormField';

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken';

interface UsernameFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  onAvailabilityChange?: (available: boolean) => void;
}

export function UsernameField({
  value,
  onChangeText,
  error,
  onAvailabilityChange,
}: UsernameFieldProps) {
  const { colors } = useTheme();
  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    availability: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      marginTop: SPACING.xs,
    },
  }), []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < APP_CONFIG.usernameMinLength) {
      setAvailability('idle');
      onAvailabilityChange?.(false);
      return;
    }

    setAvailability('checking');

    debounceRef.current = setTimeout(async () => {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value.toLowerCase())
        .maybeSingle();

      if (queryError) {
        setAvailability('idle');
        onAvailabilityChange?.(false);
        return;
      }

      const isAvailable = data === null;
      setAvailability(isAvailable ? 'available' : 'taken');
      onAvailabilityChange?.(isAvailable);
    }, APP_CONFIG.usernameDebounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, onAvailabilityChange]);

  const availabilityMessage = {
    idle: null,
    checking: { text: 'Checking...', color: colors.text.secondary },
    available: { text: 'Available', color: colors.status.free },
    taken: { text: 'Taken — try another', color: colors.interactive.destructive },
  }[availability];

  return (
    <View>
      <FormField
        label="Username"
        value={value}
        onChangeText={onChangeText}
        error={error}
        placeholder="username"
        autoCapitalize="none"
        keyboardType="default"
      />
      {availabilityMessage && (
        <Text style={[styles.availability, { color: availabilityMessage.color }]}>
          {availabilityMessage.text}
        </Text>
      )}
    </View>
  );
}
