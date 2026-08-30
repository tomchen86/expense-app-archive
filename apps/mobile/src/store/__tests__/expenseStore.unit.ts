import {
  getExpenseMutationVersion,
  useExpenseStore,
} from '../features/expenseStore';
import { mockExpenses, createMockExpense } from '../../__tests__/fixtures';
import type { Expense, ExpenseSyncStatus } from '../../types';

const createSharedExpenseWithSync = (
  status: ExpenseSyncStatus,
  serverVersion: number,
): Expense => ({
  id: `shared-${status}-${serverVersion}`,
  title: 'Shared expense',
  amountMinor: 2500,
  currency: 'AUD',
  date: '2026-08-24',
  category: 'Other',
  spaceId: 'shared-space',
  spaceKind: 'shared',
  payments: [{ participantId: 'payer', amountMinor: 2500 }],
  shares: [{ participantId: 'member', amountMinor: 2500 }],
  sync: {
    mutationId: `mutation-${status}-${serverVersion}`,
    serverVersion,
    localRevision: 1,
    status,
    updatedAt: '2026-08-24T00:00:00.000Z',
  },
});

describe('ExpenseStore', () => {
  let randomSpy: jest.SpiedFunction<typeof Math.random>;

  beforeEach(() => {
    // Reset store state and provide deterministic IDs
    useExpenseStore.setState({ expenses: [] });
    let counter = 1;
    randomSpy = jest.spyOn(Math, 'random').mockImplementation(() => {
      const value = counter / 1000;
      counter += 1;
      return value;
    });
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  describe('addExpense', () => {
    it('should add expense with generated ID', () => {
      const expense = createMockExpense({
        title: 'Test Expense',
        amountMinor: 2550,
        date: '2025-09-19',
      });

      useExpenseStore.getState().addExpense(expense);
      const expenses = useExpenseStore.getState().expenses;

      const { id: _id, ...expectedFields } = expense;

      expect(expenses).toHaveLength(1);
      expect(expenses[0]).toMatchObject({
        ...expectedFields,
        id: expect.any(String),
      });
    });

    it('should sort expenses by date descending (newest first)', () => {
      const expense1 = createMockExpense({
        title: 'Older Expense',
        date: '2025-09-17',
      });
      const expense2 = createMockExpense({
        title: 'Newer Expense',
        date: '2025-09-19',
      });

      useExpenseStore.getState().addExpense(expense1);
      useExpenseStore.getState().addExpense(expense2);

      const expenses = useExpenseStore.getState().expenses;
      expect(expenses[0].title).toBe('Newer Expense');
      expect(expenses[1].title).toBe('Older Expense');
    });

    it('should handle expenses with same date', () => {
      const expense1 = createMockExpense({
        title: 'First Expense',
        date: '2025-09-19',
      });
      const expense2 = createMockExpense({
        title: 'Second Expense',
        date: '2025-09-19',
      });

      useExpenseStore.getState().addExpense(expense1);
      useExpenseStore.getState().addExpense(expense2);

      const expenses = useExpenseStore.getState().expenses;
      expect(expenses).toHaveLength(2);
      // Both should be present, order may vary for same date
      expect(expenses.map((e) => e.title)).toContain('First Expense');
      expect(expenses.map((e) => e.title)).toContain('Second Expense');
    });

    it('should handle group expenses', () => {
      const groupExpense = createMockExpense({
        title: 'Group Lunch',
        amountMinor: 5000,
        spaceId: 'group-1',
        spaceKind: 'shared',
        payments: [{ participantId: 'user-1', amountMinor: 5000 }],
        shares: [
          { participantId: 'user-1', amountMinor: 2500 },
          { participantId: 'user-2', amountMinor: 2500 },
        ],
      });

      useExpenseStore.getState().addExpense(groupExpense);
      const expenses = useExpenseStore.getState().expenses;

      const { id: _id, ...expectedGroupFields } = groupExpense;

      expect(expenses[0]).toMatchObject({
        ...expectedGroupFields,
        id: expect.any(String),
      });
      expect(expenses[0].spaceId).toBe('group-1');
      expect(expenses[0].payments).toEqual([
        { participantId: 'user-1', amountMinor: 5000 },
      ]);
      expect(expenses[0].shares).toEqual([
        { participantId: 'user-1', amountMinor: 2500 },
        { participantId: 'user-2', amountMinor: 2500 },
      ]);
    });
  });

  describe('updateExpense', () => {
    it('advances only local revision while preserving the last server version', () => {
      const expense = createMockExpense({
        title: 'Offline edit',
        amountMinor: 2500,
        currency: 'USD',
        categoryId: 'a4d1ab87-d102-4795-b9fa-706bc9e13975',
        spaceId: 'bb7178d8-09e8-43ac-ab4c-c6a6a2ef9ddc',
        spaceKind: 'shared',
        payments: [
          {
            participantId: '8f785006-c58a-47f9-84ac-d67620969ad0',
            amountMinor: 2500,
          },
        ],
        shares: [
          {
            participantId: '8f785006-c58a-47f9-84ac-d67620969ad0',
            amountMinor: 2500,
          },
        ],
      });
      useExpenseStore.getState().addExpense(expense);
      const created = useExpenseStore.getState().expenses[0];
      useExpenseStore.setState({
        expenses: [
          {
            ...created,
            sync: {
              ...created.sync!,
              serverVersion: 7,
              localRevision: 0,
              status: 'synced',
            },
          },
        ],
      });

      useExpenseStore.getState().updateExpense({
        ...useExpenseStore.getState().expenses[0],
        title: 'Edited once',
      });
      useExpenseStore.getState().updateExpense({
        ...useExpenseStore.getState().expenses[0],
        title: 'Edited twice',
      });

      expect(useExpenseStore.getState().expenses[0].sync).toMatchObject({
        serverVersion: 7,
        localRevision: 2,
        status: 'pending',
      });
      expect(useExpenseStore.getState().expenses[0].categoryId).toBe(
        'a4d1ab87-d102-4795-b9fa-706bc9e13975',
      );
    });
    it('should update existing expense', () => {
      const expense = createMockExpense({
        title: 'Original Title',
        amountMinor: 2500,
      });

      useExpenseStore.getState().addExpense(expense);
      const addedExpense = useExpenseStore.getState().expenses[0];

      const updatedExpense = {
        ...addedExpense,
        title: 'Updated Title',
        amountMinor: 3000,
        payments: [{ participantId: 'user-1', amountMinor: 3000 }],
        shares: [{ participantId: 'user-1', amountMinor: 3000 }],
      };

      useExpenseStore.getState().updateExpense(updatedExpense);
      const expenses = useExpenseStore.getState().expenses;

      expect(expenses).toHaveLength(1);
      expect(expenses[0].title).toBe('Updated Title');
      expect(expenses[0].amountMinor).toBe(3000);
      expect(expenses[0].id).toBe(addedExpense.id);
    });

    it('should maintain sort order after update', () => {
      const expense1 = createMockExpense({
        title: 'Expense 1',
        date: '2025-09-17',
      });
      const expense2 = createMockExpense({
        title: 'Expense 2',
        date: '2025-09-19',
      });

      useExpenseStore.getState().addExpense(expense1);
      useExpenseStore.getState().addExpense(expense2);

      const expenses = useExpenseStore.getState().expenses;
      const olderExpense = expenses.find((e) => e.title === 'Expense 1');

      // Update older expense to newer date
      const updatedExpense = {
        ...olderExpense!,
        date: '2025-09-20',
      };

      useExpenseStore.getState().updateExpense(updatedExpense);
      const updatedExpenses = useExpenseStore.getState().expenses;

      // Should now be first (newest)
      expect(updatedExpenses[0].title).toBe('Expense 1');
      expect(updatedExpenses[0].date).toBe('2025-09-20');
    });

    it('should not affect other expenses', () => {
      const expense1 = createMockExpense({ title: 'Expense 1' });
      const expense2 = createMockExpense({ title: 'Expense 2' });

      useExpenseStore.getState().addExpense(expense1);
      useExpenseStore.getState().addExpense(expense2);

      const expenses = useExpenseStore.getState().expenses;
      const targetExpense = expenses.find((e) => e.title === 'Expense 1');

      useExpenseStore.getState().updateExpense({
        ...targetExpense!,
        title: 'Updated Expense 1',
      });

      const updatedExpenses = useExpenseStore.getState().expenses;
      expect(updatedExpenses).toHaveLength(2);
      expect(
        updatedExpenses.find((e) => e.title === 'Updated Expense 1'),
      ).toBeDefined();
      expect(
        updatedExpenses.find((e) => e.title === 'Expense 2'),
      ).toBeDefined();
    });
  });

  describe('deleteExpense', () => {
    it('hard-discards a pending shared create that has never been acknowledged', () => {
      const pendingCreate = createSharedExpenseWithSync('pending', 0);
      useExpenseStore.setState({ expenses: [pendingCreate] });

      useExpenseStore.getState().deleteExpense(pendingCreate.id);

      expect(useExpenseStore.getState().expenses).toEqual([]);
    });

    it('tombstones a pending shared update that has a server version', () => {
      const pendingUpdate = createSharedExpenseWithSync('pending', 4);
      useExpenseStore.setState({ expenses: [pendingUpdate] });

      useExpenseStore.getState().deleteExpense(pendingUpdate.id);

      expect(useExpenseStore.getState().expenses).toEqual([
        expect.objectContaining({
          id: pendingUpdate.id,
          sync: expect.objectContaining({
            deletedAt: expect.any(String),
            localRevision: 2,
            serverVersion: 4,
            status: 'pending',
          }),
        }),
      ]);
    });

    it('does not hard-discard an in-flight zero-version shared create', () => {
      const syncingCreate = createSharedExpenseWithSync('syncing', 0);
      useExpenseStore.setState({ expenses: [syncingCreate] });

      useExpenseStore.getState().deleteExpense(syncingCreate.id);
      useExpenseStore.getState().deleteExpense(syncingCreate.id);

      expect(useExpenseStore.getState().expenses).toEqual([
        expect.objectContaining({
          id: syncingCreate.id,
          sync: expect.objectContaining({
            deletedAt: expect.any(String),
            serverVersion: 0,
            status: 'pending',
          }),
        }),
      ]);
    });

    it('should remove expense by ID', () => {
      const expense = createMockExpense({ title: 'To Delete' });

      useExpenseStore.getState().addExpense(expense);
      const addedExpense = useExpenseStore.getState().expenses[0];

      useExpenseStore.getState().deleteExpense(addedExpense.id);
      const expenses = useExpenseStore.getState().expenses;

      expect(expenses).toHaveLength(0);
    });

    it('should not affect other expenses when deleting', () => {
      const expense1 = createMockExpense({ title: 'Keep This' });
      const expense2 = createMockExpense({ title: 'Delete This' });

      useExpenseStore.getState().addExpense(expense1);
      useExpenseStore.getState().addExpense(expense2);

      const expenses = useExpenseStore.getState().expenses;
      const toDelete = expenses.find((e) => e.title === 'Delete This');

      useExpenseStore.getState().deleteExpense(toDelete!.id);
      const remainingExpenses = useExpenseStore.getState().expenses;

      expect(remainingExpenses).toHaveLength(1);
      expect(remainingExpenses[0].title).toBe('Keep This');
    });

    it('should handle deleting non-existent expense gracefully', () => {
      const expense = createMockExpense({ title: 'Test' });
      useExpenseStore.getState().addExpense(expense);

      useExpenseStore.getState().deleteExpense('non-existent-id');
      const expenses = useExpenseStore.getState().expenses;

      expect(expenses).toHaveLength(1);
      expect(expenses[0].title).toBe('Test');
    });
  });

  describe('conditional draft rollback', () => {
    const openingExpense: Expense = {
      id: 'rollback-expense',
      title: 'Opening title',
      amountMinor: 2500,
      currency: 'AUD',
      date: '2026-08-24',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'payer', amountMinor: 2500 }],
      shares: [{ participantId: 'payer', amountMinor: 2500 }],
      sync: {
        mutationId: 'opening-mutation',
        serverVersion: 4,
        localRevision: 2,
        status: 'synced',
        updatedAt: '2026-08-24T00:00:00.000Z',
      },
    };
    const attemptedExpense: Expense = {
      ...openingExpense,
      title: 'Attempted title',
      sync: {
        mutationId: 'attempted-mutation',
        serverVersion: 4,
        localRevision: 3,
        status: 'pending',
        updatedAt: '2026-08-24T00:01:00.000Z',
      },
    };
    const openingVersion = {
      mutationId: 'opening-mutation',
      serverVersion: 4,
      localRevision: 2,
      status: 'synced' as const,
      updatedAt: '2026-08-24T00:00:00.000Z',
    };
    const attemptedVersion = {
      mutationId: 'attempted-mutation',
      serverVersion: 4,
      localRevision: 3,
      status: 'pending' as const,
      updatedAt: '2026-08-24T00:01:00.000Z',
    };

    it('restores the opening snapshot only from the exact attempted version', () => {
      useExpenseStore.setState({ expenses: [attemptedExpense] });

      expect(
        useExpenseStore
          .getState()
          .restoreExpenseSnapshot(
            openingExpense,
            attemptedVersion,
            openingVersion,
          ),
      ).toEqual({ status: 'applied' });
      expect(useExpenseStore.getState().expenses).toEqual([openingExpense]);
    });

    it('does not overwrite a newer revision or resurrect a missing expense', () => {
      const newerExpense: Expense = {
        ...attemptedExpense,
        title: 'Newer title',
        sync: {
          ...attemptedExpense.sync!,
          mutationId: 'newer-mutation',
          localRevision: 4,
          updatedAt: '2026-08-24T00:02:00.000Z',
        },
      };
      useExpenseStore.setState({ expenses: [newerExpense] });

      expect(
        useExpenseStore
          .getState()
          .restoreExpenseSnapshot(
            openingExpense,
            attemptedVersion,
            openingVersion,
          ),
      ).toEqual({ status: 'conflict', reason: 'version-mismatch' });
      expect(useExpenseStore.getState().expenses).toEqual([newerExpense]);

      useExpenseStore.setState({ expenses: [] });
      expect(
        useExpenseStore
          .getState()
          .restoreExpenseSnapshot(
            openingExpense,
            attemptedVersion,
            openingVersion,
          ),
      ).toEqual({ status: 'conflict', reason: 'missing' });
      expect(useExpenseStore.getState().expenses).toEqual([]);
    });

    it('hard-deletes a draft create only at its exact attempted version', () => {
      useExpenseStore.setState({ expenses: [attemptedExpense] });
      expect(
        useExpenseStore
          .getState()
          .deleteExpenseDraftIfVersion(attemptedExpense.id, attemptedVersion),
      ).toEqual({ status: 'applied' });
      expect(useExpenseStore.getState().expenses).toEqual([]);

      const newerExpense = {
        ...attemptedExpense,
        sync: {
          ...attemptedExpense.sync!,
          mutationId: 'newer-create-mutation',
          localRevision: 4,
        },
      };
      useExpenseStore.setState({ expenses: [newerExpense] });
      expect(
        useExpenseStore
          .getState()
          .deleteExpenseDraftIfVersion(attemptedExpense.id, attemptedVersion),
      ).toEqual({ status: 'conflict', reason: 'version-mismatch' });
      expect(useExpenseStore.getState().expenses).toEqual([newerExpense]);

      useExpenseStore.setState({ expenses: [] });
      expect(
        useExpenseStore
          .getState()
          .deleteExpenseDraftIfVersion(attemptedExpense.id, attemptedVersion),
      ).toEqual({ status: 'conflict', reason: 'missing' });
    });

    it('updates only the exact expected expense version', () => {
      useExpenseStore.setState({ expenses: [attemptedExpense] });

      const applied = useExpenseStore
        .getState()
        .updateExpenseIfVersion(
          { ...attemptedExpense, title: 'Queued title' },
          attemptedVersion,
        );

      expect(applied).toMatchObject({
        status: 'applied',
        version: {
          localRevision: 4,
          mutationId: expect.any(String),
        },
      });
      expect(useExpenseStore.getState().expenses[0].title).toBe('Queued title');
      expect(
        getExpenseMutationVersion(useExpenseStore.getState().expenses[0]),
      ).toEqual(applied.status === 'applied' ? applied.version : null);
    });

    it('does not conditionally update a newer, deleted, or missing expense', () => {
      const newerExpense: Expense = {
        ...attemptedExpense,
        title: 'External title',
        sync: {
          ...attemptedExpense.sync!,
          mutationId: 'external-newer-mutation',
          localRevision: 4,
          updatedAt: '2026-08-24T00:03:00.000Z',
        },
      };
      useExpenseStore.setState({ expenses: [newerExpense] });
      expect(
        useExpenseStore
          .getState()
          .updateExpenseIfVersion(
            { ...attemptedExpense, title: 'Stale overwrite' },
            attemptedVersion,
          ),
      ).toEqual({ status: 'conflict', reason: 'version-mismatch' });
      expect(useExpenseStore.getState().expenses).toEqual([newerExpense]);

      const tombstone: Expense = {
        ...newerExpense,
        sync: {
          ...newerExpense.sync!,
          mutationId: 'external-delete-mutation',
          localRevision: 5,
          updatedAt: '2026-08-24T00:04:00.000Z',
          deletedAt: '2026-08-24T00:04:00.000Z',
        },
      };
      useExpenseStore.setState({ expenses: [tombstone] });
      expect(
        useExpenseStore
          .getState()
          .updateExpenseIfVersion(
            { ...attemptedExpense, title: 'Stale resurrection' },
            attemptedVersion,
          ),
      ).toEqual({ status: 'conflict', reason: 'version-mismatch' });
      expect(useExpenseStore.getState().expenses).toEqual([tombstone]);

      useExpenseStore.setState({ expenses: [] });
      expect(
        useExpenseStore
          .getState()
          .updateExpenseIfVersion(
            { ...attemptedExpense, title: 'Stale resurrection' },
            attemptedVersion,
          ),
      ).toEqual({ status: 'conflict', reason: 'missing' });
      expect(useExpenseStore.getState().expenses).toEqual([]);
    });
  });

  describe('getExpenseById', () => {
    it('should return expense by ID', () => {
      const expense = createMockExpense({ title: 'Find Me' });
      useExpenseStore.getState().addExpense(expense);

      const addedExpense = useExpenseStore.getState().expenses[0];
      const foundExpense = useExpenseStore
        .getState()
        .getExpenseById(addedExpense.id);

      expect(foundExpense).toBeDefined();
      expect(foundExpense!.title).toBe('Find Me');
      expect(foundExpense!.id).toBe(addedExpense.id);
    });

    it('should return undefined for non-existent ID', () => {
      const foundExpense = useExpenseStore
        .getState()
        .getExpenseById('non-existent');
      expect(foundExpense).toBeUndefined();
    });
  });

});
