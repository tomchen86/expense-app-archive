import {
  createVersionedMigrator,
  MOBILE_PERSISTENCE_SCHEMAS,
} from '../persistence/versioned-migration';

describe('versioned mobile persistence', () => {
  it('freezes every current store version as the first public release baseline', () => {
    expect(MOBILE_PERSISTENCE_SCHEMAS).toEqual({
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
    });
  });

  it('returns the exact current-version state without rewriting it', async () => {
    const state = { groups: [{ id: 'group-1' }] };
    const migrate = createVersionedMigrator(
      MOBILE_PERSISTENCE_SCHEMAS.groups,
      {},
    );

    await expect(migrate(state, 2)).resolves.toBe(state);
  });

  it('applies every declared migration in order', async () => {
    const migrate = createVersionedMigrator(
      { storageKey: 'test', releaseVersion: 1, currentVersion: 3 },
      {
        1: (state) => ({ ...(state as object), migratedTo2: true }),
        2: async (state) => ({ ...(state as object), migratedTo3: true }),
      },
    );

    await expect(migrate({ stable: true }, 1)).resolves.toEqual({
      stable: true,
      migratedTo2: true,
      migratedTo3: true,
    });
  });

  it('fails closed when a released migration step is missing', async () => {
    const state = { groups: [{ id: 'do-not-drop' }] };
    const migrate = createVersionedMigrator(
      { storageKey: 'groups', releaseVersion: 1, currentVersion: 3 },
      { 1: (value) => value },
    );

    await expect(migrate(state, 1)).rejects.toThrow(
      'Missing groups persistence migration 2 -> 3',
    );
    expect(state).toEqual({ groups: [{ id: 'do-not-drop' }] });
  });

  it('rejects pre-release and newer schemas instead of guessing', async () => {
    const migrate = createVersionedMigrator(
      { storageKey: 'expenses', releaseVersion: 3, currentVersion: 3 },
      {},
    );

    await expect(migrate({}, 2)).rejects.toThrow(
      'Unsupported pre-release expenses persistence version 2',
    );
    await expect(migrate({}, 4)).rejects.toThrow(
      'Unsupported newer expenses persistence version 4',
    );
  });
});
