import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushUserPersistence, useUserStore } from '../features/userStore';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const initialIdentity = {
  user: useUserStore.getState().user,
  personalParticipantId: useUserStore.getState().personalParticipantId,
};

const defaultSettings = {
  theme: 'system' as const,
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  notifications: true,
};

const resetUserStore = () => {
  const { user, personalParticipantId } = initialIdentity;

  useUserStore.setState({
    user: { ...user },
    settings: { ...defaultSettings },
    personalParticipantId,
  });
};

describe('UserStore', () => {
  beforeEach(() => {
    resetUserStore();
  });

  afterEach(() => {
    resetUserStore();
  });

  it('updates the user profile while preserving the account identifier', () => {
    const { id } = useUserStore.getState().user;

    useUserStore.getState().updateUser({ displayName: 'Jamie' });

    const state = useUserStore.getState();
    expect(state.user).toMatchObject({
      id,
      displayName: 'Jamie',
    });
  });

  it('names the local user and returns its stable identifier', () => {
    const existingId = useUserStore.getState().user.id;
    const id = useUserStore.getState().createUser('Morgan');

    expect(id).toBe(existingId);
    expect(useUserStore.getState().user).toMatchObject({
      id,
      displayName: 'Morgan',
    });
  });

  it('merges settings updates without dropping existing defaults', () => {
    useUserStore.getState().updateSettings({ currency: 'EUR' });

    const { settings } = useUserStore.getState();
    expect(settings.currency).toBe('EUR');
    expect(settings.theme).toBe('system');
  });

  it('persists the insights visualization preference with user settings', async () => {
    await flushUserPersistence();
    storage.setItem.mockClear();

    useUserStore.getState().updateSettings({ insightsChartPreference: 'bar' });
    await flushUserPersistence();

    expect(useUserStore.getState().settings.insightsChartPreference).toBe(
      'bar',
    );
    expect(storage.setItem).toHaveBeenCalledWith(
      'expense-mobile-user-v2',
      expect.stringContaining('"insightsChartPreference":"bar"'),
    );
  });

  it('persists the canonical local identity without synthesizing aliases', async () => {
    await flushUserPersistence();
    storage.setItem.mockClear();
    const before = useUserStore.getState().user;

    await useUserStore.getState().ensureLocalIdentityPersisted();

    expect(useUserStore.getState().user).toBe(before);
    const serialized = storage.setItem.mock.calls.find(
      ([key]) => key === 'expense-mobile-user-v2',
    )?.[1];
    expect(serialized).toBeDefined();
    const persisted = JSON.parse(serialized!) as {
      state: Record<string, unknown>;
    };
    expect(persisted.state).toMatchObject({
      user: before,
      personalParticipantId: initialIdentity.personalParticipantId,
    });
    expect(persisted.state).not.toHaveProperty('userSettings');
    expect(persisted.state).not.toHaveProperty('internalUserId');
    expect(persisted.state).not.toHaveProperty('personalSpaceId');
  });

  it('keeps distinct UUID identities for the user, personal space, and participant', () => {
    const { user, personalParticipantId } = useUserStore.getState();
    const identities = [user.id, user.personalSpaceId, personalParticipantId];

    expect(new Set(identities).size).toBe(3);
    identities.forEach((id) =>
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
    );
  });
});
