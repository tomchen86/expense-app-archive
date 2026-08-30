import type { Expense, ExpenseSpaceKind, MoneyAllocation } from '../types';
import { getCurrencyFractionDigits } from './money';

export interface PersonalExpenseProjection {
  expense: Expense;
  currency: string;
  myPaidMinor: number;
  mySpentMinor: number;
  myBalanceMinor: number;
}

const isPositiveMinorAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const isNonNegativeMinorAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export const getExpenseCurrency = (expense: Expense): string =>
  expense.currency;

export const isExpenseDeleted = (expense: Expense): boolean =>
  typeof expense.sync?.deletedAt === 'string';

export const getExpenseAmountMinor = (expense: Expense): number => {
  return isPositiveMinorAmount(expense.amountMinor) ? expense.amountMinor : 0;
};

export const getExpenseSpaceId = (expense: Expense): string | undefined =>
  expense.spaceId;

export const getExpenseSpaceKind = (
  expense: Expense,
): ExpenseSpaceKind | undefined =>
  expense.spaceKind;

const validAllocations = (
  allocations: MoneyAllocation[] | undefined,
  isValidAmount: (value: unknown) => value is number,
): MoneyAllocation[] =>
  (allocations ?? []).filter(
    (allocation) =>
      typeof allocation.participantId === 'string' &&
      allocation.participantId.length > 0 &&
      isValidAmount(allocation.amountMinor),
  );

export const getExpensePayments = (expense: Expense): MoneyAllocation[] => {
  return validAllocations(expense.payments, isPositiveMinorAmount);
};

export const getExpenseShares = (expense: Expense): MoneyAllocation[] => {
  return validAllocations(expense.shares, isNonNegativeMinorAmount);
};

export const sumAllocationsForParticipant = (
  allocations: MoneyAllocation[],
  participantId: string,
): number =>
  allocations
    .filter((allocation) => allocation.participantId === participantId)
    .reduce((sum, allocation) => sum + allocation.amountMinor, 0);

export const getPersonalExpenseProjection = (
  expense: Expense,
  participantId: string,
): PersonalExpenseProjection | null => {
  if (isExpenseDeleted(expense)) {
    return null;
  }
  const payments = getExpensePayments(expense);
  const shares = getExpenseShares(expense);
  const hasAllocation =
    payments.some((payment) => payment.participantId === participantId) ||
    shares.some((share) => share.participantId === participantId);
  if (!hasAllocation) {
    return null;
  }
  const myPaidMinor = sumAllocationsForParticipant(payments, participantId);
  const mySpentMinor = sumAllocationsForParticipant(shares, participantId);

  return {
    expense,
    currency: getExpenseCurrency(expense),
    myPaidMinor,
    mySpentMinor,
    myBalanceMinor: myPaidMinor - mySpentMinor,
  };
};

export const validateCanonicalExpense = (expense: Expense): boolean => {
  const amountMinor = getExpenseAmountMinor(expense);
  const payments = validAllocations(expense.payments, isPositiveMinorAmount);
  const shares = validAllocations(expense.shares, isNonNegativeMinorAmount);
  return (
    isPositiveMinorAmount(expense.amountMinor) &&
    typeof expense.currency === 'string' &&
    getCurrencyFractionDigits(expense.currency) !== null &&
    typeof expense.spaceId === 'string' &&
    expense.spaceId.length > 0 &&
    (expense.spaceKind === 'personal' || expense.spaceKind === 'shared') &&
    payments.length === expense.payments?.length &&
    shares.length === expense.shares?.length &&
    payments.reduce((sum, item) => sum + item.amountMinor, 0) === amountMinor &&
    shares.reduce((sum, item) => sum + item.amountMinor, 0) === amountMinor
  );
};
