import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';

import { mobileTheme } from '../theme/tokens';
import { buildCreateExpenseRoute } from '../navigation/expense-edit-route';
import { AdaptiveActionSurface } from './ui/adaptive-action-surface';
import { AdaptiveAddIcon } from './ui/adaptive-add-icon';
import { useAdaptivePressFeedback } from './ui/use-adaptive-press-feedback';
import { useFloatingActionOffset } from './ui/use-floating-action-offset';

interface FloatingActionButtonProps {
  accessibilityLabel?: string;
  onPress?: () => void; // Custom press action
  style?: ViewStyle;
  groupId?: string; // Optional groupId to pass to AddExpense screen
  nativeTabsContentInsetApplied?: boolean;
  surfaceTestID?: string;
  testID?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  accessibilityLabel = 'Add expense',
  onPress,
  style,
  groupId,
  nativeTabsContentInsetApplied = false,
  surfaceTestID = 'add-expense-surface',
  testID = 'add-expense-fab',
}) => {
  const bottomOffset = useFloatingActionOffset({
    nativeTabsContentInsetApplied,
  });
  const { onPressIn, onPressOut, surfaceStyle, triggerFeedback } =
    useAdaptivePressFeedback();

  const handlePress = () => {
    triggerFeedback();
    if (onPress) {
      onPress();
    } else {
      router.push(buildCreateExpenseRoute({ groupId }));
    }
  };

  return (
    <AdaptiveActionSurface
      interactive
      tone='neutral'
      style={[styles.surface, { bottom: bottomOffset }, style, surfaceStyle]}
      testID={surfaceTestID}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole='button'
        android_ripple={{ color: 'rgba(10, 102, 217, 0.16)' }}
        hitSlop={mobileTheme.spacing.sm}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.fab}
        testID={testID}
      >
        <AdaptiveAddIcon />
      </Pressable>
    </AdaptiveActionSurface>
  );
};

const styles = StyleSheet.create({
  surface: {
    position: 'absolute',
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: mobileTheme.radii.pill,
  },
  fab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FloatingActionButton;
