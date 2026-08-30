import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  AccessibilityInfo,
  PlatformColor,
  StyleSheet,
  Text,
} from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import {
  AdaptiveGroupedScreen,
  AdaptiveGroupedSection,
} from '../ui/adaptive-grouped-list.ios';
import { AdaptiveCardSurface } from '../ui/adaptive-card-surface.ios';
import { AdaptiveCardSurface as FallbackAdaptiveCardSurface } from '../ui/adaptive-card-surface';
import { AdaptiveSheet } from '../ui/adaptive-sheet.ios';
import {
  TransparencyPreferenceProvider,
  useResolvedTransparencyPreference,
} from '../ui/transparency-preference.ios';

jest.mock('react-native', () => ({
  AccessibilityInfo: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
  },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: 'Modal',
  PlatformColor: jest.fn((name: string) => `platform:${name}`),
  SafeAreaView: 'SafeAreaView',
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown): Record<string, unknown> | undefined => {
      if (!style) {
        return undefined;
      }
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(Boolean));
      }
      return style as Record<string, unknown>;
    },
    hairlineWidth: 1,
  },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));

jest.mock('@expo/ui/community/bottom-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement('BottomSheet', props, children),
    BottomSheetView: ({ children, ...props }: any) =>
      React.createElement('BottomSheetView', props, children),
  };
});

jest.mock('@expo/ui/swift-ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Button: ({ label, onPress, ...props }: any) =>
      React.createElement(
        'SwiftUIButton',
        {
          accessible: true,
          accessibilityLabel: label,
          accessibilityRole: 'button',
          onPress,
          ...props,
        },
        label,
      ),
    Host: ({ children, ...props }: any) =>
      React.createElement('SwiftUIHost', props, children),
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  accessibilityLabel: (label: string) => ({
    modifier: 'accessibilityLabel',
    label,
  }),
  buttonBorderShape: (shape: string) => ({
    modifier: 'buttonBorderShape',
    shape,
  }),
  buttonStyle: (style: string) => ({ modifier: 'buttonStyle', style }),
  controlSize: (size: string) => ({ modifier: 'controlSize', size }),
  disabled: (value: boolean) => ({ modifier: 'disabled', value }),
  tint: (color: string) => ({ color, modifier: 'tint' }),
}));

