import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { supabase } from '@/lib/supabase';
import { AvatarCircle } from '@/components/common/AvatarCircle';

interface Participant {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface GroupParticipantsSheetProps {
  visible: boolean;
  onClose: () => void;
  groupChannelId: string;
}

export function GroupParticipantsSheet({ visible, onClose, groupChannelId }: GroupParticipantsSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface.card,
      borderTopLeftRadius: RADII.lg,
      borderTopRightRadius: RADII.lg,
      paddingBottom: SPACING.xxl,
    },
    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: RADII.xs,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: SPACING.sm,
      marginBottom: SPACING.md,
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      gap: SPACING.md,
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    name: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    closeBtn: {
      marginTop: SPACING.md,
      marginHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADII.lg,
      backgroundColor: colors.surface.base,
      alignItems: 'center',
    },
    closeBtnText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.secondary,
    },
  }), [colors]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const translateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      void fetchParticipants();
    } else {
      translateY.setValue(400);
    }
  }, [visible, groupChannelId, translateY]);

  async function fetchParticipants() {
    const { data: members } = await supabase
      .from('group_channel_members')
      .select('user_id')
      .eq('group_channel_id', groupChannelId);

    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);

    setParticipants(
      (profiles ?? []).map((p) => ({
        id: p.id,
        display_name: (p.display_name as string | null) ?? 'Unknown',
        avatar_url: p.avatar_url as string | null,
      })),
    );
  }

  function handleClose() {
    Animated.timing(translateY, { toValue: 400, duration: 200, useNativeDriver: true }).start(onClose);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.dragHandle} />
        <Text style={styles.title}>Participants</Text>
        {participants.map((p, i) => (
          <View key={p.id} style={[styles.row, i > 0 && styles.rowBorder]}>
            <AvatarCircle size={36} imageUri={p.avatar_url} displayName={p.display_name} />
            <Text style={styles.name} numberOfLines={1}>{p.display_name}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

