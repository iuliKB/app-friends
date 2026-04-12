// Phase 8 v1.4 — Expense create screen (IOU-01, IOU-02)
// Route: /squad/expenses/create
// Uses useExpenseCreate hook for all form state and RPC submission.

import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';
import { useExpenseCreate } from '@/hooks/useExpenseCreate';
import { SplitModeControl } from '@/components/iou/SplitModeControl';
import { RemainingIndicator } from '@/components/iou/RemainingIndicator';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { EmptyState } from '@/components/common/EmptyState';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { formatCentsDisplay, parseCentsFromInput } from '@/utils/currencyFormat';

export default function ExpenseCreateScreen() {
  const form = useExpenseCreate();

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
        placeholderTextColor={COLORS.text.secondary}
      />

      {/* Amount section */}
      <Text style={[styles.sectionLabel, styles.sectionGap]}>Total amount</Text>
      <TextInput
        style={styles.textInput}
        value={form.rawDigits ? formatCentsDisplay(parseInt(form.rawDigits || '0', 10)) : ''}
        onChangeText={(text) => form.setRawDigits(parseCentsFromInput(text))}
        placeholder="$0.00"
        placeholderTextColor={COLORS.text.secondary}
        keyboardType="numeric"
      />

      {/* Split with section */}
      <Text style={[styles.sectionLabel, styles.sectionGap]}>Split with</Text>
      {form.friendsLoading ? (
        <ActivityIndicator color={COLORS.interactive.accent} />
      ) : form.friends.length === 0 ? (
        <EmptyState icon="👥" heading="No friends yet" body="Add friends to split expenses with them" />
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
                  color={COLORS.interactive.accent}
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
                  placeholderTextColor={COLORS.text.secondary}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface.base },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  sectionGap: { marginTop: SPACING.xl },
  textInput: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.md,
    padding: SPACING.lg,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
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
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  customAmountInput: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 100,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.interactive.destructive,
    marginTop: SPACING.md,
  },
  buttonGap: { marginTop: SPACING.xl },
});
