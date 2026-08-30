import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';

import { semanticColors } from '../../theme/semantic-colors';

interface AdaptiveSwipeActionProps extends Omit<
  TouchableOpacityProps,
  'children' | 'style'
> {
  label: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'destructive' | 'neutral';
}

export const AdaptiveSwipeAction = ({
  label,
  style,
  tone = 'neutral',
  ...props
}: AdaptiveSwipeActionProps) => (
  <TouchableOpacity
    {...props}
    style={[
      styles.action,
      tone === 'destructive' ? styles.destructive : styles.neutral,
      style,
    ]}
  >
    <Text
      style={[
        styles.label,
        tone === 'destructive' ? styles.destructiveLabel : styles.neutralLabel,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  action: {
    minHeight: 44,
    minWidth: 88,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destructive: {
    backgroundColor: semanticColors.destructive,
  },
  neutral: {
    backgroundColor: semanticColors.fill,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  destructiveLabel: {
    color: semanticColors.onAccent,
  },
  neutralLabel: {
    color: semanticColors.text,
  },
});
