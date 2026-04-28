import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING } from '@/theme';

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function ImageViewerModal({ visible, imageUrl, onClose }: ImageViewerModalProps) {
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const btnTop = insets.top + SPACING.xl;

  async function handleSave() {
    if (!imageUrl || saving) return;
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
      await MediaLibrary.saveToLibraryAsync(imageUrl);
    } catch {
      Alert.alert('Error', 'Could not save photo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        {/* Backdrop — tap to dismiss */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>

        {/* Pinch-to-zoom via ScrollView — D-15 */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
          bouncesZoom
        >
          <Image
            source={{ uri: imageUrl ?? undefined }}
            style={{ width: screenWidth, height: screenHeight }}
            contentFit="contain"
          />
        </ScrollView>

        {/* Save button — top-left — D-16 */}
        <TouchableOpacity
          style={[styles.btnTopLeft, { top: btnTop }, saving && styles.btnDisabled]}
          onPress={handleSave}
          accessibilityLabel="Save to camera roll"
          disabled={saving}
        >
          <Ionicons name="download-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Close button — top-right — D-14 */}
        <TouchableOpacity
          style={[styles.btnTopRight, { top: btnTop }]}
          onPress={onClose}
          accessibilityLabel="Close image viewer"
        >
          <Ionicons name="close" size={28} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: '#000',
  },
  scrollContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTopLeft: {
    position: 'absolute',
    left: SPACING.lg,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minWidth: 44,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnTopRight: {
    position: 'absolute',
    right: SPACING.lg,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minWidth: 44,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
