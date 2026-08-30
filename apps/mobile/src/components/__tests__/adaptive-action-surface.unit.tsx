import React from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import { AdaptiveActionSurface } from '../ui/adaptive-action-surface.ios';
import { AdaptiveActionSurface as AdaptiveActionSurfaceAndroid } from '../ui/adaptive-action-surface.android';
import { TransparencyPreferenceProvider } from '../ui/transparency-preference.ios';

let mockColorScheme: 'dark' | 'light' = 'light';

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
  useColorScheme: () => mockColorScheme,
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

const renderIOSSurface = (
  surface: React.ReactElement,
  reduceTransparency = false,
) =>
  render(
    <TransparencyPreferenceProvider reduceTransparency={reduceTransparency}>
      {surface}
    </TransparencyPreferenceProvider>,
  );

describe('AdaptiveActionSurface', () => {
  beforeEach(() => {
    mockColorScheme = 'light';
    glassEffectMock.GlassView.mockClear();
    glassEffectMock.isGlassEffectAPIAvailable.mockReset().mockReturnValue(true);
    glassEffectMock.isLiquidGlassAvailable.mockReset().mockReturnValue(true);
    (
      AccessibilityInfo.isReduceTransparencyEnabled as jest.MockedFunction<
        typeof AccessibilityInfo.isReduceTransparencyEnabled
      >
    ).mockReset();
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
      const screen = renderIOSSurface(
        <AdaptiveActionSurface testID='action-surface'>
          <Text>Action</Text>
        </AdaptiveActionSurface>,
      );

      expect(screen.getByTestId('action-surface')).toBeTruthy();
      expect(screen.getByText('Action')).toBeTruthy();
      expect(glassEffectMock.GlassView).not.toHaveBeenCalled();
    },
  );

  it('uses the shared resolved preference without a per-control accessibility query', () => {
    const screen = renderIOSSurface(
      <AdaptiveActionSurface testID='action-surface'>
        <Text>Action</Text>
      </AdaptiveActionSurface>,
    );

    expect(screen.getByTestId('mock-glass-view')).toBeTruthy();
    expect(screen.getByText('Action')).toBeTruthy();
    expect(
      AccessibilityInfo.isReduceTransparencyEnabled,
    ).not.toHaveBeenCalled();
  });

  it('honors Reduce Transparency and forwards fallback props and children', async () => {
    const screen = renderIOSSurface(
      <AdaptiveActionSurface
        testID='action-surface'
        accessibilityLabel='Adaptive action'
        style={{ marginTop: 12 }}
      >
        <Text>Action</Text>
      </AdaptiveActionSurface>,
      true,
    );

    const fallback = screen.getByTestId('action-surface');
    expect(fallback.props.accessibilityLabel).toBe('Adaptive action');
    expect(fallback).toHaveStyle({ marginTop: 12 });
    expect(screen.getByText('Action')).toBeTruthy();
    expect(glassEffectMock.GlassView).not.toHaveBeenCalled();
  });

  it('uses GlassView only after every capability passes and forwards its props and children', async () => {
    const screen = renderIOSSurface(
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
    expect(
      AccessibilityInfo.isReduceTransparencyEnabled,
    ).not.toHaveBeenCalled();

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
    renderIOSSurface(
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

  it('gives grouped iOS glass a field-matching grey tint in Dark Mode', async () => {
    mockColorScheme = 'dark';

    renderIOSSurface(
      <AdaptiveActionSurface tone='grouped'>
        <Text>Grouped control</Text>
      </AdaptiveActionSurface>,
    );

    await waitFor(() => {
      expect(glassEffectMock.GlassView).toHaveBeenCalledTimes(1);
    });

    expect(glassEffectMock.GlassView.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        tintColor: 'rgba(44, 44, 46, 0.64)',
      }),
    );
  });

  it('keeps the moving selection thumb visible in Light Mode', async () => {
    renderIOSSurface(
      <AdaptiveActionSurface tone='selection'>
        <Text>Selection</Text>
      </AdaptiveActionSurface>,
    );

    await waitFor(() => {
      expect(glassEffectMock.GlassView).toHaveBeenCalledTimes(1);
    });

    expect(glassEffectMock.GlassView.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        tintColor: 'rgba(120, 120, 128, 0.18)',
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
