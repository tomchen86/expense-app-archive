import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { mobileTheme } from '../../theme/tokens';
import PeriodAggregationControl from './period-aggregation-control';

interface InsightsHeaderProps {
  aggregation: 'month' | 'year';
  onAggregationChange: (aggregation: 'month' | 'year') => void;
  displayPeriodText: string;
  onPeriodPress: () => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  isNextDisabled: boolean;
}

const InsightsHeader: React.FC<InsightsHeaderProps> = ({
  aggregation,
  onAggregationChange,
  displayPeriodText,
  onPeriodPress,
  onPreviousPeriod,
  onNextPeriod,
  isNextDisabled,
}) => {
  return (
    <View style={styles.controlsContainer}>
      <PeriodAggregationControl
        aggregation={aggregation}
        onChange={onAggregationChange}
      />

      <View style={styles.periodNavigatorContainer}>
        <TouchableOpacity
          accessibilityLabel='Previous period'
          accessibilityRole='button'
          onPress={onPreviousPeriod}
          style={styles.periodArrowButton}
          testID='previous-period-button'
        >
          <Text style={styles.periodArrowText}>{'‹'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={`Choose period. ${displayPeriodText}`}
          accessibilityHint='Opens the month and year picker'
          accessibilityRole='button'
          onPress={onPeriodPress}
          style={styles.periodButton}
          testID='period-picker-button'
        >
          <Text style={styles.periodDisplayText}>{displayPeriodText}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel='Next period'
          accessibilityRole='button'
          accessibilityState={{ disabled: isNextDisabled }}
          onPress={onNextPeriod}
          disabled={isNextDisabled}
          style={[
            styles.periodArrowButton,
            isNextDisabled && styles.disabledArrowButton,
          ]}
          testID='next-period-button'
        >
          <Text
            style={[
              styles.periodArrowText,
              isNextDisabled && styles.disabledArrowText,
            ]}
          >
            {'›'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radii.card,
    borderWidth: 1,
    marginBottom: mobileTheme.spacing.lg,
    padding: mobileTheme.spacing.md,
  },
  periodNavigatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodArrowButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  periodArrowText: {
    fontSize: 28,
    color: mobileTheme.colors.primary,
    fontWeight: 'bold',
  },
  disabledArrowButton: {
    opacity: 0.3,
  },
  disabledArrowText: {
    color: mobileTheme.colors.textMuted,
  },
  periodButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  periodDisplayText: {
    fontSize: 18,
    fontWeight: '600',
    color: mobileTheme.colors.text,
    paddingHorizontal: mobileTheme.spacing.lg,
    textAlign: 'center',
    minWidth: 150,
  },
});

export default InsightsHeader;
