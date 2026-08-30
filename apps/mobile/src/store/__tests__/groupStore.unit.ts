import { useGroupStore } from '../features/groupStore';
import type { Participant } from '../../types';

describe('GroupStore', () => {
  beforeEach(() => {
    useGroupStore.setState({ groups: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const sampleParticipant: Participant = { id: 'p1', name: 'Alice' };

  it('creates a group with its required creator participant', () => {
    const { addGroup } = useGroupStore.getState();

    const id = addGroup('Weekend Trip', sampleParticipant);
    const created = useGroupStore
      .getState()
      .groups.find((group) => group.id === id);

    expect(created).toBeDefined();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(created).toMatchObject({
      name: 'Weekend Trip',
      participants: [sampleParticipant],
    });
    expect(new Date(created!.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('rejects an ownerless group write at the feature-store boundary', () => {
    const { addGroup } = useGroupStore.getState();

    expect(() =>
      addGroup('Ownerless', undefined as unknown as Participant),
    ).toThrow('A group owner is required.');
    expect(useGroupStore.getState().groups).toEqual([]);
  });

  it("updates a group's fields", () => {
    const { addGroup, updateGroup } = useGroupStore.getState();
    const id = addGroup('Original', sampleParticipant);

    updateGroup({
      id,
      name: 'Renamed',
      participants: [sampleParticipant],
      createdAt: '2025-01-01T00:00:00.000Z',
    });

    const group = useGroupStore
      .getState()
      .groups.find((existing) => existing.id === id);

    expect(group).toMatchObject({ name: 'Renamed' });
  });

  it('archives a group without removing or rewriting its participants', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-24T01:02:03.000Z'));
    const { addGroup, archiveGroup } = useGroupStore.getState();
    const id = addGroup('Trip History', sampleParticipant);
    const originalGroup = useGroupStore.getState().getGroupById(id)!;
    const originalParticipants = originalGroup.participants;

    archiveGroup(id);

    const archivedGroup = useGroupStore.getState().getGroupById(id);
    expect(archivedGroup).toEqual({
      ...originalGroup,
      archivedAt: '2026-08-24T01:02:03.000Z',
    });
    expect(archivedGroup?.participants).toBe(originalParticipants);
  });

  it('keeps the first archive timestamp when archiving repeatedly', () => {
    jest.useFakeTimers();
    const { addGroup, archiveGroup } = useGroupStore.getState();
    const id = addGroup('Stable Archive', sampleParticipant);

    jest.setSystemTime(new Date('2026-08-24T01:02:03.000Z'));
    archiveGroup(id);
    jest.setSystemTime(new Date('2026-08-25T04:05:06.000Z'));
    archiveGroup(id);

    expect(useGroupStore.getState().getGroupById(id)?.archivedAt).toBe(
      '2026-08-24T01:02:03.000Z',
    );
  });

  it('restores an archived group by removing only archivedAt', () => {
    const { addGroup, archiveGroup, restoreGroup } = useGroupStore.getState();
    const id = addGroup('Return Trip', sampleParticipant);
    const originalGroup = useGroupStore.getState().getGroupById(id)!;
    const originalParticipants = originalGroup.participants;

    archiveGroup(id);
    restoreGroup(id);

    const restoredGroup = useGroupStore.getState().getGroupById(id);
    expect(restoredGroup).toEqual(originalGroup);
    expect(restoredGroup?.participants).toBe(originalParticipants);
  });

  it('keeps archived membership and metadata read-only until restore', () => {
    const participant: Participant = { id: 'p2', name: 'Blake' };
    const newcomer: Participant = { id: 'p3', name: 'Casey' };
    const {
      addGroup,
      addParticipantToGroup,
      archiveGroup,
      removeParticipantFromAllGroups,
      removeParticipantFromGroup,
      updateGroup,
      updateParticipantInGroups,
    } = useGroupStore.getState();
    const id = addGroup('Immutable History', sampleParticipant);
    addParticipantToGroup(
      id,
      participant.id,
      participant,
      sampleParticipant.id,
    );
    archiveGroup(id);
    const archivedGroup = useGroupStore.getState().getGroupById(id)!;

    updateGroup({ ...archivedGroup, name: 'Unexpected rename' });
    addParticipantToGroup(id, newcomer.id, newcomer, sampleParticipant.id);
    removeParticipantFromGroup(id, sampleParticipant.id, sampleParticipant.id);
    updateParticipantInGroups(participant.id, {
      ...participant,
      name: 'Unexpected update',
    });
    removeParticipantFromAllGroups(participant.id, {
      [id]: sampleParticipant.id,
    });

    expect(useGroupStore.getState().getGroupById(id)).toBe(archivedGroup);
  });

  it('keeps deleteGroup as an archive-compatible facade', () => {
    const { addGroup, deleteGroup } = useGroupStore.getState();
    const id = addGroup('Legacy Delete Call', sampleParticipant);

    deleteGroup(id);

    expect(useGroupStore.getState().getGroupById(id)).toMatchObject({
      id,
      archivedAt: expect.any(String),
    });
  });

  it('retrieves groups by identifier', () => {
    const { addGroup, getGroupById } = useGroupStore.getState();
    const id = addGroup('Lookup', sampleParticipant);

    const group = getGroupById(id);
    expect(group).toBeDefined();
    expect(group?.name).toBe('Lookup');
  });

  it('adds participants to a group without duplication', () => {
    const { addGroup, addParticipantToGroup } = useGroupStore.getState();
    const id = addGroup('Shared Expenses', sampleParticipant);

    const participant: Participant = { id: 'p2', name: 'Blake' };

    addParticipantToGroup(
      id,
      participant.id,
      participant,
      sampleParticipant.id,
    );
    addParticipantToGroup(
      id,
      participant.id,
      participant,
      sampleParticipant.id,
    );

    const group = useGroupStore
      .getState()
      .groups.find((existing) => existing.id === id);

    expect(group?.participants).toEqual([sampleParticipant, participant]);
  });

  it('removes and updates participants across group utilities', () => {
    const {
      addGroup,
      addParticipantToGroup,
      removeParticipantFromGroup,
      updateParticipantInGroups,
      removeParticipantFromAllGroups,
    } = useGroupStore.getState();
    const id = addGroup('Club', sampleParticipant);
    const participant: Participant = { id: 'p2', name: 'Blake' };

    addParticipantToGroup(
      id,
      participant.id,
      participant,
      sampleParticipant.id,
    );
    updateParticipantInGroups(participant.id, {
      id: 'p2',
      name: 'Blake Updated',
    });

    let group = useGroupStore
      .getState()
      .groups.find((existing) => existing.id === id);
    expect(group?.participants).toContainEqual({
      id: 'p2',
      name: 'Blake Updated',
    });

    removeParticipantFromGroup(id, participant.id, sampleParticipant.id);
    group = useGroupStore
      .getState()
      .groups.find((existing) => existing.id === id);
    expect(group?.participants).toEqual([sampleParticipant]);

    addParticipantToGroup(
      id,
      participant.id,
      participant,
      sampleParticipant.id,
    );
    removeParticipantFromAllGroups(participant.id, {
      [id]: sampleParticipant.id,
    });
    group = useGroupStore
      .getState()
      .groups.find((existing) => existing.id === id);
    expect(group?.participants).toEqual([sampleParticipant]);
  });

  it('guards the signed-in and final group members from removal', () => {
    const { addGroup, addParticipantToGroup, removeParticipantFromGroup } =
      useGroupStore.getState();
    const id = addGroup('Protected membership', sampleParticipant);
    const participant: Participant = { id: 'p2', name: 'Blake' };
    addParticipantToGroup(
      id,
      participant.id,
      participant,
      sampleParticipant.id,
    );

    removeParticipantFromGroup(id, sampleParticipant.id, sampleParticipant.id);
    expect(useGroupStore.getState().getGroupById(id)?.participants).toEqual([
      sampleParticipant,
      participant,
    ]);

    removeParticipantFromGroup(id, participant.id, sampleParticipant.id);
    expect(useGroupStore.getState().getGroupById(id)?.participants).toEqual([
      sampleParticipant,
    ]);

    removeParticipantFromGroup(id, sampleParticipant.id, sampleParticipant.id);
    expect(useGroupStore.getState().getGroupById(id)?.participants).toEqual([
      sampleParticipant,
    ]);
  });
});
