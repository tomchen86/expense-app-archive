import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ExpenseConditionalUpdateResult,
  Expense,
  ExpenseMutationVersion,
  ExpenseRollbackResult,
  ExpenseVersionMatchResult,
} from '../../types';
import {
  getExpenseAmountMinor,
  getExpenseCurrency,
  getExpensePayments,
  getExpenseShares,
  getExpenseSpaceKind,
} from '../../utils/expenseDomain';
import { createUuid } from '../../utils/ids';

const legacyServerVersion = (expense: Expense): number =>
  expense.sync?.serverVersion ??
  (expense.sync?.status === 'synced' ? (expense.sync.version ?? 0) : 0);

const legacyLocalRevision = (expense: Expense): number =>
  expense.sync?.localRevision ??
  (expense.sync?.status === 'synced'
    ? 0
    : Math.max(1, expense.sync?.version ?? 1));

export const getExpenseMutationVersion = (
  expense: Expense,
): ExpenseMutationVersion | null => {
  if (!expense.sync) {
    return null;
  }
  return {
    mutationId: expense.sync.mutationId,
    serverVersion: legacyServerVersion(expense),
    localRevision: legacyLocalRevision(expense),
    status: expense.sync.status,
    updatedAt: expense.sync.updatedAt,
    ...(expense.sync.deletedAt ? { deletedAt: expense.sync.deletedAt } : {}),
  };
};

const mutationVersionsMatch = (
  left: ExpenseMutationVersion | null,
  right: ExpenseMutationVersion | null,
): boolean =>
  left === null || right === null
    ? left === right
    : left.mutationId === right.mutationId &&
      left.serverVersion === right.serverVersion &&
      left.localRevision === right.localRevision &&
      left.status === right.status &&
      left.updatedAt === right.updatedAt &&
      left.deletedAt === right.deletedAt;

const buildUpdatedExpense = (
  expense: Expense,
  updatedExpense: Expense,
): Expense => {
  const merged = { ...expense, ...updatedExpense };
  const canonical =
    updatedExpense.amountMinor !== undefined &&
    updatedExpense.currency &&
    updatedExpense.spaceId &&
    updatedExpense.spaceKind &&
    updatedExpense.payments &&
    updatedExpense.shares
      ? {
          id: updatedExpense.id,
          title: updatedExpense.title,
          amountMinor: updatedExpense.amountMinor,
          currency: updatedExpense.currency,
          date: updatedExpense.date,
          category: updatedExpense.category,
          ...(updatedExpense.categoryId
            ? { categoryId: updatedExpense.categoryId }
            : {}),
          ...(updatedExpense.categorySnapshot
            ? { categorySnapshot: updatedExpense.categorySnapshot }
            : {}),
          spaceId: updatedExpense.spaceId,
          spaceKind: updatedExpense.spaceKind,
          payments: updatedExpense.payments,
          shares: updatedExpense.shares,
          ...(updatedExpense.caption
            ? { caption: updatedExpense.caption }
            : {}),
        }
      : merged;
  return {
    ...canonical,
    sync: {
      mutationId: createUuid(),
      serverVersion: legacyServerVersion(expense),
      localRevision: legacyLocalRevision(expense) + 1,
      status: canonical.spaceKind === 'shared' ? 'pending' : 'local_only',
      updatedAt: new Date().toISOString(),
    },
  };
};

let pendingExpenseWrite: { name: string; value: string } | null = null;
let expenseWritePromise: Promise<void> | null = null;

const scheduleExpenseWrite = (): Promise<void> => {
  if (!expenseWritePromise) {
    const worker = Promise.resolve().then(async () => {
      while (pendingExpenseWrite) {
        const write = pendingExpenseWrite;
        pendingExpenseWrite = null;
        try {
          await AsyncStorage.setItem(write.name, write.value);
        } catch (error) {
          // A write queued while this one was in flight represents newer
          // state; otherwise retain this exact snapshot for a later retry.
          pendingExpenseWrite ??= write;
          throw error;
        }
      }
    });
    expenseWritePromise = worker.then(
      () => {
        expenseWritePromise = null;
        return pendingExpenseWrite ? scheduleExpenseWrite() : undefined;
      },
      (error: unknown) => {
        expenseWritePromise = null;
        throw error;
      },
    );
  }
  return expenseWritePromise;
};

const expenseStateStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => {
    pendingExpenseWrite = { name, value };
    return scheduleExpenseWrite();
  },
  removeItem: async (name) => {
    pendingExpenseWrite = null;
    await (expenseWritePromise?.catch(() => undefined) ?? Promise.resolve());
    // A failed in-flight write may have restored its retry snapshot while we
    // were waiting. Clearing storage must invalidate that snapshot as well.
    pendingExpenseWrite = null;
    await AsyncStorage.removeItem(name);
  },
};

export const flushExpensePersistence = (): Promise<void> =>
  expenseWritePromise ??
  (pendingExpenseWrite ? scheduleExpenseWrite() : Promise.resolve());

// Helper to generate a simple unique ID
export interface ExpenseStoreState {
  expenses: Expense[];

  // Actions
  addExpense: (expense: Omit<Expense, 'id' | 'sync'>) => string;
  updateExpense: (expense: Expense) => void;
  updateExpenseIfVersion: (
    expense: Expense,
    expectedCurrentVersion: ExpenseMutationVersion | null,
  ) => ExpenseConditionalUpdateResult;
  checkExpenseVersion: (
    id: string,
    expectedCurrentVersion: ExpenseMutationVersion,
  ) => ExpenseVersionMatchResult;
  deleteExpense: (id: string) => void;
  deleteExpenseDraftIfVersion: (
    id: string,
    expectedCurrentVersion: ExpenseMutationVersion,
  ) => ExpenseRollbackResult;
  restoreExpenseSnapshot: (
    expense: Expense,
    expectedCurrentVersion: ExpenseMutationVersion,
    expectedSnapshotVersion: ExpenseMutationVersion | null,
  ) => ExpenseRollbackResult;
  getExpenseById: (id: string) => Expense | undefined;

  // Data migration helpers
  migrateOrphanedExpenses: (
    internalUserId: string,
    personalSpaceId?: string,
  ) => void;
  removeExpensesForGroup: (groupId: string) => void;
  updateExpensesForParticipantRemoval: (participantId: string) => void;
}

