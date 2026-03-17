import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { QRCodeDisplay } from '@/components/friends/QRCodeDisplay';

export default function QRCodeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'My QR Code',
          headerStyle: { backgroundColor: COLORS.dominant },
          headerTintColor: COLORS.textPrimary,
        }}
      />
      <QRCodeDisplay />
    </>
  );
}
