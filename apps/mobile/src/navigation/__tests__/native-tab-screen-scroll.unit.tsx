import type { ReactTestRendererJSON } from 'react-test-renderer';
import React from 'react';
import { render } from '@testing-library/react-native';

import GroupsScreen from '../../../app/(tabs)/history';
import ExpensesScreen from '../../../app/(tabs)/index';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };

  return {
    Alert: { alert: jest.fn() },
    FlatList: ({
      ListEmptyComponent,
      ListHeaderComponent,
      data,
      ...props
    }: any) =>
      React.createElement(
        'FlatList',
        props,
        ListHeaderComponent,
        data.length === 0 ? ListEmptyComponent : null,
      ),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    TouchableOpacity: host('View'),
    View: host('View'),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement('SafeAreaView', props, children),
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

const mockMobileState = {
  addGroup: jest.fn(),
  addParticipant: jest.fn(),
  addParticipantToGroup: jest.fn(),
  deleteExpense: jest.fn(),
  deleteGroup: jest.fn(),
  expenses: [],
  groups: [],
  internalUserId: 'user-1',
  participants: [],
  personalParticipantId: 'personal-participant-1',
  personalSpaceId: 'personal-space-1',
  removeParticipantFromGroup: jest.fn(),
  userSettings: { name: 'Alex' },
};

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector: (state: typeof mockMobileState) => unknown) =>
    selector(mockMobileState),
}));

jest.mock('../../components/ExpenseListItem', () => () => null);
jest.mock('../../components/GroupListItem', () => () => null);
jest.mock('../../components/TextInputModal', () => () => null);
jest.mock('../../components/FloatingActionButton', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'floating-action' });
});

const expectNativeListFirst = (
  tree: ReactTestRendererJSON | ReactTestRendererJSON[] | null,
) => {
  expect(tree).not.toBeNull();
  expect(Array.isArray(tree)).toBe(false);
  const root = tree as ReactTestRendererJSON;
  expect(root.type).toBe('SafeAreaView');
  const firstChild = root.children?.[0] as ReactTestRendererJSON;
  expect(firstChild.type).toBe('FlatList');
};

describe('native tab scroll contracts', () => {
  it('keeps the Expenses FlatList on the first descendant chain', () => {
    const screen = render(<ExpensesScreen />);
    expectNativeListFirst(screen.toJSON());
    expect(
      screen.getByTestId('floating-action').props.nativeTabsContentInsetApplied,
    ).toBe(true);
  });

  it('keeps the Groups FlatList on the first descendant chain', () => {
    const screen = render(<GroupsScreen />);
    expectNativeListFirst(screen.toJSON());
    expect(
      screen.getByTestId('floating-action').props.nativeTabsContentInsetApplied,
    ).toBe(true);
  });
});
