import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpenseGroup, Participant } from '../../types';
import {
  archiveExpenseGroup,
  isExpenseGroupArchived,
  restoreExpenseGroup,
} from '../../utils/groupDomain';
import { createUuid } from '../../utils/ids';

export interface GroupState {
  groups: ExpenseGroup[];

  // Actions
  addGroup: (name: string, creatorParticipant?: Participant) => string;
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
  ) => void;
  removeParticipantFromGroup: (groupId: string, participantId: string) => void;
  updateParticipantInGroups: (
    participantId: string,
    updatedParticipant: Participant,
  ) => void;
  removeParticipantFromAllGroups: (participantId: string) => void;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],

      addGroup: (name, creatorParticipant) => {
        const newGroupId = createUuid();
        const newGroup: ExpenseGroup = {
          id: newGroupId,
          name,
          participants: creatorParticipant ? [creatorParticipant] : [],
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

      addParticipantToGroup: (groupId, participantId, participant) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === groupId &&
            !isExpenseGroupArchived(group) &&
            !group.participants.some((p) => p.id === participantId)
              ? {
                  ...group,
                  participants: [...group.participants, participant],
                }
              : group,
          ),
        })),

      removeParticipantFromGroup: (groupId, participantId) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === groupId && !isExpenseGroupArchived(group)
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

      removeParticipantFromAllGroups: (participantId) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            isExpenseGroupArchived(group)
              ? group
              : {
                  ...group,
                  participants: group.participants.filter(
                    (p) => p.id !== participantId,
                  ),
                },
          ),
        })),
    }),
    {
      name: 'expense-mobile-groups-v2',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ groups: state.groups }),
    },
  ),
);
