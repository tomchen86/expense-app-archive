export interface MobilePersistenceSchema {
  storageKey: string;
  /** First schema version that may exist in a public build. */
  releaseVersion: number;
  currentVersion: number;
}

type Migration<State> = (state: State) => State | Promise<State>;

export const MOBILE_PERSISTENCE_SCHEMAS = {
  expenses: {
    storageKey: 'expense-mobile-expenses-v2',
    releaseVersion: 3,
    currentVersion: 3,
  },
  user: {
    storageKey: 'expense-mobile-user-v2',
    releaseVersion: 3,
    currentVersion: 3,
  },
  groups: {
    storageKey: 'expense-mobile-groups-v2',
    releaseVersion: 2,
    currentVersion: 2,
  },
  participants: {
    storageKey: 'expense-mobile-participants-v2',
    releaseVersion: 2,
    currentVersion: 2,
  },
  categories: {
    storageKey: 'expense-mobile-categories-v2',
    releaseVersion: 3,
    currentVersion: 3,
  },
} as const satisfies Record<string, MobilePersistenceSchema>;

export const createVersionedMigrator = <State>(
  schema: MobilePersistenceSchema,
  migrations: Readonly<Partial<Record<number, Migration<State>>>>,
) =>
  async (persistedState: unknown, persistedVersion: number): Promise<State> => {
    if (persistedVersion < schema.releaseVersion) {
      throw new Error(
        `Unsupported pre-release ${schema.storageKey} persistence version ${persistedVersion}`,
      );
    }
    if (persistedVersion > schema.currentVersion) {
      throw new Error(
        `Unsupported newer ${schema.storageKey} persistence version ${persistedVersion}`,
      );
    }

    let state = persistedState as State;
    for (
      let sourceVersion = persistedVersion;
      sourceVersion < schema.currentVersion;
      sourceVersion += 1
    ) {
      const migrate = migrations[sourceVersion];
      if (!migrate) {
        throw new Error(
          `Missing ${schema.storageKey} persistence migration ${sourceVersion} -> ${sourceVersion + 1}`,
        );
      }
      state = await migrate(state);
    }
    return state;
  };
