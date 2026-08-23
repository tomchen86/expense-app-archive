import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ExpenseGroup, ExpenseState } from '../types';

// Import individual stores
import { useCategoryStore } from './features/categoryStore';
import {
  flushUserPersistence,
  useUserStore,
  type UserProfileSnapshot,
} from './features/userStore';
import {
  flushParticipantPersistence,
  useParticipantStore,
} from './features/participantStore';
import { useExpenseStore as useExpenseFeatureStore } from './features/expenseStore';
import { flushGroupPersistence, useGroupStore } from './features/groupStore';
import { resolveGroupParticipantIdForUser } from '../utils/groupCalculations';
import { isExpenseGroupArchived } from '../utils/groupDomain';
import { createUuid } from '../utils/ids';

const resolveCurrentGroupParticipantId = (group: ExpenseGroup | undefined) => {
  const { internalUserId, user } = useUserStore.getState();
  return resolveGroupParticipantIdForUser(group, internalUserId, user?.id);
};

let groupMutationChain: Promise<void> = Promise.resolve();

const serializeGroupMutation = <Result>(
  operation: () => Promise<Result>,
): Promise<Result> => {
  const result = groupMutationChain.then(operation);
  groupMutationChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const rejectGroupCreation = (
  creationError: unknown,
  rollbackErrors: string[],
): never => {
  if (rollbackErrors.length === 0) {
    throw creationError;
  }
  throw new Error(
    `Group creation failed: ${errorMessage(creationError)}; rollback remains pending: ${rollbackErrors.join('; ')}`,
  );
};

const rejectGroupMutation = (
  operation: string,
  mutationError: unknown,
  rollbackErrors: string[],
): never => {
  if (rollbackErrors.length === 0) {
    throw mutationError;
  }
  throw new Error(
    `${operation} failed: ${errorMessage(mutationError)}; rollback remains pending: ${rollbackErrors.join('; ')}`,
  );
};

const rollbackParticipantCreation = async (
  participantId: string,
): Promise<string[]> => {
  const participantStore = useParticipantStore.getState();
  const participant = participantStore.getParticipantById(participantId);
  if (!participant) {
    return [];
  }
  const didRemove =
    participantStore.removeParticipantCreationIfMatches(participantId);
  const errors = didRemove
    ? []
    : ['participant memory rollback was rejected by its identity guard'];
  try {
    await flushParticipantPersistence();
  } catch (error) {
    errors.push(`participant persistence: ${errorMessage(error)}`);
  }
  return errors;
};

const rollbackGroupCreation = async (groupId: string): Promise<string[]> => {
  const groupStore = useGroupStore.getState();
  const group = groupStore.getGroupById(groupId);
  if (!group) {
    return [];
  }
  const didRemove = groupStore.removeGroupCreationIfMatches(groupId);
  const errors = didRemove
    ? []
    : ['group memory rollback was rejected by its identity guard'];
  try {
    await flushGroupPersistence();
  } catch (error) {
    errors.push(`group persistence: ${errorMessage(error)}`);
  }
  return errors;
};

interface GroupMembershipSnapshot {
  groupId: string;
  index: number;
  participant: ExpenseGroup['participants'][number];
  protectedParticipantId: string;
}

const rollbackAddedMembership = async (
  groupId: string,
  participantId: string,
): Promise<string[]> => {
  const didRemove = useGroupStore
    .getState()
    .removeParticipantMembershipIfPresent(groupId, participantId);
  const errors = didRemove
    ? []
    : ['group membership memory rollback was rejected'];
  try {
    await flushGroupPersistence();
  } catch (error) {
    errors.push(`group persistence: ${errorMessage(error)}`);
  }
  return errors;
};

const restoreMemberships = async (
  memberships: GroupMembershipSnapshot[],
): Promise<string[]> => {
  const groupStore = useGroupStore.getState();
  const errors: string[] = [];
  memberships.forEach(({ groupId, index, participant }) => {
    if (
      !groupStore.restoreParticipantMembershipIfAbsent(
        groupId,
        participant,
        index,
      )
    ) {
      errors.push(`group ${groupId} memory rollback was rejected`);
    }
  });
  try {
    await flushGroupPersistence();
  } catch (error) {
    errors.push(`group persistence: ${errorMessage(error)}`);
  }
  return errors;
};

const restoreParticipant = async (
  participant: ExpenseGroup['participants'][number],
): Promise<string[]> => {
  const didRestore = useParticipantStore
    .getState()
    .restoreParticipantIfInactive(participant);
  const errors = didRestore ? [] : ['participant memory rollback was rejected'];
  try {
    await flushParticipantPersistence();
  } catch (error) {
    errors.push(`participant persistence: ${errorMessage(error)}`);
  }
  return errors;
};

const rollbackParticipantSnapshot = async (
  expectedParticipants: ExpenseState['participants'],
  previousParticipants: ExpenseState['participants'],
): Promise<string[]> => {
  if (expectedParticipants === previousParticipants) {
    return [];
  }
  const didRestore = useParticipantStore
    .getState()
    .restoreParticipantsSnapshotIfCurrent(
      expectedParticipants,
      previousParticipants,
    );
  const errors = didRestore
    ? []
    : ['participant snapshot memory rollback was rejected by CAS'];
  try {
    await flushParticipantPersistence();
  } catch (error) {
    errors.push(`participant persistence: ${errorMessage(error)}`);
  }
  return errors;
};

const rollbackGroupSnapshot = async (
  expectedGroups: ExpenseState['groups'],
  previousGroups: ExpenseState['groups'],
): Promise<string[]> => {
  if (expectedGroups === previousGroups) {
    return [];
  }
  const didRestore = useGroupStore
    .getState()
    .restoreGroupsSnapshotIfCurrent(expectedGroups, previousGroups);
  const errors = didRestore
    ? []
    : ['group snapshot memory rollback was rejected by CAS'];
  try {
    await flushGroupPersistence();
  } catch (error) {
    errors.push(`group persistence: ${errorMessage(error)}`);
  }
  return errors;
};

const readUserProfileSnapshot = (): UserProfileSnapshot => {
  const { user, userSettings, internalUserId } = useUserStore.getState();
  return { user, userSettings, internalUserId };
};

const rollbackUserProfile = async (
  expected: UserProfileSnapshot,
  previous: UserProfileSnapshot,
): Promise<string[]> => {
  const didRestore = useUserStore
    .getState()
    .restoreProfileIfCurrent(expected, previous);
  const errors = didRestore
    ? []
    : ['user profile memory rollback was rejected by CAS'];
  try {
    await flushUserPersistence();
  } catch (error) {
    errors.push(`user persistence: ${errorMessage(error)}`);
  }
  return errors;
};

const resolveActiveGroupAccess = (groupId: string) => {
  const group = useGroupStore.getState().getGroupById(groupId);
  const protectedParticipantId = resolveCurrentGroupParticipantId(group);
  if (
    !group ||
    isExpenseGroupArchived(group) ||
    !protectedParticipantId ||
    !group.participants.some(
      (participant) => participant.id === protectedParticipantId,
    )
  ) {
    return null;
  }
  return { group, protectedParticipantId };
};

const updateCurrentUserParticipantNames = (name: string) => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return;
  }
  const { internalUserId, user } = useUserStore.getState();
  const userIds = new Set(
    [user?.id, internalUserId].filter((userId): userId is string =>
      Boolean(userId),
    ),
  );
  userIds.forEach((userId) => {
    useParticipantStore
      .getState()
      .updateActiveParticipantsByUserId(userId, trimmedName);
    useGroupStore
      .getState()
      .updateActiveParticipantNamesByUserId(userId, trimmedName);
  });
};

