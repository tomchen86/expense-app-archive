import { Ionicons } from '@expo/vector-icons';
import { Host, Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import { mobileTheme } from '../../theme/tokens';
import { AdaptiveSheet } from '../ui/adaptive-sheet';
import { AdaptiveSheetSection } from '../ui/adaptive-sheet-section';
import type { DatePickerModalProps } from './date-picker-modal.types';
import { resolvePeriodPickerPresentation } from './period-picker-policy';

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

const MonthPeriodPickerSheet = ({
  availablePeriods,
  onClose,
  onSelectPeriod,
  selectedPeriodKey,
  visible,
}: DatePickerModalProps) => {
  const selectedPeriod =
    availablePeriods.find((period) => period.key === selectedPeriodKey) ??
    availablePeriods.at(-1) ??
    null;
  const [draftPeriodKey, setDraftPeriodKey] = useState<string | null>(
    selectedPeriod?.key ?? null,
  );

  useEffect(() => {
    if (visible) {
      setDraftPeriodKey(selectedPeriod?.key ?? null);
    }
  }, [selectedPeriod?.key, visible]);

  const draftPeriod =
    availablePeriods.find((period) => period.key === draftPeriodKey) ??
    selectedPeriod;
  const availableYears = useMemo(
    () =>
      [...new Set(availablePeriods.map((period) => period.year))].sort(
        (left, right) => right - left,
      ),
    [availablePeriods],
  );
  const activeYear =
    draftPeriod?.year ?? availableYears[0] ?? selectedPeriod?.year ?? null;
  const availableMonths = useMemo(
    () =>
      availablePeriods
        .filter((period) => period.year === activeYear)
        .sort((left, right) => left.month - right.month),
    [activeYear, availablePeriods],
  );

  const handleYearSelection = (year: number) => {
    const periodsInYear = availablePeriods
      .filter((period) => period.year === year)
      .sort((left, right) => left.month - right.month);
    const nextPeriod =
      periodsInYear.find((period) => period.month === draftPeriod?.month) ??
      periodsInYear.at(-1);
    if (nextPeriod) {
      setDraftPeriodKey(nextPeriod.key);
    }
  };

  const handleDone = () => {
    const period = availablePeriods.find(
      (candidate) => candidate.key === draftPeriodKey,
    );
    if (!period) {
      return;
    }
    onSelectPeriod(period);
    onClose();
  };

  return (
    <AdaptiveSheet
      contentStyle={styles.hierarchicalSheetContent}
      leadingAction={{
        label: 'Cancel',
        onPress: onClose,
        variant: 'plain',
      }}
      onClose={onClose}
      sizing='content'
      surface='system'
      testID='period-picker-sheet'
      title='Period'
      trailingAction={{
        disabled: !draftPeriodKey,
        label: 'Done',
        onPress: handleDone,
        variant: 'prominent',
      }}
      visible={visible && availablePeriods.length > 1}
    >
      <AdaptiveSheetSection
        style={styles.selectionGroup}
        testID='period-picker-sheet-rows'
      >
        <View style={[styles.selectionRow, styles.separator]}>
          <Text style={styles.selectionLabel}>Year</Text>
          <Host
            ignoreSafeArea='all'
            seedColor={semanticColors.primary}
            style={styles.menuHost}
            useViewportSizeMeasurement
          >
            <Picker
              label='Year'
              modifiers={[pickerStyle('menu'), labelsHidden()]}
              onSelectionChange={handleYearSelection}
              selection={activeYear}
              testID='native-period-year-menu'
            >
              {availableYears.map((year) => (
                <SwiftUIText
                  key={year}
                  modifiers={[tag(year)]}
                  testID={`native-year-option-${year}`}
                >
                  {year}
                </SwiftUIText>
              ))}
            </Picker>
          </Host>
        </View>
        <View style={styles.selectionRow}>
          <Text style={styles.selectionLabel}>Month</Text>
          <Host
            ignoreSafeArea='all'
            seedColor={semanticColors.primary}
            style={styles.menuHost}
            useViewportSizeMeasurement
          >
            <Picker
              label='Month'
              modifiers={[pickerStyle('menu'), labelsHidden()]}
              onSelectionChange={(periodKey) => {
                if (
                  availableMonths.some((period) => period.key === periodKey)
                ) {
                  setDraftPeriodKey(periodKey);
                }
              }}
              selection={draftPeriodKey}
              testID='native-period-month-menu'
            >
              {availableMonths.map((period) => (
                <SwiftUIText
                  key={period.key}
                  modifiers={[tag(period.key)]}
                  testID={`native-month-option-${period.key}`}
                >
                  {MONTH_NAMES[period.month]}
                </SwiftUIText>
              ))}
            </Picker>
          </Host>
        </View>
      </AdaptiveSheetSection>
    </AdaptiveSheet>
  );
};

const YearPeriodPickerSheet = ({
  availablePeriods,
  onClose,
  onSelectPeriod,
  selectedPeriodKey,
  visible,
}: DatePickerModalProps) => {
  const presentation = resolvePeriodPickerPresentation(availablePeriods.length);
  const initialKey =
    selectedPeriodKey &&
    availablePeriods.some((period) => period.key === selectedPeriodKey)
      ? selectedPeriodKey
      : (availablePeriods.at(-1)?.key ?? null);
  const [draftPeriodKey, setDraftPeriodKey] = useState<string | null>(
    initialKey,
  );

  useEffect(() => {
    if (visible) {
      setDraftPeriodKey(initialKey);
    }
  }, [initialKey, visible]);

  const descendingPeriods = useMemo(
    () => [...availablePeriods].reverse(),
    [availablePeriods],
  );

  if (presentation === 'static' || presentation === 'menu') {
    return null;
  }

  if (presentation === 'wheel') {
    const handleDone = () => {
      const period = availablePeriods.find(
        (candidate) => candidate.key === draftPeriodKey,
      );
      if (!period) {
        return;
      }
      onSelectPeriod(period);
      onClose();
    };

    return (
      <AdaptiveSheet
        contentStyle={styles.wheelSheetContent}
        leadingAction={{
          label: 'Cancel',
          onPress: onClose,
          variant: 'plain',
        }}
        onClose={onClose}
        sizing='content'
        surface='system'
        testID='period-picker-sheet'
        title='Period'
        trailingAction={{
          disabled: !draftPeriodKey,
          label: 'Done',
          onPress: handleDone,
          variant: 'prominent',
        }}
        visible={visible}
      >
        <AdaptiveSheetSection
          style={styles.wheelSurface}
          testID='period-picker-sheet-wheel'
        >
          <Host
            ignoreSafeArea='all'
            seedColor={semanticColors.primary}
            style={styles.wheelHost}
            useViewportSizeMeasurement
          >
            <Picker
              label='Period'
              modifiers={[pickerStyle('wheel'), labelsHidden()]}
              onSelectionChange={(periodKey) => {
                if (
                  availablePeriods.some((period) => period.key === periodKey)
                ) {
                  setDraftPeriodKey(periodKey);
                }
              }}
              selection={draftPeriodKey}
              testID='native-period-wheel'
            >
              {availablePeriods.map((period) => (
                <SwiftUIText key={period.key} modifiers={[tag(period.key)]}>
                  {period.label}
                </SwiftUIText>
              ))}
            </Picker>
          </Host>
        </AdaptiveSheetSection>
      </AdaptiveSheet>
    );
  }

  return (
    <AdaptiveSheet
      contentStyle={styles.listSheetContent}
      leadingAction={{
        label: 'Close',
        onPress: onClose,
        variant: 'plain',
      }}
      onClose={onClose}
      sizing='resizable'
      surface='system'
      testID='period-picker-sheet'
      title='Period'
      visible={visible}
    >
      <Text style={styles.sectionLabel}>AVAILABLE PERIODS</Text>
      <AdaptiveSheetSection
        style={styles.listSurface}
        testID='period-picker-sheet-list'
      >
        <ScrollView>
          {descendingPeriods.map((period, index) => {
            const selected = period.key === selectedPeriodKey;
            return (
              <TouchableOpacity
                accessibilityLabel={period.label}
                accessibilityRole='button'
                accessibilityState={{ selected }}
                key={period.key}
                onPress={() => {
                  onSelectPeriod(period);
                  onClose();
                }}
                style={[
                  styles.periodRow,
                  index < descendingPeriods.length - 1 && styles.separator,
                  selected && styles.selectedPeriod,
                ]}
              >
                <Text style={styles.periodLabel}>{period.label}</Text>
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
      </AdaptiveSheetSection>
    </AdaptiveSheet>
  );
};

const DatePickerModal = (props: DatePickerModalProps) =>
  props.aggregation === 'month' ? (
    <MonthPeriodPickerSheet {...props} />
  ) : (
    <YearPeriodPickerSheet {...props} />
  );

const styles = StyleSheet.create({
  hierarchicalSheetContent: {
    paddingBottom: mobileTheme.spacing.lg,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  selectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 54,
    paddingLeft: mobileTheme.spacing.lg,
  },
  selectionGroup: {
    borderCurve: 'continuous',
    borderRadius: mobileTheme.radii.control,
  },
  selectionLabel: {
    color: semanticColors.text,
    flex: 1,
    fontSize: 17,
  },
  menuHost: {
    height: 44,
    width: 160,
  },
  wheelSheetContent: {
    paddingBottom: mobileTheme.spacing.lg,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  wheelSurface: {
    borderCurve: 'continuous',
    borderRadius: mobileTheme.radii.card,
  },
  wheelHost: {
    height: 216,
    width: '100%',
  },
  listSheetContent: {
    flex: 1,
    paddingBottom: mobileTheme.spacing.lg,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  sectionLabel: {
    color: semanticColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.md,
  },
  listSurface: {
    borderCurve: 'continuous',
    borderRadius: mobileTheme.radii.control,
    flex: 1,
  },
  periodRow: {
    alignItems: 'center',
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
