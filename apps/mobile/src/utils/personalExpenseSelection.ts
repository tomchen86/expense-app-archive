import type { Expense, Participant } from '../types';
import {
  getExpenseAmountMinor,
  getExpensePayments,
  getExpenseShares,
  getExpenseSpaceId,
  getExpenseSpaceKind,
  isExpenseDeleted,
} from './expenseDomain';

interface ResolvePersonalParticipantIdsOptions {
  userId: string | null | undefined;
  participants: Participant[];
  personalParticipantId: string | null | undefined;
}

interface PersonalLedgerSelectionOptions {
  participantIds: readonly string[];
  personalSpaceId: string | null | undefined;
}

const uniqueNonEmptyIds = (ids: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      ids.filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  );

export const resolvePersonalParticipantIds = ({
  userId,
  participants,
  personalParticipantId,
}: ResolvePersonalParticipantIdsOptions): string[] =>
  uniqueNonEmptyIds([
    personalParticipantId,
    ...(userId
      ? participants
          .filter((participant) => participant.userId === userId)
          .map((participant) => participant.id)
      : []),
  ]);

const hasCandidateAllocation = (
  expense: Expense,
  participantIds: ReadonlySet<string>,
): boolean =>
  getExpensePayments(expense).some((payment) =>
    participantIds.has(payment.participantId),
  ) ||
  getExpenseShares(expense).some((share) =>
    participantIds.has(share.participantId),
  );

export const selectPersonalLedgerExpenses = (
  expenses: Expense[],
  { participantIds, personalSpaceId }: PersonalLedgerSelectionOptions,
): Expense[] => {
  const candidateIds = new Set(uniqueNonEmptyIds([...participantIds]));
  const hasPersonalSpace =
    typeof personalSpaceId === 'string' && personalSpaceId.length > 0;

  return expenses.filter(
    (expense) =>
      !isExpenseDeleted(expense) &&
      ((hasPersonalSpace &&
        getExpenseSpaceKind(expense) === 'personal' &&
        getExpenseSpaceId(expense) === personalSpaceId) ||
        hasCandidateAllocation(expense, candidateIds)),
  );
};

export const sumPersonalShareMinor = (
  expense: Expense,
  participantIds: readonly string[],
  personalSpaceId?: string | null,
): number => {
  if (isExpenseDeleted(expense)) {
    return 0;
  }
  if (
    personalSpaceId &&
    getExpenseSpaceKind(expense) === 'personal' &&
    getExpenseSpaceId(expense) === personalSpaceId
  ) {
    return getExpenseAmountMinor(expense);
  }
  const candidateIds = new Set(uniqueNonEmptyIds([...participantIds]));
  return getExpenseShares(expense)
    .filter((share) => candidateIds.has(share.participantId))
    .reduce((sum, share) => sum + share.amountMinor, 0);
};
