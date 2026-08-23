import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import GroupsScreen, {
  GROUP_ARCHIVE_NOTICE_DURATION_MS,
} from '../../screens/groups-screen';
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

jest.mock('../../components/TextInputModal', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return ({ onClose, onSubmit, title, visible }: any) =>
    visible
      ? React.createElement(
          'View',
          { testID: 'text-input-modal' },
          React.createElement('Text', null, title),
          React.createElement('View', {
            accessible: true,
            accessibilityLabel: 'Submit group name',
            accessibilityRole: 'button',
            onPress: () => {
              void Promise.resolve(onSubmit('Durable group')).then((result) => {
                if (result !== false) {
                  onClose();
                }
              });
            },
          }),
        )
      : null;
});
jest.mock('../../components/FloatingActionButton', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return ({ accessibilityLabel, onPress, testID }: any) =>
    React.createElement('View', {
      accessible: true,
      accessibilityLabel,
      accessibilityRole: 'button',
      onPress,
      testID: testID ?? 'floating-action',
    });
});
jest.mock('../../components/GroupBalancesOverlay', () => () => null);
jest.mock('../../components/groups/GroupMembersModal', () => () => null);

describe('group archive UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileState.addGroup.mockResolvedValue('new-group');
    mockMobileState.archiveGroup.mockResolvedValue(true);
    mockMobileState.restoreGroup.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps archived groups out of the active list and creates from the FAB', () => {
    const screen = render(<GroupsScreen />);

    expect(screen.getByText(activeGroup.name)).toBeTruthy();
    expect(screen.queryByText(archivedGroup.name)).toBeNull();
    expect(screen.queryByText(/View Archived Groups/)).toBeNull();
    expect(screen.queryByText('Create New Group')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Add group' }));
    expect(screen.getByTestId('text-input-modal')).toBeTruthy();
    expect(screen.getByText('Create New Group')).toBeTruthy();
  });

  it('archives from the swipe action and points to Settings temporarily', async () => {
    jest.useFakeTimers();
    const screen = render(<GroupsScreen />);
    const swipeable = screen.getByTestId(`group-swipeable-${activeGroup.id}`);
    const rightAction = swipeable.props.renderRightActions(
      undefined,
      undefined,
      { close: jest.fn() },
    );
    const actions = render(rightAction);

    await act(async () => {
      fireEvent.press(
        actions.getByRole('button', { name: `Archive ${activeGroup.name}` }),
      );
      await Promise.resolve();
    });

    expect(mockMobileState.archiveGroup).toHaveBeenCalledWith(activeGroup.id);
    expect(
      screen.getByText('Group archived · Find it in Settings'),
    ).toBeTruthy();
    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Archive Group',
      expect.anything(),
      expect.anything(),
    );

    act(() => {
      jest.advanceTimersByTime(GROUP_ARCHIVE_NOTICE_DURATION_MS);
    });
    expect(
      screen.queryByText('Group archived · Find it in Settings'),
    ).toBeNull();
  });

  it('teaches the empty-state action without adding another create control', () => {
    const previousGroups = mockMobileState.groups;
    mockMobileState.groups = [];

    try {
      const screen = render(<GroupsScreen />);
      expect(
        screen.getByText('No groups yet. Tap + to create a group.'),
      ).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'Add group' })).toHaveLength(
        1,
      );
    } finally {
      mockMobileState.groups = previousGroups;
    }
  });

  it('reports identity persistence failure without creating through a fallback path', async () => {
    mockMobileState.addGroup.mockRejectedValueOnce(
      new Error('identity unavailable'),
    );
    const screen = render(<GroupsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Add group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Submit group name' }));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to Create Group',
        'Your group could not be saved. Please try again.',
      ),
    );
    expect(mockMobileState.addGroup).toHaveBeenCalledWith('Durable group');
    expect(screen.getByTestId('text-input-modal')).toBeTruthy();
  });

  it('does not show archive success when durable persistence rejects', async () => {
    mockMobileState.archiveGroup.mockRejectedValueOnce(
      new Error('archive write failed'),
    );
    const screen = render(<GroupsScreen />);
    const swipeable = screen.getByTestId(`group-swipeable-${activeGroup.id}`);
    const actions = render(
      swipeable.props.renderRightActions(undefined, undefined, {
        close: jest.fn(),
      }),
    );

    fireEvent.press(
      actions.getByRole('button', { name: `Archive ${activeGroup.name}` }),
    );

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to Archive Group',
        expect.stringMatching(/saved|try again/i),
      ),
    );
    expect(
      screen.queryByText('Group archived · Find it in Settings'),
    ).toBeNull();
  });

  it('keeps archived group details readable but disables mutations', async () => {
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
    await waitFor(() =>
      expect(mockMobileState.restoreGroup).toHaveBeenCalledWith(
        archivedGroup.id,
      ),
    );
    expect(screen.queryByTestId('floating-action')).toBeNull();
  });

  it('reports a failed restore from archived group details', async () => {
    mockMobileState.restoreGroup.mockRejectedValueOnce(
      new Error('restore write failed'),
    );
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      groupId: archivedGroup.id,
    });
    const screen = render(<GroupDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Restore group' }));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to Restore Group',
        expect.stringMatching(/could not be restored/i),
      ),
    );
  });
});
