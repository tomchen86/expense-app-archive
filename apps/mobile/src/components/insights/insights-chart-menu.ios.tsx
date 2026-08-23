import React from 'react';
import { Stack } from 'expo-router';

import type { InsightsChartMenuProps } from './insights-chart-menu.types';

const OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: 'Donut', value: 'donut' },
  { label: 'Bar', value: 'bar' },
] as const;

const InsightsChartMenu = ({
  preference,
  onChange,
}: InsightsChartMenuProps) => (
  <Stack.Toolbar.Menu
    accessibilityHint='Choose how spending categories are visualized'
    accessibilityLabel='Chart visualization'
    icon='chart.bar.xaxis'
    title='Visualization'
  >
    {OPTIONS.map((option) => (
      <Stack.Toolbar.MenuAction
        isOn={preference === option.value}
        key={option.value}
        onPress={() => onChange(option.value)}
      >
        {option.label}
      </Stack.Toolbar.MenuAction>
    ))}
  </Stack.Toolbar.Menu>
);

export default InsightsChartMenu;