export const useExpenseStore = create<ExpenseStoreState>()(
  persist(
    (set, get) => ({
      expenses: [],

      addExpense: (expense) => {
        const id = createUuid();
        const now = new Date().toISOString();
        const newExpenseWithId: Expense = {
          ...expense,
          id,
          sync: {
            mutationId: createUuid(),
            serverVersion: 0,
            localRevision: 1,
            status: expense.spaceKind === 'shared' ? 'pending' : 'local_only',
            updatedAt: now,
          },
        };
        set((state) => ({
          expenses: [...state.expenses, newExpenseWithId].sort((a, b) =>
            b.date.localeCompare(a.date),
          ),
        }));
        return id;
      },

      updateExpense: (updatedExpense) =>
        set((state) => ({
          expenses: state.expenses
            .map((expense) =>
              expense.id === updatedExpense.id
                ? buildUpdatedExpense(expense, updatedExpense)
                : expense,
            )
            .sort((a, b) => b.date.localeCompare(a.date)),
        })),

      updateExpenseIfVersion: (updatedExpense, expectedCurrentVersion) => {
        const currentExpense = get().expenses.find(
          (expense) => expense.id === updatedExpense.id,
        );
        if (!currentExpense) {
          return { status: 'conflict', reason: 'missing' };
        }
        if (
          !mutationVersionsMatch(
            getExpenseMutationVersion(currentExpense),
            expectedCurrentVersion,
          )
        ) {
          return { status: 'conflict', reason: 'version-mismatch' };
        }
        const nextExpense = buildUpdatedExpense(currentExpense, updatedExpense);
        const version = getExpenseMutationVersion(nextExpense);
        if (!version) {
          throw new Error(
            'A conditional expense update requires sync metadata.',
          );
        }
        set((state) => ({
          expenses: state.expenses
            .map((expense) =>
              expense.id === updatedExpense.id ? nextExpense : expense,
            )
            .sort((a, b) => b.date.localeCompare(a.date)),
        }));
        return { status: 'applied', version };
      },

      checkExpenseVersion: (id, expectedCurrentVersion) => {
        const currentExpense = get().expenses.find(
          (expense) => expense.id === id,
        );
        if (!currentExpense) {
          return { status: 'conflict', reason: 'missing' };
        }
        return mutationVersionsMatch(
          getExpenseMutationVersion(currentExpense),
          expectedCurrentVersion,
        )
          ? { status: 'matched' }
          : { status: 'conflict', reason: 'version-mismatch' };
      },

      deleteExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.flatMap((expense) => {
            if (expense.id !== id) {
              return [expense];
            }
            const isUnacknowledgedPendingSharedCreate =
              getExpenseSpaceKind(expense) === 'shared' &&
              expense.sync?.status === 'pending' &&
              expense.sync.serverVersion === 0 &&
              expense.sync.deletedAt === undefined;
            if (isUnacknowledgedPendingSharedCreate) {
              return [];
            }
            const requiresTombstone =
              getExpenseSpaceKind(expense) === 'shared' ||
              (expense.sync !== undefined &&
                expense.sync.status !== 'local_only');
            if (!requiresTombstone) {
              return [];
            }
            const now = new Date().toISOString();
            return [
              {
                ...expense,
                sync: {
                  mutationId: createUuid(),
                  serverVersion: legacyServerVersion(expense),
                  localRevision: legacyLocalRevision(expense) + 1,
                  status: 'pending' as const,
                  updatedAt: now,
                  deletedAt: now,
                },
              },
            ];
          }),
        })),

      deleteExpenseDraftIfVersion: (id, expectedCurrentVersion) => {
        const currentExpense = get().expenses.find(
          (expense) => expense.id === id,
        );
        if (!currentExpense) {
          return { status: 'conflict', reason: 'missing' };
        }
        if (
          !mutationVersionsMatch(
            getExpenseMutationVersion(currentExpense),
            expectedCurrentVersion,
          )
        ) {
          return { status: 'conflict', reason: 'version-mismatch' };
        }
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
        }));
        return { status: 'applied' };
      },

      restoreExpenseSnapshot: (
        snapshot,
        expectedCurrentVersion,
        expectedSnapshotVersion,
      ) => {
        const currentExpense = get().expenses.find(
          (expense) => expense.id === snapshot.id,
        );
        if (!currentExpense) {
          return { status: 'conflict', reason: 'missing' };
        }
        if (
          !mutationVersionsMatch(
            getExpenseMutationVersion(currentExpense),
            expectedCurrentVersion,
          )
        ) {
          return { status: 'conflict', reason: 'version-mismatch' };
        }
        if (
          !mutationVersionsMatch(
            getExpenseMutationVersion(snapshot),
            expectedSnapshotVersion,
          )
        ) {
          return { status: 'conflict', reason: 'snapshot-version-mismatch' };
        }
        set((state) => ({
          expenses: state.expenses
            .map((expense) => (expense.id === snapshot.id ? snapshot : expense))
            .sort((a, b) => b.date.localeCompare(a.date)),
        }));
        return { status: 'applied' };
      },

      getExpenseById: (id) =>
        get().expenses.find((expense) => expense.id === id),

      migrateOrphanedExpenses: (
        internalUserId: string,
        personalSpaceId = `personal_${internalUserId}`,
      ) => {
        set((state) => ({
          expenses: state.expenses.map((expense) => {
            if (expense.spaceId || expense.groupId) {
              return expense;
            }

            const amountMinor = getExpenseAmountMinor(expense);
            const currency = getExpenseCurrency(expense);
            const payments =
              getExpensePayments(expense).length > 0
                ? getExpensePayments(expense)
                : [{ participantId: internalUserId, amountMinor }];
            const shares =
              getExpenseShares(expense).length > 0
                ? getExpenseShares(expense)
                : [{ participantId: internalUserId, amountMinor }];

            return {
              ...expense,
              amountMinor,
              currency,
              spaceId: personalSpaceId,
              spaceKind: 'personal',
              payments,
              shares,
            };
          }),
        }));
      },

      // Kept for the legacy facade. Historical expenses retain their space ID.
      removeExpensesForGroup: (_groupId: string) => undefined,

      // Membership changes must not rewrite historical payment/share allocations.
      updateExpensesForParticipantRemoval: (_participantId: string) =>
        undefined,
    }),
    {
      name: 'expense-mobile-expenses-v2',
      version: 3,
      storage: createJSONStorage(() => expenseStateStorage),
      partialize: (state) => ({ expenses: state.expenses }),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as { expenses?: Expense[] };
        return {
          expenses: (state.expenses ?? []).map((expense) => {
            if (!expense.sync) {
              return expense;
            }
            const { version: _version, ...sync } = expense.sync;
            return {
              ...expense,
              sync: {
                ...sync,
                serverVersion: legacyServerVersion(expense),
                localRevision: legacyLocalRevision(expense),
              },
            };
          }),
        };
      },
    },
  ),
);
