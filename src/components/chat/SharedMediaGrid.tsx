// Shared-media grid for the chat info screens. Renders a 3-column thumbnail
// grid of every image in the chat; tapping a thumbnail opens the existing
// full-screen ImageViewerModal (same component the chat thread uses).

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { ImageViewerModal } from '@/components/chat/ImageViewerModal';
import type { ChatMediaItem } from '@/hooks/useChatMedia';

interface SharedMediaGridProps {
  media: ChatMediaItem[];
}

const COLUMNS = 3;
const GAP = SPACING.xs;

export function SharedMediaGrid({ media }: SharedMediaGridProps) {
  const { colors } = useTheme();
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [rowWidth, setRowWidth] = useState(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: GAP,
        },
        tile: {
          borderRadius: RADII.sm,
          overflow: 'hidden',
          backgroundColor: colors.surface.card,
        },
        image: {
          width: '100%',
          height: '100%',
        },
        empty: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          paddingVertical: SPACING.lg,
          textAlign: 'center',
        },
      }),
    [colors]
  );

  if (media.length === 0) {
    return <Text style={styles.empty}>No shared media yet</Text>;
  }

  const tileSize = rowWidth > 0 ? (rowWidth - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  return (
    <View style={styles.grid} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      {tileSize > 0 &&
        media.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.tile, { width: tileSize, height: tileSize }]}
            onPress={() => setViewerUrl(item.imageUrl)}
            accessibilityRole="imagebutton"
            accessibilityLabel="Open shared photo"
          >
            <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
          </Pressable>
        ))}

      <ImageViewerModal
        visible={viewerUrl !== null}
        imageUrl={viewerUrl}
        onClose={() => setViewerUrl(null)}
      />
    </View>
  );
}
