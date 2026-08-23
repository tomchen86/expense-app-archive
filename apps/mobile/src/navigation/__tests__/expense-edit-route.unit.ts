import type { Expense } from '../../types';
import {
  buildEditExpenseRoute,
  resolveEditingExpense,
  resolveSingleRouteParam,
} from '../expense-edit-route';

const expense: Expense = {
  id: 'expense-1',
  title: 'Dinner',
  amountMinor: 4200,
  currency: 'USD',
  date: '2026-08-24',
  category: 'Food',
  spaceId: 'personal-space-1',
  spaceKind: 'personal',
  payments: [{ participantId: 'participant-1', amountMinor: 4200 }],
  shares: [{ participantId: 'participant-1', amountMinor: 4200 }],
};

describe('expense edit route', () => {
  it('passes only the stable expense identifier through navigation', () => {
    expect(buildEditExpenseRoute(expense.id)).toEqual({
      pathname: '/add-expense',
      params: { expenseId: expense.id },
    });
  });

  it('normalizes Expo Router scalar and array parameters', () => {
    expect(resolveSingleRouteParam('expense-1')).toBe('expense-1');
    expect(resolveSingleRouteParam(['expense-1', 'expense-2'])).toBe(
      'expense-1',
    );
    expect(resolveSingleRouteParam(undefined)).toBeUndefined();
  });

  it('returns the canonical store object instead of parsing a route copy', () => {
    expect(resolveEditingExpense([expense], expense.id)).toBe(expense);
    expect(resolveEditingExpense([expense], ['expense-1'])).toBe(expense);
    expect(resolveEditingExpense([expense], 'missing')).toBeUndefined();
  });
});
