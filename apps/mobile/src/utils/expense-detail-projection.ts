import type {
  Expense,
  ExpenseGroup,
  MoneyAllocation,
  Participant,
} from '../types';
import {
  getExpenseAmountMinor,
  getExpenseCurrency,
  getExpensePayments,
  getExpenseShares,
} from './expenseDomain';

export interface ExpenseDetailAllocationRow {
  participantId: string;
  name: string;
  amountMinor: number;
}

export interface ExpenseDetailProjection {
  amountMinor: number;
  currency: string;
  myPaidMinor: number;
  myShareMinor: number;
  myBalanceMinor: number;
  paymentRows: ExpenseDetailAllocationRow[];
  shareRows: ExpenseDetailAllocationRow[];
}

interface BuildExpenseDetailProjectionOptions {
  currentParticipantIds: readonly string[];
  expense: Expense;
  group?: ExpenseGroup;
  participants: Participant[];
}

const aggregateAllocations = (
  allocations: MoneyAllocation[],
  participantNames: ReadonlyMap<string, string>,
  currentParticipantIds: ReadonlySet<string>,
): ExpenseDetailAllocationRow[] => [
  ...allocations
    .reduce((rows, allocation) => {
      const existing = rows.get(allocation.participantId);
      rows.set(allocation.participantId, {
        participantId: allocation.participantId,
        name:
          participantNames.get(allocation.participantId) ??
          (currentParticipantIds.has(allocation.participantId)
            ? 'You'
            : 'Former member'),
        amountMinor: (existing?.amountMinor ?? 0) + allocation.amountMinor,
      });
      return rows;
    }, new Map<string, ExpenseDetailAllocationRow>())
    .values(),
];

export const buildExpenseDetailProjection = ({
  currentParticipantIds,
  expense,
  group,
  participants,
}: BuildExpenseDetailProjectionOptions): ExpenseDetailProjection => {
  const currentParticipantIdSet = new Set(currentParticipantIds);
  const participantNames = new Map<string, string>();
  participants.forEach((participant) =>
    participantNames.set(participant.id, participant.name),
  );
  group?.participants.forEach((participant) =>
    participantNames.set(participant.id, participant.name),
  );

  const paymentRows = aggregateAllocations(
    getExpensePayments(expense),
    participantNames,
    currentParticipantIdSet,
  );
  const shareRows = aggregateAllocations(
    getExpenseShares(expense),
    participantNames,
    currentParticipantIdSet,
  );
  const myPaidMinor = paymentRows
    .filter((row) => currentParticipantIdSet.has(row.participantId))
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const myShareMinor = shareRows
    .filter((row) => currentParticipantIdSet.has(row.participantId))
    .reduce((sum, row) => sum + row.amountMinor, 0);

  return {
    amountMinor: getExpenseAmountMinor(expense),
    currency: getExpenseCurrency(expense),
    myPaidMinor,
    myShareMinor,
    myBalanceMinor: myPaidMinor - myShareMinor,
    paymentRows,
    shareRows,
  };
};
