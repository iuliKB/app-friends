import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { useMyWishList } from '@/hooks/useMyWishList';
import type { WishListItem } from '@/hooks/useMyWishList';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function WishListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    items: wishListItems,
    addItem,
    updateItem,
    deleteItem,
    loading,
    error,
    refetch,
  } = useMyWishList();

  // Add sheet
  const [showAddSheet, setShowAddSheet] = useState(false);
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

  function openAddSheet() {
    setNewItemTitle('');
    setNewItemUrl('');
    setNewItemNotes('');
    setShowAddSheet(true);
  }

  function closeAddSheet() {
    setShowAddSheet(false);
  }

  async function handleAddWishItem() {
    const trimmedTitle = newItemTitle.trim();
    if (!trimmedTitle || addingWishItem) return;
    setAddingWishItem(true);
    await addItem(trimmedTitle, newItemUrl.trim() || undefined, newItemNotes.trim() || undefined);
    setAddingWishItem(false);
    closeAddSheet();
  }

  function startEditing(item: WishListItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.url ?? '');
    setEditNotes(item.notes ?? '');
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function handleSaveEdit(itemId: string) {
    const trimmed = editTitle.trim();
    if (!trimmed || savingEdit) return;
    setSavingEdit(true);
    await updateItem(itemId, trimmed, editUrl.trim() || undefined, editNotes.trim() || undefined);
    setSavingEdit(false);
    cancelEditing();
  }

  const canAdd = newItemTitle.trim().length > 0 && !addingWishItem;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.surface.base },
        flex: { flex: 1 },
        scrollContent: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.xxl * 3,
        },

        // ── Section label ─────────────────────────────────────────
        sectionLabel: {
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
        linkChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          backgroundColor: colors.interactive.accent + '18',
          borderRadius: RADII.full,
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
          alignSelf: 'flex-start',
          marginTop: SPACING.xs,
        },
        linkChipText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.interactive.accent,
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

        // ── Inline edit card ──────────────────────────────────────
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

        // ── FAB ───────────────────────────────────────────────────
        fab: {
          position: 'absolute',
          right: SPACING.lg,
          width: 56,
          height: 56,
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.interactive.accent,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },

        // ── Bottom sheet modal ────────────────────────────────────
        modalOverlay: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.text.primary,
          opacity: 0.4,
        },
        sheet: {
          backgroundColor: colors.surface.base,
          borderTopLeftRadius: RADII.xl,
          borderTopRightRadius: RADII.xl,
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.lg,
        },
        sheetHandle: {
          width: 36,
          height: 4,
          borderRadius: RADII.full,
          backgroundColor: colors.border,
          alignSelf: 'center',
          marginTop: SPACING.md,
          marginBottom: SPACING.lg,
        },
        sheetTitle: {
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          marginBottom: SPACING.lg,
        },
        sheetCard: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          overflow: 'hidden',
          marginBottom: SPACING.md,
        },
        sheetInput: {
          height: 50,
          paddingHorizontal: SPACING.md,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        sheetDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: SPACING.md,
        },
        addButton: {
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
      <View style={styles.root}>
        <ErrorDisplay mode="screen" message="Couldn't load wish list." onRetry={refetch} />
      </View>
    );
  }

  const itemCountLabel =
    wishListItems.length > 0
      ? `${wishListItems.length} item${wishListItems.length === 1 ? '' : 's'}`
      : undefined;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={[styles.flex, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              <Ionicons name="gift-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>Your wish list is empty</Text>
              <Text style={styles.emptyBody}>
                Tap the + button to add items so your friends know what to get you
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Your items</Text>
              {wishListItems.map((item) =>
                editingId === item.id ? (
                  // ── Inline edit mode ──
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
                          <Text
                            style={[styles.editSaveText, !editTitle.trim() && { opacity: 0.4 }]}
                          >
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
                          style={styles.linkChip}
                        >
                          <Ionicons
                            name="link-outline"
                            size={11}
                            color={colors.interactive.accent}
                          />
                          <Text style={styles.linkChipText}>{extractDomain(item.url)}</Text>
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
                      >
                        <Ionicons name="pencil-outline" size={17} color={colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => void deleteItem(item.id)}
                        accessibilityLabel={`Remove ${item.title}`}
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
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity
          style={[styles.fab, { bottom: SPACING.xl + insets.bottom }]}
          onPress={openAddSheet}
          accessibilityLabel="Add wish list item"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color={colors.surface.base} />
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* ── Add Item Bottom Sheet ── */}
      <Modal
        visible={showAddSheet}
        transparent
        animationType="slide"
        onRequestClose={closeAddSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdrop} onPress={closeAddSheet} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.sheet, { paddingBottom: SPACING.lg + insets.bottom }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Add item</Text>

              <View style={styles.sheetCard}>
                <TextInput
                  style={styles.sheetInput}
                  value={newItemTitle}
                  onChangeText={setNewItemTitle}
                  placeholder="Item title (required)"
                  placeholderTextColor={colors.text.secondary}
                  maxLength={120}
                  editable={!addingWishItem}
                  autoFocus
                />
                <View style={styles.sheetDivider} />
                <TextInput
                  style={styles.sheetInput}
                  value={newItemUrl}
                  onChangeText={setNewItemUrl}
                  placeholder="Link (optional)"
                  placeholderTextColor={colors.text.secondary}
                  maxLength={500}
                  editable={!addingWishItem}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <View style={styles.sheetDivider} />
                <TextInput
                  style={styles.sheetInput}
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
                accessibilityLabel="Add to wish list"
              >
                {addingWishItem ? (
                  <ActivityIndicator color={colors.surface.base} />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color={colors.surface.base} />
                    <Text style={styles.addButtonText}>Add to Wish List</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
