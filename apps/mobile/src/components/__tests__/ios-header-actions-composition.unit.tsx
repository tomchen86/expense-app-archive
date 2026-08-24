import React, { type ReactNode } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import InsightsChartHeaderAction from '../insights/insights-chart-header-action';
import { GroupDetailHeaderActions } from '../navigation/group-detail-header-actions';

jest.mock('react-native', () => ({
  StyleSheet: {
    flatten: (style: unknown) => style,
  },
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  const Menu = ({ children, ...props }: any) =>
    React.createElement('View', props, children);
  const MenuAction = ({ children, ...props }: any) =>
    React.createElement(
      'View',
      {
        accessible: true,
        accessibilityLabel: typeof children === 'string' ? children : undefined,
        accessibilityRole: 'button',
        ...props,
      },
      children,
    );
  const Toolbar = Object.assign(
    ({ children }: { children?: ReactNode }) => {
      const directNativeItems = React.Children.toArray(children).filter(
        (child) => React.isValidElement(child) && child.type === Menu,
      );

      return React.createElement('View', null, directNativeItems);
    },
    { Menu, MenuAction },
  );

  return { Stack: { Toolbar } };
});

describe('iOS native-stack header action composition', () => {
  it('gives Expo Router the Insights menu as a direct toolbar child', () => {
    const onChange = jest.fn();
    const screen = render(
      <InsightsChartHeaderAction onChange={onChange} preference='auto' />,
    );

    expect(screen.getByLabelText('Chart visualization')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Bar' }));
    expect(onChange).toHaveBeenCalledWith('bar');
  });

  it('gives Expo Router the Group menu as a direct toolbar child', () => {
    const onOpenMembers = jest.fn();
    const screen = render(
      <GroupDetailHeaderActions onOpenMembers={onOpenMembers} />,
    );

    expect(screen.getByLabelText('Group actions')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Members' }));
    expect(onOpenMembers).toHaveBeenCalledTimes(1);
  });
});
