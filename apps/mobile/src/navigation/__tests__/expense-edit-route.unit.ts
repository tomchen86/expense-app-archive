import type { Expense } from '../../types';
import {
  buildCreateExpenseRoute,
  buildExpenseDetailRoute,
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
  it('opens a stable expense detail route from list cards', () => {
    expect(buildExpenseDetailRoute(expense.id)).toEqual({
      pathname: '/expense-detail',
      params: { expenseId: expense.id },
    });
  });

  it('gives every edit modal invocation an isolated draft session', () => {
    const firstRoute = buildEditExpenseRoute(expense.id);
    const secondRoute = buildEditExpenseRoute(expense.id);

    expect(firstRoute).toEqual({
      pathname: '/add-expense',
      params: {
        draftSessionId: expect.stringMatching(`^edit:${expense.id}:`),
        expenseId: expense.id,
      },
    });
    expect(secondRoute.params.draftSessionId).toEqual(
      expect.stringMatching(`^edit:${expense.id}:`),
    );
    expect(secondRoute.params.draftSessionId).not.toBe(
      firstRoute.params.draftSessionId,
    );
  });

  it('scopes every create route to an explicit draft session', () => {
    expect(
      buildCreateExpenseRoute({
        draftSessionId: 'draft-session-1',
        groupId: 'group-1',
      }),
    ).toEqual({
      pathname: '/add-expense',
      params: {
        draftSessionId: 'draft-session-1',
        groupId: 'group-1',
      },
    });

    expect(buildCreateExpenseRoute().params.draftSessionId).toEqual(
      expect.any(String),
    );
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
