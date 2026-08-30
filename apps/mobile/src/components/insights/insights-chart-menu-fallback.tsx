import React from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';

import type { InsightChartPreference } from '../../utils/calculations/insightCalculations';
import type { InsightsChartMenuProps } from './insights-chart-menu.types';

const OPTIONS: ReadonlyArray<{
  label: string;
  value: InsightChartPreference;
}> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Donut', value: 'donut' },
  { label: 'Bar', value: 'bar' },
];

const InsightsChartMenuFallback = ({
  preference,
  onChange,
}: InsightsChartMenuProps) => (
  <Stack.Toolbar.Button
    accessibilityHint='Choose how spending categories are visualized'
    accessibilityLabel={`Chart visualization, ${preference} selected`}
    onPress={() =>
      Alert.alert(
        'Chart visualization',
        undefined,
        OPTIONS.map((option) => ({
          onPress: () => onChange(option.value),
          text:
            preference === option.value
              ? `${option.label}, selected`
              : option.label,
        })),
      )
    }
  >
    Chart
  </Stack.Toolbar.Button>
);

export default InsightsChartMenuFallback;
