import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme';
import { QRCodeDisplay } from '@/components/friends/QRCodeDisplay';

export default function QRCodeScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen
        options={{
          title: 'My QR Code',
          headerStyle: { backgroundColor: colors.surface.base },
          headerTintColor: colors.text.primary,
        }}
      />
      <QRCodeDisplay />
    </>
  );
}
