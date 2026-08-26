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
import { AdaptiveGroupedSection } from '../ui/adaptive-grouped-list';
import { AdaptiveSheet } from '../ui/adaptive-sheet';
import type { DatePickerModalProps } from './date-picker-modal.types';
import { resolvePeriodPickerPresentation } from './period-picker-policy';

const DatePickerModal = ({
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
        leadingAction={{ label: 'Cancel', onPress: onClose }}
        onClose={onClose}
        sizing='content'
        testID='period-picker-sheet'
        title='Period'
        trailingAction={{
          disabled: !draftPeriodKey,
          label: 'Done',
          onPress: handleDone,
        }}
        visible={visible}
      >
        <View style={styles.wheelSurface}>
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
        </View>
      </AdaptiveSheet>
    );
  }

  return (
    <AdaptiveSheet
      contentStyle={styles.listSheetContent}
      leadingAction={{ label: 'Close', onPress: onClose }}
      onClose={onClose}
      sizing='resizable'
      testID='period-picker-sheet'
      title='Period'
      visible={visible}
    >
      <Text style={styles.sectionLabel}>AVAILABLE PERIODS</Text>
      <AdaptiveGroupedSection>
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
      </AdaptiveGroupedSection>
    </AdaptiveSheet>
  );
};

const styles = StyleSheet.create({
  wheelSheetContent: {
    paddingBottom: mobileTheme.spacing.lg,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  wheelSurface: {
    backgroundColor: semanticColors.surface,
    borderCurve: 'continuous',
    borderRadius: mobileTheme.radii.card,
    overflow: 'hidden',
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
