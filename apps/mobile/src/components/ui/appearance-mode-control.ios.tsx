import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  PanResponder,
  type PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { mobileTheme } from '../../theme/tokens';
import type { ThemePreference } from '../../types';
import { AdaptiveActionSurface } from './adaptive-action-surface';
import type { AppearanceModeControlProps } from './appearance-mode-control-fallback';

const TRACK_INSET = 4;
const OPTIONS: ReadonlyArray<{
  label: string;
  value: ThemePreference;
}> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

const getPreferenceIndex = (preference: ThemePreference) =>
  Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === preference),
  );

const AppearanceModeControl = ({
  onChange,
  preference,
}: AppearanceModeControlProps) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const selectedIndexRef = useRef(getPreferenceIndex(preference));
  const dragOriginRef = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const segmentWidth = Math.max(
    0,
    (trackWidth - TRACK_INSET * 2) / OPTIONS.length,
  );

  const getSegmentWidth = () =>
    Math.max(0, (trackWidthRef.current - TRACK_INSET * 2) / OPTIONS.length);

  const animateToIndex = (index: number) => {
    const nextSegmentWidth = getSegmentWidth();
    selectedIndexRef.current = index;
    Animated.spring(translateX, {
      damping: 22,
      mass: 0.7,
      stiffness: 260,
      toValue: nextSegmentWidth * index,
      useNativeDriver: true,
    }).start();
  };

  const selectIndex = (index: number) => {
    const nextIndex = clamp(index, 0, OPTIONS.length - 1);
    animateToIndex(nextIndex);
    const nextPreference = OPTIONS[nextIndex]?.value;
    if (nextPreference && nextPreference !== preference) {
      onChange(nextPreference);
    }
  };

  const handleDrag = (gestureState: PanResponderGestureState) => {
    const nextSegmentWidth = getSegmentWidth();
    const maximum = nextSegmentWidth * (OPTIONS.length - 1);
    translateX.setValue(
      clamp(dragOriginRef.current + gestureState.dx, 0, maximum),
    );
  };

  const finishDrag = (gestureState: PanResponderGestureState) => {
    const nextSegmentWidth = getSegmentWidth();
    if (nextSegmentWidth === 0) {
      return;
    }
    const nextPosition = clamp(
      dragOriginRef.current + gestureState.dx,
      0,
      nextSegmentWidth * (OPTIONS.length - 1),
    );
    selectIndex(Math.round(nextPosition / nextSegmentWidth));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          dragOriginRef.current = selectedIndexRef.current * getSegmentWidth();
        },
        onPanResponderMove: (_event, gestureState) => {
          handleDrag(gestureState);
        },
        onPanResponderRelease: (_event, gestureState) => {
          finishDrag(gestureState);
        },
        onPanResponderTerminate: () => {
          animateToIndex(selectedIndexRef.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // The responder reads current dimensions and selection through refs so it
    // remains stable while the glass thumb moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preference],
  );

  useEffect(() => {
    animateToIndex(getPreferenceIndex(preference));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference, trackWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    trackWidthRef.current = width;
    setTrackWidth(width);
  };

  return (
    <AdaptiveActionSurface
      interactive
      style={styles.glassSurface}
      testID='appearance-mode-glass-surface'
      tone='grouped'
    >
      <View
        accessibilityLabel='Appearance'
        accessibilityRole='radiogroup'
        onLayout={handleLayout}
        style={styles.track}
        testID='appearance-mode-drag-track'
      >
        {segmentWidth > 0 ? (
          <Animated.View
            pointerEvents='none'
            style={[
              styles.thumbFrame,
              {
                transform: [{ translateX }],
                width: segmentWidth,
              },
            ]}
          >
            <AdaptiveActionSurface
              style={styles.thumbSurface}
              testID='appearance-mode-glass-thumb'
              tone='selection'
            >
              {null}
            </AdaptiveActionSurface>
          </Animated.View>
        ) : (
          <View testID='appearance-mode-glass-thumb' />
        )}

        <View style={styles.options} testID='appearance-mode-control'>
          {OPTIONS.map((option, index) => {
            const selected = option.value === preference;
            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole='radio'
                accessibilityState={{ selected }}
                hitSlop={4}
                key={option.value}
                onPress={() => selectIndex(index)}
                style={styles.option}
              >
                <Text style={[styles.label, selected && styles.selectedLabel]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {segmentWidth > 0 ? (
          <Animated.View
            pointerEvents='box-none'
            style={[
              styles.thumbDragTarget,
              {
                transform: [{ translateX }],
                width: segmentWidth,
              },
            ]}
          >
            <View
              pointerEvents='box-only'
              style={styles.thumbDragHitArea}
              testID='appearance-mode-thumb-drag-target'
              {...panResponder.panHandlers}
            />
          </Animated.View>
        ) : null}
      </View>
    </AdaptiveActionSurface>
  );
};

const styles = StyleSheet.create({
  glassSurface: {
    borderRadius: mobileTheme.radii.pill,
    minHeight: 52,
    width: '100%',
  },
  track: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    width: '100%',
  },
  thumbFrame: {
    bottom: TRACK_INSET,
    left: TRACK_INSET,
    position: 'absolute',
    top: TRACK_INSET,
  },
  thumbSurface: {
    borderRadius: mobileTheme.radii.pill,
    flex: 1,
  },
  thumbDragTarget: {
    bottom: TRACK_INSET,
    left: TRACK_INSET,
    position: 'absolute',
    top: TRACK_INSET,
    zIndex: 2,
  },
  thumbDragHitArea: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  options: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: TRACK_INSET,
  },
  option: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: mobileTheme.spacing.sm,
  },
  label: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  selectedLabel: {
    color: mobileTheme.colors.primary,
  },
});

export default AppearanceModeControl;
