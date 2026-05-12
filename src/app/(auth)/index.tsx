import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthScreen from '@/screens/auth/AuthScreen';
import WelcomeScreen from '@/screens/welcome/WelcomeScreen';
import { useTheme } from '@/theme';

const WELCOME_SEEN_KEY = 'campfire:welcomeSeen';

export default function AuthIndex() {
  const { colors } = useTheme();
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY)
      .then((v) => setWelcomeSeen(v === '1'))
      .catch(() => setWelcomeSeen(true));
  }, []);

  if (welcomeSeen === null) {
    return <View style={{ flex: 1, backgroundColor: colors.surface.base }} />;
  }

  if (!welcomeSeen) {
    return (
      <WelcomeScreen
        onDone={() => {
          setWelcomeSeen(true);
          AsyncStorage.setItem(WELCOME_SEEN_KEY, '1').catch(() => {});
        }}
      />
    );
  }

  return <AuthScreen />;
}
