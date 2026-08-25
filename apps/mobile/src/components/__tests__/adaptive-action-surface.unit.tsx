import React from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

import { AdaptiveActionSurface } from '../ui/adaptive-action-surface.ios';
import { AdaptiveActionSurface as AdaptiveActionSurfaceAndroid } from '../ui/adaptive-action-surface.android';

jest.mock('react-native', () => ({
  AccessibilityInfo: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    isReduceTransparencyEnabled: jest.fn(),
  },
  Platform: { OS: 'ios' },
  DynamicColorIOS: (colors: { dark: string; light: string }) => colors,
  PlatformColor: (name: string) => `platform:${name}`,
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown): Record<string, unknown> | undefined => {
      if (!style) {
        return undefined;
      }
      if (Array.isArray(style)) {
        return Object.assign(
          {},
          ...style
            .map((entry) =>
              entry && Array.isArray(entry)
                ? Object.assign({}, ...entry)
                : entry,
            )
            .filter(Boolean),
        );
      }
      return style as Record<string, unknown>;
    },
  },
  Text: 'Text',
  useColorScheme: () => 'light',
  View: 'View',
}));

jest.mock(
  'expo-glass-effect',
  () => {
    const React = jest.requireActual<typeof import('react')>('react');
    return {
      GlassView: jest.fn(({ children }: { children?: React.ReactNode }) =>
        React.createElement('View', { testID: 'mock-glass-view' }, children),
      ),
      isGlassEffectAPIAvailable: jest.fn(),
      isLiquidGlassAvailable: jest.fn(),
    };
  },
  { virtual: true },
);

const glassEffectMock = jest.requireMock('expo-glass-effect') as {
  GlassView: jest.Mock;
  isGlassEffectAPIAvailable: jest.Mock<boolean, []>;
  isLiquidGlassAvailable: jest.Mock<boolean, []>;
};

const reduceTransparencyMock =
  AccessibilityInfo.isReduceTransparencyEnabled as jest.MockedFunction<
    typeof AccessibilityInfo.isReduceTransparencyEnabled
  >;

describe('AdaptiveActionSurface', () => {
  beforeEach(() => {
    glassEffectMock.GlassView.mockClear();
    glassEffectMock.isGlassEffectAPIAvailable.mockReset().mockReturnValue(true);
    glassEffectMock.isLiquidGlassAvailable.mockReset().mockReturnValue(true);
    reduceTransparencyMock.mockReset().mockResolvedValue(false);
  });

  it.each([
    { apiAvailable: false, liquidGlassAvailable: true },
    { apiAvailable: true, liquidGlassAvailable: false },
  ])(
    'uses the fallback when glass capability is unavailable',
    ({ apiAvailable, liquidGlassAvailable }) => {
      glassEffectMock.isGlassEffectAPIAvailable.mockReturnValue(apiAvailable);
      glassEffectMock.isLiquidGlassAvailable.mockReturnValue(
        liquidGlassAvailable,
      );
      reduceTransparencyMock.mockReturnValue(new Promise(() => {}));

      const screen = render(
        <AdaptiveActionSurface testID='action-surface'>
          <Text>Action</Text>
        </AdaptiveActionSurface>,
      );

      expect(screen.getByTestId('action-surface')).toBeTruthy();
      expect(screen.getByText('Action')).toBeTruthy();
      expect(glassEffectMock.GlassView).not.toHaveBeenCalled();
    },
  );

  it('keeps the fallback while Reduce Transparency is unresolved', () => {
    reduceTransparencyMock.mockReturnValue(new Promise(() => {}));

    const screen = render(
      <AdaptiveActionSurface testID='action-surface'>
        <Text>Action</Text>
      </AdaptiveActionSurface>,
    );

    expect(screen.getByTestId('action-surface')).toBeTruthy();
    expect(screen.getByText('Action')).toBeTruthy();
    expect(glassEffectMock.GlassView).not.toHaveBeenCalled();
  });

  it('honors Reduce Transparency and forwards fallback props and children', async () => {
    reduceTransparencyMock.mockResolvedValue(true);

    const screen = render(
      <AdaptiveActionSurface
        testID='action-surface'
        accessibilityLabel='Adaptive action'
        style={{ marginTop: 12 }}
      >
        <Text>Action</Text>
      </AdaptiveActionSurface>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const fallback = screen.getByTestId('action-surface');
    expect(fallback.props.accessibilityLabel).toBe('Adaptive action');
    expect(fallback).toHaveStyle({ marginTop: 12 });
    expect(screen.getByText('Action')).toBeTruthy();
    expect(glassEffectMock.GlassView).not.toHaveBeenCalled();
  });

  it('uses GlassView only after every capability passes and forwards its props and children', async () => {
    const screen = render(
      <AdaptiveActionSurface
        testID='action-surface'
        accessibilityLabel='Adaptive action'
        style={{ marginTop: 12 }}
      >
        <Text>Action</Text>
      </AdaptiveActionSurface>,
    );

    expect(glassEffectMock.isGlassEffectAPIAvailable).toHaveBeenCalled();
    expect(glassEffectMock.isLiquidGlassAvailable).toHaveBeenCalled();
    expect(reduceTransparencyMock).toHaveBeenCalled();

    await waitFor(() => {
      expect(glassEffectMock.GlassView).toHaveBeenCalledTimes(1);
    });

    const glassProps = glassEffectMock.GlassView.mock.calls[0][0];
    expect(glassProps).toEqual(
      expect.objectContaining({
        testID: 'action-surface',
        accessibilityLabel: 'Adaptive action',
      }),
    );
    expect(StyleSheet.flatten(glassProps.style)).toEqual(
      expect.objectContaining({ marginTop: 12 }),
    );
    expect(StyleSheet.flatten(glassProps.style)).not.toHaveProperty(
      'borderWidth',
    );
    expect(screen.getByTestId('mock-glass-view')).toBeTruthy();
    expect(screen.getByText('Action')).toBeTruthy();
  });

  it('keeps primary iOS glass neutral with only a subtle blue tint', async () => {
    render(
      <AdaptiveActionSurface interactive tone='primary'>
        <Text>Primary action</Text>
      </AdaptiveActionSurface>,
    );

    await waitFor(() => {
      expect(glassEffectMock.GlassView).toHaveBeenCalledTimes(1);
    });

    expect(glassEffectMock.GlassView.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        isInteractive: true,
        tintColor: 'rgba(0, 122, 255, 0.10)',
      }),
    );
  });

  it('uses a Material tonal surface on Android without importing glass semantics into the caller', () => {
    const screen = render(
      <AdaptiveActionSurfaceAndroid
        accessibilityLabel='Adaptive action'
        interactive
        style={{ marginTop: 12 }}
        testID='android-action-surface'
        tone='primary'
      >
        <Text>Action</Text>
      </AdaptiveActionSurfaceAndroid>,
    );

    const surface = screen.getByTestId('android-action-surface');
    expect(surface.props.accessibilityLabel).toBe('Adaptive action');
    expect(StyleSheet.flatten(surface.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: '#DCEBFF',
        elevation: 6,
        marginTop: 12,
      }),
    );
    expect(screen.getByText('Action')).toBeTruthy();
    expect(glassEffectMock.GlassView).not.toHaveBeenCalled();
  });
});
