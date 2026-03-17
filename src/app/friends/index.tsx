import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
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
              <Ionicons name="notifications-outline" size={24} color={COLORS.accent} />
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
    marginRight: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
