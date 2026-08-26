import { Host, Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { StyleSheet } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import type { PeriodPickerControlProps } from './period-picker-control.types';
import { resolvePeriodPickerPresentation } from './period-picker-policy';
import PeriodPickerTrigger from './period-picker-trigger';

const PeriodPickerControl = ({
  aggregation,
  availablePeriods,
  displayPeriodText,
  onOpen,
  onSelectPeriod,
  selectedPeriodKey,
}: PeriodPickerControlProps) => {
  const presentation = resolvePeriodPickerPresentation(availablePeriods.length);

  if (
    aggregation === 'month' ||
    presentation !== 'menu' ||
    !selectedPeriodKey
  ) {
    return (
      <PeriodPickerTrigger
        displayPeriodText={displayPeriodText}
        onOpen={onOpen}
      />
    );
  }

  return (
    <Host
      ignoreSafeArea='all'
      seedColor={semanticColors.primary}
      style={styles.host}
      useViewportSizeMeasurement
    >
      <Picker
        label='Period'
        modifiers={[pickerStyle('menu'), labelsHidden()]}
        onSelectionChange={(periodKey) => {
          const period = availablePeriods.find(
            (candidate) => candidate.key === periodKey,
          );
          if (period) {
            onSelectPeriod(period);
          }
        }}
        selection={selectedPeriodKey}
        testID='native-period-menu'
      >
        {availablePeriods.map((period) => (
          <SwiftUIText
            key={period.key}
            modifiers={[tag(period.key)]}
            testID={`native-period-option-${period.key}`}
          >
            {period.label}
          </SwiftUIText>
        ))}
      </Picker>
    </Host>
  );
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    height: 44,
    width: '100%',
  },
});

export default PeriodPickerControl;
