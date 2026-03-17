import { Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function FriendsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.dominant },
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
      }}
    />
  );
}
