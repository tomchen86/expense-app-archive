import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Settings } from '../../types';
import { createUuid } from '../../utils/ids';
import {
  createVersionedMigrator,
  MOBILE_PERSISTENCE_SCHEMAS,
} from '../persistence/versioned-migration';

let pendingUserWrite: { name: string; value: string } | null = null;
let userWritePromise: Promise<void> | null = null;

const scheduleUserWrite = (): Promise<void> => {
  if (!userWritePromise) {
    const worker = Promise.resolve().then(async () => {
      while (pendingUserWrite) {
        const write = pendingUserWrite;
        pendingUserWrite = null;
        try {
          await AsyncStorage.setItem(write.name, write.value);
        } catch (error) {
          pendingUserWrite ??= write;
          throw error;
        }
      }
    });
    userWritePromise = worker.then(
      () => {
        userWritePromise = null;
        return pendingUserWrite ? scheduleUserWrite() : undefined;
      },
      (error: unknown) => {
        userWritePromise = null;
        throw error;
      },
    );
  }
  return userWritePromise;
};

const userStateStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => {
    pendingUserWrite = { name, value };
    return scheduleUserWrite();
  },
  removeItem: async (name) => {
    pendingUserWrite = null;
    await (userWritePromise?.catch(() => undefined) ?? Promise.resolve());
    pendingUserWrite = null;
    await AsyncStorage.removeItem(name);
  },
};

export const flushUserPersistence = (): Promise<void> =>
  userWritePromise ??
  (pendingUserWrite ? scheduleUserWrite() : Promise.resolve());

export interface UserState {
  user: User;
  settings: Settings;
  personalParticipantId: string;

  updateUser: (userData: Partial<User>) => void;
  updateSettings: (settingsData: Partial<Settings>) => void;
  createUser: (displayName: string) => string; // Returns user ID
  ensureLocalIdentityPersisted: () => Promise<void>;
  restoreProfileIfCurrent: (
    expected: UserProfileSnapshot,
    previous: UserProfileSnapshot,
  ) => boolean;

}

export interface UserProfileSnapshot {
  user: User;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => {
      // Generate initial user ID
      const initialUserId = createUuid();
      const initialPersonalSpaceId = createUuid();
      const initialPersonalParticipantId = createUuid();
      const initialUser: User = {
        id: initialUserId,
        displayName: '',
        personalSpaceId: initialPersonalSpaceId,
      };

      // Default settings
      const defaultSettings: Settings = {
        theme: 'system',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        notifications: true,
        insightsChartPreference: 'auto',
      };

      return {
        user: initialUser,
        settings: defaultSettings,
        personalParticipantId: initialPersonalParticipantId,

        updateUser: (userData) => {
          const currentUser = get().user;
          const updatedUser = { ...currentUser, ...userData };
          set({ user: updatedUser });
        },

        updateSettings: (settingsData) => {
          const currentSettings = get().settings;
          set({ settings: { ...currentSettings, ...settingsData } });
        },

        createUser: (displayName) => {
          const currentUser = get().user;
          const userId = currentUser.id;
          const newUser: User = { ...currentUser, displayName };
          set({ user: newUser });
          return userId;
        },

        ensureLocalIdentityPersisted: () => {
          const state = get();
          if (
            !state.user.id ||
            !state.user.personalSpaceId ||
            !state.personalParticipantId
          ) {
            return Promise.reject(
              new Error('Canonical local identity is incomplete.'),
            );
          }
          // The initial canonical identity is generated before persist has a
          // mutation to serialize. Re-setting the current value schedules the
          // exact canonical snapshot so callers can await its durability
          // before creating ledger data.
          set({ user: state.user });
          return flushUserPersistence();
        },

        restoreProfileIfCurrent: (expected, previous) => {
          const state = get();
          if (state.user !== expected.user) {
            return false;
          }
          set(previous);
          return true;
        },
      };
    },
    {
      name: MOBILE_PERSISTENCE_SCHEMAS.user.storageKey,
      version: MOBILE_PERSISTENCE_SCHEMAS.user.currentVersion,
      storage: createJSONStorage(() => userStateStorage),
      partialize: (state) => ({
        user: state.user,
        settings: state.settings,
        personalParticipantId: state.personalParticipantId,
      }),
      migrate: createVersionedMigrator<UserState>(
        MOBILE_PERSISTENCE_SCHEMAS.user,
        {},
      ),
    },
  ),
);