jest.mock('../ui/adaptive-action-surface', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptiveActionSurface: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

const BottomSheetHost =
  'BottomSheet' as unknown as React.ComponentType<unknown>;
const BottomSheetViewHost =
  'BottomSheetView' as unknown as React.ComponentType<unknown>;
const BlurViewHost = 'BlurView' as unknown as React.ComponentType<unknown>;
const SwiftUIButtonHost =
  'SwiftUIButton' as unknown as React.ComponentType<unknown>;

const TransparencyPreferenceProbe = () => {
  const preference = useResolvedTransparencyPreference();
  return <Text testID='transparency-preference'>{String(preference)}</Text>;
};

describe('iOS semantic UI contract', () => {
  it('keeps adapter-only card variants off the native fallback view', () => {
    const screen = render(
      <FallbackAdaptiveCardSurface testID='fallback-section' variant='section'>
        <Text>Row</Text>
      </FallbackAdaptiveCardSurface>,
    );

    const section = screen.getByTestId('fallback-section');
    expect(section).not.toHaveProp('variant');
    expect(section).toHaveStyle({ borderRadius: 14 });
  });

  it('maps UI roles to adaptive iOS system colors', () => {
    expect(semanticColors.background).toBe(
      'platform:systemGroupedBackgroundColor',
    );
    expect(semanticColors.surface).toBe(
      'platform:secondarySystemGroupedBackgroundColor',
    );
    expect(semanticColors.text).toBe('platform:labelColor');
    expect(semanticColors.textMuted).toBe('platform:secondaryLabelColor');
    expect(semanticColors.separator).toBe('platform:separatorColor');
    expect(semanticColors.primary).toBe('platform:systemBlueColor');
    expect(semanticColors.destructive).toBe('platform:systemRedColor');

    expect(PlatformColor).toHaveBeenCalledWith('systemRedColor');
  });

  it('presents transient tasks as a native draggable bottom sheet with glass navigation actions', () => {
    const onCancel = jest.fn();
    const onSave = jest.fn();
    const screen = render(
      <AdaptiveSheet
        leadingAction={{
          label: 'Cancel',
          onPress: onCancel,
          variant: 'plain',
        }}
        onClose={onCancel}
        sizing='content'
        testID='semantic-sheet'
        title='New Category'
        trailingAction={{
          label: 'Add',
          onPress: onSave,
          variant: 'prominent',
        }}
        visible
      >
        <Text>Sheet body</Text>
      </AdaptiveSheet>,
    );

    expect(screen.UNSAFE_getByType(BottomSheetHost)).toHaveProp('index', 0);
    expect(screen.UNSAFE_getByType(BottomSheetHost)).toHaveProp(
      'enableDynamicSizing',
      true,
    );
    expect(screen.UNSAFE_getByType(BottomSheetHost)).toHaveProp(
      'enablePanDownToClose',
      true,
    );
    expect(screen.getByTestId('adaptive-sheet-header')).toBeTruthy();
    expect(screen.getAllByTestId('adaptive-sheet-glass-action')).toHaveLength(
      2,
    );
    const [cancelAction, addAction] =
      screen.UNSAFE_getAllByType(SwiftUIButtonHost);
    expect(cancelAction).toHaveProp(
      'modifiers',
      expect.arrayContaining([
        expect.objectContaining({ modifier: 'buttonStyle', style: 'glass' }),
      ]),
    );
    expect(addAction).toHaveProp(
      'modifiers',
      expect.arrayContaining([
        expect.objectContaining({
          modifier: 'buttonStyle',
          style: 'glassProminent',
        }),
      ]),
    );
    expect(screen.getByTestId('semantic-sheet')).toHaveStyle({
      backgroundColor: 'transparent',
    });

    fireEvent.press(screen.getByLabelText('Cancel'));
    fireEvent.press(screen.getByLabelText('Add'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('fills the native snap point before laying out a resizable selection list', () => {
    const screen = render(
      <AdaptiveSheet
        onClose={jest.fn()}
        sizing='resizable'
        title='Select Category'
        visible
      >
        <Text>Food &amp; Dining</Text>
      </AdaptiveSheet>,
    );

    const host = screen.UNSAFE_getByType(BottomSheetViewHost);
    expect(StyleSheet.flatten(host.props.style)).toEqual(
      expect.objectContaining({ flex: 1 }),
    );
  });

  it('leaves one continuous native system sheet surface to SwiftUI', () => {
    const screen = render(
      <AdaptiveSheet
        onClose={jest.fn()}
        sizing='content'
        surface='system'
        testID='glass-sheet'
        title='Period'
        visible
      >
        <Text>Year and month</Text>
      </AdaptiveSheet>,
    );

    const host = screen.UNSAFE_getByType(BottomSheetViewHost);
    expect(screen.UNSAFE_getByType(BottomSheetHost)).not.toHaveProp(
      'backgroundStyle',
    );
    expect(StyleSheet.flatten(host.props.style)).toEqual(
      expect.objectContaining({ backgroundColor: 'transparent' }),
    );
    expect(screen.getByTestId('glass-sheet')).toHaveStyle({
      backgroundColor: 'transparent',
    });
  });

  it('gives grouped screens and sections native semantic grouping', () => {
    const screen = render(
      <AdaptiveGroupedScreen testID='grouped-screen'>
        <AdaptiveGroupedSection testID='grouped-section'>
          <Text>Row</Text>
        </AdaptiveGroupedSection>
      </AdaptiveGroupedScreen>,
    );

    expect(screen.getByTestId('grouped-screen')).toHaveStyle({
      backgroundColor: 'platform:systemGroupedBackgroundColor',
    });
    expect(screen.getByTestId('grouped-section')).toBeTruthy();
    expect(screen.getByTestId('grouped-section')).toHaveStyle({
      borderRadius: 14,
    });
    expect(screen.getByTestId('grouped-section-material')).toHaveStyle({
      borderRadius: 14,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('grouped-section').props.style),
    ).not.toHaveProperty('boxShadow');
    expect(StyleSheet.hairlineWidth).toBe(1);
  });

  it('maps standalone card roles to system material instead of Liquid Glass', async () => {
    const screen = render(
      <TransparencyPreferenceProvider reduceTransparency={false}>
        <AdaptiveCardSurface interactive testID='shared-card' tone='shared'>
          <Text>Shared card</Text>
        </AdaptiveCardSurface>
      </TransparencyPreferenceProvider>,
    );

    await waitFor(() => {
      expect(screen.UNSAFE_getByType(BlurViewHost)).toHaveProp(
        'tint',
        'systemMaterial',
      );
    });
    expect(screen.UNSAFE_getByType(BlurViewHost)).toHaveProp('intensity', 100);
    expect(screen.getByTestId('shared-card')).toHaveStyle({
      borderColor: 'platform:separatorColor',
      borderRadius: 20,
      borderWidth: 1,
    });
    expect(screen.getByTestId('shared-card-material')).toHaveStyle({
      borderRadius: 20,
      overflow: 'hidden',
    });
  });

  it('uses a semantic solid Card fallback when Reduce Transparency is enabled', async () => {
    const screen = render(
      <TransparencyPreferenceProvider reduceTransparency>
        <AdaptiveCardSurface testID='accessible-card'>
          <Text>Accessible card</Text>
        </AdaptiveCardSurface>
      </TransparencyPreferenceProvider>,
    );

    expect(screen.UNSAFE_queryByType(BlurViewHost)).toBeNull();
    expect(screen.getByTestId('accessible-card-material')).toHaveStyle({
      backgroundColor: 'platform:secondarySystemGroupedBackgroundColor',
    });
  });

  it('resolves Reduce Transparency once for a shared app-level provider', async () => {
    const screen = render(<TransparencyPreferenceProbe />);

    expect(screen.getByTestId('transparency-preference')).toHaveTextContent(
      'null',
    );
    await waitFor(() =>
      expect(screen.getByTestId('transparency-preference')).toHaveTextContent(
        'false',
      ),
    );
    expect(AccessibilityInfo.isReduceTransparencyEnabled).toHaveBeenCalledTimes(
      1,
    );
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledTimes(1);
  });
});
