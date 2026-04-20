import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useMyWishList } from '@/hooks/useMyWishList';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

export default function WishListScreen() {
  const { items: wishListItems, addItem, deleteItem, loading } = useMyWishList();
  const [addingWishItem, setAddingWishItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');

  async function handleAddWishItem() {
    const trimmedTitle = newItemTitle.trim();
    if (!trimmedTitle || addingWishItem) return;
    setAddingWishItem(true);
    await addItem(trimmedTitle, newItemUrl.trim() || undefined, newItemNotes.trim() || undefined);
    setNewItemTitle('');
    setNewItemUrl('');
    setNewItemNotes('');
    setAddingWishItem(false);
  }

  if (loading) return <LoadingIndicator />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="My Wish List" />

        {/* Existing items */}
        {wishListItems.map((item) => (
          <View key={item.id} style={styles.wishListRow}>
            <View style={styles.wishListItemContent}>
              <Text style={styles.wishListItemTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.url ? (
                <Text style={styles.wishListItemUrl} numberOfLines={1}>
                  {item.url}
                </Text>
              ) : null}
              {item.notes ? (
                <Text style={styles.wishListItemNotes} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => void deleteItem(item.id)}
              style={styles.deleteWishItem}
              accessibilityLabel={`Delete ${item.title}`}
            >
              <Text style={styles.deleteWishItemText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        {wishListItems.length === 0 && (
          <Text style={styles.wishListEmpty}>No wish list items yet.</Text>
        )}

        {/* Add item form */}
        <Text style={styles.addSectionLabel}>ADD ITEM</Text>
        <TextInput
          style={[styles.textInput, styles.wishItemInput]}
          value={newItemTitle}
          onChangeText={setNewItemTitle}
          placeholder="Item title (required)"
          placeholderTextColor={COLORS.text.secondary}
          maxLength={120}
          editable={!addingWishItem}
        />
        <TextInput
          style={[styles.textInput, styles.wishItemInput]}
          value={newItemUrl}
          onChangeText={setNewItemUrl}
          placeholder="Link (optional)"
          placeholderTextColor={COLORS.text.secondary}
          maxLength={500}
          editable={!addingWishItem}
          keyboardType="url"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.textInput, styles.wishItemInput]}
          value={newItemNotes}
          onChangeText={setNewItemNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={COLORS.text.secondary}
          maxLength={200}
          editable={!addingWishItem}
        />
        <TouchableOpacity
          style={[
            styles.addWishItemButton,
            (!newItemTitle.trim() || addingWishItem) && styles.addWishItemButtonDisabled,
          ]}
          onPress={handleAddWishItem}
          disabled={!newItemTitle.trim() || addingWishItem}
          accessibilityLabel="Add wish list item"
        >
          <Text style={styles.addWishItemButtonText}>
            {addingWishItem ? 'Adding...' : 'Add Item'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  addSectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    height: 52,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.primary,
  },
  wishItemInput: {
    marginTop: SPACING.sm,
  },
  wishListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  wishListItemContent: {
    flex: 1,
  },
  wishListItemTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  wishListItemUrl: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.accent,
    marginTop: SPACING.xs,
  },
  wishListItemNotes: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  wishListEmpty: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  deleteWishItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  deleteWishItemText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.destructive,
  },
  addWishItemButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  addWishItemButtonDisabled: {
    opacity: 0.5,
  },
  addWishItemButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
});
