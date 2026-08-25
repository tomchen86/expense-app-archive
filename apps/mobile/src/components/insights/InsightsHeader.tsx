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

const SWIPE_CAPTURE_DISTANCE = 12;
const SWIPE_COMMIT_DISTANCE = 44;
const HORIZONTAL_INTENT_RATIO = 1.35;
const MAX_DRAG_DISTANCE = 52;
const PERIOD_EXIT_DISTANCE = 72;

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
      if (direction === 'next' && isNextDisabled) {
        resetPeriodDrag();
        return;
      }

      const exitDistance =
        direction === 'previous' ? PERIOD_EXIT_DISTANCE : -PERIOD_EXIT_DISTANCE;
      Animated.timing(periodDragX, {
        duration: 120,
        toValue: exitDistance,
        useNativeDriver: true,
      }).start(() => {
        if (direction === 'previous') {
          onPreviousPeriod();
        } else {
          onNextPeriod();
        }

        periodDragX.setValue(-exitDistance * 0.55);
        Animated.timing(periodDragX, {
          duration: 180,
          toValue: 0,
          useNativeDriver: true,
        }).start();
      });
    },
    [
      isNextDisabled,
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
          if (
            Math.abs(gestureState.dx) < SWIPE_COMMIT_DISTANCE ||
            !isHorizontalPeriodSwipe(gestureState.dx, gestureState.dy)
          ) {
            resetPeriodDrag();
            return;
          }
          if (gestureState.dx > 0) {
            animatePeriodChange('previous');
          } else {
            animatePeriodChange('next');
          }
        },
        onPanResponderTerminate: resetPeriodDrag,
      }),
    [animatePeriodChange, periodDragX, resetPeriodDrag],
  );

  return (
    <View style={styles.controlsContainer}>
      <PeriodAggregationControl
        aggregation={aggregation}
        onChange={onAggregationChange}
      />

      <View style={styles.periodNavigatorContainer} testID='period-navigator'>
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
              accessibilityHint='Opens the month and year picker'
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
