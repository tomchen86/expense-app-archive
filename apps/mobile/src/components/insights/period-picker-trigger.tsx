import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';

interface PeriodPickerTriggerProps {
  displayPeriodText: string;
  onOpen: () => void;
}

const PeriodPickerTrigger = ({
  displayPeriodText,
  onOpen,
}: PeriodPickerTriggerProps) => (
  <TouchableOpacity
    activeOpacity={0.72}
    accessibilityHint='Opens periods that contain expenses'
    accessibilityLabel={`Choose period. ${displayPeriodText}`}
    accessibilityRole='button'
    onPress={onOpen}
    style={styles.button}
    testID='period-picker-button'
  >
    <View style={styles.content}>
      <Text ellipsizeMode='tail' numberOfLines={1} style={styles.label}>
        {displayPeriodText}
      </Text>
      <Ionicons
        color={semanticColors.textMuted}
        name='chevron-down'
        size={14}
        testID='period-picker-chevron'
      />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flex: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 0,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  label: {
    color: semanticColors.text,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '600',
    marginRight: mobileTheme.spacing.xs,
    textAlign: 'center',
  },
});

export default PeriodPickerTrigger;
