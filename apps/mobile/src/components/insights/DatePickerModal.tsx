import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';
import { AdaptiveGroupedSection } from '../ui/adaptive-grouped-list';
import { AdaptiveSheet } from '../ui/adaptive-sheet';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  aggregation: 'month' | 'year';
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  availableYears: number[];
  monthNames: string[];
  currentYear: number;
  currentMonth: number;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  aggregation,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  availableYears,
  monthNames,
  currentYear,
  currentMonth,
}) => {
  return (
    <AdaptiveSheet
      onClose={onClose}
      title='Select Period'
      trailingAction={{ label: 'Done', onPress: onClose }}
      visible={visible}
    >
      <View style={styles.content}>
        {aggregation === 'month' ? (
          <View style={styles.field}>
            <Text style={styles.sectionLabel}>MONTH</Text>
            <AdaptiveGroupedSection>
              <Picker
                accessibilityLabel='Month'
                itemStyle={styles.pickerItem}
                onValueChange={onMonthChange}
                selectedValue={selectedMonth}
                style={styles.picker}
              >
                {monthNames.map((monthName, index) => (
                  <Picker.Item
                    enabled={
                      selectedYear < currentYear || index <= currentMonth
                    }
                    key={monthName}
                    label={monthName}
                    value={index}
                  />
                ))}
              </Picker>
            </AdaptiveGroupedSection>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>YEAR</Text>
          <AdaptiveGroupedSection>
            <Picker
              accessibilityLabel='Year'
              itemStyle={styles.pickerItem}
              onValueChange={onYearChange}
              selectedValue={selectedYear}
              style={styles.picker}
            >
              {availableYears.map((year) => (
                <Picker.Item key={year} label={year.toString()} value={year} />
              ))}
            </Picker>
          </AdaptiveGroupedSection>
        </View>
      </View>
    </AdaptiveSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingTop: mobileTheme.spacing.xl,
  },
  field: {
    marginBottom: mobileTheme.spacing.xl,
  },
  sectionLabel: {
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.lg,
    color: semanticColors.textMuted,
    fontSize: 13,
  },
  picker: {
    height: 150,
    color: semanticColors.text,
  },
  pickerItem: {
    color: semanticColors.text,
    fontSize: 16,
    height: 150,
  },
});

export default DatePickerModal;
