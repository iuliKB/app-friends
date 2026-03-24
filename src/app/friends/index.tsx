import { Stack, useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FriendsList } from '@/screens/friends/FriendsList';

export default function FriendsScreen() {
  const { count } = usePendingRequestsCount();
  const router = useRouter();

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
              <Ionicons name="notifications-outline" size={24} color={COLORS.interactive.accent} />
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

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.interactive.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    // eslint-disable-next-line campfire/no-hardcoded-styles
    paddingHorizontal: 2, // no exact token
  },
  badgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
});