interface DurableProfileMutation {
  applyUserMutation: () => void;
  identityIds: string[];
  targetName: string;
  targetUserId: string;
}

const persistProfileMutation = async ({
  applyUserMutation,
  identityIds,
  targetName,
  targetUserId,
}: DurableProfileMutation): Promise<boolean> => {
  await flushParticipantPersistence();
  await flushGroupPersistence();
  await flushUserPersistence();

  const participantStore = useParticipantStore.getState();
  const userState = useUserStore.getState();
  const previousParticipants = participantStore.participants;
  const normalizedName = targetName.trim();
  if (normalizedName) {
    participantStore.syncUserAsParticipant(
      userState.personalParticipantId,
      { name: normalizedName },
      { userId: targetUserId, spaceId: userState.personalSpaceId },
    );
    new Set(identityIds).forEach((userId) => {
      useParticipantStore
        .getState()
        .updateActiveParticipantsByUserId(userId, normalizedName);
    });
  }
  const expectedParticipants = useParticipantStore.getState().participants;
  try {
    await flushParticipantPersistence();
  } catch (mutationError) {
    const rollbackErrors = await rollbackParticipantSnapshot(
      expectedParticipants,
      previousParticipants,
    );
    return rejectGroupMutation(
      'User profile update',
      mutationError,
      rollbackErrors,
    );
  }

  const previousGroups = useGroupStore.getState().groups;
  if (normalizedName) {
    new Set(identityIds).forEach((userId) => {
      useGroupStore
        .getState()
        .updateActiveParticipantNamesByUserId(userId, normalizedName);
    });
  }
  const expectedGroups = useGroupStore.getState().groups;
  try {
    await flushGroupPersistence();
  } catch (mutationError) {
    const rollbackErrors = await rollbackGroupSnapshot(
      expectedGroups,
      previousGroups,
    );
    rollbackErrors.push(
      ...(await rollbackParticipantSnapshot(
        expectedParticipants,
        previousParticipants,
      )),
    );
    return rejectGroupMutation(
      'User profile update',
      mutationError,
      rollbackErrors,
    );
  }

  const previousProfile = readUserProfileSnapshot();
  applyUserMutation();
  const expectedProfile = readUserProfileSnapshot();
  try {
    await flushUserPersistence();
  } catch (mutationError) {
    const rollbackErrors = await rollbackUserProfile(
      expectedProfile,
      previousProfile,
    );
    rollbackErrors.push(
      ...(await rollbackGroupSnapshot(expectedGroups, previousGroups)),
    );
    rollbackErrors.push(
      ...(await rollbackParticipantSnapshot(
        expectedParticipants,
        previousParticipants,
      )),
    );
    return rejectGroupMutation(
      'User profile update',
      mutationError,
      rollbackErrors,
    );
  }
  return true;
};

