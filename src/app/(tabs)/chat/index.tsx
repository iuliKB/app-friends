import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';

export default function ChatIndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dominant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
