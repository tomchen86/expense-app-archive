import React from 'react';
import { render } from '@testing-library/react-native';

import ExpensesScreen from '../../screens/expenses-screen';
import type { Expense, ExpenseGroup, Participant } from '../../types';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };

  return {
    FlatList: ({
      data,
      ListEmptyComponent,
      ListHeaderComponent,
      renderItem,
      ...props
    }: any) =>
      React.createElement(
        'FlatList',
        props,
        ListHeaderComponent,
        data.length === 0
          ? ListEmptyComponent
          : data.map((item: Expense, index: number) =>
              React.cloneElement(renderItem({ item, index }), { key: item.id }),
            ),
      ),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    TouchableOpacity: host('TouchableOpacity'),
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

const linkedParticipant: Participant = {
  id: 'linked-participant',
  name: 'Account member',
  userId: 'account-user',
};
const archivedGroup: ExpenseGroup = {
  id: 'archived-space',
  name: 'Archived trip',
  participants: [linkedParticipant],
  createdAt: '2026-08-01T00:00:00.000Z',
  archivedAt: '2026-08-24T00:00:00.000Z',
};
const expenses: Expense[] = [
  {
    id: 'paid-only-linked',
    title: 'Linked paid-only expense',
    amountMinor: 100,
    currency: 'AUD',
    date: '2026-08-24',
    category: 'Other',
    spaceId: archivedGroup.id,
    spaceKind: 'shared',
    payments: [{ participantId: linkedParticipant.id, amountMinor: 100 }],
    shares: [{ participantId: 'other', amountMinor: 100 }],
  },
  {
    id: 'linked-share',
    title: 'Linked share expense',
    amountMinor: 100,
    currency: 'AUD',
    date: '2026-08-24',
    category: 'Other',
    spaceId: archivedGroup.id,
    spaceKind: 'shared',
    payments: [{ participantId: 'other', amountMinor: 100 }],
    shares: [
      { participantId: linkedParticipant.id, amountMinor: 30 },
      { participantId: 'other', amountMinor: 70 },
    ],
  },
  {
    id: 'unrelated',
    title: 'Unrelated expense',
    amountMinor: 100,
    currency: 'AUD',
    date: '2026-08-24',
    category: 'Other',
    spaceId: archivedGroup.id,
    spaceKind: 'shared',
    payments: [{ participantId: 'other', amountMinor: 100 }],
    shares: [{ participantId: 'other', amountMinor: 100 }],
  },
];

const mockMobileState = {
  deleteExpense: jest.fn(),
  expenses,
  groups: [archivedGroup],
  participants: [linkedParticipant],
  personalParticipantId: 'personal-participant',
  user: {
    id: 'account-user',
    displayName: 'Account member',
    personalSpaceId: 'personal-space',
  },
};

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector: (state: typeof mockMobileState) => unknown) =>
    selector(mockMobileState),
}));

jest.mock('../../components/ExpenseListItem', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return ({ item, displayAmountMinor }: any) =>
    React.createElement('ExpenseListItem', {
      displayAmountMinor,
      testID: `expense-${item.id}`,
    });
});
jest.mock('../../components/FloatingActionButton', () => () => null);

describe('Expenses personal ledger projection', () => {
  it('renders the user share on shared cards and totals the same ledger amounts', () => {
    const screen = render(<ExpensesScreen />);

    expect(screen.getByTestId('expense-paid-only-linked')).toBeTruthy();
    expect(screen.getByTestId('expense-linked-share')).toBeTruthy();
    expect(screen.queryByTestId('expense-unrelated')).toBeNull();
    expect(
      screen.getByTestId('expense-paid-only-linked').props.displayAmountMinor,
    ).toBe(0);
    expect(
      screen.getByTestId('expense-linked-share').props.displayAmountMinor,
    ).toBe(30);
    expect(screen.getByText(/Your Total Share:/).props.children).toEqual([
      'Your Total Share:',
      ' ',
      'A$0.30',
    ]);
  });
});
