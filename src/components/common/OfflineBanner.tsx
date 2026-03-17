import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const heightAnim = useRef(new Animated.Value(isConnected ? 0 : 32)).current;

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

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.offlineBg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.offlineText,
    textAlign: 'center',
  },
});
