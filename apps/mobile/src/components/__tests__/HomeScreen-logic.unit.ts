// Expenses screen contracts backed by shipped selectors and route builders.
import type { Expense } from '../../types';
import {
  buildCreateExpenseRoute,
  buildEditExpenseRoute,
  buildExpenseDetailRoute,
} from '../../navigation/expense-edit-route';
import {
  selectPersonalLedgerExpenses,
  sumPersonalShareMinor,
} from '../../utils/personalExpenseSelection';

describe('ExpensesScreen production contracts', () => {
  describe('expense list rendering logic', () => {
    it('shows personal expenses and shared-history projections without copying them', () => {
      const personalExpense: Expense = {
        id: 'personal-expense',
        title: 'Coffee',
        amountMinor: 500,
        currency: 'AUD',
        date: '2026-08-24',
        category: 'Food & Dining',
        spaceId: 'personal-space',
        spaceKind: 'personal',
        payments: [{ participantId: 'personal-member', amountMinor: 500 }],
        shares: [{ participantId: 'personal-member', amountMinor: 500 }],
      };
      const sharedExpense: Expense = {
        id: 'shared-expense',
        title: 'Dinner',
        amountMinor: 4000,
        currency: 'AUD',
        date: '2026-08-23',
        category: 'Food & Dining',
        spaceId: 'archived-group',
        spaceKind: 'shared',
        payments: [{ participantId: 'other-member', amountMinor: 4000 }],
        shares: [
          { participantId: 'current-member', amountMinor: 2000 },
          { participantId: 'other-member', amountMinor: 2000 },
        ],
      };
      const unrelatedExpense: Expense = {
        ...sharedExpense,
        id: 'unrelated-expense',
        spaceId: 'other-group',
        shares: [{ participantId: 'other-member', amountMinor: 4000 }],
      };

      const selected = selectPersonalLedgerExpenses(
        [personalExpense, sharedExpense, unrelatedExpense],
        {
          participantIds: ['personal-member', 'current-member'],
          personalSpaceId: 'personal-space',
        },
      );

      expect(selected).toEqual([personalExpense, sharedExpense]);
      expect(selected[1]).toBe(sharedExpense);
    });
  });

  describe('FAB button behavior', () => {
    it('uses the production modal route contract for a personal expense', () => {
      expect(buildCreateExpenseRoute()).toEqual({
        pathname: '/add-expense',
        params: { draftSessionId: expect.any(String) },
      });
    });

    it('uses the same production modal with a shared-space preselection', () => {
      expect(buildCreateExpenseRoute({ groupId: 'group-1' })).toEqual({
        pathname: '/add-expense',
        params: {
          draftSessionId: expect.any(String),
          groupId: 'group-1',
        },
      });
    });
  });

  describe('total calculations display', () => {
    it('uses the current participant allocation for a shared-history row', () => {
      const sharedExpense: Expense = {
        id: 'shared-expense',
        title: 'Dinner',
        amountMinor: 4000,
        currency: 'AUD',
        date: '2026-08-23',
        category: 'Food & Dining',
        spaceId: 'archived-group',
        spaceKind: 'shared',
        payments: [{ participantId: 'other-member', amountMinor: 4000 }],
        shares: [
          { participantId: 'current-member', amountMinor: 1500 },
          { participantId: 'other-member', amountMinor: 2500 },
        ],
      };

      expect(sumPersonalShareMinor(sharedExpense, ['current-member'])).toBe(
        1500,
      );
    });
  });

  describe('empty state handling', () => {
    it('derives an empty personal ledger from the production selector', () => {
      expect(
        selectPersonalLedgerExpenses([], {
          participantIds: ['current-participant'],
          personalSpaceId: 'personal-space',
        }),
      ).toEqual([]);
    });
  });

  describe('expense item display logic', () => {
    it('opens the detail route when the whole expense card is tapped', () => {
      expect(buildExpenseDetailRoute('exp-123')).toEqual({
        pathname: '/expense-detail',
        params: { expenseId: 'exp-123' },
      });
    });

    it('keeps editing as an explicit detail action using the modal form route', () => {
      expect(buildEditExpenseRoute('exp-123')).toEqual({
        pathname: '/add-expense',
        params: {
          draftSessionId: expect.stringMatching(/^edit:exp-123:/),
          expenseId: 'exp-123',
        },
      });
    });
  });
});
