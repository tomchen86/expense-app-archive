import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import FloatingActionButton from '../FloatingActionButton';

const mockUseFloatingActionOffset = jest.fn((_options?: unknown) => 16);

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    Pressable: ({ children, ...props }: any) =>
      React.createElement('View', { accessible: true, ...props }, children),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => {
        if (!Array.isArray(style)) {
          return style;
        }

        return Object.assign({}, ...style.flat().filter(Boolean));
      },
    },
    Text: ({ children, ...props }: any) =>
      React.createElement('Text', props, children),
  };
});

jest.mock('../ui/adaptive-action-surface', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    AdaptiveActionSurface: ({ children, testID }: any) =>
      React.createElement('View', { testID }, children),
  };
});

jest.mock('../ui/use-floating-action-offset', () => ({
  useFloatingActionOffset: (options: unknown) =>
    mockUseFloatingActionOffset(options),
}));

describe('FloatingActionButton native surface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes an accessible action inside the adaptive platform surface', () => {
    const screen = render(<FloatingActionButton />);

    expect(screen.getByTestId('add-expense-surface')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeTruthy();
  });

  it('preserves group-aware navigation', () => {
    const screen = render(<FloatingActionButton groupId='group-123' />);

    fireEvent.press(screen.getByRole('button', { name: 'Add expense' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/add-expense',
      params: { groupId: 'group-123' },
    });
  });

  it('passes the NativeTabs inset context to the platform offset adapter', () => {
    render(<FloatingActionButton nativeTabsContentInsetApplied />);

    expect(mockUseFloatingActionOffset).toHaveBeenCalledWith({
      nativeTabsContentInsetApplied: true,
    });
  });
});
