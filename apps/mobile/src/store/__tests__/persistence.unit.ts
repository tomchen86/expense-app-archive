import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  flushExpensePersistence,
  useExpenseStore as useExpenseFeatureStore,
} from '../features/expenseStore';
import { flushUserPersistence, useUserStore } from '../features/userStore';
import { useCategoryStore } from '../features/categoryStore';
import { flushGroupPersistence, useGroupStore } from '../features/groupStore';
import {
  flushParticipantPersistence,
  useParticipantStore,
} from '../features/participantStore';
import type { Expense } from '../../types';
import { isExpenseGroupArchived } from '../../utils/groupDomain';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('durable mobile store hydration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
    useExpenseFeatureStore.setState({ expenses: [] });
    useGroupStore.setState({ groups: [] });
    await useExpenseFeatureStore.persist.clearStorage();
  });

  it('wires every user-visible domain store to durable storage', () => {
    expect(useExpenseFeatureStore.persist.getOptions().name).toBe(
      'expense-mobile-expenses-v2',
    );
    expect(useUserStore.persist.getOptions().name).toBe(
      'expense-mobile-user-v2',
    );
    expect(useGroupStore.persist.getOptions().name).toBe(
      'expense-mobile-groups-v2',
    );
    expect(useParticipantStore.persist.getOptions().name).toBe(
      'expense-mobile-participants-v2',
    );
    expect(useCategoryStore.persist.getOptions().name).toBe(
      'expense-mobile-categories-v2',
    );

    [
      useExpenseFeatureStore,
      useUserStore,
      useGroupStore,
      useParticipantStore,
      useCategoryStore,
    ].forEach((store) => {
      expect(store.persist.getOptions().migrate).toEqual(expect.any(Function));
    });
  });

  it('persists the anonymous local identity before it owns ledger data', async () => {
    const { user, personalParticipantId } = useUserStore.getState();
    storage.setItem.mockClear();

    await useUserStore.getState().ensureLocalIdentityPersisted();

    expect(storage.setItem).toHaveBeenCalledWith(
      'expense-mobile-user-v2',
      expect.stringContaining(user.id),
    );
    expect(storage.setItem).toHaveBeenCalledWith(
      'expense-mobile-user-v2',
      expect.stringContaining(user.personalSpaceId),
    );
    expect(storage.setItem).toHaveBeenCalledWith(
      'expense-mobile-user-v2',
      expect.stringContaining(personalParticipantId),
    );
  });

  it('persists a locally-created canonical expense with its stable ID', async () => {
    useExpenseFeatureStore.getState().addExpense({
      title: 'Offline lunch',
      amountMinor: 1250,
      currency: 'AUD',
      date: '2026-08-13',
      category: 'Food & Dining',
      spaceId: 'personal-space-1',
      spaceKind: 'personal',
      payments: [{ participantId: 'user-1', amountMinor: 1250 }],
      shares: [{ participantId: 'user-1', amountMinor: 1250 }],
    });

    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledWith(
      'expense-mobile-expenses-v2',
      expect.stringContaining('Offline lunch'),
    );
    const storedExpense = useExpenseFeatureStore.getState().expenses[0];
    expect(storedExpense.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(storedExpense.sync).toMatchObject({
      serverVersion: 0,
      localRevision: 1,
      mutationId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
    });
  });

  it('exposes a flush promise that waits for the durable expense write', async () => {
    let resolveWrite: (() => void) | undefined;
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        }),
    );

    useExpenseFeatureStore.getState().addExpense({
      title: 'Await durability',
      amountMinor: 500,
      currency: 'AUD',
      date: '2026-08-13',
      category: 'Food & Dining',
      spaceId: 'personal-space-1',
      spaceKind: 'personal',
      payments: [{ participantId: 'user-1', amountMinor: 500 }],
      shares: [{ participantId: 'user-1', amountMinor: 500 }],
    });

    let flushed = false;
    const flush = flushExpensePersistence().then(() => {
      flushed = true;
    });
    await Promise.resolve();
    expect(flushed).toBe(false);

    resolveWrite?.();
    await flush;
    expect(flushed).toBe(true);
  });

  it('keeps flushing when a newer expense snapshot arrives as the worker settles', async () => {
    await flushExpensePersistence();
    storage.setItem.mockClear();
    let resolveFirstWrite: (() => void) | undefined;
    const firstWrite = new Promise<void>((resolve) => {
      resolveFirstWrite = resolve;
    });
    storage.setItem.mockImplementationOnce(() => firstWrite);

    useExpenseFeatureStore.getState().addExpense({
      title: 'First snapshot',
      amountMinor: 500,
      currency: 'AUD',
      date: '2026-08-13',
      category: 'Food & Dining',
      spaceId: 'personal-space-1',
      spaceKind: 'personal',
      payments: [{ participantId: 'user-1', amountMinor: 500 }],
      shares: [{ participantId: 'user-1', amountMinor: 500 }],
    });
    const flushed = flushExpensePersistence();
    await Promise.resolve();
    firstWrite.then(() => {
      useExpenseFeatureStore.getState().addExpense({
        title: 'Settlement snapshot',
        amountMinor: 700,
        currency: 'AUD',
        date: '2026-08-13',
        category: 'Food & Dining',
        spaceId: 'personal-space-1',
        spaceKind: 'personal',
        payments: [{ participantId: 'user-1', amountMinor: 700 }],
        shares: [{ participantId: 'user-1', amountMinor: 700 }],
      });
    });

    resolveFirstWrite?.();
    await flushed;

    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.setItem.mock.calls[1]).toEqual([
      'expense-mobile-expenses-v2',
      expect.stringContaining('Settlement snapshot'),
    ]);
  });

  it('keeps flushing when a newer user snapshot arrives as the worker settles', async () => {
    await flushUserPersistence();
    storage.setItem.mockClear();
    let resolveFirstWrite: (() => void) | undefined;
    const firstWrite = new Promise<void>((resolve) => {
      resolveFirstWrite = resolve;
    });
    storage.setItem.mockImplementationOnce(() => firstWrite);

    const flushed = useUserStore.getState().ensureLocalIdentityPersisted();
    await Promise.resolve();
    firstWrite.then(() => {
      useUserStore.getState().updateSettings({ currency: 'EUR' });
    });

    resolveFirstWrite?.();
    await flushed;

    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.setItem.mock.calls[1]).toEqual([
      'expense-mobile-user-v2',
      expect.stringContaining('EUR'),
    ]);
  });

  it('retains a failed user payload so a later flush retries it', async () => {
    await flushUserPersistence();
    storage.setItem.mockClear();
    storage.setItem.mockRejectedValueOnce(new Error('identity unavailable'));

    await expect(
      useUserStore.getState().ensureLocalIdentityPersisted(),
    ).rejects.toThrow('identity unavailable');
    const failedWrite = storage.setItem.mock.calls[0];

    await expect(flushUserPersistence()).resolves.toBeUndefined();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.setItem.mock.calls[1]).toEqual(failedWrite);
  });

  it('does not revive a failed user snapshot after storage is cleared', async () => {
    await flushUserPersistence();
    storage.setItem.mockClear();
    let rejectWrite: ((error: Error) => void) | undefined;
    let confirmStorageRemoved: (() => void) | undefined;
    const storageRemoved = new Promise<void>((resolve) => {
      confirmStorageRemoved = resolve;
    });
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectWrite = reject;
        }),
    );
    storage.removeItem.mockImplementationOnce(async () => {
      confirmStorageRemoved?.();
    });

    const failedFlush = useUserStore.getState().ensureLocalIdentityPersisted();
    await Promise.resolve();
    useUserStore.persist.clearStorage();
    rejectWrite?.(new Error('identity unavailable'));

    await expect(failedFlush).rejects.toThrow('identity unavailable');
    await storageRemoved;
    storage.setItem.mockClear();
    await expect(flushUserPersistence()).resolves.toBeUndefined();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('retains a failed expense payload so a later flush retries it', async () => {
    await flushExpensePersistence();
    storage.setItem.mockClear();
    storage.setItem.mockRejectedValueOnce(new Error('disk unavailable'));

    useExpenseFeatureStore.getState().addExpense({
      title: 'Retry the same payload',
      amountMinor: 500,
      currency: 'AUD',
      date: '2026-08-13',
      category: 'Food & Dining',
      spaceId: 'personal-space-1',
      spaceKind: 'personal',
      payments: [{ participantId: 'user-1', amountMinor: 500 }],
      shares: [{ participantId: 'user-1', amountMinor: 500 }],
    });

    await expect(flushExpensePersistence()).rejects.toThrow('disk unavailable');
    const failedWrite = storage.setItem.mock.calls[0];

    await expect(flushExpensePersistence()).resolves.toBeUndefined();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.setItem.mock.calls[1]).toEqual(failedWrite);
  });

  it('retains a failed group payload so a later flush retries the exact snapshot', async () => {
    await flushGroupPersistence();
    storage.setItem.mockClear();
    storage.setItem.mockRejectedValueOnce(new Error('group disk unavailable'));
    useGroupStore.setState({
      groups: [
        {
          id: 'group-retry',
          name: 'Retry group snapshot',
          participants: [{ id: 'owner-1', name: 'Owner' }],
          createdAt: '2026-08-24T00:00:00.000Z',
        },
      ],
    });

    await expect(flushGroupPersistence()).rejects.toThrow(
      'group disk unavailable',
    );
    const failedWrite = storage.setItem.mock.calls[0];

    await expect(flushGroupPersistence()).resolves.toBeUndefined();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.setItem.mock.calls[1]).toEqual(failedWrite);
  });

  it('exposes a participant flush that waits for the durable snapshot', async () => {
    await flushParticipantPersistence();
    storage.setItem.mockClear();
    let releaseWrite: (() => void) | undefined;
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseWrite = resolve;
        }),
    );
    useParticipantStore.setState({
      participants: [{ id: 'participant-await', name: 'Await durability' }],
    });

    let flushed = false;
    const flush = flushParticipantPersistence().then(() => {
      flushed = true;
    });
    await Promise.resolve();
    expect(flushed).toBe(false);

    releaseWrite!();
    await flush;
    expect(flushed).toBe(true);
  });

  it('does not revive a failed snapshot after storage is cleared', async () => {
    await flushExpensePersistence();
    storage.setItem.mockClear();
    let rejectWrite: ((error: Error) => void) | undefined;
    let confirmStorageRemoved: (() => void) | undefined;
    const storageRemoved = new Promise<void>((resolve) => {
      confirmStorageRemoved = resolve;
    });
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectWrite = reject;
        }),
    );
    storage.removeItem.mockImplementationOnce(async () => {
      confirmStorageRemoved?.();
    });

    useExpenseFeatureStore.getState().addExpense({
      title: 'Must stay cleared',
      amountMinor: 500,
      currency: 'AUD',
      date: '2026-08-13',
      category: 'Food & Dining',
      spaceId: 'personal-space-1',
      spaceKind: 'personal',
      payments: [{ participantId: 'user-1', amountMinor: 500 }],
      shares: [{ participantId: 'user-1', amountMinor: 500 }],
    });

    const failedFlush = flushExpensePersistence();
    await Promise.resolve();
    useExpenseFeatureStore.persist.clearStorage();
    rejectWrite?.(new Error('disk unavailable'));

    await expect(failedFlush).rejects.toThrow('disk unavailable');
    await storageRemoved;
    storage.setItem.mockClear();
    await expect(flushExpensePersistence()).resolves.toBeUndefined();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('retains a shared-expense deletion as a durable versioned tombstone', () => {
    useExpenseFeatureStore.setState({
      expenses: [
        {
          id: '13e8dc6b-dcaf-40f1-a524-c10bd1bde7c7',
          title: 'Shared taxi',
          amountMinor: 3000,
          currency: 'AUD',
          date: '2026-08-13',
          category: 'Transportation',
          spaceId: 'space-shared',
          spaceKind: 'shared',
          payments: [{ participantId: 'user-1', amountMinor: 3000 }],
          shares: [{ participantId: 'user-1', amountMinor: 3000 }],
          sync: {
            mutationId: '75f0751e-b199-4778-95de-4f71a9eb5660',
            serverVersion: 2,
            localRevision: 0,
            status: 'synced',
            updatedAt: '2026-08-13T00:00:00.000Z',
          },
        },
      ],
    });

    useExpenseFeatureStore
      .getState()
      .deleteExpense('13e8dc6b-dcaf-40f1-a524-c10bd1bde7c7');

    expect(useExpenseFeatureStore.getState().expenses[0].sync).toMatchObject({
      serverVersion: 2,
      localRevision: 1,
      status: 'pending',
      deletedAt: expect.any(String),
    });
  });

  it('persists archive and restore under the existing group storage contract', async () => {
    const group = {
      id: 'group-archive-persist',
      name: 'Persisted Archive',
      participants: [],
      createdAt: '2026-08-20T00:00:00.000Z',
    };
    useGroupStore.setState({ groups: [group] });
    await Promise.resolve();
    storage.setItem.mockClear();

    useGroupStore.getState().archiveGroup(group.id);
    await Promise.resolve();

    const archiveWrite = storage.setItem.mock.calls.find(
      ([key, value]) =>
        key === 'expense-mobile-groups-v2' && value.includes('archivedAt'),
    );
    expect(archiveWrite).toBeDefined();

    storage.setItem.mockClear();
    useGroupStore.getState().restoreGroup(group.id);
    await Promise.resolve();

    const restoreWrite = storage.setItem.mock.calls.find(
      ([key]) => key === 'expense-mobile-groups-v2',
    );
    expect(restoreWrite?.[1]).not.toContain('archivedAt');
  });

  it('rehydrates a legacy v2 group as active', async () => {
    const legacyGroup = {
      id: 'legacy-active-group',
      name: 'Legacy Active',
      participants: [],
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    storage.getItem.mockResolvedValueOnce(
      JSON.stringify({ state: { groups: [legacyGroup] }, version: 2 }),
    );

    await useGroupStore.persist.rehydrate();

    const hydrated = useGroupStore.getState().getGroupById(legacyGroup.id);
    expect(hydrated).toEqual(legacyGroup);
    expect(isExpenseGroupArchived(hydrated!)).toBe(false);
  });

  it('rehydrates the same expense after an offline restart', async () => {
    const expense: Expense = {
      id: 'stable-expense-id',
      title: 'Restored dinner',
      amountMinor: 4200,
      currency: 'AUD',
      date: '2026-08-12',
      category: 'Food & Dining',
      spaceId: 'space-1',
      spaceKind: 'shared',
      payments: [{ participantId: 'user-1', amountMinor: 4200 }],
      shares: [{ participantId: 'user-1', amountMinor: 4200 }],
      sync: {
        mutationId: 'mutation-stable',
        serverVersion: 0,
        localRevision: 1,
        status: 'pending',
        updatedAt: '2026-08-12T00:00:00.000Z',
      },
    };
    storage.getItem.mockResolvedValueOnce(
      JSON.stringify({ state: { expenses: [expense] }, version: 3 }),
    );
    useExpenseFeatureStore.setState({ expenses: [] });

    await useExpenseFeatureStore.persist.rehydrate();

    expect(useExpenseFeatureStore.getState().expenses).toEqual([expense]);
  });

  it('hydrates a durable user and personal-space identity', async () => {
    storage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        state: {
          user: {
            id: 'user-stable',
            displayName: 'Morgan',
            personalSpaceId: 'personal-stable',
          },
          personalParticipantId: 'participant-stable',
        },
        version: 3,
      }),
    );

    await useUserStore.persist.rehydrate();

    expect(useUserStore.getState()).toMatchObject({
      user: {
        id: 'user-stable',
        displayName: 'Morgan',
        personalSpaceId: 'personal-stable',
      },
      personalParticipantId: 'participant-stable',
    });
  });
});
