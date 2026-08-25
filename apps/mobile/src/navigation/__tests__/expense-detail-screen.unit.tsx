import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import ExpenseDetailScreen from '../../../app/expense-detail';
import type { Category, Expense, ExpenseGroup, Participant } from '../../types';
import { formatLocalDateForDisplay } from '../../utils/dateFormat';

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
  { id: 'participant-1', name: 'Tom', userId: 'user-tom' },
  { id: 'participant-2', name: 'Sharon' },
  { id: 'participant-3', name: 'Alex' },
];
const mockGroup: ExpenseGroup = {
  id: 'group-1',
  name: 'Brisbane',
  participants: mockParticipants,
  createdAt: '2026-08-01T00:00:00.000Z',
};
const mockCategory: Category = {
  id: 'category-food',
  name: 'Food & Dining',
  color: '#D81B60',
};
const mockExpense: Expense = {
  id: 'expense-1',
  title: 'Dinner',
  amountMinor: 6000,
  currency: 'USD',
  date: '2026-08-24',
  category: 'Food & Dining',
  categoryId: mockCategory.id,
  caption: 'Birthday dinner',
  spaceId: mockGroup.id,
  spaceKind: 'shared',
  payments: [{ participantId: mockParticipants[0].id, amountMinor: 6000 }],
  shares: [
    { participantId: mockParticipants[0].id, amountMinor: 2000 },
    { participantId: mockParticipants[1].id, amountMinor: 2000 },
    { participantId: mockParticipants[2].id, amountMinor: 2000 },
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
      categories: [mockCategory],
      internalUserId: 'user-tom',
      personalParticipantId: 'personal-participant',
    }),
}));

describe('ExpenseDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExpense.payments = [
      { participantId: mockParticipants[0].id, amountMinor: 6000 },
    ];
    mockExpense.shares = [
      { participantId: mockParticipants[0].id, amountMinor: 2000 },
      { participantId: mockParticipants[1].id, amountMinor: 2000 },
      { participantId: mockParticipants[2].id, amountMinor: 2000 },
    ];
    delete mockGroup.archivedAt;
    delete mockCategory.archivedAt;
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      expenseId: mockExpense.id,
    });
  });

  it('turns a shared expense into a complete financial record', () => {
    const screen = render(<ExpenseDetailScreen />);

    expect(screen.getByText('Dinner')).toBeTruthy();
    expect(screen.getAllByText('USD 60.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('You paid')).toBeTruthy();
    expect(screen.getByText('Your share')).toBeTruthy();
    expect(screen.getByText('You are owed')).toBeTruthy();
    expect(screen.getByText('USD 40.00')).toBeTruthy();
    expect(screen.getByText('PAID BY')).toBeTruthy();
    expect(screen.getByText('SPLIT')).toBeTruthy();
    expect(screen.getAllByText('Tom')).toHaveLength(2);
    expect(screen.getAllByText('Sharon').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Alex').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('USD 20.00').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Brisbane')).toBeTruthy();
    expect(screen.getByText('Food & Dining')).toBeTruthy();
    expect(
      screen.getByText(formatLocalDateForDisplay(mockExpense.date)),
    ).toBeTruthy();
    expect(screen.getByText('Birthday dinner')).toBeTruthy();
    expect(screen.queryByText('2026-08-24')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Edit expense' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/add-expense',
      params: {
        draftSessionId: expect.stringMatching(`^edit:${mockExpense.id}:`),
        expenseId: mockExpense.id,
      },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(mockRequestExpenseDeletion).toHaveBeenCalledWith(
      mockExpense.id,
      mockExpense.title,
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('lists every payer and amount when an expense has multiple payments', () => {
    mockExpense.payments = [
      { participantId: mockParticipants[0].id, amountMinor: 3000 },
      { participantId: mockParticipants[1].id, amountMinor: 3000 },
    ];

    const screen = render(<ExpenseDetailScreen />);

    expect(screen.getByText('PAID BY')).toBeTruthy();
    expect(screen.getAllByText('Tom')).toHaveLength(2);
    expect(screen.getAllByText('Sharon')).toHaveLength(2);
    expect(screen.getAllByText('USD 30.00')).toHaveLength(3);
  });

  it('shows how much the current user owes when their share exceeds payment', () => {
    mockExpense.payments = [
      { participantId: mockParticipants[1].id, amountMinor: 6000 },
    ];

    const screen = render(<ExpenseDetailScreen />);

    expect(screen.getByText('You owe')).toBeTruthy();
    expect(screen.getAllByText('USD 20.00').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('You are owed')).toBeNull();
  });

  it('shows a settled position when payment equals the current user share', () => {
    mockExpense.payments = [
      { participantId: mockParticipants[0].id, amountMinor: 2000 },
      { participantId: mockParticipants[1].id, amountMinor: 4000 },
    ];

    const screen = render(<ExpenseDetailScreen />);

    expect(screen.getByText('Settled up')).toBeTruthy();
    expect(screen.getAllByText('USD 0.00')).toHaveLength(1);
    expect(screen.queryByText('You owe')).toBeNull();
    expect(screen.queryByText('You are owed')).toBeNull();
  });

  it('keeps archived shared history readable and disables mutations', () => {
    mockGroup.archivedAt = '2026-08-24T01:00:00.000Z';

    const screen = render(<ExpenseDetailScreen />);

    expect(screen.getByText('Shared history')).toBeTruthy();
    expect(screen.getByText('Archived · Read-only')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit expense' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();

    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(mockRequestExpenseDeletion).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('labels an archived category without rewriting the expense', () => {
    mockCategory.archivedAt = '2026-08-25T01:00:00.000Z';

    const screen = render(<ExpenseDetailScreen />);

    expect(screen.getByText('Food & Dining (Archived)')).toBeTruthy();
    expect(mockExpense.category).toBe('Food & Dining');
    expect(mockExpense.categoryId).toBe(mockCategory.id);
  });
});
