import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE } from '@/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { colors } = useTheme();
  const { isConnected } = useNetworkStatus();
  const heightAnim = useRef(new Animated.Value(isConnected ? 0 : 32)).current;

  const styles = useMemo(() => StyleSheet.create({
    banner: {
      backgroundColor: colors.offline.bg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.offline.text,
      textAlign: 'center',
    },
  }), [colors]);

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isConnected ? 0 : 32,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isConnected, heightAnim]);

  return (
    <Animated.View style={[styles.banner, { height: heightAnim }]}>
      <Text style={styles.text}>No connection — some features may not work</Text>
    </Animated.View>
  );
}
