import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { InsightChartPreference } from '../../utils/calculations/insightCalculations';
import { mobileTheme } from '../../theme/tokens';

interface ChartPreferenceControlProps {
  preference: InsightChartPreference;
  onChange: (preference: InsightChartPreference) => void;
}

const OPTIONS: ReadonlyArray<{
  label: string;
  value: InsightChartPreference;
}> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Donut', value: 'donut' },
  { label: 'Bar', value: 'bar' },
];

const ChartPreferenceControl: React.FC<ChartPreferenceControlProps> = ({
  preference,
  onChange,
}) => (
  <View
    accessibilityLabel='Visualization'
    accessibilityRole='radiogroup'
    style={styles.container}
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
          style={[styles.option, selected && styles.selectedOption]}
          testID={`insights-chart-${option.value}`}
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
    alignSelf: 'flex-end',
    backgroundColor: mobileTheme.colors.surfaceVariant,
    borderRadius: mobileTheme.radii.control,
    flexDirection: 'row',
    marginBottom: mobileTheme.spacing.md,
    padding: 2,
  },
  option: {
    alignItems: 'center',
    borderRadius: mobileTheme.radii.control - 2,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: mobileTheme.spacing.md,
  },
  selectedOption: {
    backgroundColor: mobileTheme.colors.surface,
    ...mobileTheme.shadows.card,
  },
  label: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedLabel: {
    color: mobileTheme.colors.primary,
  },
});

export default ChartPreferenceControl;
