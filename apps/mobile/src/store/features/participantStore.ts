import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Participant, UserSettings } from '../../types';
import { createUuid } from '../../utils/ids';

export interface ParticipantState {
  participants: Participant[];

  // Actions
  addParticipant: (
    name: string,
    idOverride?: string,
    identity?: Pick<Participant, 'spaceId' | 'userId'>,
  ) => string;
  updateParticipant: (participant: Participant) => void;
  deleteParticipant: (id: string) => void;
  getParticipantById: (id: string) => Participant | undefined;
  syncUserAsParticipant: (
    internalUserId: string,
    userSettings: UserSettings | null,
    identity?: Pick<Participant, 'spaceId' | 'userId'>,
  ) => void;
}

export const useParticipantStore = create<ParticipantState>()(
  persist(
    (set, get) => ({
      participants: [],

      addParticipant: (name, idOverride, identity) => {
        const participants = get().participants;
        const existingById = idOverride
          ? participants.find((participant) => participant.id === idOverride)
          : undefined;

        if (existingById) {
          set((state) => ({
            participants: state.participants.map((participant) =>
              participant.id === existingById.id
                ? {
                    ...participant,
                    name,
                    ...identity,
                    ...(participant.active === false ? { active: true } : {}),
                  }
                : participant,
            ),
          }));
          return existingById.id;
        }

        const existingByName = participants.find(
          (participant) =>
            participant.name === name &&
            participant.active !== false &&
            participant.spaceId === identity?.spaceId,
        );
        if (existingByName) {
          console.warn(
            `Participant with name "${name}" already exists with a different ID.`,
          );
          return existingByName.id;
        }

        const id = idOverride ?? createUuid();
        set((state) => ({
          participants: [...state.participants, { id, name, ...identity }],
        }));
        return id;
      },

      updateParticipant: (updatedParticipant) =>
        set((state) => ({
          participants: state.participants.map((participant) =>
            participant.id === updatedParticipant.id
              ? updatedParticipant
              : participant,
          ),
        })),

      deleteParticipant: (id) =>
        set((state) => ({
          participants: state.participants.map((participant) =>
            participant.id === id
              ? { ...participant, active: false }
              : participant,
          ),
        })),

      getParticipantById: (id) =>
        get().participants.find((participant) => participant.id === id),

      syncUserAsParticipant: (
        internalUserId: string,
        userSettings: UserSettings | null,
        identity,
      ) => {
        if (!internalUserId || !userSettings?.name) {
          return;
        }

        set((state) => {
          let newParticipants = [...state.participants];
          const userAsParticipant = newParticipants.find(
            (p) => p.id === internalUserId,
          );

          if (userAsParticipant) {
            if (
              userAsParticipant.name !== userSettings.name ||
              userAsParticipant.userId !== identity?.userId ||
              userAsParticipant.spaceId !== identity?.spaceId
            ) {
              newParticipants = newParticipants.map((p) =>
                p.id === internalUserId
                  ? { ...p, name: userSettings.name, ...identity }
                  : p,
              );
            }
          } else {
            newParticipants.push({
              id: internalUserId,
              name: userSettings.name,
              ...identity,
            });
          }

          return { participants: newParticipants };
        });
      },
    }),
    {
      name: 'expense-mobile-participants-v2',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ participants: state.participants }),
    },
  ),
);
