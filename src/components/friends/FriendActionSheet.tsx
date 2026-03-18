import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface FriendActionSheetProps {
  visible: boolean;
  onClose: () => void;
  friend: FriendWithStatus | null;
  onViewProfile: () => void;
  onStartDM: () => void;
  onRemoveFriend: () => void;
}

export function FriendActionSheet({
  visible,
  onClose,
  friend,
  onViewProfile,
  onStartDM,
  onRemoveFriend,
}: FriendActionSheetProps) {
  const translateY = useRef(new Animated.Value(300)).current;
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible) {
      setConfirming(false);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(300);
    }
  }, [visible, translateY]);

  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [visible, onClose]);

  if (!friend) return null;

  function handleRemovePress() {
    setConfirming(true);
  }

  function handleConfirmRemove() {
    onRemoveFriend();
    onClose();
  }

  function handleKeepFriend() {
    setConfirming(false);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {!confirming ? (
          <>
            {/* Friend header */}
            <View style={styles.friendHeader}>
              <AvatarCircle
                size={48}
                imageUri={friend.avatar_url}
                displayName={friend.display_name}
              />
              <View style={styles.friendHeaderInfo}>
                <Text style={styles.friendDisplayName}>{friend.display_name}</Text>
                <Text style={styles.friendUsername}>@{friend.username}</Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity style={styles.actionRow} onPress={onViewProfile} activeOpacity={0.7}>
              <Ionicons
                name="person-outline"
                size={22}
                color={COLORS.textSecondary}
                style={styles.actionIcon}
              />
              <Text style={styles.actionLabel}>View profile</Text>
            </TouchableOpacity>
            <View style={styles.separator} />

            <TouchableOpacity style={styles.actionRow} onPress={onStartDM} activeOpacity={0.7}>
              <Ionicons
                name="chatbubble-outline"
                size={22}
                color={COLORS.textSecondary}
                style={styles.actionIcon}
              />
              <Text style={styles.actionLabel}>Start DM</Text>
            </TouchableOpacity>
            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleRemovePress}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-remove-outline"
                size={22}
                color={COLORS.destructive}
                style={styles.actionIcon}
              />
              <Text style={[styles.actionLabel, styles.destructiveLabel]}>Remove friend</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmHeading}>Remove {friend.display_name}?</Text>
            <Text style={styles.confirmBody}>They won&apos;t be notified.</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleConfirmRemove}
              activeOpacity={0.8}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keepButton}
              onPress={handleKeepFriend}
              activeOpacity={0.8}
            >
              <Text style={styles.keepButtonText}>Keep Friend</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.secondary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  friendHeaderInfo: {
    marginLeft: 16,
  },
  friendDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  friendUsername: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  actionRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  destructiveLabel: {
    color: COLORS.destructive,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  confirmContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'center',
  },
  confirmHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  removeButton: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.destructive,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  keepButton: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
});
