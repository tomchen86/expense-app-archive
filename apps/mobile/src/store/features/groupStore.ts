import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpenseGroup, Participant } from '../../types';
import {
  archiveExpenseGroup,
  canRemoveParticipantFromGroup,
  isExpenseGroupArchived,
  restoreExpenseGroup,
} from '../../utils/groupDomain';
import { createUuid } from '../../utils/ids';
import {
  createVersionedMigrator,
  MOBILE_PERSISTENCE_SCHEMAS,
} from '../persistence/versioned-migration';

let pendingGroupWrite: { name: string; value: string } | null = null;
let groupWritePromise: Promise<void> | null = null;

const scheduleGroupWrite = (): Promise<void> => {
  if (!groupWritePromise) {
    const worker = Promise.resolve().then(async () => {
      while (pendingGroupWrite) {
        const write = pendingGroupWrite;
        pendingGroupWrite = null;
        try {
          await AsyncStorage.setItem(write.name, write.value);
        } catch (error) {
          pendingGroupWrite ??= write;
          throw error;
        }
      }
    });
    groupWritePromise = worker.then(
      () => {
        groupWritePromise = null;
        return pendingGroupWrite ? scheduleGroupWrite() : undefined;
      },
      (error: unknown) => {
        groupWritePromise = null;
        throw error;
      },
    );
  }
  return groupWritePromise;
};

const groupStateStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => {
    pendingGroupWrite = { name, value };
    return scheduleGroupWrite();
  },
  removeItem: async (name) => {
    pendingGroupWrite = null;
    await (groupWritePromise?.catch(() => undefined) ?? Promise.resolve());
    pendingGroupWrite = null;
    await AsyncStorage.removeItem(name);
  },
};

export const flushGroupPersistence = (): Promise<void> =>
  groupWritePromise ??
  (pendingGroupWrite ? scheduleGroupWrite() : Promise.resolve());

export interface GroupState {
  groups: ExpenseGroup[];

  // Actions
  addGroup: (
    name: string,
    creatorParticipant: Participant,
    idOverride?: string,
  ) => string;
  updateGroup: (group: ExpenseGroup) => void;
  archiveGroup: (id: string) => void;
  restoreGroup: (id: string) => void;
  /** @deprecated Use archiveGroup for the non-destructive lifecycle action. */
  deleteGroup: (id: string) => void;
  getGroupById: (id: string) => ExpenseGroup | undefined;

