import React from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';

import { AndroidHeaderAction } from '../navigation/android-header-action';
import type { InsightsChartMenuProps } from './insights-chart-menu.types';
import type { InsightChartPreference } from '../../utils/calculations/insightCalculations';

const OPTIONS: ReadonlyArray<{
  label: string;
  value: InsightChartPreference;
}> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Donut', value: 'donut' },
  { label: 'Bar', value: 'bar' },
];

const InsightsChartHeaderAction = ({
  preference,
  onChange,
}: InsightsChartMenuProps) => (
  <Stack.Toolbar asChild placement='right'>
    <AndroidHeaderAction
      accessibilityHint='Choose how spending categories are visualized'
      accessibilityLabel={`Chart visualization, ${preference} selected`}
      icon='bar-chart'
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
      testID='insights-chart-action'
    />
  </Stack.Toolbar>
);

export default InsightsChartHeaderAction;
