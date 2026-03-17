import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/colors';

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

const styles = StyleSheet.create({
  circle: {
    backgroundColor: COLORS.secondary,
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
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.accent,
  },
});
