import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { mobileTheme } from '../../theme/tokens';
import { AdaptiveActionSurface } from '../ui/adaptive-action-surface';
import PeriodAggregationControl from './period-aggregation-control';

const SWIPE_CAPTURE_DISTANCE = 2;
const SWIPE_COMMIT_DISTANCE = 3;
const SWIPE_FLICK_VELOCITY = 0.45;
const HORIZONTAL_INTENT_RATIO = 0.7;
const MAX_DRAG_DISTANCE = 52;
const PERIOD_ENTRY_DISTANCE = 36;

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
  hasMultiplePeriods: boolean;
  isNextDisabled: boolean;
  isPreviousDisabled: boolean;
}

const InsightsHeader: React.FC<InsightsHeaderProps> = ({
  aggregation,
  onAggregationChange,
  displayPeriodText,
  onPeriodPress,
  onPreviousPeriod,
  onNextPeriod,
  hasMultiplePeriods,
  isNextDisabled,
  isPreviousDisabled,
}) => {
  const periodDragX = useRef(new Animated.Value(0)).current;
  const periodOpacity = periodDragX.interpolate({
    inputRange: [-MAX_DRAG_DISTANCE, 0, MAX_DRAG_DISTANCE],
    outputRange: [0.62, 1, 0.62],
    extrapolate: 'clamp',
  });

  const resetPeriodDrag = useCallback(() => {
    Animated.timing(periodDragX, {
      duration: 150,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [periodDragX]);

  const animatePeriodChange = useCallback(
    (direction: 'previous' | 'next') => {
      if (
        (direction === 'previous' && isPreviousDisabled) ||
        (direction === 'next' && isNextDisabled)
      ) {
        resetPeriodDrag();
        return;
      }

      if (direction === 'previous') {
        onPreviousPeriod();
      } else {
        onNextPeriod();
      }

      periodDragX.setValue(
        direction === 'previous'
          ? -PERIOD_ENTRY_DISTANCE
          : PERIOD_ENTRY_DISTANCE,
      );
      Animated.timing(periodDragX, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
    [
      isNextDisabled,
      isPreviousDisabled,
      onNextPeriod,
      onPreviousPeriod,
      periodDragX,
      resetPeriodDrag,
    ],
  );

  const periodPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          hasMultiplePeriods &&
          isHorizontalPeriodSwipe(gestureState.dx, gestureState.dy),
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          hasMultiplePeriods &&
          isHorizontalPeriodSwipe(gestureState.dx, gestureState.dy),
        onPanResponderMove: (_event, gestureState) => {
          periodDragX.setValue(
            Math.max(
              -MAX_DRAG_DISTANCE,
              Math.min(MAX_DRAG_DISTANCE, gestureState.dx),
            ),
          );
        },
        onPanResponderRelease: (_event, gestureState) => {
          const isFlick =
            Math.abs(gestureState.vx ?? 0) >= SWIPE_FLICK_VELOCITY;
          if (Math.abs(gestureState.dx) < SWIPE_COMMIT_DISTANCE && !isFlick) {
            resetPeriodDrag();
            return;
          }
          if (gestureState.dx > 0) {
            animatePeriodChange('previous');
          } else {
            animatePeriodChange('next');
          }
        },
        onPanResponderTerminate: () => {
          resetPeriodDrag();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [animatePeriodChange, hasMultiplePeriods, periodDragX, resetPeriodDrag],
  );

  return (
    <View style={styles.controlsContainer}>
      <PeriodAggregationControl
        aggregation={aggregation}
        onChange={onAggregationChange}
      />

      <View style={styles.periodNavigatorContainer} testID='period-navigator'>
        {hasMultiplePeriods ? (
          <AdaptiveActionSurface
            interactive
            style={[
              styles.periodArrowSurface,
              isPreviousDisabled && styles.disabledArrowButton,
            ]}
            testID='previous-period-surface'
          >
            <TouchableOpacity
              activeOpacity={0.72}
              accessibilityLabel='Previous period'
              accessibilityRole='button'
              accessibilityState={{ disabled: isPreviousDisabled }}
              disabled={isPreviousDisabled}
              onPress={() => animatePeriodChange('previous')}
              style={styles.periodArrowButton}
              testID='previous-period-button'
            >
              <Ionicons
                color={
                  isPreviousDisabled
                    ? mobileTheme.colors.textMuted
                    : mobileTheme.colors.primary
                }
                name='chevron-back'
                size={21}
              />
            </TouchableOpacity>
          </AdaptiveActionSurface>
        ) : null}
        {hasMultiplePeriods ? (
          <View
            {...periodPanResponder.panHandlers}
            style={styles.periodSwipeTarget}
            testID='period-swipe-target'
          >
            <AdaptiveActionSurface
              interactive
              style={styles.periodPickerSurface}
              testID='period-picker-surface'
            >
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityLabel={`Choose period. ${displayPeriodText}`}
                accessibilityHint='Opens periods that contain expenses'
                accessibilityRole='button'
                onPress={onPeriodPress}
                style={styles.periodButton}
                testID='period-picker-button'
              >
                <Animated.View
                  style={[
                    styles.periodPickerContent,
                    {
                      opacity: periodOpacity,
                      transform: [{ translateX: periodDragX }],
                    },
                  ]}
                  testID='period-transition'
                >
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
                </Animated.View>
              </TouchableOpacity>
            </AdaptiveActionSurface>
          </View>
        ) : (
          <AdaptiveActionSurface
            style={styles.periodPickerSurface}
            testID='period-picker-surface'
          >
            <View
              accessibilityLabel={displayPeriodText}
              style={styles.periodButton}
            >
              <Animated.View
                style={[
                  styles.periodPickerContent,
                  {
                    opacity: periodOpacity,
                    transform: [{ translateX: periodDragX }],
                  },
                ]}
                testID='period-transition'
              >
                <Text
                  ellipsizeMode='tail'
                  numberOfLines={1}
                  style={styles.periodDisplayText}
                >
                  {displayPeriodText}
                </Text>
              </Animated.View>
            </View>
          </AdaptiveActionSurface>
        )}
        {hasMultiplePeriods ? (
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
              onPress={() => animatePeriodChange('next')}
              style={styles.periodArrowButton}
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
        ) : null}
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
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...mobileTheme.shadows.card,
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
  periodSwipeTarget: {
    flex: 1,
    minWidth: 0,
  },
  periodPickerSurface: {
    borderRadius: mobileTheme.radii.pill,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    width: '100%',
    ...mobileTheme.shadows.card,
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
