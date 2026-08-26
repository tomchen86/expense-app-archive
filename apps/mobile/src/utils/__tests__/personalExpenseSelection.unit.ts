import type { Expense, Participant } from '../../types';
import {
  resolvePersonalParticipantIds,
  selectPersonalLedgerExpenses,
  sumPersonalShareMinor,
} from '../personalExpenseSelection';

const expense = (id: string, overrides: Partial<Expense> = {}): Expense => ({
  id,
  title: id,
  amountMinor: 100,
  currency: 'AUD',
  date: '2026-08-24',
  category: 'Other',
  spaceId: 'shared-space',
  spaceKind: 'shared',
  payments: [{ participantId: 'other', amountMinor: 100 }],
  shares: [{ participantId: 'other', amountMinor: 100 }],
  ...overrides,
});

describe('personal ledger expense selection', () => {
  it('resolves canonical, account-linked, and bare legacy participant identities once', () => {
    const participants: Participant[] = [
      {
        id: 'linked-participant',
        name: 'Linked',
        userId: 'legacy-user',
      },
      {
        id: 'personal-participant',
        name: 'Duplicate canonical link',
        userId: 'legacy-user',
      },
      { id: 'unrelated', name: 'Unrelated', userId: 'other-user' },
    ];

    expect(
      resolvePersonalParticipantIds({
        userId: 'legacy-user',
        participants,
        personalParticipantId: 'personal-participant',
      }),
    ).toEqual(['personal-participant', 'linked-participant']);
  });

  it('selects personal-space, paid-only, share-only, and zero-share expenses', () => {
    const participantIds = ['personal-participant', 'legacy-user'];
    const expenses = [
      expense('personal-space-expense', {
        spaceId: 'personal-space',
        spaceKind: 'personal',
      }),
      expense('paid-only', {
        payments: [{ participantId: 'legacy-user', amountMinor: 100 }],
      }),
      expense('share-only', {
        shares: [{ participantId: 'personal-participant', amountMinor: 100 }],
      }),
      expense('zero-share', {
        amountMinor: 1,
        payments: [{ participantId: 'other', amountMinor: 1 }],
        shares: [
          { participantId: 'other', amountMinor: 1 },
          { participantId: 'personal-participant', amountMinor: 0 },
        ],
      }),
    ];

    expect(
      selectPersonalLedgerExpenses(expenses, {
        participantIds,
        personalSpaceId: 'personal-space',
      }).map(({ id }) => id),
    ).toEqual([
      'personal-space-expense',
      'paid-only',
      'share-only',
      'zero-share',
    ]);
  });

  it('excludes tombstones and unrelated expenses without consulting group lifecycle', () => {
    const archivedGroupExpense = expense('archived-group-share', {
      spaceId: 'archived-group',
      shares: [{ participantId: 'personal-participant', amountMinor: 100 }],
    });
    const tombstone = expense('deleted-share', {
      shares: [{ participantId: 'personal-participant', amountMinor: 100 }],
      sync: {
        mutationId: 'delete-mutation',
        serverVersion: 0,
        localRevision: 1,
        status: 'pending',
        updatedAt: '2026-08-24T00:00:00.000Z',
        deletedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    expect(
      selectPersonalLedgerExpenses(
        [archivedGroupExpense, tombstone, expense('unrelated')],
        {
          participantIds: ['personal-participant'],
          personalSpaceId: 'personal-space',
        },
      ).map(({ id }) => id),
    ).toEqual(['archived-group-share']);
  });

  it('sums only candidate share allocations, never their payments', () => {
    const paidAndShared = expense('paid-and-shared', {
      amountMinor: 100,
      payments: [{ participantId: 'legacy-user', amountMinor: 100 }],
      shares: [
        { participantId: 'personal-participant', amountMinor: 30 },
        { participantId: 'other', amountMinor: 70 },
      ],
    });

    expect(
      sumPersonalShareMinor(paidAndShared, [
        'personal-participant',
        'legacy-user',
        'personal-participant',
      ]),
    ).toBe(30);
  });

  it('counts the full amount for a matching personal-space expense with stale allocations', () => {
    const importedPersonalExpense = expense('imported-personal', {
      amountMinor: 900,
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'stale-participant', amountMinor: 900 }],
      shares: [{ participantId: 'stale-participant', amountMinor: 900 }],
    });

    expect(
      sumPersonalShareMinor(
        importedPersonalExpense,
        ['personal-participant'],
        'personal-space',
      ),
    ).toBe(900);
  });
});
