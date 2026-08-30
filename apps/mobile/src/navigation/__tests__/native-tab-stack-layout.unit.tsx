import React from 'react';
import { render } from '@testing-library/react-native';

import ExpensesStackLayout from '../../../app/(tabs)/index/_layout';
import GroupsStackLayout from '../../../app/(tabs)/history/_layout';
import SettingsStackLayout from '../../../app/(tabs)/settings/_layout';

jest.mock('react-native', () => ({
  StyleSheet: {
    flatten: (style: unknown) => style,
  },
  View: 'View',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Screen = (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'stack-screen' });
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('View', { testID: 'native-stack' }, children);

  Stack.Screen = Screen;

  return { Stack };
});

describe('native tab stack layouts', () => {
  it.each([
    ['Expenses', ExpensesStackLayout],
    ['Groups', GroupsStackLayout],
    ['Settings', SettingsStackLayout],
  ])(
    'configures the %s tab root with a collapsible native title',
    (title, Layout) => {
      const screen = render(<Layout />);
      const route = screen
        .getAllByTestId('stack-screen')
        .find((candidate) => candidate.props.name === 'index');

      expect(screen.getByTestId('native-stack')).toBeTruthy();
      expect(route).toBeDefined();
      expect(route?.props.options).toEqual(
        expect.objectContaining({
          headerLargeTitleEnabled: true,
          title,
        }),
      );
      expect(route?.props.options.header).toBeUndefined();
      expect(route?.props.options.headerShown).not.toBe(false);
    },
  );

  it('keeps Archived Groups inside the Settings stack', () => {
    const screen = render(<SettingsStackLayout />);
    const route = screen
      .getAllByTestId('stack-screen')
      .find((candidate) => candidate.props.name === 'archived-groups');

    expect(route?.props.options).toEqual({ title: 'Archived Groups' });
  });

  it('keeps category management inside the Settings stack', () => {
    const screen = render(<SettingsStackLayout />);
    const route = screen
      .getAllByTestId('stack-screen')
      .find((candidate) => candidate.props.name === 'manage-categories');

    expect(route?.props.options).toEqual({ title: 'Manage Categories' });
  });
});
