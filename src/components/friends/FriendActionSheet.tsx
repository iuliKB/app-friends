import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
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
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { FriendWithStatus } from '@/hooks/useFriends';

interface FriendActionSheetProps {
  visible: boolean;
  onClose: () => void;
  friend: FriendWithStatus | null;
  onViewProfile: () => void;
  onStartDM: () => void;
  onRemoveFriend: () => void;
  loadingDM?: boolean;
}

export function FriendActionSheet({
  visible,
  onClose,
  friend,
  onViewProfile,
  onStartDM,
  onRemoveFriend,
  loadingDM = false,
}: FriendActionSheetProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(300)).current;
  const [confirming, setConfirming] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(0,0,0,0.6)', // no exact token — modal scrim
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface.card,
      borderTopLeftRadius: RADII.xl,
      borderTopRightRadius: RADII.xl,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.xxl,
    },
    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: RADII.xs,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: SPACING.sm,
    },
    friendHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    friendHeaderInfo: {
      marginLeft: SPACING.lg,
    },
    friendDisplayName: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.primary,
    },
    friendUsername: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    actionRow: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
    },
    disabledRow: {
      opacity: 0.5,
    },
    actionIcon: {
      marginRight: SPACING.lg,
    },
    actionLabel: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    destructiveLabel: {
      color: colors.interactive.destructive,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: SPACING.lg,
    },
    confirmContainer: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
      alignItems: 'center',
    },
    confirmHeading: {
      fontSize: FONT_SIZE.xl,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      textAlign: 'center',
    },
    confirmBody: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: SPACING.sm,
      marginBottom: SPACING.xl,
    },
    removeButton: {
      width: '100%',
      height: 52,
      backgroundColor: colors.interactive.destructive,
      borderRadius: RADII.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
    },
    removeButtonText: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
    keepButton: {
      width: '100%',
      height: 52,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keepButtonText: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.regular,
      color: colors.text.primary,
    },
  }), [colors]);

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
                color={colors.text.secondary}
                style={styles.actionIcon}
              />
              <Text style={styles.actionLabel}>View profile</Text>
            </TouchableOpacity>
            <View style={styles.separator} />

            <TouchableOpacity
              style={[styles.actionRow, loadingDM && styles.disabledRow]}
              onPress={onStartDM}
              activeOpacity={0.7}
              disabled={loadingDM}
            >
              {loadingDM ? (
                <ActivityIndicator
                  size="small"
                  color={colors.text.secondary}
                  style={styles.actionIcon}
                />
              ) : (
                <Ionicons
                  name="chatbubble-outline"
                  size={22}
                  color={colors.text.secondary}
                  style={styles.actionIcon}
                />
              )}
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
                color={colors.interactive.destructive}
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
