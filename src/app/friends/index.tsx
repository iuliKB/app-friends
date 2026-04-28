import { Stack, useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FriendsList } from '@/screens/friends/FriendsList';
import { useMemo } from 'react';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const { count } = usePendingRequestsCount();
  const router = useRouter();

  const styles = useMemo(() => StyleSheet.create({
    headerButton: {
      position: 'relative',
      marginRight: SPACING.sm,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: RADII.md,
      backgroundColor: colors.interactive.destructive,
      alignItems: 'center',
      justifyContent: 'center',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingHorizontal: 2, // no exact token
    },
    badgeText: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.primary,
    },
  }), [colors]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Friends',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/friends/requests')}
              accessibilityLabel="Friend requests"
              style={styles.headerButton}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.interactive.accent} />
              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <FriendsList />
    </>
  );
}
