import React from 'react';
import { render, within } from '@testing-library/react-native';

import TabLayout from '../../../app/(tabs)/_layout';

jest.mock('react-native', () => ({
  StyleSheet: {
    flatten: (style: unknown) => style,
  },
  Text: 'Text',
  View: 'View',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const LegacyScreen = ({ name }: { name: string }) =>
    React.createElement('View', {
      testID: 'legacy-tab-screen',
      routeName: name,
    });
  const LegacyTabs = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('View', { testID: 'legacy-tabs' }, children);

  LegacyTabs.Screen = LegacyScreen;

  return { Tabs: LegacyTabs };
});

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Label = ({ children }: { children?: string }) =>
    React.createElement('Text', { testID: 'native-tab-label' }, children);
  const Icon = (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'native-tab-icon' });
  const Trigger = ({
    children,
    name,
    ...props
  }: {
    children?: React.ReactNode;
    name: string;
  }) =>
    React.createElement(
      'View',
      {
        ...props,
        testID: 'native-tab-trigger',
        routeName: name,
      },
      children,
    );

  Trigger.Label = Label;
  Trigger.Icon = Icon;

  const NativeTabs = ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement('View', { ...props, testID: 'native-tabs' }, children);

  NativeTabs.Trigger = Trigger;

  return { NativeTabs };
});

describe('TabLayout', () => {
  it('uses native tabs with the existing route order and platform-native labels and icons', () => {
    const screen = render(<TabLayout />);

    expect(screen.queryByTestId('legacy-tabs')).toBeNull();

    const nativeTabs = screen.getByTestId('native-tabs');
    const triggers = screen.getAllByTestId('native-tab-trigger');

    expect(triggers.map((trigger) => trigger.props.routeName)).toEqual([
      'history',
      'index',
      'settings',
    ]);
    expect(
      triggers.map(
        (trigger) =>
          within(trigger).getByTestId('native-tab-label').props.children,
      ),
    ).toEqual(['Groups', 'Expenses', 'Settings']);
    expect(
      triggers.map(
        (trigger) => trigger.props.unstable_nativeProps.tabBarItemTestID,
      ),
    ).toEqual(['tab-groups', 'tab-expenses', 'tab-settings']);

    const icons = triggers.map(
      (trigger) => within(trigger).getByTestId('native-tab-icon').props,
    );
    expect(icons).toEqual([
      expect.objectContaining({
        sf: { default: 'person.3', selected: 'person.3.fill' },
        md: 'groups',
      }),
      expect.objectContaining({
        sf: { default: 'creditcard', selected: 'creditcard.fill' },
        md: 'payments',
      }),
      expect.objectContaining({
        sf: { default: 'gearshape', selected: 'gearshape.fill' },
        md: 'settings',
      }),
    ]);

    expect(nativeTabs.props.backBehavior).toBe('initialRoute');
    expect(nativeTabs.props.backgroundColor).toBeUndefined();
  });
});
