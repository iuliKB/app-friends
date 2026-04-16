import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface CompactFriendRowProps {
  friend: FriendWithStatus;
  onPress: () => void;
}

export function CompactFriendRow({ friend, onPress }: CompactFriendRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={friend.display_name}
      onPress={onPress}
    >
      <AvatarCircle size={36} imageUri={friend.avatar_url} displayName={friend.display_name} />
      <Text style={styles.name} numberOfLines={1}>{friend.display_name}</Text>
      <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  name: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
});
