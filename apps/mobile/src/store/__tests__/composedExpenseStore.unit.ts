import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from '../../constants/expenses';
import type { Expense, ExpenseGroup, Participant } from '../../types';
import { useExpenseStore as useComposedExpenseStore } from '../composedExpenseStore';
import { useCategoryStore } from '../features/categoryStore';
import {
  flushExpensePersistence,
  useExpenseStore as useExpenseFeatureStore,
} from '../features/expenseStore';
import { flushGroupPersistence, useGroupStore } from '../features/groupStore';
import {
  flushParticipantPersistence,
  useParticipantStore,
} from '../features/participantStore';
import { flushUserPersistence, useUserStore } from '../features/userStore';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const initialIdentity = {
  internalUserId: useUserStore.getState().internalUserId,
  personalParticipantId: useUserStore.getState().personalParticipantId,
  personalSpaceId: useUserStore.getState().personalSpaceId,
};

const defaultSettings = {
  theme: 'light' as const,
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  notifications: true,
};

const prepareDurableGroupTest = async () => {
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue(undefined);
  storage.removeItem.mockResolvedValue(undefined);
  await Promise.all([
    flushExpensePersistence(),
    flushUserPersistence(),
    flushGroupPersistence(),
    flushParticipantPersistence(),
  ]);
  await Promise.resolve();
  storage.setItem.mockClear();
};

const waitForCondition = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 20 && !condition(); attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};

const resetAllStores = () => {
  const { internalUserId, personalSpaceId, personalParticipantId } =
    initialIdentity;

  useUserStore.setState({
    user: null,
    settings: { ...defaultSettings },
    userSettings: null,
    internalUserId,
    personalSpaceId,
    personalParticipantId,
  });
  useParticipantStore.setState({ participants: [] });
  useGroupStore.setState({ groups: [] });
  useCategoryStore.setState({
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
  });
  useExpenseFeatureStore.setState({ expenses: [] });

  useComposedExpenseStore.setState({
    expenses: [],
    groups: [],
    participants: [],
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    user: null,
    settings: { ...defaultSettings },
    userSettings: null,
    internalUserId,
    personalSpaceId,
    personalParticipantId,
  });
};

const seedDurableMembership = async () => {
  await prepareDurableGroupTest();
  const durableStorage = new Map<string, string>();
  storage.setItem.mockImplementation(async (key, value) => {
    durableStorage.set(key, value);
  });
  const currentUserId = useUserStore.getState().internalUserId!;
  const owner: Participant = {
    id: 'durable-owner',
    name: 'Owner',
    userId: currentUserId,
    spaceId: 'durable-group',
  };
  const member: Participant = {
    id: 'durable-member',
    name: 'Member',
    spaceId: 'durable-group',
  };
  const group: ExpenseGroup = {
    id: 'durable-group',
    name: 'Durable group',
    participants: [owner, member],
    createdAt: '2026-08-24T00:00:00.000Z',
  };
  useParticipantStore.setState({ participants: [owner, member] });
  useGroupStore.setState({ groups: [group] });
  await Promise.all([flushParticipantPersistence(), flushGroupPersistence()]);
  storage.setItem.mockClear();
  return { durableStorage, group, member, owner };
};

const persistedParticipants = (durableStorage: Map<string, string>) =>
  JSON.parse(durableStorage.get('expense-mobile-participants-v2')!).state
    .participants as Participant[];

const persistedGroups = (durableStorage: Map<string, string>) =>
  JSON.parse(durableStorage.get('expense-mobile-groups-v2')!).state
    .groups as ExpenseGroup[];

const persistedUserProfile = (durableStorage: Map<string, string>) =>
  JSON.parse(durableStorage.get('expense-mobile-user-v2')!).state as {
    user: { id: string; displayName: string } | null;
    userSettings: { name: string } | null;
  };

const seedDurableProfileProjection = async () => {
  await prepareDurableGroupTest();
  const durableStorage = new Map<string, string>();
  storage.setItem.mockImplementation(async (key, value) => {
    durableStorage.set(key, value);
  });
  const personalSpaceId = useUserStore.getState().personalSpaceId;
  const personalParticipantId = useUserStore.getState().personalParticipantId;
  useUserStore.setState({
    internalUserId: 'legacy-profile-id',
    user: {
      id: 'canonical-profile-id',
      displayName: 'Before',
      personalSpaceId,
    },
    userSettings: { name: 'Before' },
  });
  const personal: Participant = {
    id: personalParticipantId,
    name: 'Before',
    userId: 'canonical-profile-id',
    spaceId: personalSpaceId,
  };
  const member: Participant = {
    id: 'profile-group-member',
    name: 'Before',
    userId: 'canonical-profile-id',
    spaceId: 'profile-group',
  };
  const group: ExpenseGroup = {
    id: 'profile-group',
    name: 'Profile group',
    participants: [member],
    createdAt: '2026-08-24T00:00:00.000Z',
  };
  useParticipantStore.setState({ participants: [personal, member] });
  useGroupStore.setState({ groups: [group] });
  await Promise.all([
    flushUserPersistence(),
    flushParticipantPersistence(),
    flushGroupPersistence(),
  ]);
  storage.setItem.mockClear();
  return { durableStorage, group, member, personal };
};

