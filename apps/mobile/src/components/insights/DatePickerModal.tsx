import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors';
import type { InsightPeriod } from '../../hooks/useInsightsData';
import SelectionModal from '../SelectionModal';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  aggregation: 'month' | 'year';
  selectedYear: number;
  selectedMonth: number;
  onSelectPeriod: (period: InsightPeriod) => void;
  availablePeriods: InsightPeriod[];
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  aggregation,
  selectedYear,
  selectedMonth,
  onSelectPeriod,
  availablePeriods,
}) => (
  <SelectionModal
    data={[...availablePeriods].reverse()}
    isSelected={(period) =>
      period.year === selectedYear &&
      (aggregation === 'year' || period.month === selectedMonth)
    }
    keyExtractor={(period) => period.key}
    onClose={onClose}
    onSelect={onSelectPeriod}
    renderItemContent={(period) => (
      <Text style={styles.periodLabel}>{period.label}</Text>
    )}
    title={aggregation === 'month' ? 'Select Month' : 'Select Year'}
    visible={visible && availablePeriods.length > 1}
  />
);

const styles = StyleSheet.create({
  periodLabel: {
    color: semanticColors.text,
    fontSize: 17,
  },
});

export default DatePickerModal;
