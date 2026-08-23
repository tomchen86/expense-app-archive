import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';

import { mobileTheme } from '../theme/tokens';
import { AdaptiveActionSurface } from './ui/adaptive-action-surface';
import { useFloatingActionOffset } from './ui/use-floating-action-offset';

interface FloatingActionButtonProps {
  onPress?: () => void; // Custom press action
  style?: ViewStyle;
  groupId?: string; // Optional groupId to pass to AddExpense screen
  nativeTabsContentInsetApplied?: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  style,
  groupId,
  nativeTabsContentInsetApplied = false,
}) => {
  const bottomOffset = useFloatingActionOffset({
    nativeTabsContentInsetApplied,
  });

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      if (groupId) {
        router.push({
          pathname: '/add-expense',
          params: { groupId },
        });
      } else {
        router.push('/add-expense');
      }
    }
  };

  return (
    <AdaptiveActionSurface
      interactive
      tone='primary'
      style={[styles.surface, { bottom: bottomOffset }, style]}
      testID='add-expense-surface'
    >
      <Pressable
        accessibilityLabel='Add expense'
        accessibilityRole='button'
        android_ripple={{ color: 'rgba(10, 102, 217, 0.16)' }}
        hitSlop={mobileTheme.spacing.sm}
        onPress={handlePress}
        style={styles.fab}
        testID='add-expense-fab'
      >
        <Text accessibilityElementsHidden style={styles.fabText}>
          +
        </Text>
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
  fabText: {
    fontSize: 32,
    color: mobileTheme.colors.onPrimaryContainer,
    lineHeight: 34,
    fontWeight: '400',
  },
});

export default FloatingActionButton;
