import React from 'react';
import { render } from '@testing-library/react-native';

import RootLayout from '../../../app/_layout';

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    flatten: (style: unknown) => style,
  },
  View: 'View',
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}));

jest.mock('react-native-reanimated', () => ({}));

jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('../../store/hydration', () => ({
  useMobileStoresHydrated: () => true,
}));

jest.mock('../../components/feedback/expense-deletion-provider', () => ({
  ExpenseDeletionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Screen = (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'root-stack-screen' });
  const Stack = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('View', { ...props, testID: 'root-stack' }, children);

  Stack.Screen = Screen;

  return { Stack };
});

describe('RootLayout', () => {
  it('keeps route-group implementation names out of native back buttons', () => {
    const screen = render(<RootLayout />);

    expect(screen.getByTestId('root-stack').props.screenOptions).toEqual(
      expect.objectContaining({
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitle: 'Back',
      }),
    );
  });

  it('presents expense creation as a native modal task', () => {
    const screen = render(<RootLayout />);
    const addExpenseRoute = screen
      .getAllByTestId('root-stack-screen')
      .find((route) => route.props.name === 'add-expense');

    expect(addExpenseRoute).toBeDefined();
    expect(addExpenseRoute?.props.options).toEqual(
      expect.objectContaining({
        headerBackVisible: false,
        presentation: 'modal',
        title: 'New Expense',
      }),
    );
  });

  it('keeps Insights as a root native stack destination with the compact title', () => {
    const screen = render(<RootLayout />);
    const insights = screen
      .getAllByTestId('root-stack-screen')
      .find((route) => route.props.name === 'insights');

    expect(insights).toBeTruthy();
    expect(insights?.props.options).toEqual({ title: 'Insights' });
  });
});