  // Participant management
  addParticipantToGroup: (
    groupId: string,
    participantId: string,
    participant: Participant,
    protectedParticipantId: string | null,
  ) => boolean;
  removeParticipantFromGroup: (
    groupId: string,
    participantId: string,
    protectedParticipantId: string | null,
  ) => void;
  updateParticipantInGroups: (
    participantId: string,
    updatedParticipant: Participant,
  ) => void;
  removeParticipantFromAllGroups: (
    participantId: string,
    protectedParticipantIdsByGroup: Record<string, string | null>,
  ) => boolean;
  removeParticipantMembershipIfPresent: (
    groupId: string,
    participantId: string,
  ) => boolean;
  restoreParticipantMembershipIfAbsent: (
    groupId: string,
    participant: Participant,
    index: number,
  ) => boolean;
  restoreGroupsSnapshotIfCurrent: (
    expectedGroups: ExpenseGroup[],
    previousGroups: ExpenseGroup[],
  ) => boolean;
  removeGroupCreationIfMatches: (groupId: string) => boolean;
  updateActiveParticipantNamesByUserId: (userId: string, name: string) => void;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],

      addGroup: (name, creatorParticipant, idOverride) => {
        if (!creatorParticipant?.id || !creatorParticipant.name.trim()) {
          throw new Error('A group owner is required.');
        }
        const newGroupId = idOverride ?? createUuid();
        const newGroup: ExpenseGroup = {
          id: newGroupId,
          name,
          participants: [creatorParticipant],
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          groups: [...state.groups, newGroup],
        }));

        return newGroupId;
      },

      updateGroup: (updatedGroup) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === updatedGroup.id && !isExpenseGroupArchived(group)
              ? updatedGroup
              : group,
          ),
        })),

      archiveGroup: (id) => {
        const archivedAt = new Date().toISOString();
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? archiveExpenseGroup(group, archivedAt) : group,
          ),
        }));
      },

      restoreGroup: (id) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? restoreExpenseGroup(group) : group,
          ),
        })),

      deleteGroup: (id) => get().archiveGroup(id),

      getGroupById: (id) => get().groups.find((group) => group.id === id),

      addParticipantToGroup: (
        groupId,
        participantId,
        participant,
        protectedParticipantId,
      ) => {
        const group = get().getGroupById(groupId);
        const canAdd =
          group !== undefined &&
          protectedParticipantId !== null &&
          participantId === participant.id &&
          group.participants.some(
            (candidate) => candidate.id === protectedParticipantId,
          ) &&
          !isExpenseGroupArchived(group) &&
          !group.participants.some(
            (candidate) => candidate.id === participantId,
          );
        if (!canAdd) {
          return false;
        }

        set((state) => ({
          groups: state.groups.map((candidate) =>
            candidate.id === groupId
              ? {
                  ...candidate,
                  participants: [...candidate.participants, participant],
                }
              : candidate,
          ),
        }));
        return true;
      },

      removeParticipantFromGroup: (
        groupId,
        participantId,
        protectedParticipantId,
      ) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === groupId &&
            canRemoveParticipantFromGroup(
              group,
              participantId,
              protectedParticipantId,
            )
              ? {
                  ...group,
                  participants: group.participants.filter(
                    (p) => p.id !== participantId,
                  ),
                }
              : group,
          ),
        })),

      updateParticipantInGroups: (participantId, updatedParticipant) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            isExpenseGroupArchived(group)
              ? group
              : {
                  ...group,
                  participants: group.participants.map((p) =>
                    p.id === participantId ? updatedParticipant : p,
                  ),
                },
          ),
        })),

      removeParticipantFromAllGroups: (
        participantId,
        protectedParticipantIdsByGroup,
      ) => {
        const groupsContainingParticipant = get().groups.filter((group) =>
          group.participants.some(
            (participant) => participant.id === participantId,
          ),
        );
        const canRemoveFromEveryGroup = groupsContainingParticipant.every(
          (group) =>
            canRemoveParticipantFromGroup(
              group,
              participantId,
              protectedParticipantIdsByGroup[group.id] ?? null,
            ),
        );
        if (!canRemoveFromEveryGroup) {
          return false;
        }

        set((state) => ({
          groups: state.groups.map((group) =>
            group.participants.some(
              (participant) => participant.id === participantId,
            )
              ? {
                  ...group,
                  participants: group.participants.filter(
                    (participant) => participant.id !== participantId,
                  ),
                }
              : group,
          ),
        }));
        return true;
      },

      removeParticipantMembershipIfPresent: (groupId, participantId) => {
        const group = get().getGroupById(groupId);
        if (!group) {
          return false;
        }
        if (
          !group.participants.some(
            (participant) => participant.id === participantId,
          )
        ) {
          return true;
        }
        set((state) => ({
          groups: state.groups.map((candidate) =>
            candidate.id === groupId
              ? {
                  ...candidate,
                  participants: candidate.participants.filter(
                    (participant) => participant.id !== participantId,
                  ),
                }
              : candidate,
          ),
        }));
        return true;
      },

      restoreParticipantMembershipIfAbsent: (groupId, participant, index) => {
        const group = get().getGroupById(groupId);
        if (!group) {
          return false;
        }
        if (
          group.participants.some(
            (candidate) => candidate.id === participant.id,
          )
        ) {
          return true;
        }
        set((state) => ({
          groups: state.groups.map((candidate) => {
            if (candidate.id !== groupId) {
              return candidate;
            }
            const participants = [...candidate.participants];
            participants.splice(
              Math.max(0, Math.min(index, participants.length)),
              0,
              participant,
            );
            return { ...candidate, participants };
          }),
        }));
        return true;
      },

      restoreGroupsSnapshotIfCurrent: (expectedGroups, previousGroups) => {
        if (get().groups !== expectedGroups) {
          return false;
        }
        set({ groups: previousGroups });
        return true;
      },

      removeGroupCreationIfMatches: (groupId) => {
        const group = get().getGroupById(groupId);
        if (!group) {
          return false;
        }
        set((state) => ({
          groups: state.groups.filter((candidate) => candidate.id !== groupId),
        }));
        return true;
      },

      updateActiveParticipantNamesByUserId: (userId, name) => {
        const hasMatchingParticipant = get().groups.some(
          (group) =>
            !isExpenseGroupArchived(group) &&
            group.participants.some(
              (participant) =>
                participant.active !== false &&
                participant.userId === userId &&
                participant.name !== name,
            ),
        );
        if (!hasMatchingParticipant) {
          return;
        }
        set((state) => ({
          groups: state.groups.map((group) =>
            isExpenseGroupArchived(group)
              ? group
              : {
                  ...group,
                  participants: group.participants.map((participant) =>
                    participant.active !== false &&
                    participant.userId === userId
                      ? { ...participant, name }
                      : participant,
                  ),
                },
          ),
        }));
      },
    }),
    {
      name: MOBILE_PERSISTENCE_SCHEMAS.groups.storageKey,
      version: MOBILE_PERSISTENCE_SCHEMAS.groups.currentVersion,
      storage: createJSONStorage(() => groupStateStorage),
      partialize: (state) => ({ groups: state.groups }),
      migrate: createVersionedMigrator<GroupState>(
        MOBILE_PERSISTENCE_SCHEMAS.groups,
        {},
      ),
    },
  ),
);
