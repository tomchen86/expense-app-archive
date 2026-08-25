import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { mobileTheme } from '../../theme/tokens';
import type { ThemePreference } from '../../types';

export interface AppearanceModeControlProps {
  onChange: (preference: ThemePreference) => void;
  preference: ThemePreference;
}

const OPTIONS: ReadonlyArray<{
  label: string;
  value: ThemePreference;
}> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const AppearanceModeControlFallback = ({
  onChange,
  preference,
}: AppearanceModeControlProps) => (
  <View
    accessibilityLabel='Appearance'
    accessibilityRole='radiogroup'
    style={styles.container}
    testID='appearance-mode-control'
  >
    {OPTIONS.map((option) => {
      const selected = preference === option.value;
      return (
        <TouchableOpacity
          accessibilityLabel={option.label}
          accessibilityRole='radio'
          accessibilityState={{ selected }}
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.segment, selected && styles.selectedSegment]}
        >
          <Text style={[styles.label, selected && styles.selectedLabel]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileTheme.colors.surfaceVariant,
    borderRadius: mobileTheme.radii.control,
    flexDirection: 'row',
    padding: 2,
    width: '100%',
  },
  segment: {
    alignItems: 'center',
    borderRadius: mobileTheme.radii.control - 2,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: mobileTheme.spacing.sm,
  },
  selectedSegment: {
    backgroundColor: mobileTheme.colors.surface,
    ...mobileTheme.shadows.card,
  },
  label: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  selectedLabel: {
    color: mobileTheme.colors.primary,
  },
});

export default AppearanceModeControlFallback;
