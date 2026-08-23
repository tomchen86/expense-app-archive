// Groups screen contracts backed by shipped domain helpers.
import type { Expense, ExpenseGroup } from '../../types';
import { resolveSingleRouteParam } from '../../navigation/expense-edit-route';
import { calculateCurrentUserGroupSummaryByCurrency } from '../../utils/groupCalculations';
import { isExpenseGroupArchived } from '../../utils/groupDomain';

describe('GroupsScreen production contracts', () => {
  describe('group list display', () => {
    const group: ExpenseGroup = {
      id: 'group-1',
      name: 'Trip',
      participants: [
        { id: 'current-member', name: 'Current', userId: 'current-user' },
        { id: 'other-member', name: 'Other' },
      ],
      createdAt: '2026-08-20T00:00:00.000Z',
    };

    it('projects the current user share and net balance instead of a group total', () => {
      const expenses: Expense[] = [
        {
          id: 'expense-aud',
          title: 'Dinner',
          amountMinor: 6000,
          currency: 'AUD',
          date: '2026-08-24',
          category: 'Food & Dining',
          spaceId: group.id,
          spaceKind: 'shared',
          payments: [{ participantId: 'current-member', amountMinor: 6000 }],
          shares: [
            { participantId: 'current-member', amountMinor: 3000 },
            { participantId: 'other-member', amountMinor: 3000 },
          ],
        },
        {
          id: 'expense-usd',
          title: 'Taxi',
          amountMinor: 2000,
          currency: 'USD',
          date: '2026-08-24',
          category: 'Transportation',
          spaceId: group.id,
          spaceKind: 'shared',
          payments: [{ participantId: 'other-member', amountMinor: 2000 }],
          shares: [
            { participantId: 'current-member', amountMinor: 1000 },
            { participantId: 'other-member', amountMinor: 1000 },
          ],
        },
      ];

      expect(
        calculateCurrentUserGroupSummaryByCurrency(
          group,
          expenses,
          'current-user',
        ),
      ).toEqual([
        { currency: 'AUD', myShareMinor: 3000, myNetBalanceMinor: 3000 },
        { currency: 'USD', myShareMinor: 1000, myNetBalanceMinor: -1000 },
      ]);
    });

    it('keeps archived groups out of the active collection', () => {
      const archivedGroup = {
        ...group,
        id: 'archived-group',
        archivedAt: '2026-08-24T00:00:00.000Z',
      };

      expect(
        [group, archivedGroup].filter((item) => !isExpenseGroupArchived(item)),
      ).toEqual([group]);
    });
  });

  describe('balance calculations', () => {
    it('returns an explicit no-spending projection when the group has no expenses', () => {
      const group: ExpenseGroup = {
        id: 'empty-group',
        name: 'Empty',
        participants: [
          { id: 'current-member', name: 'Current', userId: 'current-user' },
        ],
        createdAt: '2026-08-24T00:00:00.000Z',
      };

      expect(
        calculateCurrentUserGroupSummaryByCurrency(group, [], 'current-user'),
      ).toEqual([]);
    });
  });

  describe('navigation to group details', () => {
    it('resolves the first Expo Router value for deep-link array params', () => {
      expect(resolveSingleRouteParam(['group-123', 'ignored'])).toBe(
        'group-123',
      );
    });
  });

  describe('identity safety', () => {
    it('does not invent a balance when the current member cannot be resolved', () => {
      const group: ExpenseGroup = {
        id: 'unresolved-group',
        name: 'Unresolved',
        participants: [{ id: 'someone-else', name: 'Someone Else' }],
        createdAt: '2026-08-24T00:00:00.000Z',
      };

      expect(
        calculateCurrentUserGroupSummaryByCurrency(group, [], 'missing-user'),
      ).toBeNull();
    });
  });
});
