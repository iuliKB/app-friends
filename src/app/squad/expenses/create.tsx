// Phase 8 v1.4 — Expense create screen (IOU-01, IOU-02)
// Route: /squad/expenses/create
// Uses useExpenseCreate hook for all form state and RPC submission.

import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { useExpenseCreate } from '@/hooks/useExpenseCreate';
import { SplitModeControl } from '@/components/iou/SplitModeControl';
import { RemainingIndicator } from '@/components/iou/RemainingIndicator';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { EmptyState } from '@/components/common/EmptyState';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { formatCentsDisplay, parseCentsFromInput } from '@/utils/currencyFormat';
import { useMemo } from 'react';

export default function ExpenseCreateScreen() {
  const { colors } = useTheme();
  const { group_channel_id } = useLocalSearchParams<{ group_channel_id?: string }>();
  const form = useExpenseCreate({ groupChannelId: group_channel_id });

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface.base },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    sectionLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
      marginBottom: SPACING.sm,
    },
    sectionGap: { marginTop: SPACING.xl },
    textInput: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      padding: SPACING.lg,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      gap: SPACING.sm,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
    },
    friendName: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    customSection: { marginTop: SPACING.lg },
    customRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
      gap: SPACING.md,
    },
    customName: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    customAmountInput: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      padding: SPACING.md,
      fontSize: FONT_SIZE.md,
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: colors.border,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 100,
    },
    errorText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.interactive.destructive,
      marginTop: SPACING.md,
    },
    buttonGap: { marginTop: SPACING.xl },
  }), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title section */}
      <Text style={styles.sectionLabel}>Expense title</Text>
      <TextInput
        style={styles.textInput}
        value={form.title}
        onChangeText={form.setTitle}
        placeholder="What's this for?"
        placeholderTextColor={colors.text.secondary}
      />

      {/* Amount section */}
      <Text style={[styles.sectionLabel, styles.sectionGap]}>Total amount</Text>
      <TextInput
        style={styles.textInput}
        value={form.rawDigits ? formatCentsDisplay(parseInt(form.rawDigits || '0', 10)) : ''}
        onChangeText={(text) => form.setRawDigits(parseCentsFromInput(text))}
        placeholder="$0.00"
        placeholderTextColor={colors.text.secondary}
        keyboardType="numeric"
      />

      {/* Split with section */}
      <Text style={[styles.sectionLabel, styles.sectionGap]}>Split with</Text>
      {form.friendsLoading ? (
        <ActivityIndicator color={colors.interactive.accent} />
      ) : form.friends.length === 0 ? (
        <EmptyState icon="people-outline" iconType="ionicons" heading="No friends yet" body="Add friends to split expenses with them" />
      ) : (
        <FlatList
          data={form.friends}
          keyExtractor={(f) => f.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const selected = form.selectedFriendIds.has(item.id);
            return (
              <TouchableOpacity
                style={styles.friendRow}
                onPress={() => form.toggleFriend(item.id)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <AvatarCircle size={36} imageUri={item.avatar_url} displayName={item.display_name} />
                <Text style={styles.friendName}>{item.display_name}</Text>
                <Ionicons
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={colors.interactive.accent}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Split mode section */}
      <Text style={[styles.sectionLabel, styles.sectionGap]}>Split mode</Text>
      <SplitModeControl mode={form.splitMode} onChange={form.setSplitMode} />

      {/* Custom split per-person amounts */}
      {form.splitMode === 'custom' && (
        <View style={styles.customSection}>
          {Array.from(form.selectedFriendIds).map((friendId) => {
            const friend = form.friends.find((f) => f.id === friendId);
            if (!friend) return null;
            return (
              <View key={friendId} style={styles.customRow}>
                <Text style={styles.customName} numberOfLines={1}>{friend.display_name}</Text>
                <TextInput
                  style={styles.customAmountInput}
                  value={form.customAmounts[friendId]
                    ? formatCentsDisplay(parseInt(form.customAmounts[friendId] ?? '0', 10))
                    : ''}
                  onChangeText={(text) => form.setCustomAmount(friendId, parseCentsFromInput(text))}
                  placeholder="$0.00"
                  placeholderTextColor={colors.text.secondary}
                  keyboardType="numeric"
                />
              </View>
            );
          })}
          <RemainingIndicator totalCents={form.totalCents} allocatedCents={form.allocatedCents} />
        </View>
      )}

      {/* Submit error */}
      {form.submitError ? (
        <Text style={styles.errorText}>{form.submitError}</Text>
      ) : null}

      {/* Submit button */}
      <View style={styles.buttonGap}>
        <PrimaryButton
          title="Create Expense"
          onPress={() => { void form.submit(); }}
          loading={form.submitting}
          disabled={!form.canSubmit || form.submitting}
        />
      </View>
    </ScrollView>
  );
}
