// Cross-platform action sheet (D-05). iOS uses native ActionSheetIOS;
// Android uses Alert with cancellable buttons. No new npm dependency.
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ActionSheetItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function showActionSheet(title: string, items: ActionSheetItem[]): void {
  if (Platform.OS === 'ios') {
    const labels = [...items.map((i) => i.label), 'Cancel'];
    const cancelButtonIndex = labels.length - 1;
    const destructiveIdx = items.findIndex((i) => i.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: labels,
        cancelButtonIndex,
        destructiveButtonIndex: destructiveIdx === -1 ? undefined : destructiveIdx,
      },
      (idx) => {
        if (idx !== cancelButtonIndex && items[idx]) items[idx].onPress();
      }
    );
  } else {
    Alert.alert(
      title,
      undefined,
      [
        ...items.map((i) => ({
          text: i.label,
          style: (i.destructive ? 'destructive' : 'default') as 'destructive' | 'default',
          onPress: i.onPress,
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true }
    );
  }
}
