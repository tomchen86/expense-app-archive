import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { InsightPeriod } from '../../hooks/useInsightsData';
import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';
import { AdaptiveGroupedSection } from '../ui/adaptive-grouped-list';
import { AdaptivePopover } from '../ui/adaptive-popover';
import type { DatePickerModalProps } from './date-picker-modal.types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  aggregation,
  selectedYear,
  selectedMonth,
  onSelectPeriod,
  availablePeriods,
}) => {
  const availableYears = useMemo(
    () =>
      [...new Set(availablePeriods.map((period) => period.year))].sort(
        (left, right) => right - left,
      ),
    [availablePeriods],
  );
  const [browsingYear, setBrowsingYear] = useState(selectedYear);
  const activeYear = availableYears.includes(browsingYear)
    ? browsingYear
    : (availableYears[0] ?? selectedYear);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setBrowsingYear(
      availableYears.includes(selectedYear)
        ? selectedYear
        : (availableYears[0] ?? selectedYear),
    );
  }, [availableYears, selectedYear, visible]);

  const selectablePeriods = useMemo(() => {
    if (aggregation === 'month') {
      return availablePeriods
        .filter((period) => period.year === activeYear)
        .sort((left, right) => right.month - left.month);
    }

    const periodByYear = new Map<number, InsightPeriod>();
    availablePeriods.forEach((period) => {
      periodByYear.set(period.year, period);
    });
    return [...periodByYear.values()].sort(
      (left, right) => right.year - left.year,
    );
  }, [activeYear, aggregation, availablePeriods]);

  const handlePeriodSelect = (period: InsightPeriod) => {
    onSelectPeriod(period);
    onClose();
  };

  return (
    <AdaptivePopover
      onClose={onClose}
      testID='period-popover'
      title={aggregation === 'month' ? 'Select Month' : 'Select Year'}
      visible={visible && availablePeriods.length > 1}
    >
      <View style={styles.content}>
        {aggregation === 'month' && availableYears.length > 1 ? (
          <View style={styles.yearPicker}>
            <Text style={styles.sectionLabel}>YEAR</Text>
            <ScrollView
              contentContainerStyle={styles.yearOptions}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {availableYears.map((year) => {
                const selected = year === activeYear;
                return (
                  <TouchableOpacity
                    accessibilityLabel={`Year ${year}`}
                    accessibilityRole='button'
                    accessibilityState={{ selected }}
                    key={year}
                    onPress={() => setBrowsingYear(year)}
                    style={[styles.yearOption, selected && styles.selectedYear]}
                  >
                    <Text
                      style={[
                        styles.yearOptionText,
                        selected && styles.selectedYearText,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>
            {aggregation === 'month' ? 'MONTH' : 'YEAR'}
          </Text>
          {aggregation === 'month' ? (
            <Text style={styles.contextLabel}>{activeYear}</Text>
          ) : null}
        </View>
        <AdaptiveGroupedSection>
          <ScrollView style={styles.periodList}>
            {selectablePeriods.map((period, index) => {
              const selected =
                period.year === selectedYear &&
                (aggregation === 'year' || period.month === selectedMonth);
              const label =
                aggregation === 'month'
                  ? MONTH_NAMES[period.month]
                  : period.year.toString();
              return (
                <TouchableOpacity
                  accessibilityLabel={period.label}
                  accessibilityRole='button'
                  accessibilityState={{ selected }}
                  key={period.key}
                  onPress={() => handlePeriodSelect(period)}
                  style={[
                    styles.periodRow,
                    index < selectablePeriods.length - 1 && styles.separator,
                    selected && styles.selectedPeriod,
                  ]}
                >
                  <Text style={styles.periodLabel}>{label}</Text>
                  {selected ? (
                    <Ionicons
                      accessibilityElementsHidden
                      color={semanticColors.primary}
                      importantForAccessibility='no-hide-descendants'
                      name='checkmark'
                      size={20}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </AdaptiveGroupedSection>
      </View>
    </AdaptivePopover>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: mobileTheme.spacing.lg,
  },
  yearPicker: {
    marginBottom: mobileTheme.spacing.lg,
  },
  sectionLabel: {
    color: semanticColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  yearOptions: {
    gap: mobileTheme.spacing.sm,
    paddingTop: mobileTheme.spacing.sm,
  },
  yearOption: {
    alignItems: 'center',
    borderColor: semanticColors.separator,
    borderRadius: mobileTheme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: mobileTheme.spacing.md,
  },
  selectedYear: {
    backgroundColor: semanticColors.fill,
    borderColor: semanticColors.primary,
  },
  yearOptionText: {
    color: semanticColors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  selectedYearText: {
    color: semanticColors.primary,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.sm,
  },
  contextLabel: {
    color: semanticColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  periodList: {
    maxHeight: 320,
  },
  periodRow: {
    alignItems: 'center',
    backgroundColor: semanticColors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  separator: {
    borderBottomColor: semanticColors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedPeriod: {
    backgroundColor: semanticColors.fill,
  },
  periodLabel: {
    color: semanticColors.text,
    fontSize: 17,
  },
});

export default DatePickerModal;
