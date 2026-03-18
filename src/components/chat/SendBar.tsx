import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';

interface SendBarProps {
  onSend: (body: string) => void;
}

export function SendBar({ onSend }: SendBarProps) {
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0;

  function handleSend() {
    if (!canSend) return;
    const body = text.trim();
    setText('');
    onSend(body);
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Message..."
        placeholderTextColor={COLORS.textSecondary}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        multiline={false}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.7}
        accessibilityLabel="Send message"
      >
        <Ionicons
          name="send"
          size={24}
          color={canSend ? COLORS.accent : COLORS.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.secondary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
});
