import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

import { mobileTheme } from '../../theme/tokens';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface AndroidHeaderActionProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
  color?: string;
  disabled?: boolean;
  icon: MaterialIconName;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const AndroidHeaderAction = ({
  accessibilityHint,
  accessibilityLabel,
  color = mobileTheme.colors.text,
  disabled = false,
  icon,
  onPress,
  style,
  testID,
}: AndroidHeaderActionProps) => (
  <Pressable
    accessibilityHint={accessibilityHint}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole='button'
    accessibilityState={{ disabled }}
    android_ripple={{
      borderless: true,
      color: mobileTheme.colors.primaryGlassTint,
      radius: 24,
    }}
    disabled={disabled}
    hitSlop={8}
    onPress={onPress}
    style={({ pressed }) => [
      styles.action,
      pressed && !disabled && styles.pressed,
      disabled && styles.disabled,
      style,
    ]}
    testID={testID}
  >
    <MaterialIcons
      accessibilityElementsHidden
      accessible={false}
      color={color}
      importantForAccessibility='no-hide-descendants'
      name={icon}
      size={24}
    />
  </Pressable>
);

export const AndroidHeaderActionRow = ({
  children,
}: {
  children: React.ReactNode;
}) => <View style={styles.row}>{children}</View>;

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  action: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    minWidth: 48,
    overflow: 'hidden',
  },
  pressed: {
    backgroundColor: mobileTheme.colors.surfaceVariant,
  },
  disabled: {
    opacity: 0.38,
  },
});
