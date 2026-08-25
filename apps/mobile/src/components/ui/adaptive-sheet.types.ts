import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface AdaptiveSheetAction {
  accessibilityLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface AdaptiveSheetProps {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  leadingAction?: AdaptiveSheetAction;
  onClose: () => void;
  sizing?: 'content' | 'resizable';
  testID?: string;
  title: string;
  trailingAction?: AdaptiveSheetAction;
  visible: boolean;
}
