import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PlatformColor, StyleSheet, Text } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import {
  AdaptiveGroupedScreen,
  AdaptiveGroupedSection,
} from '../ui/adaptive-grouped-list.ios';
import { AdaptiveSheet } from '../ui/adaptive-sheet.ios';

jest.mock('react-native', () => ({
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

jest.mock('@expo/ui/community/bottom-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement('BottomSheet', props, children),
    BottomSheetView: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

jest.mock('../ui/adaptive-action-surface', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptiveActionSurface: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

const BottomSheetHost =
  'BottomSheet' as unknown as React.ComponentType<unknown>;

describe('iOS semantic UI contract', () => {
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
        leadingAction={{ label: 'Cancel', onPress: onCancel }}
        onClose={onCancel}
        sizing='content'
        testID='semantic-sheet'
        title='New Category'
        trailingAction={{ label: 'Add', onPress: onSave }}
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
    expect(screen.getByTestId('adaptive-sheet-glass-header')).toBeTruthy();
    expect(screen.getByTestId('semantic-sheet')).toHaveStyle({
      backgroundColor: 'platform:systemGroupedBackgroundColor',
    });

    fireEvent.press(screen.getByLabelText('Cancel'));
    fireEvent.press(screen.getByLabelText('Add'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('gives grouped screens and sections native semantic surfaces', () => {
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
    expect(screen.getByTestId('grouped-section')).toHaveStyle({
      backgroundColor: 'platform:secondarySystemGroupedBackgroundColor',
    });
    expect(StyleSheet.hairlineWidth).toBe(1);
  });
});
