import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Participant } from '../../types';
import { createUuid } from '../../utils/ids';
import {
  createVersionedMigrator,
  MOBILE_PERSISTENCE_SCHEMAS,
} from '../persistence/versioned-migration';

let pendingParticipantWrite: { name: string; value: string } | null = null;
let participantWritePromise: Promise<void> | null = null;

const scheduleParticipantWrite = (): Promise<void> => {
  if (!participantWritePromise) {
    const worker = Promise.resolve().then(async () => {
      while (pendingParticipantWrite) {
        const write = pendingParticipantWrite;
        pendingParticipantWrite = null;
        try {
          await AsyncStorage.setItem(write.name, write.value);
        } catch (error) {
          pendingParticipantWrite ??= write;
          throw error;
        }
      }
    });
    participantWritePromise = worker.then(
      () => {
        participantWritePromise = null;
        return pendingParticipantWrite ? scheduleParticipantWrite() : undefined;
      },
      (error: unknown) => {
        participantWritePromise = null;
        throw error;
      },
    );
  }
  return participantWritePromise;
};

const participantStateStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => {
    pendingParticipantWrite = { name, value };
    return scheduleParticipantWrite();
  },
  removeItem: async (name) => {
    pendingParticipantWrite = null;
    await (participantWritePromise?.catch(() => undefined) ??
      Promise.resolve());
    pendingParticipantWrite = null;
    await AsyncStorage.removeItem(name);
  },
};

export const flushParticipantPersistence = (): Promise<void> =>
  participantWritePromise ??
  (pendingParticipantWrite ? scheduleParticipantWrite() : Promise.resolve());

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
    participantId: string,
    displayName: string,
    identity?: Pick<Participant, 'spaceId' | 'userId'>,
  ) => void;
  deactivateParticipantIfActive: (id: string) => Participant | null;
  restoreParticipantIfInactive: (participant: Participant) => boolean;
  restoreParticipantsSnapshotIfCurrent: (
    expectedParticipants: Participant[],
    previousParticipants: Participant[],
  ) => boolean;
  removeParticipantCreationIfMatches: (participantId: string) => boolean;
  updateActiveParticipantsByUserId: (userId: string, name: string) => void;
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

      deactivateParticipantIfActive: (id) => {
        const participant = get().getParticipantById(id);
        if (!participant || participant.active === false) {
          return null;
        }
        set((state) => ({
          participants: state.participants.map((candidate) =>
            candidate.id === id ? { ...candidate, active: false } : candidate,
          ),
        }));
        return participant;
      },

      restoreParticipantIfInactive: (participant) => {
        const current = get().getParticipantById(participant.id);
        if (!current) {
          return false;
        }
        if (current.active !== false) {
          return true;
        }
        set((state) => ({
          participants: state.participants.map((candidate) =>
            candidate.id === participant.id ? participant : candidate,
          ),
        }));
        return true;
      },

      restoreParticipantsSnapshotIfCurrent: (
        expectedParticipants,
        previousParticipants,
      ) => {
        if (get().participants !== expectedParticipants) {
          return false;
        }
        set({ participants: previousParticipants });
        return true;
      },

      getParticipantById: (id) =>
        get().participants.find((participant) => participant.id === id),

      syncUserAsParticipant: (
        participantId: string,
        displayName: string,
        identity,
      ) => {
        const name = displayName.trim();
        if (!participantId || !name) {
          return;
        }

        set((state) => {
          let newParticipants = [...state.participants];
          const userAsParticipant = newParticipants.find(
            (p) => p.id === participantId,
          );

          if (userAsParticipant) {
            if (
              userAsParticipant.name !== name ||
              userAsParticipant.userId !== identity?.userId ||
              userAsParticipant.spaceId !== identity?.spaceId
            ) {
              newParticipants = newParticipants.map((p) =>
                p.id === participantId
                  ? { ...p, name, ...identity }
                  : p,
              );
            }
          } else {
            newParticipants.push({
              id: participantId,
              name,
              ...identity,
            });
          }

          return { participants: newParticipants };
        });
      },

      removeParticipantCreationIfMatches: (participantId) => {
        const participant = get().getParticipantById(participantId);
        if (!participant) {
          return false;
        }
        set((state) => ({
          participants: state.participants.filter(
            (candidate) => candidate.id !== participantId,
          ),
        }));
        return true;
      },

      updateActiveParticipantsByUserId: (userId, name) => {
        const hasMatchingParticipant = get().participants.some(
          (participant) =>
            participant.active !== false &&
            participant.userId === userId &&
            participant.name !== name,
        );
        if (!hasMatchingParticipant) {
          return;
        }
        set((state) => ({
          participants: state.participants.map((participant) =>
            participant.active !== false && participant.userId === userId
              ? { ...participant, name }
              : participant,
          ),
        }));
      },
    }),
    {
      name: MOBILE_PERSISTENCE_SCHEMAS.participants.storageKey,
      version: MOBILE_PERSISTENCE_SCHEMAS.participants.currentVersion,
      storage: createJSONStorage(() => participantStateStorage),
      partialize: (state) => ({ participants: state.participants }),
      migrate: createVersionedMigrator<ParticipantState>(
        MOBILE_PERSISTENCE_SCHEMAS.participants,
        {},
      ),
    },
  ),
);
