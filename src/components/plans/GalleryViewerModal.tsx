import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { PlanPhotoWithUploader } from '@/types/database';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GalleryViewerModalProps {
  visible: boolean;
  photos: PlanPhotoWithUploader[];
  initialIndex: number;
  currentUserId: string;
  onClose: () => void;
  deletePhoto: (photoId: string) => Promise<{ error: Error | null }>;
}

export function GalleryViewerModal({
  visible,
  photos,
  initialIndex,
  currentUserId,
  onClose,
  deletePhoto,
}: GalleryViewerModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<PlanPhotoWithUploader>>(null);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Reset currentIndex when modal opens to a new photo
  // (initialIndex prop may change between openings)
  React.useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  const currentPhoto = photos[currentIndex];

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const first = viewableItems[0];
      if (first?.index != null) setCurrentIndex(first.index);
    },
    [],
  );

  async function handleSave() {
    if (!currentPhoto?.signedUrl || saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Access Needed',
          'Allow Campfire to access your photos in Settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }
      await MediaLibrary.saveToLibraryAsync(currentPhoto.signedUrl);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'Could not save photo.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeletePress() {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function confirmDelete() {
    if (!currentPhoto) return;
    const { error } = await deletePhoto(currentPhoto.id);
    if (error) {
      Alert.alert('Error', 'Could not delete photo.');
      return;
    }
    onClose(); // D-10: close viewer; usePlanPhotos.deletePhoto() calls refetch() internally
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: '#000',
        },
        scrollContent: {
          flex: 1,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
        },
        btnTopRight: {
          position: 'absolute' as const,
          right: SPACING.lg,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          minWidth: 44,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          minHeight: 44,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
        btnDisabled: {
          opacity: 0.5,
        },
        overlayBar: {
          position: 'absolute' as const,
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(0,0,0,0.6)',
        },
        overlayLeft: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: SPACING.sm,
          flex: 1,
          marginRight: SPACING.md,
        },
        uploaderName: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.semibold,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          color: '#fff',
          flex: 1,
        },
        overlayRight: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: SPACING.lg,
        },
        overlayBtn: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          minWidth: 44,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          minHeight: 44,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
      }),
    [colors],
  );

  const btnTop = insets.top + SPACING.xl;

  if (!currentPhoto) return null; // Guard for empty photos array

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        {/* Horizontal photo pager — CRITICAL: getItemLayout required with initialScrollIndex */}
        <FlatList
          ref={flatListRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <ScrollView
              style={{ width: screenWidth, height: screenHeight }}
              contentContainerStyle={styles.scrollContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              bouncesZoom
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: item.signedUrl ?? undefined }}
                style={{ width: screenWidth, height: screenHeight }}
                contentFit="contain"
              />
            </ScrollView>
          )}
        />

        {/* Close button — absolute top-right (D-03) */}
        <TouchableOpacity
          style={[styles.btnTopRight, { top: btnTop }]}
          onPress={onClose}
          accessibilityLabel="Close photo viewer"
        >
          <Ionicons name="close" size={28} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Bottom overlay bar — uploader attribution + actions (D-02) */}
        <View style={[styles.overlayBar, { paddingBottom: insets.bottom + SPACING.md }]}>
          {/* Left: uploader avatar + name (D-06) */}
          <View style={styles.overlayLeft}>
            <AvatarCircle
              size={32}
              imageUri={currentPhoto.uploader.avatarUrl}
              displayName={currentPhoto.uploader.displayName}
            />
            <Text numberOfLines={1} style={styles.uploaderName}>
              {currentPhoto.uploader.displayName}
            </Text>
          </View>

          {/* Right: Save + conditional Delete (D-02, D-09) */}
          <View style={styles.overlayRight}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.overlayBtn, saving && styles.btnDisabled]}
              accessibilityLabel="Save to camera roll"
            >
              {/* eslint-disable-next-line campfire/no-hardcoded-styles */}
              <Ionicons name="download-outline" size={24} color="#fff" />
            </TouchableOpacity>
            {currentPhoto.uploaderId === currentUserId && (
              <TouchableOpacity
                onPress={handleDeletePress}
                style={styles.overlayBtn}
                accessibilityLabel="Delete photo"
              >
                <Ionicons name="trash-outline" size={24} color={colors.feedback.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
