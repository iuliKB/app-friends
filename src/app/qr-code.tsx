import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/theme';
import { QRCodeDisplay } from '@/components/friends/QRCodeDisplay';

export default function QRCodeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'My QR Code',
          headerStyle: { backgroundColor: COLORS.surface.base },
          headerTintColor: COLORS.text.primary,
        }}
      />
      <QRCodeDisplay />
    </>
  );
}
