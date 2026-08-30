import React from 'react';
import { act, render, renderHook } from '@testing-library/react-native';

import { AdaptiveAddIcon } from '../ui/adaptive-add-icon.ios';
import { useAdaptivePressFeedback } from '../ui/use-adaptive-press-feedback.ios';

const mockImpactAsync = jest.fn((_style?: unknown) => Promise.resolve());

jest.mock('react-native', () => ({
  PlatformColor: (name: string) => `platform:${name}`,
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown) => style,
  },
  Text: 'Text',
}));

jest.mock(
  'expo-symbols',
  () => {
    const React = jest.requireActual<typeof import('react')>('react');
    return {
      SymbolView: (props: Record<string, unknown>) =>
        React.createElement('SymbolView', {
          ...props,
          testID: 'native-add-icon',
        }),
    };
  },
  { virtual: true },
);

jest.mock(
  'expo-haptics',
  () => ({
    ImpactFeedbackStyle: { Light: 'light' },
    impactAsync: (style: unknown) => mockImpactAsync(style),
  }),
  { virtual: true },
);

describe('iOS adaptive add action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a native label-colored SF Symbol instead of a blue text glyph', () => {
    const screen = render(<AdaptiveAddIcon />);

    expect(
      screen.getByTestId('native-add-icon', { includeHiddenElements: true })
        .props,
    ).toEqual(
      expect.objectContaining({
        name: 'plus',
        tintColor: 'platform:labelColor',
        weight: 'medium',
      }),
    );
  });

  it('scales to 0.96 while pressed and emits light feedback on activation', () => {
    const { result } = renderHook(() => useAdaptivePressFeedback());

    expect(result.current.surfaceStyle).toBeUndefined();
    act(() => result.current.onPressIn?.());
    expect(result.current.surfaceStyle).toEqual({
      transform: [{ scale: 0.96 }],
    });
    act(() => result.current.onPressOut?.());
    expect(result.current.surfaceStyle).toBeUndefined();

    act(() => result.current.triggerFeedback());
    expect(mockImpactAsync).toHaveBeenCalledWith('light');
  });
});
