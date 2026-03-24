import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
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
  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    checking: { text: 'Checking...', color: COLORS.text.secondary },
    available: { text: 'Available', color: COLORS.status.free },
    taken: { text: 'Taken — try another', color: COLORS.interactive.destructive },
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

const styles = StyleSheet.create({
  availability: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    marginTop: SPACING.xs,
  },
});
