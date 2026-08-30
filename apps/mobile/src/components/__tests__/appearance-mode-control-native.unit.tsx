import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import AppearanceModeControlAndroid from '../ui/appearance-mode-control.android';
import AppearanceModeControlIOS from '../ui/appearance-mode-control.ios';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };

  return {
    Animated: {
      Value: class AnimatedValue {
        value: number;

        constructor(value: number) {
          this.value = value;
        }

        setValue(value: number) {
          this.value = value;
        }
      },
      View: host('AnimatedView'),
      spring: (value: { setValue: (next: number) => void }, config: any) => ({
        start: (callback?: () => void) => {
          value.setValue(config.toValue);
          callback?.();
        },
      }),
    },
    PanResponder: {
      create: (handlers: any) => ({
        panHandlers: {
          onStartShouldSetResponder: handlers.onStartShouldSetPanResponder,
          onStartShouldSetResponderCapture:
            handlers.onStartShouldSetPanResponderCapture,
          onMoveShouldSetResponder: handlers.onMoveShouldSetPanResponder,
          onResponderGrant: handlers.onPanResponderGrant,
          onResponderMove: handlers.onPanResponderMove,
          onResponderRelease: handlers.onPanResponderRelease,
          onResponderTerminate: handlers.onPanResponderTerminate,
          onResponderTerminationRequest:
            handlers.onPanResponderTerminationRequest,
        },
      }),
    },
    Pressable: host('Pressable'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    TouchableOpacity: host('TouchableOpacity'),
    View: host('View'),
  };
});

jest.mock('@expo/ui/community/segmented-control', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../ui/adaptive-action-surface', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptiveActionSurface: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

const segmentedControlMock = jest.requireMock(
  '@expo/ui/community/segmented-control',
).default as jest.Mock;

describe('AppearanceModeControl platform adapters', () => {
  beforeEach(() => {
    segmentedControlMock.mockClear();
  });

  it('uses a draggable Liquid Glass selector on iOS', () => {
    const onChange = jest.fn();

    const screen = render(
      <AppearanceModeControlIOS onChange={onChange} preference='system' />,
    );

    expect(screen.getByTestId('appearance-mode-control')).toBeTruthy();
    expect(
      screen.getByTestId('appearance-mode-glass-surface').props.interactive,
    ).toBe(true);
    expect(screen.getByTestId('appearance-mode-glass-surface').props.tone).toBe(
      'grouped',
    );
    expect(segmentedControlMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('System').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByLabelText('Dark').props.accessibilityState).toEqual({
      selected: false,
    });

    const track = screen.getByTestId('appearance-mode-drag-track');
    act(() => {
      track.props.onLayout({ nativeEvent: { layout: { width: 300 } } });
    });
    expect(screen.getByTestId('appearance-mode-glass-thumb').props.tone).toBe(
      'selection',
    );
    const thumbTarget = screen.getByTestId('appearance-mode-thumb-drag-target');
    expect(thumbTarget.props.onStartShouldSetResponder()).toBe(true);
    expect(thumbTarget.props.onStartShouldSetResponderCapture()).toBe(true);
    expect(thumbTarget.props.onResponderTerminationRequest()).toBe(false);
    expect(track.props.onMoveShouldSetResponder).toBeUndefined();
    act(() => {
      thumbTarget.props.onResponderGrant({}, { dx: 0, dy: 0 });
      thumbTarget.props.onResponderMove({}, { dx: 80, dy: 120 });
      thumbTarget.props.onResponderRelease({}, { dx: 80, dy: 120 });
    });
    expect(onChange).toHaveBeenCalledWith('light');

    fireEvent.press(screen.getByLabelText('Dark'));
    expect(onChange).toHaveBeenCalledWith('dark');
  });

  it('keeps an accessible dependency-safe fallback on Android', () => {
    const onChange = jest.fn();

    const screen = render(
      <AppearanceModeControlAndroid onChange={onChange} preference='light' />,
    );

    expect(segmentedControlMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('System').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(screen.getByLabelText('Light').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByLabelText('Dark').props.accessibilityState).toEqual({
      selected: false,
    });

    fireEvent.press(screen.getByLabelText('System'));
    expect(onChange).toHaveBeenCalledWith('system');
  });
});
