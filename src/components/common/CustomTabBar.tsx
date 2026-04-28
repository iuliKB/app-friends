import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { useInvitationCount } from '@/hooks/useInvitationCount';

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  squad: 'Squad',
  plans: 'Explore',
  chat: 'Chats',
  profile: 'Profile',
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { focused: IconName; unfocused: IconName }> = {
  squad: { focused: 'people', unfocused: 'people-outline' },
  plans: { focused: 'compass', unfocused: 'compass-outline' },
  index: { focused: 'home', unfocused: 'home-outline' },
  chat: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  profile: { focused: 'person', unfocused: 'person-outline' },
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { count: pendingCount } = usePendingRequestsCount();
  const { count: invitationCount } = useInvitationCount();

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 16,
      right: 16,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(21, 23, 28, 0.92)',
      borderRadius: 28,
      borderWidth: 1,
      borderColor: 'rgba(185, 255, 59, 0.12)',
      borderTopColor: 'rgba(185, 255, 59, 0.12)',
      height: 64,
      paddingHorizontal: 8,
      overflow: 'visible',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      height: '100%',
    },
    iconWrapper: {
      position: 'relative',
    },
    centerWrapper: {
      width: 68,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerButton: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.interactive.accent,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ translateY: -20 }],
      shadowColor: colors.interactive.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.interactive.accent,
    },
    label: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: 2,
    },
    labelActive: {
      color: colors.interactive.accent,
      fontFamily: FONT_FAMILY.body.semibold,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -8,
      backgroundColor: colors.interactive.destructive,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
    },
  }), [colors]);

  const focusedRoute = state.routes[state.index];
  const nestedState = focusedRoute.state;
  if (nestedState) {
    const nestedIndex = nestedState.index ?? 0;
    const nestedRoute = nestedState.routes[nestedIndex];
    if (nestedRoute?.name === 'room') return null;
  }

  const badges: Record<string, number> = {
    squad: pendingCount,
    plans: invitationCount,
  };

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 12 }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter = index === 2;
          const config = TAB_CONFIG[route.name];
          const badge = badges[route.name] ?? 0;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <View key={route.key} style={styles.centerWrapper}>
                <TouchableOpacity
                  onPress={onPress}
                  style={styles.centerButton}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Home"
                >
                  <Ionicons name={config.focused} size={26} color="#0E0F11" />
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={isFocused ? config.focused : config.unfocused}
                  size={20}
                  color={isFocused ? colors.interactive.accent : colors.text.secondary}
                />
                {badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {TAB_LABELS[route.name]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
