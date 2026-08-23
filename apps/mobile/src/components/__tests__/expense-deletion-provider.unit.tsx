import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Button, Text, View } from 'react-native';

import {
  EXPENSE_ACCESSIBLE_UNDO_DURATION_MS,
  EXPENSE_UNDO_DURATION_MS,
  ExpenseDeletionProvider,
  useExpenseDeletion,
} from '../feedback/expense-deletion-provider';

const mockIsScreenReaderEnabled = jest.fn(() => Promise.resolve(false));

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
  const Text = host('Text');
  const View = host('View');

  return {
    AccessibilityInfo: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      isScreenReaderEnabled: () => mockIsScreenReaderEnabled(),
    },
    Button: ({ onPress, title }: { onPress: () => void; title: string }) =>
      React.createElement(
        'View',
        {
          accessible: true,
          accessibilityLabel: title,
          accessibilityRole: 'button',
          onPress,
        },
        React.createElement('Text', null, title),
      ),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text,
    TouchableOpacity: host('View', true),
    View,
  };
});

const mockDeleteExpense = jest.fn();
const mockFlushExpensePersistence = jest.fn(() => Promise.resolve());

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector: (state: unknown) => unknown) =>
    selector({ deleteExpense: mockDeleteExpense }),
}));

jest.mock('../../store/features/expenseStore', () => ({
  flushExpensePersistence: () => mockFlushExpensePersistence(),
}));

const Harness = () => {
  const { isPendingDeletion, requestExpenseDeletion } = useExpenseDeletion();

  return (
    <View>
      <Button
        title='Delete fixture'
        onPress={() => requestExpenseDeletion('expense-1', 'First fixture')}
      />
      <Button
        title='Delete second fixture'
        onPress={() => requestExpenseDeletion('expense-2', 'Second fixture')}
      />
      <Text testID='pending-state'>
        {isPendingDeletion('expense-1') ? 'hidden' : 'visible'}
      </Text>
      <Text testID='second-pending-state'>
        {isPendingDeletion('expense-2') ? 'hidden' : 'visible'}
      </Text>
    </View>
  );
};

