import SegmentedControl from '@expo/ui/community/segmented-control';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { mobileTheme } from '../../theme/tokens';
import type { PeriodAggregationControlProps } from './period-aggregation-control-fallback';

const VALUES = ['Month', 'Year'];

const PeriodAggregationControl = ({
  aggregation,
  onChange,
}: PeriodAggregationControlProps) => (
  <View style={styles.container} testID='period-aggregation-segmented-control'>
    <SegmentedControl
      onValueChange={(value) => {
        if (value === 'Month') {
          onChange('month');
        } else if (value === 'Year') {
          onChange('year');
        }
      }}
      selectedIndex={aggregation === 'month' ? 0 : 1}
      style={styles.control}
      testID='period-aggregation-segmented-control-native'
      tintColor={mobileTheme.colors.primaryContainer}
      values={VALUES}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginBottom: mobileTheme.spacing.md,
  },
  control: {
    minHeight: 44,
    width: 184,
  },
});

export default PeriodAggregationControl;
