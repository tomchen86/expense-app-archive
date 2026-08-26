import {
  calculateAllMemberBalancesInGroup,
  calculateCurrentUserGroupSummaryByCurrency,
  resolveGroupParticipantIdForUser,
} from '../groupCalculations';
import type { Expense, ExpenseGroup, Participant } from '../../types';

describe('groupCalculations', () => {
  const members: Participant[] = [
    { id: 'user-1', name: 'Alice' },
    { id: 'user-2', name: 'Bob' },
    { id: 'user-3', name: 'Chris' },
  ];

  const expenses: Expense[] = [
    {
      id: '1',
      title: 'Dinner',
      amountMinor: 9000,
      currency: 'USD',
      date: '2025-01-01',
      category: 'Food & Dining',
      spaceId: 'group-1',
      spaceKind: 'shared',
      payments: [{ participantId: 'user-1', amountMinor: 9000 }],
      shares: [
        { participantId: 'user-1', amountMinor: 3000 },
        { participantId: 'user-2', amountMinor: 3000 },
        { participantId: 'user-3', amountMinor: 3000 },
      ],
    },
    {
      id: '2',
      title: 'Groceries',
      amountMinor: 4500,
      currency: 'USD',
      date: '2025-01-02',
      category: 'Food & Dining',
      spaceId: 'group-1',
      spaceKind: 'shared',
      payments: [{ participantId: 'user-2', amountMinor: 4500 }],
      shares: [
        { participantId: 'user-1', amountMinor: 2250 },
        { participantId: 'user-2', amountMinor: 2250 },
      ],
    },
    {
      id: '3',
      title: 'Travel',
      amountMinor: 12000,
      currency: 'USD',
      date: '2025-01-03',
      category: 'Travel',
      spaceId: 'group-2',
      spaceKind: 'shared',
      payments: [{ participantId: 'user-3', amountMinor: 12000 }],
      shares: [{ participantId: 'user-3', amountMinor: 12000 }],
    },
  ];

  it('resolves an account identity to its distinct participant in a shared space', () => {
    const canonicalGroup: ExpenseGroup = {
      id: 'group-1',
      name: 'Trip',
      createdAt: '2026-08-13T00:00:00.000Z',
      participants: [
        {
          id: 'participant-alice',
          userId: 'account-alice',
          spaceId: 'group-1',
          name: 'Alice',
        },
      ],
    };

    expect(
      resolveGroupParticipantIdForUser(canonicalGroup, 'account-alice'),
    ).toBe('participant-alice');
    expect(
      resolveGroupParticipantIdForUser(canonicalGroup, 'account-bob'),
    ).toBeNull();
    expect(resolveGroupParticipantIdForUser(canonicalGroup, null)).toBeNull();
  });

  it('calculates balances for each member', () => {
    const groupExpenses = expenses.filter((exp) => exp.spaceId === 'group-1');
    const balances = calculateAllMemberBalancesInGroup(members, groupExpenses);

    const alice = balances.find((balance) => balance.memberId === 'user-1');
    const bob = balances.find((balance) => balance.memberId === 'user-2');
    const chris = balances.find((balance) => balance.memberId === 'user-3');

    expect(alice).toMatchObject({ totalPaid: 90 });
    expect(bob).toMatchObject({ totalPaid: 45 });
    expect(chris).toMatchObject({ totalPaid: 0 });

    const totalShares = balances.map((balance) => balance.totalShare);
    expect(totalShares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(135);
  });

  it('retains historical allocation participants when no members remain', () => {
    const result = calculateAllMemberBalancesInGroup([], expenses);
    expect(result.map((balance) => balance.memberId)).toEqual(
      expect.arrayContaining(['user-1', 'user-2', 'user-3']),
    );
    expect(
      result.reduce((sum, balance) => sum + balance.netBalanceMinor, 0),
    ).toBe(0);
  });

  it('projects the current user share and aggregate balance per currency', () => {
    const group: ExpenseGroup = {
      id: 'shared-space',
      name: 'Household',
      createdAt: '2026-08-20T00:00:00.000Z',
      participants: [
        {
          id: 'participant-alex',
          name: 'Alex',
          userId: 'account-alex',
          spaceId: 'shared-space',
        },
        {
          id: 'participant-blake',
          name: 'Blake',
          spaceId: 'shared-space',
        },
      ],
    };
    const sharedExpenses: Expense[] = [
      {
        id: 'aud-expense',
        title: 'Groceries',
        amountMinor: 10_000,
        currency: 'AUD',
        date: '2026-08-20',
        category: 'Food & Dining',
        spaceId: group.id,
        spaceKind: 'shared',
        payments: [{ participantId: 'participant-alex', amountMinor: 10_000 }],
        shares: [
          { participantId: 'participant-alex', amountMinor: 6_000 },
          { participantId: 'participant-blake', amountMinor: 4_000 },
        ],
      },
      {
        id: 'usd-expense',
        title: 'Tickets',
        amountMinor: 5_000,
        currency: 'USD',
        date: '2026-08-21',
        category: 'Entertainment',
        spaceId: group.id,
        spaceKind: 'shared',
        payments: [{ participantId: 'participant-blake', amountMinor: 5_000 }],
        shares: [
          { participantId: 'participant-alex', amountMinor: 2_000 },
          { participantId: 'participant-blake', amountMinor: 3_000 },
        ],
      },
    ];

    expect(
      calculateCurrentUserGroupSummaryByCurrency(
        group,
        sharedExpenses,
        'account-alex',
      ),
    ).toEqual([
      {
        currency: 'AUD',
        myNetBalanceMinor: 4_000,
        myShareMinor: 6_000,
      },
      {
        currency: 'USD',
        myNetBalanceMinor: -2_000,
        myShareMinor: 2_000,
      },
    ]);
  });

  it('filters unrelated and deleted expenses and distinguishes unresolved identity', () => {
    const group: ExpenseGroup = {
      id: 'shared-space',
      name: 'Household',
      createdAt: '2026-08-20T00:00:00.000Z',
      participants: [
        {
          id: 'participant-alex',
          name: 'Alex',
          userId: 'account-alex',
        },
      ],
    };
    const deletedExpense: Expense = {
      id: 'deleted',
      title: 'Deleted',
      amountMinor: 1_000,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Other',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [{ participantId: 'participant-alex', amountMinor: 1_000 }],
      shares: [{ participantId: 'participant-alex', amountMinor: 1_000 }],
      sync: {
        mutationId: 'delete-mutation',
        serverVersion: 0,
        localRevision: 1,
        status: 'pending',
        updatedAt: '2026-08-24T00:00:00.000Z',
        deletedAt: '2026-08-24T00:00:00.000Z',
      },
    };
    const unrelatedExpense: Expense = {
      ...deletedExpense,
      id: 'other-space',
      spaceId: 'other-space',
      sync: undefined,
    };

    expect(
      calculateCurrentUserGroupSummaryByCurrency(
        group,
        [deletedExpense, unrelatedExpense],
        'account-alex',
      ),
    ).toEqual([]);
    expect(
      calculateCurrentUserGroupSummaryByCurrency(
        group,
        [unrelatedExpense],
        'unknown-account',
      ),
    ).toBeNull();
  });
});
