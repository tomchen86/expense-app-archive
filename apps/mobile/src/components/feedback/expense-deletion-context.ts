import { createContext, useContext } from 'react';

export interface ExpenseDeletionContextValue {
  isPendingDeletion: (expenseId: string) => boolean;
  pendingExpenseDeletionIds: readonly string[];
  requestExpenseDeletion: (expenseId: string, expenseTitle?: string) => void;
}

const EMPTY_CONTEXT: ExpenseDeletionContextValue = {
  isPendingDeletion: () => false,
  pendingExpenseDeletionIds: [],
  requestExpenseDeletion: () => undefined,
};

export const ExpenseDeletionContext =
  createContext<ExpenseDeletionContextValue>(EMPTY_CONTEXT);

export const useExpenseDeletion = () => useContext(ExpenseDeletionContext);
