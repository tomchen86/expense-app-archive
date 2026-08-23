import type { Expense } from '../types';

export type RouteParam = string | string[] | undefined;

export const resolveSingleRouteParam = (value: RouteParam) =>
  Array.isArray(value) ? value[0] : value;

export const buildEditExpenseRoute = (expenseId: string) => ({
  pathname: '/add-expense' as const,
  params: { expenseId },
});

export const buildExpenseDetailRoute = (expenseId: string) => ({
  pathname: '/expense-detail' as const,
  params: { expenseId },
});

export const resolveEditingExpense = (
  expenses: Expense[],
  expenseIdParam: RouteParam,
) => {
  const expenseId = resolveSingleRouteParam(expenseIdParam);

  return expenseId
    ? expenses.find((expense) => expense.id === expenseId)
    : undefined;
};
