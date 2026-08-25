import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Settings, UserSettings } from '../../types';
import { createUuid } from '../../utils/ids';

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
  // New structure
  user: User | null;
  settings: Settings;

  // Legacy support (temporary)
  userSettings: UserSettings | null;
  internalUserId: string | null;
  personalSpaceId: string;
  personalParticipantId: string;

  // New actions
  updateUser: (userData: Partial<User>) => void;
  updateSettings: (settingsData: Partial<Settings>) => void;
  createUser: (displayName: string) => string; // Returns user ID
  ensureLocalIdentityPersisted: () => Promise<void>;
  restoreProfileIfCurrent: (
    expected: UserProfileSnapshot,
    previous: UserProfileSnapshot,
  ) => boolean;

  // Legacy actions (temporary)
  updateUserSettings: (settings: UserSettings) => void;
  getInternalUserId: () => string;
}

export interface UserProfileSnapshot {
  user: User | null;
  userSettings: UserSettings | null;
  internalUserId: string | null;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => {
      // Generate initial user ID
      const initialUserId = createUuid();
      const initialPersonalSpaceId = createUuid();
      const initialPersonalParticipantId = createUuid();

      // Default settings
      const defaultSettings: Settings = {
        theme: 'system',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        notifications: true,
        insightsChartPreference: 'auto',
      };

      return {
        // New structure
        user: null,
        settings: defaultSettings,

        // Legacy structure (temporary)
        userSettings: null,
        internalUserId: initialUserId,
        personalSpaceId: initialPersonalSpaceId,
        personalParticipantId: initialPersonalParticipantId,

        // New actions
        updateUser: (userData) => {
          const currentUser = get().user;
          const repairedInternalUserId =
            get().internalUserId || currentUser?.id || initialUserId;
          const updatedUser = currentUser
            ? { ...currentUser, ...userData }
            : {
                id: repairedInternalUserId,
                displayName: '',
                personalSpaceId: get().personalSpaceId,
                ...userData,
              };

          set({
            internalUserId: repairedInternalUserId,
            user: updatedUser,
          });
        },

        updateSettings: (settingsData) => {
          const currentSettings = get().settings;
          set({ settings: { ...currentSettings, ...settingsData } });
        },

        createUser: (displayName) => {
          const userId = get().internalUserId || initialUserId;
          const newUser: User = {
            id: userId,
            displayName,
            personalSpaceId: get().personalSpaceId,
          };
          set({ user: newUser, internalUserId: userId });
          return userId;
        },

        ensureLocalIdentityPersisted: () => {
          const state = get();
          const internalUserId =
            state.internalUserId || state.user?.id || createUuid();
          const personalSpaceId = state.personalSpaceId || createUuid();
          const personalParticipantId =
            state.personalParticipantId || createUuid();
          const user = state.user
            ? {
                ...state.user,
                personalSpaceId,
              }
            : state.userSettings?.name
              ? {
                  id: internalUserId,
                  displayName: state.userSettings.name,
                  personalSpaceId,
                }
              : null;
          set({
            internalUserId,
            personalSpaceId,
            personalParticipantId,
            user,
          });
          return flushUserPersistence();
        },

        restoreProfileIfCurrent: (expected, previous) => {
          const state = get();
          if (
            state.user !== expected.user ||
            state.userSettings !== expected.userSettings ||
            state.internalUserId !== expected.internalUserId
          ) {
            return false;
          }
          set(previous);
          return true;
        },

        // Legacy actions (temporary)
        updateUserSettings: (settings) => {
          const currentUser = get().user;
          const repairedInternalUserId =
            get().internalUserId || currentUser?.id || initialUserId;
          set({
            internalUserId: repairedInternalUserId,
            userSettings: settings,
          });

          // Sync to new structure if possible
          if (settings.name) {
            const updatedUser = currentUser
              ? { ...currentUser, displayName: settings.name }
              : {
                  id: repairedInternalUserId,
                  displayName: settings.name,
                  personalSpaceId: get().personalSpaceId,
                };
            set({
              internalUserId: repairedInternalUserId,
              user: updatedUser,
            });
          }
        },

        getInternalUserId: () => {
          const state = get();
          return state.user?.id || state.internalUserId || '';
        },
      };
    },
    {
      name: 'expense-mobile-user-v2',
      version: 3,
      storage: createJSONStorage(() => userStateStorage),
      partialize: (state) => ({
        user: state.user,
        settings: state.settings,
        userSettings: state.userSettings,
        internalUserId: state.internalUserId,
        personalSpaceId: state.personalSpaceId,
        personalParticipantId: state.personalParticipantId,
      }),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<UserState>;
        return {
          ...state,
          personalParticipantId: state.personalParticipantId ?? createUuid(),
        } as UserState;
      },
    },
  ),
);