describe('ComposedExpenseStore', () => {
  beforeEach(() => {
    resetAllStores();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    resetAllStores();
  });

  it('synchronizes the user profile to the participant store', async () => {
    const { updateUser } = useComposedExpenseStore.getState();

    await updateUser({ displayName: 'Jamie' });

    const { user, participants, personalParticipantId, personalSpaceId } =
      useComposedExpenseStore.getState();
    const syncedParticipant = useParticipantStore
      .getState()
      .getParticipantById(personalParticipantId);

    expect(user?.displayName).toBe('Jamie');
    expect(syncedParticipant).toEqual({
      id: personalParticipantId,
      name: 'Jamie',
      userId: user!.id,
      spaceId: personalSpaceId,
    });
    expect(participants).toContainEqual(syncedParticipant);
  });

  it.each([
    [
      'canonical profile',
      () =>
        useComposedExpenseStore
          .getState()
          .updateUser({ displayName: 'Renamed' }),
    ],
    [
      'legacy settings',
      () =>
        useComposedExpenseStore
          .getState()
          .updateUserSettings({ name: 'Renamed' }),
    ],
  ])(
    'propagates a %s name change to every active participant snapshot for that user',
    async (_source, renameUser) => {
      const personalSpaceId = useUserStore.getState().personalSpaceId;
      const personalParticipantId =
        useUserStore.getState().personalParticipantId;
      useUserStore.setState({
        internalUserId: 'legacy-user-id',
        user: {
          id: 'canonical-user-id',
          displayName: 'Before',
          personalSpaceId,
        },
        userSettings: { name: 'Before' },
      });
      const participants: Participant[] = [
        {
          id: personalParticipantId,
          name: 'Before',
          userId: 'canonical-user-id',
          spaceId: personalSpaceId,
        },
        {
          id: 'active-canonical-member',
          name: 'Before',
          userId: 'canonical-user-id',
          spaceId: 'active-group',
        },
        {
          id: 'active-legacy-member',
          name: 'Before legacy',
          userId: 'legacy-user-id',
          spaceId: 'legacy-group',
        },
        {
          id: 'inactive-member',
          name: 'Historical name',
          userId: 'canonical-user-id',
          spaceId: 'old-group',
          active: false,
        },
        {
          id: 'someone-else',
          name: 'Someone Else',
          userId: 'other-user-id',
          spaceId: 'active-group',
        },
      ];
      const activeGroup: ExpenseGroup = {
        id: 'active-group',
        name: 'Active',
        participants: [participants[1], participants[4]],
        createdAt: '2026-08-24T00:00:00.000Z',
      };
      const legacyGroup: ExpenseGroup = {
        id: 'legacy-group',
        name: 'Legacy identity',
        participants: [participants[2]],
        createdAt: '2026-08-24T00:00:00.000Z',
      };
      const archivedGroup: ExpenseGroup = {
        id: 'old-group',
        name: 'Archived history',
        participants: [
          {
            id: 'archived-member',
            name: 'Historical name',
            userId: 'canonical-user-id',
            spaceId: 'old-group',
          },
        ],
        createdAt: '2026-08-20T00:00:00.000Z',
        archivedAt: '2026-08-23T00:00:00.000Z',
      };
      useParticipantStore.setState({ participants });
      useGroupStore.setState({
        groups: [activeGroup, legacyGroup, archivedGroup],
      });

      await renameUser();

      const participantState = useParticipantStore.getState().participants;
      expect(
        participantState
          .filter(
            (participant) =>
              participant.active !== false &&
              ['canonical-user-id', 'legacy-user-id'].includes(
                participant.userId ?? '',
              ),
          )
          .map((participant) => participant.name),
      ).toEqual(['Renamed', 'Renamed', 'Renamed']);
      expect(
        participantState.find(
          (participant) => participant.id === 'inactive-member',
        )?.name,
      ).toBe('Historical name');
      expect(
        participantState.find(
          (participant) => participant.id === 'someone-else',
        )?.name,
      ).toBe('Someone Else');
      expect(
        useGroupStore
          .getState()
          .getGroupById(activeGroup.id)
          ?.participants.find(
            (participant) => participant.id === 'active-canonical-member',
          )?.name,
      ).toBe('Renamed');
      expect(
        useGroupStore.getState().getGroupById(legacyGroup.id)?.participants[0]
          .name,
      ).toBe('Renamed');
      expect(
        useGroupStore.getState().getGroupById(archivedGroup.id)?.participants[0]
          .name,
      ).toBe('Historical name');
    },
  );

  it('uses the latest user name when it changes during durable group creation', async () => {
    await prepareDurableGroupTest();
    useComposedExpenseStore.getState().createUser('Before Rename');
    await Promise.all([flushUserPersistence(), flushParticipantPersistence()]);
    storage.setItem.mockClear();
    let releaseParticipantWrite: (() => void) | undefined;
    storage.setItem.mockImplementation((key) => {
      if (
        key === 'expense-mobile-participants-v2' &&
        !releaseParticipantWrite
      ) {
        return new Promise<void>((resolve) => {
          releaseParticipantWrite = resolve;
        });
      }
      return Promise.resolve();
    });

    const groupCreation = useComposedExpenseStore
      .getState()
      .addGroup('Rename race');
    await waitForCondition(() => releaseParticipantWrite !== undefined);
    const rename = useComposedExpenseStore
      .getState()
      .updateUser({ displayName: 'After Rename' });
    releaseParticipantWrite!();

    const groupId = await groupCreation;
    await rename;
    expect(
      useGroupStore.getState().getGroupById(groupId)?.participants[0].name,
    ).toBe('After Rename');
  });

  it('creates groups seeded with the current user as a participant', async () => {
    const { createUser, addGroup } = useComposedExpenseStore.getState();

    const userId = createUser('Morgan');
    const groupId = await addGroup('Finance Squad');

    const group = useGroupStore.getState().getGroupById(groupId);
    expect(group).toBeDefined();
    const creator = group?.participants[0];
    expect(creator).toMatchObject({
      name: 'Morgan',
      userId,
      spaceId: groupId,
    });
    expect(creator?.id).not.toBe(userId);
    expect(creator?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(
      useParticipantStore.getState().getParticipantById(creator!.id),
    ).toEqual(creator);
  });

  it('manages categories across composed and feature stores', () => {
    const store = useComposedExpenseStore.getState();

    const created = store.addCategory({ name: 'Fitness', color: '#111111' });
    expect(created).toMatchObject({ name: 'Fitness', color: '#111111' });

    const fetched = store.getCategoryByName('Fitness');
    expect(fetched).toEqual(created);

    store.updateCategory({ ...created, color: '#00FF00' });
    expect(
      useCategoryStore.getState().getCategoryByName('Fitness')?.color,
    ).toBe('#00FF00');

    store.deleteCategory(created.id);
    expect(
      useCategoryStore.getState().getCategoryByName('Fitness'),
    ).toBeUndefined();
  });

  it('archives and restores a group without rewriting financial or participant records', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-24T01:02:03.000Z'));
    const participants: Participant[] = [
      {
        id: 'participant-1',
        name: 'Casey',
        spaceId: 'group-1',
        userId: 'user-1',
      },
      { id: 'participant-2', name: 'Drew', spaceId: 'group-1' },
    ];
    const payments = [{ participantId: 'participant-1', amountMinor: 20000 }];
    const shares = [
      { participantId: 'participant-1', amountMinor: 10000 },
      { participantId: 'participant-2', amountMinor: 10000 },
    ];
    const sync = {
      mutationId: 'mutation-1',
      serverVersion: 3,
      localRevision: 0,
      status: 'synced' as const,
      updatedAt: '2026-08-23T00:00:00.000Z',
    };
    const expense: Expense = {
      id: 'expense-1',
      title: 'Hotel',
      amountMinor: 20000,
      currency: 'AUD',
      date: '2025-03-01',
      category: 'Travel',
      spaceId: 'group-1',
      spaceKind: 'shared',
      payments,
      shares,
      sync,
    };
    const group: ExpenseGroup = {
      id: 'group-1',
      name: 'Trip Crew',
      participants,
      createdAt: '2025-02-01T00:00:00.000Z',
    };

    useParticipantStore.setState({ participants });
    useGroupStore.setState({ groups: [group] });
    useExpenseFeatureStore.setState({ expenses: [expense] });
    useComposedExpenseStore.setState({
      participants,
      groups: [group],
      expenses: [expense],
    });
    const featureExpensesBefore = useExpenseFeatureStore.getState().expenses;
    const featureParticipantsBefore =
      useParticipantStore.getState().participants;
    const composedExpensesBefore = useComposedExpenseStore.getState().expenses;
    const composedParticipantsBefore =
      useComposedExpenseStore.getState().participants;

    await useComposedExpenseStore.getState().deleteGroup('group-1');

    const archivedGroup = useGroupStore.getState().getGroupById('group-1');
    expect(archivedGroup).toEqual({
      ...group,
      archivedAt: '2026-08-24T01:02:03.000Z',
    });
    expect(archivedGroup?.participants).toBe(participants);
    expect(useExpenseFeatureStore.getState().expenses).toBe(
      featureExpensesBefore,
    );
    expect(useParticipantStore.getState().participants).toBe(
      featureParticipantsBefore,
    );
    expect(useComposedExpenseStore.getState().expenses).toBe(
      composedExpensesBefore,
    );
    expect(useComposedExpenseStore.getState().participants).toBe(
      composedParticipantsBefore,
    );
    expect(featureExpensesBefore[0]).toBe(expense);
    expect(featureExpensesBefore[0].payments).toBe(payments);
    expect(featureExpensesBefore[0].shares).toBe(shares);
    expect(featureExpensesBefore[0].sync).toBe(sync);

    await useComposedExpenseStore.getState().restoreGroup('group-1');

    const restoredGroup = useGroupStore.getState().getGroupById('group-1');
    expect(restoredGroup).toEqual(group);
    expect(restoredGroup?.participants).toBe(participants);
    expect(useExpenseFeatureStore.getState().expenses).toBe(
      featureExpensesBefore,
    );
    expect(useParticipantStore.getState().participants).toBe(
      featureParticipantsBefore,
    );
  });

  it('deactivates a safely removable participant while retaining expense allocations', async () => {
    const currentUserId = useUserStore.getState().internalUserId!;
    const group: ExpenseGroup = {
      id: 'group-2',
      name: 'Roommates',
      participants: [
        { id: 'p1', name: 'Casey' },
        { id: 'p2', name: 'Drew', userId: currentUserId },
      ],
      createdAt: '2025-02-15T00:00:00.000Z',
    };
    const expense: Expense = {
      id: 'expense-2',
      title: 'Utilities',
      amount: 120,
      date: '2025-02-20',
      category: 'Bills & Utilities',
      groupId: 'group-2',
      paidBy: 'p1',
      splitBetween: ['p1', 'p2'],
    };

    useParticipantStore.setState({
      participants: [
        { id: 'p1', name: 'Casey' },
        { id: 'p2', name: 'Drew', userId: currentUserId },
      ],
    });
    useGroupStore.setState({ groups: [group] });
    useExpenseFeatureStore.setState({ expenses: [expense] });
    useComposedExpenseStore.setState({
      participants: [
        { id: 'p1', name: 'Casey' },
        { id: 'p2', name: 'Drew', userId: currentUserId },
      ],
      groups: [group],
      expenses: [expense],
    });

    await useComposedExpenseStore.getState().deleteParticipant('p1');

    expect(useParticipantStore.getState().participants).toEqual([
      { id: 'p1', name: 'Casey', active: false },
      { id: 'p2', name: 'Drew', userId: currentUserId },
    ]);
    const updatedGroup = useGroupStore.getState().getGroupById('group-2');
    expect(updatedGroup?.participants).toEqual([
      { id: 'p2', name: 'Drew', userId: currentUserId },
    ]);
    const updatedExpense = useExpenseFeatureStore
      .getState()
      .expenses.find((item) => item.id === 'expense-2');
    expect(updatedExpense?.paidBy).toBe('p1');
    expect(updatedExpense?.splitBetween).toEqual(['p1', 'p2']);

    const composedParticipants =
      useComposedExpenseStore.getState().participants;
    expect(composedParticipants).toEqual([
      { id: 'p1', name: 'Casey', active: false },
      { id: 'p2', name: 'Drew', userId: currentUserId },
    ]);
  });

  it('refuses public participant deletion for self, unresolved identity, and archived membership', async () => {
    const currentUserId = useUserStore.getState().internalUserId!;
    const currentParticipant: Participant = {
      id: 'participant-current',
      name: 'Current',
      userId: currentUserId,
    };
    const otherParticipant: Participant = {
      id: 'participant-other',
      name: 'Other',
    };
    const group: ExpenseGroup = {
      id: 'protected-delete-group',
      name: 'Protected delete',
      participants: [currentParticipant, otherParticipant],
      createdAt: '2026-08-24T00:00:00.000Z',
    };
    useParticipantStore.setState({
      participants: [currentParticipant, otherParticipant],
    });
    useGroupStore.setState({ groups: [group] });

    const store = useComposedExpenseStore.getState();
    await store.deleteParticipant(currentParticipant.id);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([currentParticipant, otherParticipant]);
    expect(
      useParticipantStore.getState().getParticipantById(currentParticipant.id)
        ?.active,
    ).not.toBe(false);

    useUserStore.setState({ internalUserId: null, user: null });
    await store.deleteParticipant(otherParticipant.id);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([currentParticipant, otherParticipant]);
    expect(
      useParticipantStore.getState().getParticipantById(otherParticipant.id)
        ?.active,
    ).not.toBe(false);

    useUserStore.setState({ internalUserId: currentUserId });
    useGroupStore.setState({
      groups: [
        group,
        {
          ...group,
          id: 'archived-delete-group',
          archivedAt: '2026-08-24T01:00:00.000Z',
        },
      ],
    });
    await store.deleteParticipant(otherParticipant.id);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([currentParticipant, otherParticipant]);
    expect(
      useParticipantStore.getState().getParticipantById(otherParticipant.id)
        ?.active,
    ).not.toBe(false);
  });

  it('refuses deletion of the current identity even outside a group', async () => {
    const currentUserId = useUserStore.getState().internalUserId!;
    const currentParticipant: Participant = {
      id: 'standalone-current-participant',
      name: 'Current',
      userId: currentUserId,
    };
    useParticipantStore.setState({ participants: [currentParticipant] });
    useGroupStore.setState({ groups: [] });

    await useComposedExpenseStore
      .getState()
      .deleteParticipant(currentParticipant.id);

    expect(
      useParticipantStore.getState().getParticipantById(currentParticipant.id),
    ).toEqual(currentParticipant);
  });

  it('atomically rejects named member creation after archive or identity loss', async () => {
    const currentUserId = useUserStore.getState().internalUserId!;
    const currentParticipant: Participant = {
      id: 'participant-current',
      name: 'Current',
      userId: currentUserId,
    };
    const group: ExpenseGroup = {
      id: 'guarded-add-group',
      name: 'Guarded add',
      participants: [currentParticipant],
      createdAt: '2026-08-24T00:00:00.000Z',
    };
    useParticipantStore.setState({ participants: [currentParticipant] });
    useGroupStore.setState({ groups: [group] });
    const store = useComposedExpenseStore.getState();

    useGroupStore.getState().archiveGroup(group.id);
    await expect(
      store.addParticipantToGroupByName(group.id, 'Archived orphan'),
    ).resolves.toBeNull();
    expect(useParticipantStore.getState().participants).toEqual([
      currentParticipant,
    ]);

    useGroupStore.getState().restoreGroup(group.id);
    useUserStore.setState({ internalUserId: null, user: null });
    await expect(
      store.addParticipantToGroupByName(group.id, 'Identity orphan'),
    ).resolves.toBeNull();
    expect(useParticipantStore.getState().participants).toEqual([
      currentParticipant,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([currentParticipant]);
  });

  it('adds a named member to the group and participant stores through one guarded action', async () => {
    const currentUserId = useUserStore.getState().internalUserId!;
    const currentParticipant: Participant = {
      id: 'participant-current',
      name: 'Current',
      userId: currentUserId,
    };
    const group: ExpenseGroup = {
      id: 'guarded-add-success',
      name: 'Guarded success',
      participants: [currentParticipant],
      createdAt: '2026-08-24T00:00:00.000Z',
    };
    useParticipantStore.setState({ participants: [currentParticipant] });
    useGroupStore.setState({ groups: [group] });

    const participantId = await useComposedExpenseStore
      .getState()
      .addParticipantToGroupByName(group.id, 'Blake');

    expect(participantId).toEqual(expect.any(String));
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toContainEqual({
      id: participantId,
      name: 'Blake',
      spaceId: group.id,
    });
    expect(
      useParticipantStore.getState().getParticipantById(participantId!),
    ).toEqual({
      id: participantId,
      name: 'Blake',
      spaceId: group.id,
    });
  });

  it('does not write a group while repaired identity persistence is pending', async () => {
    await flushUserPersistence();
    useUserStore.setState({
      internalUserId: null,
      user: null,
      userSettings: { name: 'Awaited Owner' },
    });
    await flushUserPersistence();
    storage.setItem.mockClear();
    let releaseIdentityWrite: (() => void) | undefined;
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseIdentityWrite = resolve;
        }),
    );

    let creationSettled = false;
    const groupCreation = useComposedExpenseStore
      .getState()
      .addGroup('After identity')
      .finally(() => {
        creationSettled = true;
      });
    await Promise.resolve();
    await Promise.resolve();

    expect(useGroupStore.getState().groups).toEqual([]);
    expect(useParticipantStore.getState().participants).toEqual([]);
    expect(creationSettled).toBe(false);
    expect(releaseIdentityWrite).toBeDefined();
    releaseIdentityWrite!();
    await groupCreation;
    expect(useGroupStore.getState().groups).toHaveLength(1);
  });

  it('repairs and persists a null legacy identity before creating an owned group', async () => {
    await flushUserPersistence();
    useUserStore.setState({
      internalUserId: null,
      user: null,
      userSettings: { name: 'Legacy Owner' },
    });
    await flushUserPersistence();
    storage.setItem.mockClear();

    const groupId = await useComposedExpenseStore
      .getState()
      .addGroup('Durable owner');

    const identity = useUserStore.getState().internalUserId;
    const group = useGroupStore.getState().getGroupById(groupId);
    expect(identity).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(group?.participants).toEqual([
      expect.objectContaining({
        name: 'Legacy Owner',
        spaceId: groupId,
        userId: identity,
      }),
    ]);
    const persistedKeys = storage.setItem.mock.calls.map(([key]) => key);
    expect(
      persistedKeys.indexOf('expense-mobile-user-v2'),
    ).toBeGreaterThanOrEqual(0);
    expect(persistedKeys.indexOf('expense-mobile-groups-v2')).toBeGreaterThan(
      persistedKeys.indexOf('expense-mobile-user-v2'),
    );
  });

  it('does not create a group when repaired identity persistence fails', async () => {
    await flushUserPersistence();
    useUserStore.setState({
      internalUserId: null,
      user: null,
      userSettings: { name: 'Unpersisted Owner' },
    });
    await flushUserPersistence();
    storage.setItem.mockClear();
    storage.setItem.mockRejectedValueOnce(new Error('identity unavailable'));

    await expect(
      useComposedExpenseStore.getState().addGroup('Must not exist'),
    ).rejects.toThrow('identity unavailable');
    expect(useGroupStore.getState().groups).toEqual([]);
    expect(useParticipantStore.getState().participants).toEqual([]);

    storage.setItem.mockResolvedValue(undefined);
    await flushUserPersistence();
  });

  it('rolls back a failed participant write before rejecting and retries without duplicates', async () => {
    await prepareDurableGroupTest();
    useComposedExpenseStore.getState().createUser('Morgan');
    await Promise.all([flushUserPersistence(), flushParticipantPersistence()]);
    const baselineParticipants = useParticipantStore.getState().participants;
    storage.setItem.mockClear();
    const durableStorage = new Map<string, string>();
    let shouldFailParticipantWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (
        key === 'expense-mobile-participants-v2' &&
        shouldFailParticipantWrite
      ) {
        shouldFailParticipantWrite = false;
        throw new Error('participant disk unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore.getState().addGroup('Retryable group'),
    ).rejects.toThrow('participant disk unavailable');

    expect(useGroupStore.getState().groups).toEqual([]);
    expect(useParticipantStore.getState().participants).toEqual(
      baselineParticipants,
    );
    expect(
      storage.setItem.mock.calls.some(
        ([key]) => key === 'expense-mobile-groups-v2',
      ),
    ).toBe(false);
    expect(
      JSON.parse(durableStorage.get('expense-mobile-participants-v2')!).state
        .participants,
    ).toEqual(baselineParticipants);

    const groupId = await useComposedExpenseStore
      .getState()
      .addGroup('Retryable group');
    const group = useGroupStore.getState().getGroupById(groupId)!;
    expect(useGroupStore.getState().groups).toHaveLength(1);
    expect(useParticipantStore.getState().participants).toEqual([
      ...baselineParticipants,
      group.participants[0],
    ]);
    expect(
      JSON.parse(durableStorage.get('expense-mobile-groups-v2')!).state.groups,
    ).toHaveLength(1);
    expect(
      JSON.parse(durableStorage.get('expense-mobile-participants-v2')!).state
        .participants,
    ).toHaveLength(baselineParticipants.length + 1);
  });

  it('persists the participant before the group and durably compensates a failed group write', async () => {
    await prepareDurableGroupTest();
    useComposedExpenseStore.getState().createUser('Morgan');
    await Promise.all([flushUserPersistence(), flushParticipantPersistence()]);
    const baselineParticipants = useParticipantStore.getState().participants;
    storage.setItem.mockClear();
    const durableStorage = new Map<string, string>();
    const writeKeys: string[] = [];
    let shouldFailGroupWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      writeKeys.push(key);
      if (key === 'expense-mobile-groups-v2' && shouldFailGroupWrite) {
        shouldFailGroupWrite = false;
        throw new Error('group disk unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore.getState().addGroup('Compensated group'),
    ).rejects.toThrow('group disk unavailable');

    expect(writeKeys.indexOf('expense-mobile-participants-v2')).toBeLessThan(
      writeKeys.indexOf('expense-mobile-groups-v2'),
    );
    expect(useGroupStore.getState().groups).toEqual([]);
    expect(useParticipantStore.getState().participants).toEqual(
      baselineParticipants,
    );
    expect(
      JSON.parse(durableStorage.get('expense-mobile-groups-v2')!).state.groups,
    ).toEqual([]);
    expect(
      JSON.parse(durableStorage.get('expense-mobile-participants-v2')!).state
        .participants,
    ).toEqual(baselineParticipants);

    const groupId = await useComposedExpenseStore
      .getState()
      .addGroup('Compensated group');
    expect(useGroupStore.getState().groups).toEqual([
      expect.objectContaining({ id: groupId, name: 'Compensated group' }),
    ]);
    expect(useParticipantStore.getState().participants).toHaveLength(
      baselineParticipants.length + 1,
    );
    expect(
      JSON.parse(durableStorage.get('expense-mobile-groups-v2')!).state.groups,
    ).toHaveLength(1);
    expect(
      JSON.parse(durableStorage.get('expense-mobile-participants-v2')!).state
        .participants,
    ).toHaveLength(baselineParticipants.length + 1);
  });

  it('rejects explicitly and retains a retryable rollback snapshot when compensation also fails', async () => {
    await prepareDurableGroupTest();
    useComposedExpenseStore.getState().createUser('Morgan');
    await Promise.all([flushUserPersistence(), flushParticipantPersistence()]);
    const baselineParticipants = useParticipantStore.getState().participants;
    storage.setItem.mockClear();
    let failedGroupWrites = 0;
    storage.setItem.mockImplementation(async (key) => {
      if (key === 'expense-mobile-groups-v2' && failedGroupWrites < 2) {
        failedGroupWrites += 1;
        throw new Error(
          failedGroupWrites === 1
            ? 'group create unavailable'
            : 'group rollback unavailable',
        );
      }
    });

    await expect(
      useComposedExpenseStore.getState().addGroup('Pending rollback'),
    ).rejects.toThrow('rollback remains pending');
    expect(useGroupStore.getState().groups).toEqual([]);
    expect(useParticipantStore.getState().participants).toEqual(
      baselineParticipants,
    );

    storage.setItem.mockResolvedValue(undefined);
    await expect(flushGroupPersistence()).resolves.toBeUndefined();
    await expect(flushParticipantPersistence()).resolves.toBeUndefined();
  });

  it('uses the transaction identity to roll back a concurrently changed pending group', async () => {
    await prepareDurableGroupTest();
    useComposedExpenseStore.getState().createUser('Morgan');
    await Promise.all([flushUserPersistence(), flushParticipantPersistence()]);
    const baselineParticipants = useParticipantStore.getState().participants;
    storage.setItem.mockClear();
    let rejectGroupWrite: ((error: Error) => void) | undefined;
    storage.setItem.mockImplementation((key) => {
      if (key === 'expense-mobile-groups-v2' && !rejectGroupWrite) {
        return new Promise<void>((_resolve, reject) => {
          rejectGroupWrite = reject;
        });
      }
      return Promise.resolve();
    });

    const groupCreation = useComposedExpenseStore
      .getState()
      .addGroup('Concurrent mutation');
    await waitForCondition(() => rejectGroupWrite !== undefined);
    const pendingGroup = useGroupStore.getState().groups[0];
    const creator = pendingGroup.participants[0];
    expect(
      useGroupStore.getState().addParticipantToGroup(
        pendingGroup.id,
        'concurrent-member',
        {
          id: 'concurrent-member',
          name: 'Concurrent',
          spaceId: pendingGroup.id,
        },
        creator.id,
      ),
    ).toBe(true);
    rejectGroupWrite!(new Error('group write unavailable'));

    await expect(groupCreation).rejects.toThrow('group write unavailable');
    expect(useGroupStore.getState().groups).toEqual([]);
    expect(useParticipantStore.getState().participants).toEqual(
      baselineParticipants,
    );
  });

  it('keeps group creation pending until both participant and group snapshots are durable', async () => {
    await prepareDurableGroupTest();
    useComposedExpenseStore.getState().createUser('Morgan');
    await Promise.all([flushUserPersistence(), flushParticipantPersistence()]);
    storage.setItem.mockClear();
    let releaseParticipantWrite: (() => void) | undefined;
    let releaseGroupWrite: (() => void) | undefined;
    storage.setItem.mockImplementation((key) => {
      if (
        key === 'expense-mobile-participants-v2' &&
        !releaseParticipantWrite
      ) {
        return new Promise<void>((resolve) => {
          releaseParticipantWrite = resolve;
        });
      }
      if (key === 'expense-mobile-groups-v2' && !releaseGroupWrite) {
        return new Promise<void>((resolve) => {
          releaseGroupWrite = resolve;
        });
      }
      return Promise.resolve();
    });

    let creationSettled = false;
    const groupCreation = useComposedExpenseStore
      .getState()
      .addGroup('Await all stores')
      .finally(() => {
        creationSettled = true;
      });
    await waitForCondition(() => releaseParticipantWrite !== undefined);

    expect(releaseParticipantWrite).toBeDefined();
    expect(releaseGroupWrite).toBeUndefined();
    expect(useGroupStore.getState().groups).toEqual([]);
    expect(creationSettled).toBe(false);

    releaseParticipantWrite!();
    await waitForCondition(() => releaseGroupWrite !== undefined);

    expect(releaseGroupWrite).toBeDefined();
    expect(useGroupStore.getState().groups).toHaveLength(1);
    expect(creationSettled).toBe(false);

    releaseGroupWrite!();
    await expect(groupCreation).resolves.toEqual(expect.any(String));
    expect(creationSettled).toBe(true);
  });

  it('adds and updates participants through composed actions', async () => {
    const store = useComposedExpenseStore.getState();

    const participantId = store.addParticipant('Casey');
    expect(participantId).toBeTruthy();
    expect(store.getParticipantById(participantId)).toEqual({
      id: participantId,
      name: 'Casey',
    });

    await store.updateParticipant({ id: participantId, name: 'Casey Updated' });
    expect(store.getParticipantById(participantId)?.name).toBe('Casey Updated');
  });

  it('updates expenses and retrieves them by identifier', () => {
    const baseExpense: Expense = {
      id: 'expense-3',
      title: 'Dinner',
      amount: 60,
      date: '2025-02-01',
      category: 'Food & Dining',
    };

    useExpenseFeatureStore.setState({ expenses: [baseExpense] });
    useComposedExpenseStore.setState({ expenses: [baseExpense] });

    const store = useComposedExpenseStore.getState();
    const fetched = store.getExpenseById('expense-3');
    expect(fetched).toMatchObject({ title: 'Dinner' });

    store.updateExpense({ ...baseExpense, amount: 75 });
    expect(store.getExpenseById('expense-3')?.amount).toBe(75);
  });

  it('handles user settings updates and creation flows', async () => {
    const store = useComposedExpenseStore.getState();

    store.updateSettings({ currency: 'EUR' });
    expect(useUserStore.getState().settings.currency).toBe('EUR');

    const newUserId = store.createUser('Jordan');
    expect(newUserId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    await store.updateUser({ displayName: 'Jordan Updated' });
    expect(useUserStore.getState().user?.displayName).toBe('Jordan Updated');
  });

  it('manages group participant membership helpers', async () => {
    const participant: Participant = {
      id: 'p10',
      name: 'Jamie',
      userId: useUserStore.getState().internalUserId ?? undefined,
    };
    useParticipantStore.setState({ participants: [participant] });

    const groupId = useGroupStore.getState().addGroup('Helpers', participant);
    useComposedExpenseStore.setState({
      groups: useGroupStore.getState().groups,
      participants: [participant],
    });

    const store = useComposedExpenseStore.getState();
    const groupBefore = store.getGroupById(groupId);
    expect(groupBefore?.participants).toHaveLength(1);

    const otherParticipant: Participant = { id: 'p11', name: 'Taylor' };
    useParticipantStore
      .getState()
      .addParticipant(otherParticipant.name, otherParticipant.id);
    await store.addParticipantToGroup(groupId, otherParticipant.id);

    expect(store.getGroupById(groupId)?.participants).toEqual([
      participant,
      otherParticipant,
    ]);

    await store.removeParticipantFromGroup(groupId, otherParticipant.id);
    expect(store.getGroupById(groupId)?.participants).toEqual([participant]);
  });

  it('prevents the signed-in participant and final participant from being removed through the public store', async () => {
    const store = useComposedExpenseStore.getState();

    store.createUser('Alex');
    const groupId = await store.addGroup('Protected members');
    const creator = useComposedExpenseStore.getState().getGroupById(groupId)!
      .participants[0];
    const otherParticipantId = store.addParticipant('Blake');
    await store.addParticipantToGroup(groupId, otherParticipantId);

    await store.removeParticipantFromGroup(groupId, creator.id);
    expect(
      useComposedExpenseStore.getState().getGroupById(groupId)?.participants,
    ).toEqual([
      creator,
      expect.objectContaining({ id: otherParticipantId, name: 'Blake' }),
    ]);

    await store.removeParticipantFromGroup(groupId, otherParticipantId);
    expect(
      useComposedExpenseStore.getState().getGroupById(groupId)?.participants,
    ).toEqual([creator]);

    await store.removeParticipantFromGroup(groupId, creator.id);
    expect(
      useComposedExpenseStore.getState().getGroupById(groupId)?.participants,
    ).toEqual([creator]);
  });

  it('durably compensates a named member when the participant write fails, then retries without duplication', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let failParticipantWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-participants-v2' && failParticipantWrite) {
        failParticipantWrite = false;
        throw new Error('participant member write unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore
        .getState()
        .addParticipantToGroupByName(group.id, 'New member'),
    ).rejects.toThrow('participant member write unavailable');
    expect(useParticipantStore.getState().participants).toEqual([
      owner,
      member,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner, member]);
    expect(persistedParticipants(durableStorage)).toEqual([owner, member]);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([
      owner,
      member,
    ]);

    const participantId = await useComposedExpenseStore
      .getState()
      .addParticipantToGroupByName(group.id, 'New member');
    expect(participantId).toEqual(expect.any(String));
    expect(
      useParticipantStore
        .getState()
        .participants.filter(
          (participant) => participant.name === 'New member',
        ),
    ).toHaveLength(1);
    expect(
      useGroupStore
        .getState()
        .getGroupById(group.id)
        ?.participants.filter(
          (participant) => participant.name === 'New member',
        ),
    ).toHaveLength(1);
  });

  it('writes a new named participant before membership and compensates a failed group write', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    const writeKeys: string[] = [];
    let failGroupWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      writeKeys.push(key);
      if (key === 'expense-mobile-groups-v2' && failGroupWrite) {
        failGroupWrite = false;
        throw new Error('member group write unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore
        .getState()
        .addParticipantToGroupByName(group.id, 'New member'),
    ).rejects.toThrow('member group write unavailable');
    expect(writeKeys.indexOf('expense-mobile-participants-v2')).toBeLessThan(
      writeKeys.indexOf('expense-mobile-groups-v2'),
    );
    expect(useParticipantStore.getState().participants).toEqual([
      owner,
      member,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner, member]);
    expect(persistedParticipants(durableStorage)).toEqual([owner, member]);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([
      owner,
      member,
    ]);
  });

  it('serializes duplicate named-member submissions and returns one durable membership', async () => {
    const { durableStorage, group } = await seedDurableMembership();
    let releaseParticipantWrite: (() => void) | undefined;
    storage.setItem.mockImplementation((key, value) => {
      if (
        key === 'expense-mobile-participants-v2' &&
        !releaseParticipantWrite
      ) {
        return new Promise<void>((resolve) => {
          releaseParticipantWrite = () => {
            durableStorage.set(key, value);
            resolve();
          };
        });
      }
      durableStorage.set(key, value);
      return Promise.resolve();
    });

    const first = useComposedExpenseStore
      .getState()
      .addParticipantToGroupByName(group.id, 'Concurrent member');
    const second = useComposedExpenseStore
      .getState()
      .addParticipantToGroupByName(group.id, 'Concurrent member');
    await waitForCondition(() => releaseParticipantWrite !== undefined);
    expect(releaseParticipantWrite).toBeDefined();
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toHaveLength(2);
    releaseParticipantWrite!();

    const [firstId, secondId] = await Promise.all([first, second]);
    expect(secondId).toBe(firstId);
    expect(
      useParticipantStore
        .getState()
        .participants.filter(
          (participant) => participant.name === 'Concurrent member',
        ),
    ).toHaveLength(1);
    expect(
      persistedGroups(durableStorage)[0].participants.filter(
        (participant) => participant.name === 'Concurrent member',
      ),
    ).toHaveLength(1);
  });

  it('removes a newly persisted participant if identity changes before membership is written', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let releaseParticipantWrite: (() => void) | undefined;
    storage.setItem.mockImplementation((key, value) => {
      if (
        key === 'expense-mobile-participants-v2' &&
        !releaseParticipantWrite
      ) {
        return new Promise<void>((resolve) => {
          releaseParticipantWrite = () => {
            durableStorage.set(key, value);
            resolve();
          };
        });
      }
      durableStorage.set(key, value);
      return Promise.resolve();
    });

    const addition = useComposedExpenseStore
      .getState()
      .addParticipantToGroupByName(group.id, 'Identity race');
    await waitForCondition(() => releaseParticipantWrite !== undefined);
    useUserStore.setState({ internalUserId: null, user: null });
    releaseParticipantWrite!();

    await expect(addition).resolves.toBeNull();
    expect(useParticipantStore.getState().participants).toEqual([
      owner,
      member,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner, member]);
    expect(persistedParticipants(durableStorage)).toEqual([owner, member]);
  });

  it('compensates both stores if a group is archived while its new membership write is pending', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let releaseGroupWrite: (() => void) | undefined;
    storage.setItem.mockImplementation((key, value) => {
      if (key === 'expense-mobile-groups-v2' && !releaseGroupWrite) {
        return new Promise<void>((resolve) => {
          releaseGroupWrite = () => {
            durableStorage.set(key, value);
            resolve();
          };
        });
      }
      durableStorage.set(key, value);
      return Promise.resolve();
    });

    const addition = useComposedExpenseStore
      .getState()
      .addParticipantToGroupByName(group.id, 'Archive race');
    await waitForCondition(() => releaseGroupWrite !== undefined);
    useGroupStore.getState().archiveGroup(group.id);
    releaseGroupWrite!();

    await expect(addition).resolves.toBeNull();
    expect(useParticipantStore.getState().participants).toEqual([
      owner,
      member,
    ]);
    expect(useGroupStore.getState().getGroupById(group.id)).toEqual(
      expect.objectContaining({
        archivedAt: expect.any(String),
        participants: [owner, member],
      }),
    );
    expect(persistedParticipants(durableStorage)).toEqual([owner, member]);
    expect(persistedGroups(durableStorage)[0]).toEqual(
      expect.objectContaining({
        archivedAt: expect.any(String),
        participants: [owner, member],
      }),
    );
  });

  it('reports a retryable pending rollback when a membership write and its compensation both fail', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let failedGroupWrites = 0;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-groups-v2' && failedGroupWrites < 2) {
        failedGroupWrites += 1;
        throw new Error(
          failedGroupWrites === 1
            ? 'member write unavailable'
            : 'member rollback unavailable',
        );
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore
        .getState()
        .addParticipantToGroupByName(group.id, 'Pending rollback member'),
    ).rejects.toThrow('rollback remains pending');
    expect(useParticipantStore.getState().participants).toEqual([
      owner,
      member,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner, member]);

    storage.setItem.mockImplementation(async (key, value) => {
      durableStorage.set(key, value);
    });
    const participantId = await useComposedExpenseStore
      .getState()
      .addParticipantToGroupByName(group.id, 'Pending rollback member');
    expect(participantId).toEqual(expect.any(String));
    expect(
      persistedGroups(durableStorage)[0].participants.filter(
        (participant) => participant.name === 'Pending rollback member',
      ),
    ).toHaveLength(1);
  });

  it('rolls back public deletion when its group write fails and retries safely', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let failGroupWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-groups-v2' && failGroupWrite) {
        failGroupWrite = false;
        throw new Error('delete group write unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore.getState().deleteParticipant(member.id),
    ).rejects.toThrow('delete group write unavailable');
    expect(useParticipantStore.getState().participants).toEqual([
      owner,
      member,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner, member]);
    expect(persistedParticipants(durableStorage)).toEqual([owner, member]);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([
      owner,
      member,
    ]);

    await expect(
      useComposedExpenseStore.getState().deleteParticipant(member.id),
    ).resolves.toBe(true);
    expect(
      useParticipantStore.getState().getParticipantById(member.id)?.active,
    ).toBe(false);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner]);
  });

  it('restores durable membership and participant activity when the second delete write fails', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    const writeKeys: string[] = [];
    let failParticipantWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      writeKeys.push(key);
      if (key === 'expense-mobile-participants-v2' && failParticipantWrite) {
        failParticipantWrite = false;
        throw new Error('delete participant write unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore.getState().deleteParticipant(member.id),
    ).rejects.toThrow('delete participant write unavailable');
    expect(writeKeys.indexOf('expense-mobile-groups-v2')).toBeLessThan(
      writeKeys.indexOf('expense-mobile-participants-v2'),
    );
    expect(useParticipantStore.getState().participants).toEqual([
      owner,
      member,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner, member]);
    expect(persistedParticipants(durableStorage)).toEqual([owner, member]);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([
      owner,
      member,
    ]);
  });

  it('serializes concurrent public deletions without partial deactivation or duplicate work', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let releaseGroupWrite: (() => void) | undefined;
    storage.setItem.mockImplementation((key, value) => {
      if (key === 'expense-mobile-groups-v2' && !releaseGroupWrite) {
        return new Promise<void>((resolve) => {
          releaseGroupWrite = () => {
            durableStorage.set(key, value);
            resolve();
          };
        });
      }
      durableStorage.set(key, value);
      return Promise.resolve();
    });

    const first = useComposedExpenseStore
      .getState()
      .deleteParticipant(member.id);
    const second = useComposedExpenseStore
      .getState()
      .deleteParticipant(member.id);
    await waitForCondition(() => releaseGroupWrite !== undefined);
    expect(
      useParticipantStore.getState().getParticipantById(member.id)?.active,
    ).not.toBe(false);
    releaseGroupWrite!();

    await expect(Promise.all([first, second])).resolves.toEqual([true, false]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner]);
    expect(
      useParticipantStore.getState().getParticipantById(member.id)?.active,
    ).toBe(false);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([owner]);
    expect(
      persistedParticipants(durableStorage).find(
        (participant) => participant.id === member.id,
      )?.active,
    ).toBe(false);
  });

  it('restores a member if the group is archived while participant deactivation is pending', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let releaseParticipantWrite: (() => void) | undefined;
    storage.setItem.mockImplementation((key, value) => {
      if (
        key === 'expense-mobile-participants-v2' &&
        !releaseParticipantWrite
      ) {
        return new Promise<void>((resolve) => {
          releaseParticipantWrite = () => {
            durableStorage.set(key, value);
            resolve();
          };
        });
      }
      durableStorage.set(key, value);
      return Promise.resolve();
    });

    const deletion = useComposedExpenseStore
      .getState()
      .deleteParticipant(member.id);
    await waitForCondition(() => releaseParticipantWrite !== undefined);
    useGroupStore.getState().archiveGroup(group.id);
    releaseParticipantWrite!();

    await expect(deletion).resolves.toBe(false);
    expect(useParticipantStore.getState().participants).toEqual([
      owner,
      member,
    ]);
    expect(useGroupStore.getState().getGroupById(group.id)).toEqual(
      expect.objectContaining({
        archivedAt: expect.any(String),
        participants: [owner, member],
      }),
    );
    expect(persistedParticipants(durableStorage)).toEqual([owner, member]);
    expect(persistedGroups(durableStorage)[0]).toEqual(
      expect.objectContaining({
        archivedAt: expect.any(String),
        participants: [owner, member],
      }),
    );
  });

  it('keeps the legacy membership facade durable and compensates a failed group write', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    const existing: Participant = {
      id: 'existing-global-participant',
      name: 'Existing global participant',
      spaceId: group.id,
    };
    useParticipantStore.setState({ participants: [owner, member, existing] });
    await flushParticipantPersistence();
    let failGroupWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-groups-v2' && failGroupWrite) {
        failGroupWrite = false;
        throw new Error('legacy group write unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore
        .getState()
        .addParticipantToGroup(group.id, existing.id),
    ).rejects.toThrow('legacy group write unavailable');
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner, member]);
    expect(
      useParticipantStore.getState().getParticipantById(existing.id),
    ).toEqual(existing);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([
      owner,
      member,
    ]);

    await expect(
      useComposedExpenseStore
        .getState()
        .addParticipantToGroup(group.id, existing.id),
    ).resolves.toBe(true);
    await expect(
      useComposedExpenseStore
        .getState()
        .addParticipantToGroup(group.id, existing.id),
    ).resolves.toBe(true);
    expect(
      persistedGroups(durableStorage)[0].participants.filter(
        (participant) => participant.id === existing.id,
      ),
    ).toHaveLength(1);
  });

  it('rolls back participant and embedded group snapshots when a participant update cannot persist its second write', async () => {
    const { durableStorage, group, member } = await seedDurableMembership();
    let failGroupWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-groups-v2' && failGroupWrite) {
        failGroupWrite = false;
        throw new Error('participant projection unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore
        .getState()
        .updateParticipant({ ...member, name: 'Renamed member' }),
    ).rejects.toThrow('participant projection unavailable');
    expect(
      useParticipantStore.getState().getParticipantById(member.id),
    ).toEqual(member);
    expect(
      useGroupStore
        .getState()
        .getGroupById(group.id)
        ?.participants.find((participant) => participant.id === member.id),
    ).toEqual(member);
    expect(
      persistedParticipants(durableStorage).find(
        (participant) => participant.id === member.id,
      ),
    ).toEqual(member);
    expect(
      persistedGroups(durableStorage)[0].participants.find(
        (participant) => participant.id === member.id,
      ),
    ).toEqual(member);
  });

  it('rolls back profile projections when a settings rename cannot persist its group snapshot', async () => {
    const { durableStorage, group, member, personal } =
      await seedDurableProfileProjection();
    let failGroupWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-groups-v2' && failGroupWrite) {
        failGroupWrite = false;
        throw new Error('profile group projection unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore.getState().updateUserSettings({ name: 'After' }),
    ).rejects.toThrow('profile group projection unavailable');
    expect(useUserStore.getState().user?.displayName).toBe('Before');
    expect(useUserStore.getState().userSettings?.name).toBe('Before');
    expect(useParticipantStore.getState().participants).toEqual([
      personal,
      member,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([member]);
    expect(persistedUserProfile(durableStorage).user?.displayName).toBe(
      'Before',
    );
    expect(persistedParticipants(durableStorage)).toEqual([personal, member]);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([member]);
  });

  it('compensates every name projection when the final user-profile write fails', async () => {
    const { durableStorage, group, member, personal } =
      await seedDurableProfileProjection();
    let failUserWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-user-v2' && failUserWrite) {
        failUserWrite = false;
        throw new Error('profile write unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore.getState().updateUser({ displayName: 'After' }),
    ).rejects.toThrow('profile write unavailable');
    expect(useUserStore.getState().user?.displayName).toBe('Before');
    expect(useParticipantStore.getState().participants).toEqual([
      personal,
      member,
    ]);
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([member]);
    expect(persistedUserProfile(durableStorage).user?.displayName).toBe(
      'Before',
    );
    expect(persistedParticipants(durableStorage)).toEqual([personal, member]);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([member]);
  });

  it('restores a removed membership when its only persisted write fails', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let failGroupWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-groups-v2' && failGroupWrite) {
        failGroupWrite = false;
        throw new Error('remove member unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore
        .getState()
        .removeParticipantFromGroup(group.id, member.id),
    ).rejects.toThrow('remove member unavailable');
    expect(
      useGroupStore.getState().getGroupById(group.id)?.participants,
    ).toEqual([owner, member]);
    expect(persistedGroups(durableStorage)[0].participants).toEqual([
      owner,
      member,
    ]);
  });

  it('does not report archive or restore success until the group lifecycle snapshot is durable', async () => {
    const { durableStorage, group, member, owner } =
      await seedDurableMembership();
    let failGroupWrite = true;
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === 'expense-mobile-groups-v2' && failGroupWrite) {
        failGroupWrite = false;
        throw new Error('archive unavailable');
      }
      durableStorage.set(key, value);
    });

    await expect(
      useComposedExpenseStore.getState().archiveGroup(group.id),
    ).rejects.toThrow('archive unavailable');
    expect(useGroupStore.getState().getGroupById(group.id)?.archivedAt).toBe(
      undefined,
    );
    expect(persistedGroups(durableStorage)[0].archivedAt).toBeUndefined();

    await expect(
      useComposedExpenseStore.getState().archiveGroup(group.id),
    ).resolves.toBe(true);
    expect(useGroupStore.getState().getGroupById(group.id)?.archivedAt).toEqual(
      expect.any(String),
    );
    expect(persistedGroups(durableStorage)[0].archivedAt).toEqual(
      expect.any(String),
    );

    failGroupWrite = true;
    await expect(
      useComposedExpenseStore.getState().restoreGroup(group.id),
    ).rejects.toThrow('archive unavailable');
    expect(useGroupStore.getState().getGroupById(group.id)).toEqual(
      expect.objectContaining({
        archivedAt: expect.any(String),
        participants: [owner, member],
      }),
    );
    expect(persistedGroups(durableStorage)[0].archivedAt).toEqual(
      expect.any(String),
    );
  });
});
