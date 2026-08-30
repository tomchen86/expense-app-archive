import type { Expense, Participant } from '../../types';
import {
  getExpenseAmountMinor,
  getExpenseShares,
  getPersonalExpenseProjection,
  validateCanonicalExpense,
} from '../expenseDomain';
import { calculateAllMemberBalancesInGroup } from '../groupCalculations';

const canonicalExpense: Expense = {
  id: 'expense-1',
  title: 'Dinner',
  amountMinor: 10000,
  currency: 'AUD',
  date: '2026-08-13',
  category: 'Food & Dining',
  spaceId: 'space-trip',
  spaceKind: 'shared',
  payments: [{ participantId: 'alice', amountMinor: 10000 }],
  shares: [
    { participantId: 'alice', amountMinor: 2000 },
    { participantId: 'bob', amountMinor: 3000 },
    { participantId: 'chris', amountMinor: 5000 },
  ],
  sync: {
    mutationId: 'mutation-1',
    serverVersion: 0,
    localRevision: 1,
    status: 'pending',
    updatedAt: '2026-08-13T00:00:00.000Z',
  },
};

describe('canonical expense projections', () => {
  it('distinguishes what a user paid, spent, and is owed', () => {
    expect(getPersonalExpenseProjection(canonicalExpense, 'alice')).toEqual({
      expense: canonicalExpense,
      currency: 'AUD',
      myPaidMinor: 10000,
      mySpentMinor: 2000,
      myBalanceMinor: 8000,
    });
    expect(getPersonalExpenseProjection(canonicalExpense, 'bob')).toEqual({
      expense: canonicalExpense,
      currency: 'AUD',
      myPaidMinor: 0,
      mySpentMinor: 3000,
      myBalanceMinor: -3000,
    });
  });

  it('keeps departed participants in historical balances', () => {
    const activeMembers: Participant[] = [{ id: 'alice', name: 'Alice' }];
    const allParticipants: Participant[] = [
      ...activeMembers,
      { id: 'bob', name: 'Bob (left)' },
      { id: 'chris', name: 'Chris (left)' },
    ];

    const balances = calculateAllMemberBalancesInGroup(
      activeMembers,
      [canonicalExpense],
      allParticipants,
    );

    expect(balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: 'alice',
          totalPaidMinor: 10000,
          totalShareMinor: 2000,
          netBalanceMinor: 8000,
        }),
        expect.objectContaining({
          memberId: 'bob',
          memberName: 'Bob (left)',
          totalShareMinor: 3000,
          netBalanceMinor: -3000,
        }),
        expect.objectContaining({
          memberId: 'chris',
          totalShareMinor: 5000,
          netBalanceMinor: -5000,
        }),
      ]),
    );
    expect(balances.reduce((sum, item) => sum + item.netBalanceMinor, 0)).toBe(
      0,
    );
  });

  it('does not fabricate money from a record missing canonical minor units', () => {
    const invalidPersistedRecord = {
      ...canonicalExpense,
      amountMinor: undefined,
    } as unknown as Expense;

    expect(getExpenseAmountMinor(invalidPersistedRecord)).toBe(0);
    expect(validateCanonicalExpense(invalidPersistedRecord)).toBe(false);
  });

  it('preserves a zero-cent share in a balanced canonical expense', () => {
    const oneCentExpense: Expense = {
      ...canonicalExpense,
      amountMinor: 1,
      payments: [{ participantId: 'alice', amountMinor: 1 }],
      shares: [
        { participantId: 'alice', amountMinor: 1 },
        { participantId: 'bob', amountMinor: 0 },
      ],
    };

    expect(getExpenseShares(oneCentExpense)).toEqual(oneCentExpense.shares);
    expect(validateCanonicalExpense(oneCentExpense)).toBe(true);
  });

  it('projects an explicit zero-cent share as participation', () => {
    const oneCentExpense: Expense = {
      ...canonicalExpense,
      amountMinor: 1,
      payments: [{ participantId: 'alice', amountMinor: 1 }],
      shares: [
        { participantId: 'alice', amountMinor: 1 },
        { participantId: 'bob', amountMinor: 0 },
      ],
    };

    expect(getPersonalExpenseProjection(oneCentExpense, 'bob')).toEqual({
      expense: oneCentExpense,
      currency: 'AUD',
      myPaidMinor: 0,
      mySpentMinor: 0,
      myBalanceMinor: 0,
    });
  });
});