describe('ExpenseDeletionProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDeleteExpense.mockReset();
    mockFlushExpensePersistence.mockClear();
    mockIsScreenReaderEnabled.mockReset();
    mockIsScreenReaderEnabled.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('hides immediately and cancels without creating a delete mutation on Undo', () => {
    const screen = render(
      <ExpenseDeletionProvider>
        <Harness />
      </ExpenseDeletionProvider>,
    );

    fireEvent.press(screen.getByText('Delete fixture'));

    expect(screen.getByTestId('pending-state')).toHaveTextContent('hidden');
    expect(screen.getByText('Expense deleted')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Undo deletion of First fixture',
      }),
    ).toBeTruthy();
    expect(mockDeleteExpense).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Undo deletion of First fixture',
      }),
    );
    jest.advanceTimersByTime(EXPENSE_UNDO_DURATION_MS);

    expect(screen.getByTestId('pending-state')).toHaveTextContent('visible');
    expect(mockDeleteExpense).not.toHaveBeenCalled();
  });

  it('commits exactly once only after the Undo window expires', async () => {
    const screen = render(
      <ExpenseDeletionProvider>
        <Harness />
      </ExpenseDeletionProvider>,
    );

    fireEvent.press(screen.getByText('Delete fixture'));
    jest.advanceTimersByTime(EXPENSE_UNDO_DURATION_MS - 1);
    expect(mockDeleteExpense).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(mockDeleteExpense).toHaveBeenCalledTimes(1);
    expect(mockDeleteExpense).toHaveBeenCalledWith('expense-1');
    expect(mockFlushExpensePersistence).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('pending-state')).toHaveTextContent('visible');
  });

  it('queues rapid deletions so each one receives a complete Undo window', async () => {
    const screen = render(
      <ExpenseDeletionProvider>
        <Harness />
      </ExpenseDeletionProvider>,
    );

    fireEvent.press(screen.getByText('Delete fixture'));
    fireEvent.press(screen.getByText('Delete second fixture'));

    expect(screen.getByTestId('pending-state')).toHaveTextContent('hidden');
    expect(screen.getByTestId('second-pending-state')).toHaveTextContent(
      'hidden',
    );

    await act(async () => {
      jest.advanceTimersByTime(EXPENSE_UNDO_DURATION_MS);
      await Promise.resolve();
    });

    expect(mockDeleteExpense).toHaveBeenCalledTimes(1);
    expect(mockDeleteExpense).toHaveBeenLastCalledWith('expense-2');

    jest.advanceTimersByTime(EXPENSE_UNDO_DURATION_MS - 1);
    expect(mockDeleteExpense).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(mockDeleteExpense).toHaveBeenCalledTimes(2);
    expect(mockDeleteExpense).toHaveBeenLastCalledWith('expense-1');
  });

  it('offers Undo for the most recently deleted expense', () => {
    const screen = render(
      <ExpenseDeletionProvider>
        <Harness />
      </ExpenseDeletionProvider>,
    );

    fireEvent.press(screen.getByText('Delete fixture'));
    fireEvent.press(screen.getByText('Delete second fixture'));

    expect(
      screen.getByRole('alert', {
        name: 'Second fixture deleted. Undo available.',
      }),
    ).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Undo deletion of Second fixture',
      }),
    );

    expect(screen.getByTestId('second-pending-state')).toHaveTextContent(
      'visible',
    );
    expect(screen.getByTestId('pending-state')).toHaveTextContent('hidden');
    expect(mockDeleteExpense).not.toHaveBeenCalled();
  });

  it('extends the Undo window while a screen reader is enabled', async () => {
    mockIsScreenReaderEnabled.mockResolvedValueOnce(true);
    const screen = render(
      <ExpenseDeletionProvider>
        <Harness />
      </ExpenseDeletionProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(screen.getByText('Delete fixture'));
    act(() => {
      jest.advanceTimersByTime(EXPENSE_UNDO_DURATION_MS);
    });
    expect(mockDeleteExpense).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(
        EXPENSE_ACCESSIBLE_UNDO_DURATION_MS - EXPENSE_UNDO_DURATION_MS,
      );
    });
    expect(mockDeleteExpense).toHaveBeenCalledWith('expense-1');
  });

  it('does not leak an unhandled rejection when durable storage must retry', async () => {
    mockFlushExpensePersistence.mockRejectedValueOnce(
      new Error('storage unavailable'),
    );
    const screen = render(
      <ExpenseDeletionProvider>
        <Harness />
      </ExpenseDeletionProvider>,
    );

    fireEvent.press(screen.getByText('Delete fixture'));
    await act(async () => {
      jest.advanceTimersByTime(EXPENSE_UNDO_DURATION_MS);
      await Promise.resolve();
    });

    expect(mockDeleteExpense).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('pending-state')).toHaveTextContent('visible');
  });

  it('closes the Undo window before waiting for a slow durable write', async () => {
    let resolveFlush: (() => void) | undefined;
    mockFlushExpensePersistence.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFlush = resolve;
        }),
    );
    const screen = render(
      <ExpenseDeletionProvider>
        <Harness />
      </ExpenseDeletionProvider>,
    );

    fireEvent.press(screen.getByText('Delete fixture'));
    act(() => {
      jest.advanceTimersByTime(EXPENSE_UNDO_DURATION_MS);
    });

    expect(mockDeleteExpense).toHaveBeenCalledWith('expense-1');
    expect(
      screen.queryByRole('button', {
        name: 'Undo deletion of First fixture',
      }),
    ).toBeNull();
    expect(screen.getByTestId('pending-state')).toHaveTextContent('visible');

    await act(async () => {
      resolveFlush?.();
      await Promise.resolve();
    });
  });
});
