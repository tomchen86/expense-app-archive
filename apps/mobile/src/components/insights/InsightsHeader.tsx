import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  PanResponder,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { mobileTheme } from '../../theme/tokens';
import { AdaptiveActionSurface } from '../ui/adaptive-action-surface';
import PeriodAggregationControl from './period-aggregation-control';

const SWIPE_CAPTURE_DISTANCE = 12;
const SWIPE_COMMIT_DISTANCE = 44;
const HORIZONTAL_INTENT_RATIO = 1.35;

const isHorizontalPeriodSwipe = (dx: number, dy: number): boolean =>
  Math.abs(dx) >= SWIPE_CAPTURE_DISTANCE &&
  Math.abs(dx) > Math.abs(dy) * HORIZONTAL_INTENT_RATIO;

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
  const periodPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          isHorizontalPeriodSwipe(gestureState.dx, gestureState.dy),
        onPanResponderRelease: (_event, gestureState) => {
          if (
            Math.abs(gestureState.dx) < SWIPE_COMMIT_DISTANCE ||
            !isHorizontalPeriodSwipe(gestureState.dx, gestureState.dy)
          ) {
            return;
          }
          if (gestureState.dx > 0) {
            onPreviousPeriod();
          } else if (!isNextDisabled) {
            onNextPeriod();
          }
        },
      }),
    [isNextDisabled, onNextPeriod, onPreviousPeriod],
  );

  return (
    <View style={styles.controlsContainer}>
      <PeriodAggregationControl
        aggregation={aggregation}
        onChange={onAggregationChange}
      />

      <View
        {...periodPanResponder.panHandlers}
        style={styles.periodNavigatorContainer}
        testID='period-navigator'
      >
        <AdaptiveActionSurface
          interactive
          style={styles.periodArrowSurface}
          testID='previous-period-surface'
        >
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityLabel='Previous period'
            accessibilityRole='button'
            onPress={onPreviousPeriod}
            style={[styles.periodArrowButton]}
            testID='previous-period-button'
          >
            <Ionicons
              color={mobileTheme.colors.primary}
              name='chevron-back'
              size={21}
            />
          </TouchableOpacity>
        </AdaptiveActionSurface>
        <AdaptiveActionSurface
          interactive
          style={styles.periodPickerSurface}
          testID='period-picker-surface'
        >
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityLabel={`Choose period. ${displayPeriodText}`}
            accessibilityHint='Opens the month and year picker'
            accessibilityRole='button'
            onPress={onPeriodPress}
            style={styles.periodButton}
            testID='period-picker-button'
          >
            <View style={styles.periodPickerContent}>
              <Text
                ellipsizeMode='tail'
                numberOfLines={1}
                style={styles.periodDisplayText}
              >
                {displayPeriodText}
              </Text>
              <Ionicons
                color={mobileTheme.colors.textMuted}
                name='chevron-down'
                size={14}
                testID='period-picker-chevron'
              />
            </View>
          </TouchableOpacity>
        </AdaptiveActionSurface>
        <AdaptiveActionSurface
          interactive
          style={[
            styles.periodArrowSurface,
            isNextDisabled && styles.disabledArrowButton,
          ]}
          testID='next-period-surface'
        >
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityLabel='Next period'
            accessibilityRole='button'
            accessibilityState={{ disabled: isNextDisabled }}
            disabled={isNextDisabled}
            onPress={onNextPeriod}
            style={[styles.periodArrowButton]}
            testID='next-period-button'
          >
            <Ionicons
              color={
                isNextDisabled
                  ? mobileTheme.colors.textMuted
                  : mobileTheme.colors.primary
              }
              name='chevron-forward'
              size={21}
            />
          </TouchableOpacity>
        </AdaptiveActionSurface>
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing.sm,
    justifyContent: 'center',
    marginTop: mobileTheme.spacing.sm,
  },
  periodArrowButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  periodArrowSurface: {
    alignItems: 'center',
    borderRadius: 22,
    boxShadow: '0 2px 8px rgba(32, 55, 88, 0.08)',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  disabledArrowButton: {
    opacity: 0.28,
  },
  periodButton: {
    alignItems: 'center',
    flex: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 0,
  },
  periodPickerSurface: {
    borderRadius: mobileTheme.radii.pill,
    boxShadow: '0 2px 8px rgba(32, 55, 88, 0.08)',
    flex: 1,
    height: 44,
    justifyContent: 'center',
    width: '100%',
  },
  periodPickerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  periodDisplayText: {
    color: mobileTheme.colors.text,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '600',
    marginRight: mobileTheme.spacing.xs,
    textAlign: 'center',
  },
});

export default InsightsHeader;
