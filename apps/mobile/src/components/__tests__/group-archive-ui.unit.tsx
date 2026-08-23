import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import GroupsScreen from '../../screens/groups-screen';
import GroupDetailScreen from '../../../app/group-detail';
import type { ExpenseGroup } from '../../types';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string, accessible = false) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(
        name,
        accessible ? { accessible: true, ...props } : props,
        children,
      );
    };

  return {
    Alert: { alert: jest.fn() },
    FlatList: ({
      ListEmptyComponent,
      ListHeaderComponent,
      data,
      renderItem,
      ...props
    }: any) =>
      React.createElement(
        'FlatList',
        props,
        ListHeaderComponent,
        data.length === 0
          ? ListEmptyComponent
          : data.map((item: ExpenseGroup, index: number) =>
              React.createElement(
                React.Fragment,
                { key: item.id },
                renderItem({ item, index }),
              ),
            ),
      ),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    Pressable: host('View', true),
    TouchableOpacity: host('View', true),
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

const activeGroup: ExpenseGroup = {
  id: 'active-group',
  name: 'Active household',
  participants: [],
  createdAt: '2026-08-20T00:00:00.000Z',
};
const archivedGroup: ExpenseGroup = {
  id: 'archived-group',
  name: 'Archived trip',
  participants: [],
  createdAt: '2026-08-10T00:00:00.000Z',
  archivedAt: '2026-08-24T00:00:00.000Z',
};

const mockMobileState = {
  addGroup: jest.fn(),
  addParticipant: jest.fn(),
  addParticipantToGroup: jest.fn(),
  archiveGroup: jest.fn(),
  deleteExpense: jest.fn(),
  expenses: [],
  groups: [activeGroup, archivedGroup],
  internalUserId: null,
  participants: [],
  removeParticipantFromGroup: jest.fn(),
  restoreGroup: jest.fn(),
  userSettings: { name: 'Alex' },
};

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector: (state: typeof mockMobileState) => unknown) =>
    selector(mockMobileState),
}));

jest.mock('../../components/TextInputModal', () => () => null);
jest.mock('../../components/FloatingActionButton', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return () => React.createElement('View', { testID: 'floating-action' });
});
jest.mock('../../components/GroupBalancesOverlay', () => () => null);

describe('group archive UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows active groups by default and archived groups only after opt-in', () => {
    const screen = render(<GroupsScreen />);

    expect(screen.getByText(activeGroup.name)).toBeTruthy();
    expect(screen.queryByText(archivedGroup.name)).toBeNull();

    fireEvent.press(
      screen.getByRole('button', { name: 'View archived groups' }),
    );

    expect(screen.queryByText(activeGroup.name)).toBeNull();
    expect(screen.getByText(archivedGroup.name)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: `Restore ${archivedGroup.name}` }),
    ).toBeTruthy();
  });

  it('confirms that archive retains history before hiding a group', () => {
    const screen = render(<GroupsScreen />);

    fireEvent.press(
      screen.getByRole('button', { name: `Archive ${activeGroup.name}` }),
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      'Archive Group',
      'This hides the group from daily use while retaining its expenses, participants, payments, and shares.',
      expect.any(Array),
    );
    const actions = (Alert.alert as jest.Mock).mock.calls[0][2];
    actions[1].onPress();
    expect(mockMobileState.archiveGroup).toHaveBeenCalledWith(activeGroup.id);
  });

  it('keeps archived group details readable but disables mutations', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      groupId: archivedGroup.id,
    });

    const screen = render(<GroupDetailScreen />);

    expect(
      screen.getByText(
        'Archived group. Expenses and allocations are read-only.',
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Restore group' }));
    expect(mockMobileState.restoreGroup).toHaveBeenCalledWith(archivedGroup.id);
    expect(screen.queryByTestId('floating-action')).toBeNull();
  });
});
