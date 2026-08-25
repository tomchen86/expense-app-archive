import type { ReactTestRendererJSON } from 'react-test-renderer';
import React from 'react';
import { render } from '@testing-library/react-native';

import ExpensesScreen from '../../screens/expenses-screen';
import GroupsScreen from '../../screens/groups-screen';
import SettingsScreen from '../../screens/settings-screen';

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
    ScrollView: host('ScrollView'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    TextInput: host('TextInput'),
    Switch: host('Switch'),
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
  archiveGroup: jest.fn(),
  deleteExpense: jest.fn(),
  expenses: [],
  groups: [],
  internalUserId: 'user-1',
  participants: [],
  personalParticipantId: 'personal-participant-1',
  personalSpaceId: 'personal-space-1',
  removeParticipantFromGroup: jest.fn(),
  restoreGroup: jest.fn(),
  settings: { theme: 'light' as const },
  updateSettings: jest.fn(),
  updateUserSettings: jest.fn(),
  userSettings: { name: 'Alex' },
};

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector?: (state: typeof mockMobileState) => unknown) =>
    selector ? selector(mockMobileState) : mockMobileState,
}));

jest.mock('../../components/ExpenseListItem', () => () => null);
jest.mock('../../components/GroupListItem', () => () => null);
jest.mock('../../components/TextInputModal', () => () => null);
jest.mock('../../components/FloatingActionButton', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'floating-action' });
});

const expectNativeScrollFirst = (
  tree: ReactTestRendererJSON | ReactTestRendererJSON[] | null,
  expectedType: 'FlatList' | 'ScrollView',
) => {
  expect(tree).not.toBeNull();
  expect(Array.isArray(tree)).toBe(false);
  const root = tree as ReactTestRendererJSON;
  expect(root.type).toBe('SafeAreaView');
  expect(root.props.edges).toEqual(['left', 'right']);
  const firstChild = root.children?.[0] as ReactTestRendererJSON;
  expect(firstChild.type).toBe(expectedType);
  expect(firstChild.props.contentInsetAdjustmentBehavior).toBe('automatic');
};

describe('native tab scroll contracts', () => {
  it('keeps the Expenses FlatList on the first descendant chain', () => {
    const screen = render(<ExpensesScreen />);
    expectNativeScrollFirst(screen.toJSON(), 'FlatList');
    expect(screen.queryByText('Expenses')).toBeNull();
    expect(
      screen.getByTestId('floating-action').props.nativeTabsContentInsetApplied,
    ).toBe(true);
  });

  it('keeps the Groups FlatList on the first descendant chain', () => {
    const screen = render(<GroupsScreen />);
    expectNativeScrollFirst(screen.toJSON(), 'FlatList');
    expect(screen.queryByText('Groups')).toBeNull();
    expect(
      screen.getByTestId('floating-action').props.nativeTabsContentInsetApplied,
    ).toBe(true);
  });

  it('keeps the Settings ScrollView on the first descendant chain', () => {
    const screen = render(<SettingsScreen />);
    expectNativeScrollFirst(screen.toJSON(), 'ScrollView');
    expect(screen.queryByText('Settings')).toBeNull();
  });
});
