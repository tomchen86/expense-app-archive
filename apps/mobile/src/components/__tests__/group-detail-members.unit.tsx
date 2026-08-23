import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

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
      ListFooterComponent,
      data,
      renderItem,
      ...props
    }: any) =>
      React.createElement(
        'FlatList',
        props,
        data.length === 0
          ? ListEmptyComponent
          : data.map((item: any, index: number) =>
              React.createElement(
                React.Fragment,
                { key: item.id },
                renderItem({ item, index }),
              ),
            ),
        ListFooterComponent,
      ),
    Modal: ({ children, visible, ...props }: any) =>
      visible ? React.createElement('Modal', props, children) : null,
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
      hairlineWidth: 1,
    },
    Text: host('Text'),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

const group: ExpenseGroup = {
  id: 'group-1',
  name: 'Household',
  participants: [
    {
      id: 'participant-alex',
      name: 'Alex',
      userId: 'account-alex',
    },
    { id: 'participant-blake', name: 'Blake' },
  ],
  createdAt: '2026-08-20T00:00:00.000Z',
};

const mockMobileState = {
  addParticipantToGroupByName: jest.fn(),
  expenses: [],
  groups: [group],
  internalUserId: 'account-alex',
  participants: group.participants,
  removeParticipantFromGroup: jest.fn(),
  restoreGroup: jest.fn(),
  user: null,
};

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector: (state: typeof mockMobileState) => unknown) =>
    selector(mockMobileState),
}));
jest.mock('../../components/ExpenseListItem', () => () => null);
jest.mock('../../components/GroupBalancesOverlay', () => () => null);
jest.mock('../../components/FloatingActionButton', () => () => null);
jest.mock('../../components/TextInputModal', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return ({ onClose, onSubmit, visible }: any) =>
    visible
      ? React.createElement('View', {
          accessible: true,
          accessibilityLabel: 'Submit member name',
          accessibilityRole: 'button',
          onPress: () => {
            void Promise.resolve(onSubmit('Casey')).then((result) => {
              if (result !== false) {
                onClose();
              }
            });
          },
        })
      : null;
});

describe('Group detail members and empty summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileState.addParticipantToGroupByName.mockResolvedValue(
      'participant-casey',
    );
    mockMobileState.removeParticipantFromGroup.mockResolvedValue(true);
    mockMobileState.restoreGroup.mockResolvedValue(true);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ groupId: group.id });
  });

  it('does not render empty amount blocks before the first expense', () => {
    const screen = render(<GroupDetailScreen />);

    expect(screen.queryByTestId('group-total-summary')).toBeNull();
    expect(screen.queryByTestId('user-contribution-summary')).toBeNull();
    expect(screen.getByText('No expenses in this group yet.')).toBeTruthy();
  });

  it('opens Members from the native overflow menu in read-only mode', () => {
    const screen = render(<GroupDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Members' }));

    expect(screen.getByText(/Alex/)).toBeTruthy();
    expect(screen.getByText('Blake')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove Blake' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Edit members' }));
    expect(screen.getByRole('button', { name: 'Remove Blake' })).toBeTruthy();
  });

  it('resolves an array-valued deep-link group parameter', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      groupId: [group.id, 'ignored'],
    });

    const screen = render(<GroupDetailScreen />);

    expect(screen.queryByText('Group not found.')).toBeNull();
    expect(screen.getByText('No expenses in this group yet.')).toBeTruthy();
  });

  it('awaits successful member creation before closing the add-member modal', async () => {
    mockMobileState.addParticipantToGroupByName.mockResolvedValueOnce(
      'participant-casey',
    );
    const screen = render(<GroupDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Members' }));
    fireEvent.press(screen.getByRole('button', { name: 'Edit members' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add member' }));
    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Submit member name' }),
      );
    });

    expect(mockMobileState.addParticipantToGroupByName).toHaveBeenCalledWith(
      group.id,
      'Casey',
    );
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Submit member name' }),
      ).toBeNull();
    });
  });

  it.each([
    ['a rejected group transition', null],
    ['a persistence rejection', new Error('write failed')],
  ])('keeps member creation open after %s', async (_label, failure) => {
    if (failure instanceof Error) {
      mockMobileState.addParticipantToGroupByName.mockRejectedValueOnce(
        failure,
      );
    } else {
      mockMobileState.addParticipantToGroupByName.mockResolvedValueOnce(null);
    }
    const screen = render(<GroupDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Members' }));
    fireEvent.press(screen.getByRole('button', { name: 'Edit members' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add member' }));
    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Submit member name' }),
      );
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Unable to Add Member',
      expect.stringMatching(/saved|changed/i),
    );
    expect(
      screen.getByRole('button', { name: 'Submit member name' }),
    ).toBeTruthy();
  });

  it('keeps member removal pending and reports a durable failure', async () => {
    let rejectRemoval: ((error: Error) => void) | undefined;
    mockMobileState.removeParticipantFromGroup.mockImplementationOnce(
      () =>
        new Promise<boolean>((_resolve, reject) => {
          rejectRemoval = reject;
        }),
    );
    const screen = render(<GroupDetailScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Members' }));
    fireEvent.press(screen.getByRole('button', { name: 'Edit members' }));
    fireEvent.press(screen.getByRole('button', { name: 'Remove Blake' }));
    const confirmation = (Alert.alert as jest.Mock).mock.calls.find(
      ([title]) => title === 'Remove Member',
    );
    const removeAction = confirmation?.[2]?.find(
      (action: { text: string }) => action.text === 'Remove',
    );
    act(() => {
      removeAction.onPress();
      removeAction.onPress();
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Blake' })).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ busy: true, disabled: true }),
      ),
    );
    expect(mockMobileState.removeParticipantFromGroup).toHaveBeenCalledTimes(1);

    rejectRemoval?.(new Error('group write failed'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to Remove Member',
        expect.stringMatching(/safely|try again/i),
      ),
    );
  });
});
