import type { Expense, ExpenseGroup, Participant } from '../../types';
import { buildExpenseDetailProjection } from '../expense-detail-projection';

const participants: Participant[] = [
  { id: 'tom', name: 'Tom', userId: 'user-tom' },
  { id: 'sharon', name: 'Sharon' },
  { id: 'alex', name: 'Alex' },
];

const group: ExpenseGroup = {
  id: 'group-brisbane',
  name: 'Brisbane',
  participants,
  createdAt: '2026-08-01T00:00:00.000Z',
};

const dinner: Expense = {
  id: 'expense-dinner',
  title: 'Dinner',
  amountMinor: 6_000,
  currency: 'USD',
  date: '2026-08-24',
  category: 'Food & Dining',
  spaceId: group.id,
  spaceKind: 'shared',
  payments: [{ participantId: 'tom', amountMinor: 6_000 }],
  shares: [
    { participantId: 'tom', amountMinor: 2_000 },
    { participantId: 'sharon', amountMinor: 2_000 },
    { participantId: 'alex', amountMinor: 2_000 },
  ],
};

describe('expense detail projection', () => {
  it('separates original total, paid, share, and net position', () => {
    expect(
      buildExpenseDetailProjection({
        currentParticipantIds: ['tom'],
        expense: dinner,
        group,
        participants,
      }),
    ).toEqual({
      amountMinor: 6_000,
      currency: 'USD',
      myBalanceMinor: 4_000,
      myPaidMinor: 6_000,
      myShareMinor: 2_000,
      paymentRows: [{ participantId: 'tom', name: 'Tom', amountMinor: 6_000 }],
      shareRows: [
        { participantId: 'tom', name: 'Tom', amountMinor: 2_000 },
        {
          participantId: 'sharon',
          name: 'Sharon',
          amountMinor: 2_000,
        },
        { participantId: 'alex', name: 'Alex', amountMinor: 2_000 },
      ],
    });
  });

  it('aggregates duplicate allocations and all current identity aliases', () => {
    const expense: Expense = {
      ...dinner,
      payments: [
        { participantId: 'tom', amountMinor: 1_000 },
        { participantId: 'tom', amountMinor: 500 },
        { participantId: 'legacy-tom', amountMinor: 1_500 },
        { participantId: 'former-payer', amountMinor: 3_000 },
      ],
      shares: [
        { participantId: 'tom', amountMinor: 1_000 },
        { participantId: 'legacy-tom', amountMinor: 1_000 },
        { participantId: 'former-payer', amountMinor: 4_000 },
      ],
    };

    const projection = buildExpenseDetailProjection({
      currentParticipantIds: ['tom', 'legacy-tom'],
      expense,
      group,
      participants,
    });

    expect(projection.myPaidMinor).toBe(3_000);
    expect(projection.myShareMinor).toBe(2_000);
    expect(projection.myBalanceMinor).toBe(1_000);
    expect(projection.paymentRows).toEqual([
      { participantId: 'tom', name: 'Tom', amountMinor: 1_500 },
      {
        participantId: 'legacy-tom',
        name: 'You',
        amountMinor: 1_500,
      },
      {
        participantId: 'former-payer',
        name: 'Former member',
        amountMinor: 3_000,
      },
    ]);
  });

  it('uses archived group membership to preserve historical names', () => {
    const archivedGroup: ExpenseGroup = {
      ...group,
      archivedAt: '2026-08-24T01:00:00.000Z',
      participants: [...participants, { id: 'former-payer', name: 'Blake' }],
    };
    const expense: Expense = {
      ...dinner,
      payments: [{ participantId: 'former-payer', amountMinor: 6_000 }],
    };

    expect(
      buildExpenseDetailProjection({
        currentParticipantIds: ['tom'],
        expense,
        group: archivedGroup,
        participants,
      }).paymentRows,
    ).toEqual([
      {
        participantId: 'former-payer',
        name: 'Blake',
        amountMinor: 6_000,
      },
    ]);
  });

  it('prefers the archived group name over a later global profile rename', () => {
    const archivedGroup: ExpenseGroup = {
      ...group,
      archivedAt: '2026-08-24T01:00:00.000Z',
      participants: participants.map((participant) =>
        participant.id === 'tom'
          ? { ...participant, name: 'Tom at the time' }
          : participant,
      ),
    };

    expect(
      buildExpenseDetailProjection({
        currentParticipantIds: ['tom'],
        expense: dinner,
        group: archivedGroup,
        participants,
      }).paymentRows[0].name,
    ).toBe('Tom at the time');
  });

  it('projects canonical payment and share allocations', () => {
    const canonicalExpense: Expense = {
      id: 'canonical-expense',
      title: 'Dinner',
      amountMinor: 6000,
      currency: 'USD',
      date: '2026-08-24',
      category: 'Food & Dining',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [{ participantId: 'tom', amountMinor: 6000 }],
      shares: [
        { participantId: 'tom', amountMinor: 2000 },
        { participantId: 'sharon', amountMinor: 2000 },
        { participantId: 'alex', amountMinor: 2000 },
      ],
    };

    const projection = buildExpenseDetailProjection({
      currentParticipantIds: ['tom'],
      expense: canonicalExpense,
      group,
      participants,
    });

    expect(projection.amountMinor).toBe(6_000);
    expect(projection.myPaidMinor).toBe(6_000);
    expect(projection.myShareMinor).toBe(2_000);
    expect(projection.myBalanceMinor).toBe(4_000);
    expect(projection.shareRows.map((row) => row.amountMinor)).toEqual([
      2_000, 2_000, 2_000,
    ]);
  });
});
