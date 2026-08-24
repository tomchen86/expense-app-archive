import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { Expense, ExpenseGroup, Participant } from '../../types';
import { formatMinorUnits } from '../../utils/money';
import ExpenseListItem from '../ExpenseListItem';

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

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement('Swipeable', props, children),
  };
});

const participants: Participant[] = [
  { id: 'participant-1', name: 'Tom' },
  { id: 'participant-2', name: 'Sharon' },
];

const group: ExpenseGroup = {
  id: 'group-1',
  name: 'Brisbane',
  participants,
  createdAt: '2026-08-01T00:00:00.000Z',
};

const expense: Expense = {
  id: 'expense-1',
  title: 'Dinner',
  amountMinor: 2400,
  currency: 'USD',
  date: '2026-08-24',
  category: 'Food & Dining',
  caption: 'Birthday dinner',
  spaceId: group.id,
  spaceKind: 'shared',
  payments: [{ participantId: participants[0].id, amountMinor: 2400 }],
  shares: [
    { participantId: participants[0].id, amountMinor: 1200 },
    { participantId: participants[1].id, amountMinor: 1200 },
  ],
};

describe('ExpenseListItem interactions', () => {
  it('opens the expense from the whole card without inline Edit/Delete labels', () => {
    const onPress = jest.fn();
    const screen = render(
      <ExpenseListItem
        currentParticipantIds={[participants[0].id]}
        currency='USD'
        displayAmountMinor={2400}
        group={group}
        item={expense}
        onDelete={jest.fn()}
        onPress={onPress}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', { name: 'Open Dinner expense' }),
    );

    expect(onPress).toHaveBeenCalledWith(expense);
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
    expect(screen.getByLabelText('Expense amount USD 24.00')).toBeTruthy();
    expect(
      screen.getByText(
        `Brisbane · Your share ${formatMinorUnits(1200, 'USD')}`,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Paid by:/)).toBeNull();
    expect(screen.queryByText('Birthday dinner')).toBeNull();
  });

  it('exposes Delete only through the left-swipe action', () => {
    const onDelete = jest.fn();
    const screen = render(
      <ExpenseListItem
        currency='USD'
        displayAmountMinor={1200}
        group={group}
        item={expense}
        onDelete={onDelete}
        onPress={jest.fn()}
      />,
    );
    const swipeable = screen.getByTestId('expense-swipeable-expense-1');
    const close = jest.fn();
    const action = render(
      swipeable.props.renderRightActions({ value: 0 }, { value: 0 }, { close }),
    );

    fireEvent.press(
      action.getByRole('button', { name: 'Delete Dinner expense' }),
    );

    expect(close).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(expense);
  });

  it('keeps payer details off the summary card even with multiple payers', () => {
    const multiPayerExpense: Expense = {
      ...expense,
      payments: [
        { participantId: participants[0].id, amountMinor: 1200 },
        { participantId: participants[1].id, amountMinor: 1200 },
      ],
    };
    const screen = render(
      <ExpenseListItem
        currentParticipantIds={[participants[0].id]}
        currency='USD'
        displayAmountMinor={2400}
        group={group}
        item={multiPayerExpense}
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByText(/Paid by:/)).toBeNull();
    expect(
      screen.getByText(
        `Brisbane · Your share ${formatMinorUnits(1200, 'USD')}`,
      ),
    ).toBeTruthy();
  });

  it('does not add sharing metadata to a personal expense card', () => {
    const personalExpense: Expense = {
      ...expense,
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 2400 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 2400 }],
    };
    const screen = render(
      <ExpenseListItem
        currentParticipantIds={['personal-participant']}
        currency='USD'
        displayAmountMinor={2400}
        group={null}
        item={personalExpense}
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Expense amount USD 24.00')).toBeTruthy();
    expect(screen.queryByText(/Your share/)).toBeNull();
    expect(screen.queryByText(/Paid by:/)).toBeNull();
  });

  it('keeps a missing shared group understandable without exposing payer data', () => {
    const screen = render(
      <ExpenseListItem
        currentParticipantIds={[participants[0].id]}
        currency='USD'
        displayAmountMinor={2400}
        group={null}
        item={expense}
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        `Archived group · Your share ${formatMinorUnits(1200, 'USD')}`,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Paid by:/)).toBeNull();
  });
});