export const useExpenseStore = create(
  subscribeWithSelector<ExpenseState>((set, _get) => {
    // Subscribe to individual stores and sync their state
    const initialState = {
      expenses: useExpenseFeatureStore.getState().expenses,
      groups: useGroupStore.getState().groups,
      participants: useParticipantStore.getState().participants,
      categories: useCategoryStore.getState().categories,

      // New structure
      user: useUserStore.getState().user,
      settings: useUserStore.getState().settings,

      // Legacy structure (temporary)
      userSettings: useUserStore.getState().userSettings,
      internalUserId: useUserStore.getState().internalUserId,
      personalSpaceId: useUserStore.getState().personalSpaceId,
      personalParticipantId: useUserStore.getState().personalParticipantId,
    };

    // Set up subscriptions to sync changes from individual stores
    useExpenseFeatureStore.subscribe((state) =>
      set({ expenses: state.expenses }),
    );
    useGroupStore.subscribe((state) => set({ groups: state.groups }));
    useParticipantStore.subscribe((state) =>
      set({ participants: state.participants }),
    );
    useCategoryStore.subscribe((state) =>
      set({ categories: state.categories }),
    );
    useUserStore.subscribe((state) =>
      set({
        // New structure
        user: state.user,
        settings: state.settings,

        // Legacy structure (temporary)
        userSettings: state.userSettings,
        internalUserId: state.internalUserId,
        personalSpaceId: state.personalSpaceId,
        personalParticipantId: state.personalParticipantId,
      }),
    );

    return {
      // --- State from individual stores ---
      ...initialState,

      // --- New User Actions ---
      updateUser: (userData) =>
        serializeGroupMutation(async () => {
          await useUserStore.getState().ensureLocalIdentityPersisted();
          const userState = useUserStore.getState();
          const repairedInternalUserId =
            userState.internalUserId ?? userState.user?.id;
          if (!repairedInternalUserId) {
            throw new Error('A durable local identity is required.');
          }
          const targetUser = userState.user
            ? { ...userState.user, ...userData }
            : {
                id: repairedInternalUserId,
                displayName: '',
                personalSpaceId: userState.personalSpaceId,
                ...userData,
              };
          return persistProfileMutation({
            applyUserMutation: () =>
              useUserStore.getState().updateUser(userData),
            identityIds: [
              repairedInternalUserId,
              userState.user?.id ?? repairedInternalUserId,
              targetUser.id,
            ],
            targetName: targetUser.displayName,
            targetUserId: targetUser.id,
          });
        }),

      updateSettings: (settingsData) => {
        useUserStore.getState().updateSettings(settingsData);
      },

      createUser: (displayName) => {
        const userId = useUserStore.getState().createUser(displayName);
        const { personalParticipantId, personalSpaceId } =
          useUserStore.getState();
        useParticipantStore
          .getState()
          .syncUserAsParticipant(
            personalParticipantId,
            { name: displayName },
            { userId, spaceId: personalSpaceId },
          );
        updateCurrentUserParticipantNames(displayName);
        return userId;
      },

      // --- Legacy User Settings Actions (temporary) ---
      updateUserSettings: (settings) =>
        serializeGroupMutation(async () => {
          await useUserStore.getState().ensureLocalIdentityPersisted();
          const { internalUserId, user } = useUserStore.getState();
          const userId = user?.id ?? internalUserId;
          if (!userId) {
            throw new Error('A durable local identity is required.');
          }
          return persistProfileMutation({
            applyUserMutation: () =>
              useUserStore.getState().updateUserSettings(settings),
            identityIds: [userId, internalUserId ?? userId],
            targetName: settings.name,
            targetUserId: userId,
          });
        }),

      // --- Expense Actions ---
      addExpense: (expense) => {
        return useExpenseFeatureStore.getState().addExpense(expense);
      },

      updateExpense: (expense) => {
        useExpenseFeatureStore.getState().updateExpense(expense);
      },

      updateExpenseIfVersion: (expense, expectedCurrentVersion) =>
        useExpenseFeatureStore
          .getState()
          .updateExpenseIfVersion(expense, expectedCurrentVersion),

      checkExpenseVersion: (id, expectedCurrentVersion) =>
        useExpenseFeatureStore
          .getState()
          .checkExpenseVersion(id, expectedCurrentVersion),

      deleteExpense: (id) => {
        useExpenseFeatureStore.getState().deleteExpense(id);
      },

      deleteExpenseDraftIfVersion: (id, expectedCurrentVersion) =>
        useExpenseFeatureStore
          .getState()
          .deleteExpenseDraftIfVersion(id, expectedCurrentVersion),

      restoreExpenseSnapshot: (
        expense,
        expectedCurrentVersion,
        expectedSnapshotVersion,
      ) =>
        useExpenseFeatureStore
          .getState()
          .restoreExpenseSnapshot(
            expense,
            expectedCurrentVersion,
            expectedSnapshotVersion,
          ),

      getExpenseById: (id) => {
        return useExpenseFeatureStore.getState().getExpenseById(id);
      },

      // --- Group Actions ---
      addGroup: (name) =>
        serializeGroupMutation(async () => {
          await useUserStore.getState().ensureLocalIdentityPersisted();
          await flushGroupPersistence();
          await flushParticipantPersistence();

          const { internalUserId, user, userSettings } =
            useUserStore.getState();
          const userId = user?.id || internalUserId;
          if (!userId) {
            throw new Error('A durable local identity is required.');
          }

          const creatorName =
            user?.displayName?.trim() ||
            userSettings?.name?.trim() ||
            `User ${userId.substring(0, 4)}`;
          let groupId = createUuid();
          while (useGroupStore.getState().getGroupById(groupId)) {
            groupId = createUuid();
          }
          let participantId = createUuid();
          while (
            useParticipantStore.getState().getParticipantById(participantId)
          ) {
            participantId = createUuid();
          }
          const creator = {
            id: participantId,
            name: creatorName,
            spaceId: groupId,
            userId,
          };

          useParticipantStore
            .getState()
            .addParticipant(creatorName, participantId, {
              spaceId: groupId,
              userId,
            });
          try {
            await flushParticipantPersistence();
          } catch (creationError) {
            const rollbackErrors =
              await rollbackParticipantCreation(participantId);
            return rejectGroupCreation(creationError, rollbackErrors);
          }

          try {
            const latestCreator =
              useParticipantStore
                .getState()
                .getParticipantById(participantId) ?? creator;
            useGroupStore.getState().addGroup(name, latestCreator, groupId);
            await flushGroupPersistence();
          } catch (creationError) {
            const rollbackErrors = await rollbackGroupCreation(groupId);
            rollbackErrors.push(
              ...(await rollbackParticipantCreation(participantId)),
            );
            return rejectGroupCreation(creationError, rollbackErrors);
          }

          return groupId;
        }),

      updateGroup: (group) => {
        useGroupStore.getState().updateGroup(group);
      },

      archiveGroup: (id) =>
        serializeGroupMutation(async () => {
          await flushGroupPersistence();
          const group = useGroupStore.getState().getGroupById(id);
          if (!group || isExpenseGroupArchived(group)) {
            return false;
          }
          const previousGroups = useGroupStore.getState().groups;
          useGroupStore.getState().archiveGroup(id);
          const expectedGroups = useGroupStore.getState().groups;
          try {
            await flushGroupPersistence();
          } catch (mutationError) {
            const rollbackErrors = await rollbackGroupSnapshot(
              expectedGroups,
              previousGroups,
            );
            return rejectGroupMutation(
              'Group archive',
              mutationError,
              rollbackErrors,
            );
          }
          return true;
        }),

      restoreGroup: (id) =>
        serializeGroupMutation(async () => {
          await flushGroupPersistence();
          const group = useGroupStore.getState().getGroupById(id);
          if (!group || !isExpenseGroupArchived(group)) {
            return false;
          }
          const previousGroups = useGroupStore.getState().groups;
          useGroupStore.getState().restoreGroup(id);
          const expectedGroups = useGroupStore.getState().groups;
          try {
            await flushGroupPersistence();
          } catch (mutationError) {
            const rollbackErrors = await rollbackGroupSnapshot(
              expectedGroups,
              previousGroups,
            );
            return rejectGroupMutation(
              'Group restore',
              mutationError,
              rollbackErrors,
            );
          }
          return true;
        }),

      deleteGroup: (id) =>
        serializeGroupMutation(async () => {
          await flushGroupPersistence();
          const group = useGroupStore.getState().getGroupById(id);
          if (!group || isExpenseGroupArchived(group)) {
            return false;
          }
          const previousGroups = useGroupStore.getState().groups;
          useGroupStore.getState().deleteGroup(id);
          const expectedGroups = useGroupStore.getState().groups;
          try {
            await flushGroupPersistence();
          } catch (mutationError) {
            const rollbackErrors = await rollbackGroupSnapshot(
              expectedGroups,
              previousGroups,
            );
            return rejectGroupMutation(
              'Group archive',
              mutationError,
              rollbackErrors,
            );
          }
          return true;
        }),

      getGroupById: (id) => {
        return useGroupStore.getState().getGroupById(id);
      },

      // --- Participant Actions ---
      addParticipant: (name, idOverride, identity) => {
        return useParticipantStore
          .getState()
          .addParticipant(name, idOverride, identity);
      },

      updateParticipant: (participant) =>
        serializeGroupMutation(async () => {
          await flushParticipantPersistence();
          await flushGroupPersistence();
          const existingParticipant = useParticipantStore
            .getState()
            .getParticipantById(participant.id);
          if (!existingParticipant) {
            return false;
          }

          const previousParticipants =
            useParticipantStore.getState().participants;
          useParticipantStore.getState().updateParticipant(participant);
          const expectedParticipants =
            useParticipantStore.getState().participants;
          try {
            await flushParticipantPersistence();
          } catch (mutationError) {
            const rollbackErrors = await rollbackParticipantSnapshot(
              expectedParticipants,
              previousParticipants,
            );
            return rejectGroupMutation(
              'Participant update',
              mutationError,
              rollbackErrors,
            );
          }

          const previousGroups = useGroupStore.getState().groups;
          useGroupStore
            .getState()
            .updateParticipantInGroups(participant.id, participant);
          const expectedGroups = useGroupStore.getState().groups;
          try {
            await flushGroupPersistence();
          } catch (mutationError) {
            const rollbackErrors = await rollbackGroupSnapshot(
              expectedGroups,
              previousGroups,
            );
            rollbackErrors.push(
              ...(await rollbackParticipantSnapshot(
                expectedParticipants,
                previousParticipants,
              )),
            );
            return rejectGroupMutation(
              'Participant update',
              mutationError,
              rollbackErrors,
            );
          }
          return true;
        }),

      deleteParticipant: (id) =>
        serializeGroupMutation(async () => {
          await flushGroupPersistence();
          await flushParticipantPersistence();

          const participantStore = useParticipantStore.getState();
          const participant = participantStore.getParticipantById(id);
          if (!participant || participant.active === false) {
            return false;
          }
          const { internalUserId, personalParticipantId, user } =
            useUserStore.getState();
          const currentIdentityIds = new Set(
            [internalUserId, personalParticipantId, user?.id].filter(
              (identityId): identityId is string => Boolean(identityId),
            ),
          );
          if (
            currentIdentityIds.has(participant.id) ||
            (participant.userId !== undefined &&
              currentIdentityIds.has(participant.userId))
          ) {
            return false;
          }

          const groupStore = useGroupStore.getState();
          const memberships = groupStore.groups.flatMap((group) => {
            const index = group.participants.findIndex(
              (candidate) => candidate.id === id,
            );
            const protectedParticipantId =
              resolveCurrentGroupParticipantId(group);
            return index >= 0 && protectedParticipantId
              ? [
                  {
                    groupId: group.id,
                    index,
                    participant: group.participants[index],
                    protectedParticipantId,
                  } satisfies GroupMembershipSnapshot,
                ]
              : [];
          });
          const groupsContainingParticipant = groupStore.groups.filter(
            (group) =>
              group.participants.some((candidate) => candidate.id === id),
          );
          if (memberships.length !== groupsContainingParticipant.length) {
            return false;
          }
          const protectedParticipantIdsByGroup = Object.fromEntries(
            memberships.map(({ groupId, protectedParticipantId }) => [
              groupId,
              protectedParticipantId,
            ]),
          );
          const didRemoveFromGroups = groupStore.removeParticipantFromAllGroups(
            id,
            protectedParticipantIdsByGroup,
          );
          if (!didRemoveFromGroups) {
            return false;
          }

          if (memberships.length > 0) {
            try {
              await flushGroupPersistence();
            } catch (mutationError) {
              const rollbackErrors = await restoreMemberships(memberships);
              return rejectGroupMutation(
                'Participant deletion',
                mutationError,
                rollbackErrors,
              );
            }

            const accessChanged = memberships.some(
              ({ groupId, protectedParticipantId }) => {
                const liveGroup = useGroupStore
                  .getState()
                  .getGroupById(groupId);
                return (
                  !liveGroup ||
                  isExpenseGroupArchived(liveGroup) ||
                  resolveCurrentGroupParticipantId(liveGroup) !==
                    protectedParticipantId
                );
              },
            );
            if (accessChanged) {
              const rollbackErrors = await restoreMemberships(memberships);
              if (rollbackErrors.length > 0) {
                return rejectGroupMutation(
                  'Participant deletion',
                  new Error('Group access changed during deletion.'),
                  rollbackErrors,
                );
              }
              return false;
            }
          }

          const deactivatedParticipant = useParticipantStore
            .getState()
            .deactivateParticipantIfActive(id);
          if (!deactivatedParticipant) {
            const rollbackErrors = await restoreMemberships(memberships);
            if (rollbackErrors.length > 0) {
              return rejectGroupMutation(
                'Participant deletion',
                new Error('Participant changed during deletion.'),
                rollbackErrors,
              );
            }
            return false;
          }

          try {
            await flushParticipantPersistence();
          } catch (mutationError) {
            const rollbackErrors = await restoreParticipant(
              deactivatedParticipant,
            );
            rollbackErrors.push(...(await restoreMemberships(memberships)));
            return rejectGroupMutation(
              'Participant deletion',
              mutationError,
              rollbackErrors,
            );
          }

          const finalAccessChanged = memberships.some(
            ({ groupId, protectedParticipantId }) => {
              const liveGroup = useGroupStore.getState().getGroupById(groupId);
              return (
                !liveGroup ||
                isExpenseGroupArchived(liveGroup) ||
                resolveCurrentGroupParticipantId(liveGroup) !==
                  protectedParticipantId
              );
            },
          );
          if (finalAccessChanged) {
            const rollbackErrors = await restoreParticipant(
              deactivatedParticipant,
            );
            rollbackErrors.push(...(await restoreMemberships(memberships)));
            if (rollbackErrors.length > 0) {
              return rejectGroupMutation(
                'Participant deletion',
                new Error('Group access changed during deletion.'),
                rollbackErrors,
              );
            }
            return false;
          }

          useExpenseFeatureStore
            .getState()
            .updateExpensesForParticipantRemoval(id);
          return true;
        }),

      getParticipantById: (id) => {
        return useParticipantStore.getState().getParticipantById(id);
      },

      addParticipantToGroup: (groupId, participantId) =>
        serializeGroupMutation(async () => {
          await flushGroupPersistence();
          await flushParticipantPersistence();

          const access = resolveActiveGroupAccess(groupId);
          const participant = useParticipantStore
            .getState()
            .getParticipantById(participantId);
          if (!access || !participant || participant.active === false) {
            return false;
          }
          if (
            access.group.participants.some(
              (candidate) => candidate.id === participantId,
            )
          ) {
            return true;
          }

          const didAdd = useGroupStore
            .getState()
            .addParticipantToGroup(
              groupId,
              participantId,
              participant,
              access.protectedParticipantId,
            );
          if (!didAdd) {
            return false;
          }
          try {
            await flushGroupPersistence();
          } catch (mutationError) {
            const rollbackErrors = await rollbackAddedMembership(
              groupId,
              participantId,
            );
            return rejectGroupMutation(
              'Group membership addition',
              mutationError,
              rollbackErrors,
            );
          }

          const liveAccess = resolveActiveGroupAccess(groupId);
          const liveParticipant = useParticipantStore
            .getState()
            .getParticipantById(participantId);
          if (
            !liveAccess ||
            liveAccess.protectedParticipantId !==
              access.protectedParticipantId ||
            !liveParticipant ||
            liveParticipant.active === false
          ) {
            const rollbackErrors = await rollbackAddedMembership(
              groupId,
              participantId,
            );
            if (rollbackErrors.length > 0) {
              return rejectGroupMutation(
                'Group membership addition',
                new Error('Group access changed while adding the member.'),
                rollbackErrors,
              );
            }
            return false;
          }
          return true;
        }),

      addParticipantToGroupByName: (groupId, participantName) =>
        serializeGroupMutation(async () => {
          await flushGroupPersistence();
          await flushParticipantPersistence();

          const name = participantName.trim();
          const initialAccess = resolveActiveGroupAccess(groupId);
          if (!initialAccess || !name) {
            return null;
          }

          const participantStore = useParticipantStore.getState();
          const existingParticipant = participantStore.participants.find(
            (participant) =>
              participant.active !== false &&
              participant.name === name &&
              participant.spaceId === groupId,
          );
          if (
            existingParticipant &&
            initialAccess.group.participants.some(
              (candidate) => candidate.id === existingParticipant.id,
            )
          ) {
            return existingParticipant.id;
          }

          let participantId = existingParticipant?.id ?? createUuid();
          while (
            !existingParticipant &&
            useParticipantStore.getState().getParticipantById(participantId)
          ) {
            participantId = createUuid();
          }
          const createdParticipant = !existingParticipant;
          if (createdParticipant) {
            participantStore.addParticipant(name, participantId, {
              spaceId: groupId,
            });
            try {
              await flushParticipantPersistence();
            } catch (mutationError) {
              const rollbackErrors =
                await rollbackParticipantCreation(participantId);
              return rejectGroupMutation(
                'Group member creation',
                mutationError,
                rollbackErrors,
              );
            }
          }

          const liveAccess = resolveActiveGroupAccess(groupId);
          if (
            !liveAccess ||
            liveAccess.protectedParticipantId !==
              initialAccess.protectedParticipantId
          ) {
            const rollbackErrors = createdParticipant
              ? await rollbackParticipantCreation(participantId)
              : [];
            if (rollbackErrors.length > 0) {
              return rejectGroupMutation(
                'Group member creation',
                new Error('Group access changed while adding the member.'),
                rollbackErrors,
              );
            }
            return null;
          }

          const participant = useParticipantStore
            .getState()
            .getParticipantById(participantId);
          if (!participant || participant.active === false) {
            const rollbackErrors = createdParticipant
              ? await rollbackParticipantCreation(participantId)
              : [];
            if (rollbackErrors.length > 0) {
              return rejectGroupMutation(
                'Group member creation',
                new Error('Participant changed while adding the member.'),
                rollbackErrors,
              );
            }
            return null;
          }

          const didAdd = useGroupStore
            .getState()
            .addParticipantToGroup(
              groupId,
              participantId,
              participant,
              liveAccess.protectedParticipantId,
            );
          if (!didAdd) {
            const rollbackErrors = createdParticipant
              ? await rollbackParticipantCreation(participantId)
              : [];
            if (rollbackErrors.length > 0) {
              return rejectGroupMutation(
                'Group member creation',
                new Error('The member could not be added to the group.'),
                rollbackErrors,
              );
            }
            return null;
          }

          try {
            await flushGroupPersistence();
          } catch (mutationError) {
            const rollbackErrors = await rollbackAddedMembership(
              groupId,
              participantId,
            );
            if (createdParticipant) {
              rollbackErrors.push(
                ...(await rollbackParticipantCreation(participantId)),
              );
            }
            return rejectGroupMutation(
              'Group member creation',
              mutationError,
              rollbackErrors,
            );
          }

          const finalAccess = resolveActiveGroupAccess(groupId);
          const finalParticipant = useParticipantStore
            .getState()
            .getParticipantById(participantId);
          if (
            !finalAccess ||
            finalAccess.protectedParticipantId !==
              initialAccess.protectedParticipantId ||
            !finalParticipant ||
            finalParticipant.active === false
          ) {
            const rollbackErrors = await rollbackAddedMembership(
              groupId,
              participantId,
            );
            if (createdParticipant) {
              rollbackErrors.push(
                ...(await rollbackParticipantCreation(participantId)),
              );
            }
            if (rollbackErrors.length > 0) {
              return rejectGroupMutation(
                'Group member creation',
                new Error('Group access changed while adding the member.'),
                rollbackErrors,
              );
            }
            return null;
          }
          return participantId;
        }),

      removeParticipantFromGroup: (groupId, participantId) =>
        serializeGroupMutation(async () => {
          await flushGroupPersistence();
          const access = resolveActiveGroupAccess(groupId);
          if (!access) {
            return false;
          }
          const participantIndex = access.group.participants.findIndex(
            (participant) => participant.id === participantId,
          );
          if (participantIndex < 0) {
            return false;
          }
          const membership: GroupMembershipSnapshot = {
            groupId,
            index: participantIndex,
            participant: access.group.participants[participantIndex],
            protectedParticipantId: access.protectedParticipantId,
          };
          useGroupStore
            .getState()
            .removeParticipantFromGroup(
              groupId,
              participantId,
              access.protectedParticipantId,
            );
          if (
            useGroupStore
              .getState()
              .getGroupById(groupId)
              ?.participants.some(
                (participant) => participant.id === participantId,
              )
          ) {
            return false;
          }

          try {
            await flushGroupPersistence();
          } catch (mutationError) {
            const rollbackErrors = await restoreMemberships([membership]);
            return rejectGroupMutation(
              'Group member removal',
              mutationError,
              rollbackErrors,
            );
          }

          const finalAccess = resolveActiveGroupAccess(groupId);
          if (
            !finalAccess ||
            finalAccess.protectedParticipantId !== access.protectedParticipantId
          ) {
            const rollbackErrors = await restoreMemberships([membership]);
            if (rollbackErrors.length > 0) {
              return rejectGroupMutation(
                'Group member removal',
                new Error('Group access changed while removing the member.'),
                rollbackErrors,
              );
            }
            return false;
          }
          return true;
        }),

      // --- Category Actions ---
      addCategory: (categoryData) => {
        return useCategoryStore.getState().addCategory(categoryData);
      },

      updateCategory: (category) => {
        useCategoryStore.getState().updateCategory(category);
      },

      deleteCategory: (categoryId) => {
        useCategoryStore.getState().deleteCategory(categoryId);
      },

      getCategoryByName: (name) => {
        return useCategoryStore.getState().getCategoryByName(name);
      },
    };
  }),
);

// Initialize migration for orphaned expenses on store creation
const initializeStore = () => {
  const { personalParticipantId, personalSpaceId } = useUserStore.getState();
  if (personalParticipantId && personalSpaceId) {
    useExpenseFeatureStore
      .getState()
      .migrateOrphanedExpenses(personalParticipantId, personalSpaceId);
  }
};

const initializeAfterHydration = () => {
  if (
    useUserStore.persist.hasHydrated() &&
    useExpenseFeatureStore.persist.hasHydrated()
  ) {
    initializeStore();
  }
};

useUserStore.persist.onFinishHydration(initializeAfterHydration);
useExpenseFeatureStore.persist.onFinishHydration(initializeAfterHydration);
initializeAfterHydration();
