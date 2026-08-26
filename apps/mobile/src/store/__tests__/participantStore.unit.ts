import { useParticipantStore } from '../features/participantStore';

describe('ParticipantStore', () => {
  beforeEach(() => {
    useParticipantStore.setState({ participants: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds a participant and returns the generated identifier', () => {
    const { addParticipant } = useParticipantStore.getState();

    const id = addParticipant('Alex');

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(useParticipantStore.getState().participants).toContainEqual({
      id,
      name: 'Alex',
    });
  });

  it('updates the display name when adding with an existing override identifier', () => {
    const { addParticipant } = useParticipantStore.getState();

    addParticipant('Original', 'participant-1');
    addParticipant('Updated', 'participant-1');

    expect(useParticipantStore.getState().participants).toContainEqual({
      id: 'participant-1',
      name: 'Updated',
    });
  });

  it('returns the stored participant id for an active same-name add in one space', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const { addParticipant } = useParticipantStore.getState();

    const storedId = addParticipant('Taylor', undefined, {
      spaceId: 'space-1',
    });
    const resolvedId = addParticipant('Taylor', undefined, {
      spaceId: 'space-1',
    });

    expect(resolvedId).toBe(storedId);
    expect(
      useParticipantStore.getState().getParticipantById(resolvedId),
    ).toEqual({
      id: storedId,
      name: 'Taylor',
      spaceId: 'space-1',
    });
    expect(useParticipantStore.getState().participants).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Participant with name "Taylor" already exists'),
    );
  });

  it('reactivates an inactive exact id and updates identity when its name is unchanged', () => {
    const { addParticipant, deleteParticipant } =
      useParticipantStore.getState();
    addParticipant('Casey', 'participant-1', {
      spaceId: 'space-old',
      userId: 'user-old',
    });
    deleteParticipant('participant-1');

    const resolvedId = addParticipant('Casey', 'participant-1', {
      spaceId: 'space-new',
      userId: 'user-new',
    });

    expect(resolvedId).toBe('participant-1');
    expect(
      useParticipantStore.getState().getParticipantById('participant-1'),
    ).toEqual({
      id: 'participant-1',
      name: 'Casey',
      active: true,
      spaceId: 'space-new',
      userId: 'user-new',
    });
  });

  it('creates a new identity for an inactive same-name add without a stable id', () => {
    const { addParticipant, deleteParticipant } =
      useParticipantStore.getState();
    const inactiveId = addParticipant('Casey', undefined, {
      spaceId: 'space-1',
    });
    deleteParticipant(inactiveId);

    const newId = addParticipant('Casey', undefined, {
      spaceId: 'space-1',
    });

    expect(newId).not.toBe(inactiveId);
    expect(useParticipantStore.getState().participants).toEqual([
      {
        id: inactiveId,
        name: 'Casey',
        active: false,
        spaceId: 'space-1',
      },
      { id: newId, name: 'Casey', spaceId: 'space-1' },
    ]);
  });

  it('syncs the signed-in user as a participant and updates their name', () => {
    const { syncUserAsParticipant } = useParticipantStore.getState();

    syncUserAsParticipant('user-1', 'Initial');
    expect(useParticipantStore.getState().participants).toContainEqual({
      id: 'user-1',
      name: 'Initial',
    });

    syncUserAsParticipant('user-1', 'Updated');
    expect(useParticipantStore.getState().participants).toContainEqual({
      id: 'user-1',
      name: 'Updated',
    });
  });

  it('keeps user identity distinct from a space-scoped participant identity', () => {
    const participantId = '6ca81ea8-56b6-4147-85db-cad209885ce6';
    useParticipantStore.getState().syncUserAsParticipant(
      participantId,
      'Morgan',
      {
        userId: 'bdf125cb-cbe7-4b8d-98f4-50bc6213d31e',
        spaceId: 'd1f5558f-4290-4f6c-9273-ab5cf594db26',
      },
    );

    expect(
      useParticipantStore.getState().getParticipantById(participantId),
    ).toEqual({
      id: participantId,
      name: 'Morgan',
      userId: 'bdf125cb-cbe7-4b8d-98f4-50bc6213d31e',
      spaceId: 'd1f5558f-4290-4f6c-9273-ab5cf594db26',
    });
  });

  it('allows the same display name in different spaces', () => {
    const store = useParticipantStore.getState();
    const first = store.addParticipant('Alex', undefined, {
      spaceId: '1d84f3e2-c61c-4098-a383-b9ea7253150b',
    });
    const second = store.addParticipant('Alex', undefined, {
      spaceId: 'aabfe4e9-c005-4b1a-9366-e4569ae2231f',
    });

    expect(first).not.toBe(second);
    expect(useParticipantStore.getState().participants).toHaveLength(2);
  });

  it('deactivates a participant by identifier for historical resolution', () => {
    const { addParticipant, deleteParticipant } =
      useParticipantStore.getState();

    const id = addParticipant('Casey');
    deleteParticipant(id);

    expect(useParticipantStore.getState().participants).toContainEqual({
      id,
      name: 'Casey',
      active: false,
    });
  });

  it('retrieves participants and syncs when details missing', () => {
    const store = useParticipantStore.getState();
    const identifier = store.addParticipant('Jordan');
    expect(store.getParticipantById(identifier)).toEqual({
      id: identifier,
      name: 'Jordan',
    });

    store.syncUserAsParticipant('user-sync', '   ');
    expect(store.getParticipantById('user-sync')).toBeUndefined();
  });
});
