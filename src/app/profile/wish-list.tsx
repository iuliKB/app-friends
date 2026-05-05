import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { useMyWishList } from '@/hooks/useMyWishList';
import type { WishListItem } from '@/hooks/useMyWishList';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

export default function WishListScreen() {
  const { colors } = useTheme();
  const {
    items: wishListItems,
    addItem,
    updateItem,
    deleteItem,
    loading,
    error,
    refetch,
  } = useMyWishList();

  // Add form
  const [addingWishItem, setAddingWishItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Edit state — one item at a time
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  function startEditing(item: WishListItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.url ?? '');
    setEditNotes(item.notes ?? '');
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle('');
    setEditUrl('');
    setEditNotes('');
  }

  async function handleSaveEdit(itemId: string) {
    const trimmed = editTitle.trim();
    if (!trimmed || savingEdit) return;
    setSavingEdit(true);
    await updateItem(itemId, trimmed, editUrl.trim() || undefined, editNotes.trim() || undefined);
    setSavingEdit(false);
    cancelEditing();
  }

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

  const canAdd = newItemTitle.trim().length > 0 && !addingWishItem;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1, backgroundColor: colors.surface.base },
        scroll: { flex: 1 },
        scrollContent: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.xxl * 2,
        },

        // ── Section label ────────────────────────────────────────
        sectionLabel: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          marginTop: SPACING.xl,
          marginBottom: SPACING.sm,
          marginLeft: SPACING.xs,
        },
        sectionLabelFirst: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          marginTop: SPACING.md,
          marginBottom: SPACING.sm,
          marginLeft: SPACING.xs,
        },

        // ── Item card (display mode) ──────────────────────────────
        itemCard: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
          marginBottom: SPACING.sm,
        },
        itemIconWrap: {
          width: 36,
          height: 36,
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent + '22',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: SPACING.md,
          flexShrink: 0,
          marginTop: 1,
        },
        itemContent: { flex: 1 },
        itemTitle: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        itemUrl: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.accent,
          marginTop: SPACING.xs,
        },
        itemNotes: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: SPACING.xs,
        },
        itemActions: {
          flexDirection: 'row',
          gap: SPACING.xs,
          flexShrink: 0,
          marginLeft: SPACING.sm,
        },
        iconBtn: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },

        // ── Item card (edit mode) ─────────────────────────────────
        editCard: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          marginBottom: SPACING.sm,
          overflow: 'hidden',
        },
        editInput: {
          height: 46,
          paddingHorizontal: SPACING.md,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        editDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: SPACING.md,
        },
        editActions: {
          flexDirection: 'row',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        editActionBtn: {
          flex: 1,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        },
        editActionDivider: {
          width: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
        },
        editCancelText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        editSaveText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.interactive.accent,
        },

        // ── Empty state ───────────────────────────────────────────
        emptyState: {
          alignItems: 'center',
          paddingTop: SPACING.xxl,
          paddingBottom: SPACING.xl,
          gap: SPACING.md,
        },
        emptyTitle: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          textAlign: 'center',
        },
        emptyBody: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
          paddingHorizontal: SPACING.xl,
        },

        // ── Add form card ─────────────────────────────────────────
        addFormCard: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          overflow: 'hidden',
        },
        formInput: {
          height: 50,
          paddingHorizontal: SPACING.md,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        formDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: SPACING.md,
        },

        // ── Add button ────────────────────────────────────────────
        addButton: {
          marginTop: SPACING.md,
          backgroundColor: colors.interactive.accent,
          borderRadius: RADII.lg,
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.sm,
        },
        addButtonDisabled: { opacity: 0.4 },
        addButtonText: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.surface.base,
        },
      }),
    [colors]
  );

  if (loading) return <LoadingIndicator />;

  if (error) {
    return (
      <View style={styles.flex}>
        <ErrorDisplay mode="screen" message="Couldn't load wish list." onRetry={refetch} />
      </View>
    );
  }

  const itemCountLabel =
    wishListItems.length > 0
      ? `${wishListItems.length} item${wishListItems.length === 1 ? '' : 's'}`
      : undefined;

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
        <ScreenHeader
          title="My Wish List"
          rightAction={
            itemCountLabel ? (
              <Text
                style={{
                  fontSize: FONT_SIZE.sm,
                  fontFamily: FONT_FAMILY.body.medium,
                  color: colors.text.secondary,
                }}
              >
                {itemCountLabel}
              </Text>
            ) : undefined
          }
        />

        {/* ── Items ── */}
        {wishListItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="gift-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Your wish list is empty</Text>
            <Text style={styles.emptyBody}>Add items so your friends know what to get you</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabelFirst}>Your items</Text>
            {wishListItems.map((item) =>
              editingId === item.id ? (
                // ── Edit mode ──
                <View key={item.id} style={styles.editCard}>
                  <TextInput
                    style={styles.editInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Item title"
                    placeholderTextColor={colors.text.secondary}
                    maxLength={120}
                    autoFocus
                  />
                  <View style={styles.editDivider} />
                  <TextInput
                    style={styles.editInput}
                    value={editUrl}
                    onChangeText={setEditUrl}
                    placeholder="Link (optional)"
                    placeholderTextColor={colors.text.secondary}
                    maxLength={500}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                  <View style={styles.editDivider} />
                  <TextInput
                    style={styles.editInput}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholder="Notes (optional)"
                    placeholderTextColor={colors.text.secondary}
                    maxLength={200}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.editActionBtn}
                      onPress={cancelEditing}
                      disabled={savingEdit}
                    >
                      <Text style={styles.editCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <View style={styles.editActionDivider} />
                    <TouchableOpacity
                      style={styles.editActionBtn}
                      onPress={() => void handleSaveEdit(item.id)}
                      disabled={!editTitle.trim() || savingEdit}
                    >
                      {savingEdit ? (
                        <ActivityIndicator size="small" color={colors.interactive.accent} />
                      ) : (
                        <Text style={[styles.editSaveText, !editTitle.trim() && { opacity: 0.4 }]}>
                          Save
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // ── Display mode ──
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemIconWrap}>
                    <Ionicons name="gift-outline" size={18} color={colors.interactive.accent} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.url ? (
                      <TouchableOpacity
                        onPress={() => void Linking.openURL(item.url!)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.itemUrl} numberOfLines={1}>
                          {item.url}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {item.notes ? (
                      <Text style={styles.itemNotes} numberOfLines={2}>
                        {item.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => startEditing(item)}
                      accessibilityLabel={`Edit ${item.title}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="pencil-outline" size={17} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => void deleteItem(item.id)}
                      accessibilityLabel={`Remove ${item.title}`}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={colors.interactive.destructive}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )}
          </>
        )}

        {/* ── Add form ── */}
        <Text style={styles.sectionLabel}>Add item</Text>
        <View style={styles.addFormCard}>
          <TextInput
            style={styles.formInput}
            value={newItemTitle}
            onChangeText={setNewItemTitle}
            placeholder="Item title (required)"
            placeholderTextColor={colors.text.secondary}
            maxLength={120}
            editable={!addingWishItem}
          />
          <View style={styles.formDivider} />
          <TextInput
            style={styles.formInput}
            value={newItemUrl}
            onChangeText={setNewItemUrl}
            placeholder="Link (optional)"
            placeholderTextColor={colors.text.secondary}
            maxLength={500}
            editable={!addingWishItem}
            keyboardType="url"
            autoCapitalize="none"
          />
          <View style={styles.formDivider} />
          <TextInput
            style={styles.formInput}
            value={newItemNotes}
            onChangeText={setNewItemNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.text.secondary}
            maxLength={200}
            editable={!addingWishItem}
          />
        </View>

        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={handleAddWishItem}
          disabled={!canAdd}
          accessibilityLabel="Add wish list item"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.surface.base} />
          <Text style={styles.addButtonText}>
            {addingWishItem ? 'Adding...' : 'Add to Wish List'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
