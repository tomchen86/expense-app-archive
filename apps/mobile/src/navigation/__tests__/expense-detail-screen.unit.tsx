import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import ExpenseDetailScreen from '../../../app/expense-detail';
import type { Expense, ExpenseGroup, Participant } from '../../types';

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
    ScrollView: host('ScrollView'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
      hairlineWidth: 1,
    },
    Text: host('Text'),
    View: host('View'),
  };
});

const mockRequestExpenseDeletion = jest.fn();

const mockParticipants: Participant[] = [
  { id: 'participant-1', name: 'Tom' },
  { id: 'participant-2', name: 'Sharon' },
];
const mockGroup: ExpenseGroup = {
  id: 'group-1',
  name: 'Brisbane',
  participants: mockParticipants,
  createdAt: '2026-08-01T00:00:00.000Z',
};
const mockExpense: Expense = {
  id: 'expense-1',
  title: 'Dinner',
  amountMinor: 2400,
  currency: 'USD',
  date: '2026-08-24',
  category: 'Food & Dining',
  caption: 'Birthday dinner',
  spaceId: mockGroup.id,
  spaceKind: 'shared',
  payments: [{ participantId: mockParticipants[0].id, amountMinor: 2400 }],
  shares: [
    { participantId: mockParticipants[0].id, amountMinor: 1200 },
    { participantId: mockParticipants[1].id, amountMinor: 1200 },
  ],
};

jest.mock('../../components/feedback/expense-deletion-context', () => ({
  useExpenseDeletion: () => ({
    isPendingDeletion: () => false,
    requestExpenseDeletion: mockRequestExpenseDeletion,
  }),
}));

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector: (state: unknown) => unknown) =>
    selector({
      expenses: [mockExpense],
      groups: [mockGroup],
      participants: mockParticipants,
    }),
}));

describe('ExpenseDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExpense.payments = [
      { participantId: mockParticipants[0].id, amountMinor: 2400 },
    ];
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      expenseId: mockExpense.id,
    });
  });

  it('shows a native edit action and keeps Delete in the overflow menu', () => {
    const screen = render(<ExpenseDetailScreen />);

    expect(screen.getByText('Dinner')).toBeTruthy();
    expect(screen.getByText('USD 24.00')).toBeTruthy();
    expect(screen.getByText('Food & Dining')).toBeTruthy();
    expect(screen.queryByText('2026-08-24')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Edit expense' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/add-expense',
      params: { expenseId: mockExpense.id },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(mockRequestExpenseDeletion).toHaveBeenCalledWith(
      mockExpense.id,
      mockExpense.title,
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('lists every payer when an expense has multiple payments', () => {
    mockExpense.payments = [
      { participantId: mockParticipants[0].id, amountMinor: 1200 },
      { participantId: mockParticipants[1].id, amountMinor: 1200 },
    ];

    const screen = render(<ExpenseDetailScreen />);

    expect(screen.getAllByText('2 people')).toHaveLength(2);
    expect(screen.getByText('Tom paid')).toBeTruthy();
    expect(screen.getByText('Sharon paid')).toBeTruthy();
    expect(screen.getAllByText('USD 12.00')).toHaveLength(2);
  });
});
