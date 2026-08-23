import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { mobileTheme } from '../../theme/tokens';

export interface PeriodAggregationControlProps {
  aggregation: 'month' | 'year';
  onChange: (aggregation: 'month' | 'year') => void;
}

const OPTIONS = [
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
] as const;

const PeriodAggregationControlFallback = ({
  aggregation,
  onChange,
}: PeriodAggregationControlProps) => (
  <View
    accessibilityLabel='Period aggregation'
    accessibilityRole='radiogroup'
    style={styles.container}
    testID='period-aggregation-segmented-control'
  >
    {OPTIONS.map((option) => {
      const selected = aggregation === option.value;
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
    alignSelf: 'center',
    backgroundColor: mobileTheme.colors.surfaceVariant,
    borderRadius: mobileTheme.radii.control,
    flexDirection: 'row',
    marginBottom: mobileTheme.spacing.md,
    padding: 2,
  },
  segment: {
    alignItems: 'center',
    borderRadius: mobileTheme.radii.control - 2,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  selectedSegment: {
    backgroundColor: mobileTheme.colors.surface,
    ...mobileTheme.shadows.card,
  },
  label: {
    color: mobileTheme.colors.textMuted,
    fontWeight: '600',
  },
  selectedLabel: {
    color: mobileTheme.colors.primary,
  },
});

export default PeriodAggregationControlFallback;
