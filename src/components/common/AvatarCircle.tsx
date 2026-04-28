import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE } from '@/theme';

interface AvatarCircleProps {
  size?: number;
  imageUri?: string | null;
  displayName: string;
  onPress?: () => void;
}

function getInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function AvatarCircle({ size = 80, imageUri, displayName, onPress }: AvatarCircleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    circle: {
      backgroundColor: colors.surface.card,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    initials: {
      fontSize: FONT_SIZE.xl,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.interactive.accent,
    },
  }), [colors]);

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const content = (
    <View style={[styles.circle, circleStyle]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={[styles.image, circleStyle]} resizeMode="cover" />
      ) : (
        <Text style={styles.initials}>{getInitials(displayName)}</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
