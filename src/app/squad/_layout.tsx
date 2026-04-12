import { Stack } from 'expo-router';
import { COLORS } from '@/theme';

export default function SquadLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface.base },
        headerTintColor: COLORS.text.primary,
        headerShadowVisible: false,
      }}
    />
  );
}
