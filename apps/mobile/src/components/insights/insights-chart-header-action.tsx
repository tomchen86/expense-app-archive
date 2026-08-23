import React from 'react';
import { Stack } from 'expo-router';

import InsightsChartMenu from './insights-chart-menu';
import type { InsightsChartMenuProps } from './insights-chart-menu.types';

const InsightsChartHeaderAction = (props: InsightsChartMenuProps) => (
  <Stack.Toolbar placement='right'>
    <InsightsChartMenu {...props} />
  </Stack.Toolbar>
);

export default InsightsChartHeaderAction;
