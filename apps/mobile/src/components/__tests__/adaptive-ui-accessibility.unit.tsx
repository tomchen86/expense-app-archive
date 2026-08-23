import React from 'react';
import { render } from '@testing-library/react-native';

import SettingsScreen from '../../screens/settings-screen';
import type { Expense, ExpenseGroup, Participant } from '../../types';
import ExpenseListItem from '../ExpenseListItem';
import GroupListItem from '../GroupListItem';

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement('Swipeable', props, children),
  };
});

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
    ScrollView: host('ScrollView'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => {
        if (!Array.isArray(style)) {
          return style;
        }

        return Object.assign({}, ...style.flat().filter(Boolean));
      },
    },
    Text: host('Text'),
    TextInput: host('TextInput'),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: () => ({
    groups: [],
    updateUserSettings: jest.fn(),
    userSettings: { name: 'Alex' },
  }),
}));

const participants: Participant[] = [
  { id: 'participant-1', name: 'Alex' },
  { id: 'participant-2', name: 'Sam' },
  { id: 'participant-3', name: 'Jordan' },
];

const group: ExpenseGroup = {
  id: 'group-1',
  name: 'Weekend Trip',
  participants,
  createdAt: '2026-08-23T00:00:00.000Z',
};

const expense: Expense = {
  id: 'expense-1',
  title: 'A deliberately long shared dinner title',
  date: '2026-08-23',
  category: 'Dining',
  amountMinor: 12_000,
  currency: 'AUD',
  spaceId: group.id,
  spaceKind: 'shared',
  payments: [{ participantId: participants[0].id, amountMinor: 12_000 }],
  shares: [
    { participantId: participants[0].id, amountMinor: 4_000 },
    { participantId: participants[1].id, amountMinor: 4_000 },
    { participantId: participants[2].id, amountMinor: 4_000 },
  ],
};

describe('adaptive UI accessibility contracts', () => {
  it('makes the expense card the labelled navigation target', () => {
    const screen = render(
      <ExpenseListItem
        allParticipants={participants}
        currency='AUD'
        displayAmountMinor={4_000}
        group={group}
        item={expense}
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Expense amount AUD 40.00')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: `Open ${expense.title} expense`,
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('labels archived shared history without restoring inline controls', () => {
    const archivedGroup: ExpenseGroup = {
      ...group,
      archivedAt: '2026-08-24T00:00:00.000Z',
    };
    const screen = render(
      <ExpenseListItem
        allParticipants={participants}
        currency='AUD'
        displayAmountMinor={4_000}
        group={archivedGroup}
        item={expense}
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: `Edit ${expense.title}` }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: `Delete ${expense.title}` }),
    ).toBeNull();
    expect(screen.getByText('Archived shared history')).toBeTruthy();
  });

  it('keeps group navigation separate from hidden swipe actions', () => {
    const screen = render(
      <GroupListItem
        group={group}
        onArchiveGroup={jest.fn()}
        onPress={jest.fn()}
        onRestoreGroup={jest.fn()}
        summary={[
          {
            currency: 'AUD',
            myNetBalanceMinor: 6_000,
            myShareMinor: 6_000,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('button', { name: `Open ${group.name}` }),
    ).toBeTruthy();
    expect(screen.queryByText('Archive')).toBeNull();
    expect(screen.queryByLabelText(/Remove /)).toBeNull();
    expect(screen.queryByLabelText(/Add participant/)).toBeNull();
  });

  it('offers restore without membership mutations for an archived group', () => {
    const archivedGroup: ExpenseGroup = {
      ...group,
      archivedAt: '2026-08-24T00:00:00.000Z',
    };
    const screen = render(
      <GroupListItem
        group={archivedGroup}
        onArchiveGroup={jest.fn()}
        onPress={jest.fn()}
        onRestoreGroup={jest.fn()}
        summary={null}
      />,
    );

    expect(
      screen.getByRole('button', { name: `Restore ${group.name}` }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', {
        name: `Remove ${participants[1].name} from ${group.name}`,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: `Add participant to ${group.name}`,
      }),
    ).toBeNull();
  });

  it('keeps Settings scrollable when the keyboard or larger text reduces space', () => {
    const screen = render(<SettingsScreen />);
    const scrollView = screen.getByTestId('settings-scroll-view');

    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(screen.getByTestId('username-input')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save settings' })).toHaveProp(
      'testID',
      'save-settings-button',
    );
  });
});
