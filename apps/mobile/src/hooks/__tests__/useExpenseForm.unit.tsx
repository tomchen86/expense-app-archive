jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((selection) => selection?.ios ?? selection?.default),
  },
}));

import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from '../../constants/expenses';
import {
  resetExpenseFormDraftSessionsForTests,
  useExpenseForm,
} from '../useExpenseForm';
import { useExpenseStore as useComposedExpenseStore } from '../../store/expenseStore';
import { useCategoryStore } from '../../store/features/categoryStore';
import {
  flushExpensePersistence,
  useExpenseStore as useExpenseFeatureStore,
} from '../../store/features/expenseStore';
import { useGroupStore } from '../../store/features/groupStore';
import { useParticipantStore } from '../../store/features/participantStore';
import {
  flushUserPersistence,
  useUserStore,
} from '../../store/features/userStore';
import type { Expense, ExpenseGroup, Participant } from '../../types';

const defaultSettings = {
  theme: 'light' as const,
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  notifications: true,
};

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Expo router is already mocked in jest.setup.unit.ts
import { router } from 'expo-router';

const resetAllStores = () => {
  const { internalUserId, personalSpaceId, personalParticipantId } =
    useUserStore.getState();

  useUserStore.setState({
    user: null,
    settings: { ...defaultSettings },
    userSettings: null,
    internalUserId,
    personalSpaceId,
    personalParticipantId,
  });
  useParticipantStore.setState({ participants: [] });
  useGroupStore.setState({ groups: [] });
  useCategoryStore.setState({
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
  });
  useExpenseFeatureStore.setState({ expenses: [] });

  useComposedExpenseStore.setState({
    expenses: [],
    groups: [],
    participants: [],
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    user: null,
    settings: { ...defaultSettings },
    userSettings: null,
    internalUserId,
    personalSpaceId,
    personalParticipantId,
  });
};

// Router mocking is handled in jest.setup.unit.ts

interface HookHarnessProps {
  draftSessionId?: string;
  editingExpense?: Expense | null;
  initialSpaceId?: string;
}

const HookHarness = forwardRef(
  (
    {
      draftSessionId = 'default-test-draft-session',
      editingExpense,
      initialSpaceId,
    }: HookHarnessProps,
    ref,
  ) => {
    const hookValue = useExpenseForm({
      draftSessionId,
      editingExpense,
      initialSpaceId,
    });
    useImperativeHandle(ref, () => hookValue, [hookValue]);
    return null;
  },
);
HookHarness.displayName = 'HookHarness';

describe('useExpenseForm', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetExpenseFormDraftSessionsForTests();
    storage.setItem.mockResolvedValue(undefined);
    resetAllStores();
    await Promise.all([flushExpensePersistence(), flushUserPersistence()]);
    storage.setItem.mockClear();
    (Alert.alert as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('exposes dirty and validity state for native modal actions', () => {
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(<HookHarness ref={ref} editingExpense={null} />);
    });

    expect(ref.current!.isDirty).toBe(false);
    expect(ref.current!.canSubmit).toBe(false);

    act(() => {
      ref.current!.handleUpdateFormState('title', 'Coffee');
      ref.current!.handleUpdateFormState('amount', '5.00');
    });

    expect(ref.current!.isDirty).toBe(true);
    expect(ref.current!.canSubmit).toBe(true);
  });

  it('does not submit a pristine edit', async () => {
    const existingExpense: Expense = {
      id: 'pristine-edit-expense',
      title: 'Unchanged dinner',
      amountMinor: 1800,
      currency: 'USD',
      date: '2026-08-24',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 1800 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 1800 }],
      sync: {
        mutationId: 'pristine-opening-mutation',
        serverVersion: 2,
        localRevision: 0,
        status: 'synced',
        updatedAt: '2026-08-24T00:00:00.000Z',
      },
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({ expenses: [existingExpense] });
    });
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });

    expect(ref.current!.isDirty).toBe(false);
    expect(ref.current!.canSubmit).toBe(false);
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      existingExpense,
    ]);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('restores the complete draft only for the same route session', () => {
    const firstRef = createRef<ReturnType<typeof useExpenseForm>>();
    let firstRenderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      firstRenderer = TestRenderer.create(
        <HookHarness
          ref={firstRef}
          draftSessionId='same-draft-session'
          editingExpense={null}
        />,
      );
    });
    act(() => {
      firstRef.current!.handleUpdateFormState('title', 'Session coffee');
      firstRef.current!.handleUpdateFormState('amount', '6.25');
      firstRef.current!.handleSharingChange(true);
    });
    act(() => firstRenderer.unmount());

    const remountedRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={remountedRef}
          draftSessionId='same-draft-session'
          editingExpense={null}
        />,
      );
    });
    expect(remountedRef.current!.formState.title).toBe('Session coffee');
    expect(remountedRef.current!.formState.amount).toBe('6.25');
    expect(remountedRef.current!.sharingEnabled).toBe(true);
    expect(remountedRef.current!.isDirty).toBe(true);
    expect(remountedRef.current!.canSubmit).toBe(false);

    const freshRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={freshRef}
          draftSessionId='different-draft-session'
          editingExpense={null}
        />,
      );
    });
    expect(freshRef.current!.formState.title).toBe('');
    expect(freshRef.current!.sharingEnabled).toBe(false);
    expect(freshRef.current!.isDirty).toBe(false);
  });

  it('ends a clean edit session so reopening reads the latest snapshot', async () => {
    const originalExpense: Expense = {
      id: 'clean-edit-session-expense',
      title: 'Original title',
      amountMinor: 500,
      currency: 'USD',
      date: '2026-08-24',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 500 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 500 }],
    };
    const firstRef = createRef<ReturnType<typeof useExpenseForm>>();
    let firstRenderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      firstRenderer = TestRenderer.create(
        <HookHarness
          ref={firstRef}
          draftSessionId='edit:clean-edit-session-expense'
          editingExpense={originalExpense}
        />,
      );
    });
    await act(async () => {
      expect(await firstRef.current!.discardChanges()).toBe(true);
    });
    act(() => firstRenderer.unmount());

    const latestExpense = {
      ...originalExpense,
      title: 'Updated elsewhere',
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [latestExpense] });
      useComposedExpenseStore.setState({ expenses: [latestExpense] });
    });
    const latestRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={latestRef}
          draftSessionId='edit:clean-edit-session-expense'
          editingExpense={latestExpense}
        />,
      );
    });

    expect(latestRef.current!.formState.title).toBe('Updated elsewhere');
    expect(latestRef.current!.isDirty).toBe(false);
  });

  it('isolates simultaneous edit modals for the same expense', () => {
    const existingExpense: Expense = {
      id: 'parallel-edit-expense',
      title: 'Opening title',
      amountMinor: 500,
      currency: 'USD',
      date: '2026-08-24',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 500 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 500 }],
    };
    const firstRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={firstRef}
          draftSessionId='edit:parallel-edit-expense:first'
          editingExpense={existingExpense}
        />,
      );
    });
    act(() => {
      firstRef.current!.handleUpdateFormState('title', 'First modal draft');
    });

    const secondRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={secondRef}
          draftSessionId='edit:parallel-edit-expense:second'
          editingExpense={existingExpense}
        />,
      );
    });

    expect(firstRef.current!.formState.title).toBe('First modal draft');
    expect(firstRef.current!.isDirty).toBe(true);
    expect(secondRef.current!.formState.title).toBe('Opening title');
    expect(secondRef.current!.isDirty).toBe(false);
  });

  it('creates a canonical personal expense in the explicit personal space', async () => {
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HookHarness ref={ref} editingExpense={null} />,
      );
    });

    const { personalParticipantId, personalSpaceId } =
      useComposedExpenseStore.getState();

    act(() => {
      ref.current!.handleUpdateFormState('title', 'Coffee run');
      ref.current!.handleUpdateFormState('amount', '8.75');
      ref.current!.handleUpdateFormState('caption', 'Morning treat');
    });

    await act(async () => {
      await ref.current!.handleSubmit();
    });

    const expenses = useComposedExpenseStore.getState().expenses;
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({
      title: 'Coffee run',
      amountMinor: 875,
      currency: 'USD',
      spaceId: personalSpaceId,
      spaceKind: 'personal',
      payments: [{ participantId: personalParticipantId, amountMinor: 875 }],
      shares: [{ participantId: personalParticipantId, amountMinor: 875 }],
      caption: 'Morning treat',
    });
    expect(expenses[0]).not.toHaveProperty('amount');
    expect(expenses[0]).not.toHaveProperty('groupId');
    expect(expenses[0]).not.toHaveProperty('paidBy');
    expect(expenses[0]).not.toHaveProperty('splitBetween');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
  it('stores the selected stable category identifier when available', async () => {
    const category = {
      id: 'f7686a96-d2d3-49bb-968f-e80e9f436763',
      name: 'Local custom',
      color: '#123456',
    };
    act(() => {
      useCategoryStore.setState({ categories: [category] });
      useComposedExpenseStore.setState({ categories: [category] });
    });

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(<HookHarness ref={ref} editingExpense={null} />);
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Custom category expense');
      ref.current!.handleUpdateFormState('amount', '12.00');
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      category: category.name,
      categoryId: category.id,
      categorySnapshot: {
        name: category.name,
        color: category.color,
      },
    });
  });
  it('keeps a system category snapshot without storing its legacy name as an API ID', async () => {
    const category = DEFAULT_CATEGORIES[0];
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(<HookHarness ref={ref} editingExpense={null} />);
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'System category expense');
      ref.current!.handleUpdateFormState('amount', '12.00');
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      category: category.name,
      categorySnapshot: {
        name: category.name,
        color: category.color,
      },
    });
    expect(useExpenseFeatureStore.getState().expenses[0]).not.toHaveProperty(
      'categoryId',
    );
  });
  it('validates group expenses require payer and participants', async () => {
    const group: ExpenseGroup = {
      id: 'group-1',
      name: 'Roommates',
      participants: [],
      createdAt: '2025-02-01T00:00:00.000Z',
    };
    act(() => {
      useGroupStore.setState({ groups: [group] });
      useComposedExpenseStore.setState({ groups: [group] });
    });

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HookHarness ref={ref} editingExpense={null} />,
      );
    });

    act(() => {
      ref.current!.handleUpdateFormState('title', 'Shared dinner');
      ref.current!.handleUpdateFormState('amount', '42.00');
      ref.current!.handleSharingChange(true);
      ref.current!.handleUpdateFormState('selectedGroup', group);
    });

    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Validation Error',
      'When adding to a group, please select who paid and who to split with.',
    );
    expect(useComposedExpenseStore.getState().expenses).toHaveLength(0);
    expect(router.back).not.toHaveBeenCalled();
  });
  it('preselects the shared space supplied by the group-detail route', () => {
    const participant: Participant = { id: 'p1', name: 'Alex' };
    const group: ExpenseGroup = {
      id: 'space-route',
      name: 'Route Group',
      participants: [participant],
      createdAt: '2025-02-01T00:00:00.000Z',
    };
    act(() => {
      useGroupStore.setState({ groups: [group] });
      useComposedExpenseStore.setState({ groups: [group] });
    });

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={ref}
          editingExpense={null}
          initialSpaceId={group.id}
        />,
      );
    });

    expect(ref.current!.formState.selectedGroup?.id).toBe(group.id);
  });

  it('excludes archived groups from new expense selection and route preselection', () => {
    const archivedGroup: ExpenseGroup = {
      id: 'archived-space',
      name: 'Archived Space',
      participants: [],
      createdAt: '2025-02-01T00:00:00.000Z',
      archivedAt: '2026-08-24T00:00:00.000Z',
    };
    const activeGroup: ExpenseGroup = {
      id: 'active-space',
      name: 'Active Space',
      participants: [],
      createdAt: '2025-02-02T00:00:00.000Z',
    };
    act(() => {
      useGroupStore.setState({ groups: [archivedGroup, activeGroup] });
      useComposedExpenseStore.setState({
        groups: [archivedGroup, activeGroup],
      });
    });

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={ref}
          editingExpense={null}
          initialSpaceId={archivedGroup.id}
        />,
      );
    });

    expect(ref.current!.groups).toEqual([activeGroup]);
    expect(ref.current!.formState.selectedGroup).toBeNull();
  });
  it('updates an existing expense when editing', async () => {
    const participant: Participant = { id: 'p1', name: 'Alex' };
    const group: ExpenseGroup = {
      id: 'group-2',
      name: 'Cycling Club',
      participants: [participant],
      createdAt: '2025-02-10T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'expense-1',
      title: 'Snacks',
      amount: 15,
      date: '2025-03-01',
      category: DEFAULT_CATEGORIES[0].name,
      groupId: group.id,
      paidBy: participant.id,
      splitBetween: [participant.id],
      caption: 'Team ride snacks',
    };

    act(() => {
      useParticipantStore.setState({ participants: [participant] });
      useGroupStore.setState({ groups: [group] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        participants: [participant],
        groups: [group],
        expenses: [existingExpense],
      });
    });

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });

    expect(ref.current!.formState.title).toBe('Snacks');

    act(() => {
      ref.current!.handleUpdateFormState('amount', '21.50');
      ref.current!.handleUpdateFormState('caption', 'Updated snacks');
    });

    await act(async () => {
      await ref.current!.handleSubmit();
    });

    const updated = useComposedExpenseStore
      .getState()
      .expenses.find((expense) => expense.id === 'expense-1');

    expect(updated).toMatchObject({
      amountMinor: 2150,
      currency: 'USD',
      spaceId: group.id,
      spaceKind: 'shared',
      caption: 'Updated snacks',
    });
    expect(updated).not.toHaveProperty('amount');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('preserves shared currency and custom allocations on a metadata-only edit', async () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alex' },
      { id: 'p2', name: 'Blair' },
      { id: 'p3', name: 'Casey' },
    ];
    const group: ExpenseGroup = {
      id: 'group-custom',
      name: 'Household',
      participants,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'expense-custom',
      title: 'Groceries',
      amountMinor: 1200,
      currency: 'JPY',
      date: '2026-08-20',
      category: 'Food & Dining',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [
        { participantId: 'p1', amountMinor: 900 },
        { participantId: 'p2', amountMinor: 300 },
      ],
      shares: [
        { participantId: 'p1', amountMinor: 200 },
        { participantId: 'p2', amountMinor: 300 },
        { participantId: 'p3', amountMinor: 700 },
      ],
    };

    act(() => {
      useParticipantStore.setState({ participants });
      useGroupStore.setState({ groups: [group] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        participants,
        groups: [group],
        expenses: [existingExpense],
        settings: { ...defaultSettings, currency: 'USD' },
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Groceries and supplies');
      ref.current!.onChangeDate({} as never, new Date(2026, 7, 21));
      ref.current!.handleUpdateFormState('category', 'Transportation');
    });

    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      id: existingExpense.id,
      title: 'Groceries and supplies',
      amountMinor: 1200,
      currency: 'JPY',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: existingExpense.payments,
      shares: existingExpense.shares,
      date: '2026-08-21',
      category: 'Transportation',
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('preserves unresolved historical allocations on a metadata-only edit', async () => {
    const historicalParticipants: Participant[] = [
      { id: 'historical-payer', name: 'Former payer' },
      { id: 'historical-member', name: 'Former member' },
    ];
    const group: ExpenseGroup = {
      id: 'group-with-historical-members',
      name: 'Former household',
      participants: historicalParticipants,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'expense-with-historical-members',
      title: 'Old utilities',
      amountMinor: 9000,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Utilities',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [{ participantId: 'historical-payer', amountMinor: 9000 }],
      shares: [
        { participantId: 'historical-payer', amountMinor: 4500 },
        { participantId: 'historical-member', amountMinor: 4500 },
      ],
    };
    act(() => {
      useParticipantStore.setState({ participants: [] });
      useGroupStore.setState({ groups: [group] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        participants: [],
        groups: [group],
        expenses: [existingExpense],
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Archived utilities');
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      title: 'Archived utilities',
      payments: existingExpense.payments,
      shares: existingExpense.shares,
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('refuses to drop a partially unresolved member when the amount changes', async () => {
    const visibleParticipant: Participant = { id: 'p1', name: 'Alex' };
    const formerParticipant: Participant = { id: 'p2', name: 'Former member' };
    const group: ExpenseGroup = {
      id: 'group-partially-resolved',
      name: 'Old trip',
      participants: [visibleParticipant, formerParticipant],
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'expense-partially-resolved',
      title: 'Old hotel',
      amountMinor: 9000,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Travel',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [{ participantId: visibleParticipant.id, amountMinor: 9000 }],
      shares: [
        { participantId: visibleParticipant.id, amountMinor: 4500 },
        { participantId: formerParticipant.id, amountMinor: 4500 },
      ],
    };
    act(() => {
      useParticipantStore.setState({ participants: [visibleParticipant] });
      useGroupStore.setState({ groups: [group] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        participants: [visibleParticipant],
        groups: [group],
        expenses: [existingExpense],
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    expect(ref.current!.financialEditingDisabled).toBe(true);
    expect(ref.current!.financialEditingReason).toMatch(
      /custom shared allocations/i,
    );
    expect(ref.current!.canSubmit).toBe(false);
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Old hotel metadata');
    });
    expect(ref.current!.canSubmit).toBe(true);
    act(() => {
      ref.current!.handleUpdateFormState('amount', '100.00');
    });
    expect(ref.current!.canSubmit).toBe(false);
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      existingExpense,
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Allocation Update Required',
      'Custom shared allocations need a dedicated editor before the amount or split can change.',
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  it('refuses to guess new custom allocations when the amount changes', async () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alex' },
      { id: 'p2', name: 'Blair' },
      { id: 'p3', name: 'Casey' },
    ];
    const group: ExpenseGroup = {
      id: 'group-scale',
      name: 'Trip',
      participants,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'expense-scale',
      title: 'Lodging',
      amountMinor: 10000,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Travel',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [
        { participantId: 'p1', amountMinor: 7000 },
        { participantId: 'p2', amountMinor: 3000 },
      ],
      shares: [
        { participantId: 'p1', amountMinor: 2000 },
        { participantId: 'p2', amountMinor: 3000 },
        { participantId: 'p3', amountMinor: 5000 },
      ],
    };

    act(() => {
      useParticipantStore.setState({ participants });
      useGroupStore.setState({ groups: [group] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        participants,
        groups: [group],
        expenses: [existingExpense],
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('amount', '200.00');
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      existingExpense,
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Allocation Update Required',
      'Custom shared allocations need a dedicated editor before the amount or split can change.',
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  it('blocks payer changes while custom shares are locked', async () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alex' },
      { id: 'p2', name: 'Blair' },
      { id: 'p3', name: 'Casey' },
    ];
    const group: ExpenseGroup = {
      id: 'group-custom-payer',
      name: 'Trip',
      participants,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'expense-custom-payer',
      title: 'Villa',
      amountMinor: 10000,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Travel',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [{ participantId: 'p1', amountMinor: 10000 }],
      shares: [
        { participantId: 'p1', amountMinor: 2000 },
        { participantId: 'p2', amountMinor: 3000 },
        { participantId: 'p3', amountMinor: 5000 },
      ],
    };
    act(() => {
      useParticipantStore.setState({ participants });
      useGroupStore.setState({ groups: [group] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        participants,
        groups: [group],
        expenses: [existingExpense],
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('paidByParticipant', participants[1]);
    });
    expect(ref.current!.financialEditingDisabled).toBe(true);
    expect(ref.current!.canSubmit).toBe(false);
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      existingExpense,
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Allocation Update Required',
      'Custom shared allocations need a dedicated editor before the amount or split can change.',
    );
  });

  it('refuses to discard a member from a custom split', async () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alex' },
      { id: 'p2', name: 'Blair' },
      { id: 'p3', name: 'Casey' },
    ];
    const group: ExpenseGroup = {
      id: 'group-custom-split',
      name: 'Trip',
      participants,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'expense-custom-split',
      title: 'Villa',
      amountMinor: 10000,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Travel',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [{ participantId: 'p1', amountMinor: 10000 }],
      shares: [
        { participantId: 'p1', amountMinor: 2000 },
        { participantId: 'p2', amountMinor: 3000 },
        { participantId: 'p3', amountMinor: 5000 },
      ],
    };
    act(() => {
      useParticipantStore.setState({ participants });
      useGroupStore.setState({ groups: [group] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        participants,
        groups: [group],
        expenses: [existingExpense],
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.handleRemoveParticipant('p3');
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      existingExpense,
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Allocation Update Required',
      'Custom shared allocations need a dedicated editor before the amount or split can change.',
    );
  });

  it('recomputes a representable equal split after membership changes', async () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alex' },
      { id: 'p2', name: 'Blair' },
      { id: 'p3', name: 'Casey' },
    ];
    const group: ExpenseGroup = {
      id: 'group-equal-split',
      name: 'Trip',
      participants,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'expense-equal-split',
      title: 'Train',
      amountMinor: 10001,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Travel',
      spaceId: group.id,
      spaceKind: 'shared',
      payments: [{ participantId: 'p1', amountMinor: 10001 }],
      shares: [
        { participantId: 'p1', amountMinor: 5001 },
        { participantId: 'p2', amountMinor: 5000 },
      ],
    };
    act(() => {
      useParticipantStore.setState({ participants });
      useGroupStore.setState({ groups: [group] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        participants,
        groups: [group],
        expenses: [existingExpense],
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.setFormState((previous) => ({
        ...previous,
        selectedParticipants: participants,
      }));
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses[0].shares).toEqual([
      { participantId: 'p1', amountMinor: 3334 },
      { participantId: 'p2', amountMinor: 3334 },
      { participantId: 'p3', amountMinor: 3333 },
    ]);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('refuses to convert a shared expense when its group is unavailable', async () => {
    const existingExpense: Expense = {
      id: 'expense-orphaned',
      title: 'Historical dinner',
      amountMinor: 9000,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Food & Dining',
      spaceId: 'missing-group',
      spaceKind: 'shared',
      payments: [{ participantId: 'p1', amountMinor: 9000 }],
      shares: [
        { participantId: 'p1', amountMinor: 3000 },
        { participantId: 'p2', amountMinor: 6000 },
      ],
    };
    act(() => {
      useParticipantStore.setState({
        participants: [
          { id: 'p1', name: 'Alex' },
          { id: 'p2', name: 'Blair' },
        ],
      });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        expenses: [existingExpense],
        groups: [],
        participants: [
          { id: 'p1', name: 'Alex' },
          { id: 'p2', name: 'Blair' },
        ],
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Changed title');
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      existingExpense,
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Historical Shared Expense',
      'Restore its group before editing this expense.',
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  it('loads archived shared context but requires restore before editing', async () => {
    const participant: Participant = { id: 'p1', name: 'Alex' };
    const archivedGroup: ExpenseGroup = {
      id: 'archived-group-edit',
      name: 'Archived Group',
      participants: [participant],
      createdAt: '2026-08-01T00:00:00.000Z',
      archivedAt: '2026-08-24T00:00:00.000Z',
    };
    const existingExpense: Expense = {
      id: 'archived-expense-edit',
      title: 'Historical dinner',
      amountMinor: 9000,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Food & Dining',
      spaceId: archivedGroup.id,
      spaceKind: 'shared',
      payments: [{ participantId: participant.id, amountMinor: 9000 }],
      shares: [{ participantId: participant.id, amountMinor: 9000 }],
    };
    act(() => {
      useParticipantStore.setState({ participants: [participant] });
      useGroupStore.setState({ groups: [archivedGroup] });
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({
        expenses: [existingExpense],
        groups: [archivedGroup],
        participants: [participant],
      });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    expect(ref.current!.formState.selectedGroup?.id).toBe(archivedGroup.id);
    expect(ref.current!.canSubmit).toBe(false);
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Changed title');
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      existingExpense,
    ]);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Historical Shared Expense',
      'Restore its group before editing this expense.',
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  it('retries a failed create with the same stable expense identity', async () => {
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(<HookHarness ref={ref} editingExpense={null} />);
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Retry-safe coffee');
      ref.current!.handleUpdateFormState('amount', '5.00');
    });

    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    const failedCreate = useExpenseFeatureStore.getState().expenses[0];
    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Storage Error',
      'The expense could not be saved to this device. Please try again.',
    );
    expect(ref.current!.hasPendingMutation).toBe(true);
    expect(router.back).not.toHaveBeenCalled();

    (Alert.alert as jest.Mock).mockClear();
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    expect(useExpenseFeatureStore.getState().expenses[0].id).toBe(
      failedCreate.id,
    );
    expect(useExpenseFeatureStore.getState().expenses[0].title).toBe(
      'Retry-safe coffee',
    );
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('reuses a failed create identity after the form remounts', async () => {
    const firstRef = createRef<ReturnType<typeof useExpenseForm>>();
    let firstRenderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      firstRenderer = TestRenderer.create(
        <HookHarness ref={firstRef} editingExpense={null} />,
      );
    });
    act(() => {
      firstRef.current!.handleUpdateFormState('title', 'Remounted coffee');
      firstRef.current!.handleUpdateFormState('amount', '6.00');
    });

    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await firstRef.current!.handleSubmit();
    });
    const failedExpense = useExpenseFeatureStore.getState().expenses[0];
    act(() => {
      firstRenderer.unmount();
    });

    const retryRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(<HookHarness ref={retryRef} editingExpense={null} />);
    });
    act(() => {
      retryRef.current!.handleUpdateFormState('title', 'Remounted coffee');
      retryRef.current!.handleUpdateFormState('amount', '6.00');
    });
    await act(async () => {
      await retryRef.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    expect(useExpenseFeatureStore.getState().expenses[0].id).toBe(
      failedExpense.id,
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('rolls back a failed create before a different draft session can save', async () => {
    const firstRef = createRef<ReturnType<typeof useExpenseForm>>();
    let firstRenderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      firstRenderer = TestRenderer.create(
        <HookHarness
          ref={firstRef}
          draftSessionId='failed-create-session'
          editingExpense={null}
        />,
      );
    });
    act(() => {
      firstRef.current!.handleUpdateFormState('title', 'Abandoned coffee');
      firstRef.current!.handleUpdateFormState('amount', '5.00');
    });

    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await firstRef.current!.handleSubmit();
    });
    const abandonedId = useExpenseFeatureStore.getState().expenses[0].id;

    storage.setItem.mockResolvedValue(undefined);
    let discarded = false;
    await act(async () => {
      discarded = await firstRef.current!.discardChanges();
    });
    expect(discarded).toBe(true);
    expect(useExpenseFeatureStore.getState().expenses).toEqual([]);
    act(() => firstRenderer.unmount());

    const nextRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={nextRef}
          draftSessionId='new-create-session'
          editingExpense={null}
        />,
      );
    });
    act(() => {
      nextRef.current!.handleUpdateFormState('title', 'Intentional lunch');
      nextRef.current!.handleUpdateFormState('amount', '12.00');
    });
    await act(async () => {
      await nextRef.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      title: 'Intentional lunch',
    });
    expect(useExpenseFeatureStore.getState().expenses[0].id).not.toBe(
      abandonedId,
    );
  });

  it('restores the exact edit snapshot when a failed save is discarded', async () => {
    const originalExpense: Expense = {
      id: 'expense-discard-edit',
      title: 'Original dinner',
      amountMinor: 2500,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      sync: {
        mutationId: 'original-discard-mutation',
        serverVersion: 4,
        localRevision: 2,
        status: 'synced',
        updatedAt: '2026-08-20T00:00:00.000Z',
      },
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [originalExpense] });
      useComposedExpenseStore.setState({ expenses: [originalExpense] });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={ref}
          draftSessionId='discard-edit-session'
          editingExpense={originalExpense}
        />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Unpersisted dinner');
    });
    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await ref.current!.handleSubmit();
    });
    expect(
      useExpenseFeatureStore.getState().expenses[0].sync?.localRevision,
    ).toBe(3);

    storage.setItem.mockResolvedValue(undefined);
    let discarded = false;
    await act(async () => {
      discarded = await ref.current!.discardChanges();
    });
    expect(discarded).toBe(true);
    expect(useExpenseFeatureStore.getState().expenses[0]).toEqual(
      originalExpense,
    );
  });

  it('does not roll back over a newer expense mutation', async () => {
    const originalExpense: Expense = {
      id: 'expense-discard-conflict',
      title: 'Opening title',
      amountMinor: 2500,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      sync: {
        mutationId: 'opening-conflict-mutation',
        serverVersion: 4,
        localRevision: 2,
        status: 'synced',
        updatedAt: '2026-08-20T00:00:00.000Z',
      },
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [originalExpense] });
      useComposedExpenseStore.setState({ expenses: [originalExpense] });
    });
    await flushExpensePersistence();
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={ref}
          draftSessionId='discard-conflict-session'
          editingExpense={originalExpense}
        />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Failed local title');
    });
    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    const attemptedExpense = useExpenseFeatureStore.getState().expenses[0];
    act(() => {
      useExpenseFeatureStore.getState().updateExpense({
        ...attemptedExpense,
        title: 'Concurrent newer title',
      });
    });
    await flushExpensePersistence();
    const concurrentExpense = useExpenseFeatureStore.getState().expenses[0];
    expect(concurrentExpense.sync?.localRevision).toBe(4);

    let discarded = true;
    await act(async () => {
      discarded = await ref.current!.discardChanges();
    });

    expect(discarded).toBe(false);
    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      concurrentExpense,
    ]);
    expect(ref.current!.hasPendingMutation).toBe(true);
    expect(ref.current!.isRollbackPending).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Conflict',
      'This expense changed elsewhere. Review the latest version before leaving.',
    );

    (Alert.alert as jest.Mock).mockClear();
    await act(async () => {
      await ref.current!.handleSubmit();
    });
    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      concurrentExpense,
    ]);
    expect(router.back).not.toHaveBeenCalled();
    expect(ref.current!.canSubmit).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Save Conflict',
      'This expense changed elsewhere. Cancel and reopen it to review the latest version.',
    );

    await act(async () => {
      discarded = await ref.current!.discardChanges();
    });
    expect(discarded).toBe(true);
    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      concurrentExpense,
    ]);
  });

  it('does not resurrect an expense concurrently deleted while a failed edit is pending', async () => {
    const originalExpense: Expense = {
      id: 'expense-discard-missing',
      title: 'Opening title',
      amountMinor: 2500,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      sync: {
        mutationId: 'opening-missing-mutation',
        serverVersion: 4,
        localRevision: 2,
        status: 'synced',
        updatedAt: '2026-08-20T00:00:00.000Z',
      },
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [originalExpense] });
      useComposedExpenseStore.setState({ expenses: [originalExpense] });
    });
    await flushExpensePersistence();
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={ref}
          draftSessionId='discard-missing-session'
          editingExpense={originalExpense}
        />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Failed local title');
    });
    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await ref.current!.handleSubmit();
    });
    const attemptedExpense = useExpenseFeatureStore.getState().expenses[0];
    const concurrentTombstone: Expense = {
      ...attemptedExpense,
      sync: {
        mutationId: 'concurrent-delete-mutation',
        serverVersion: 4,
        localRevision: 4,
        status: 'pending',
        updatedAt: '2026-08-24T00:03:00.000Z',
        deletedAt: '2026-08-24T00:03:00.000Z',
      },
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [concurrentTombstone] });
    });
    await flushExpensePersistence();
    expect(concurrentTombstone.sync?.deletedAt).toEqual(expect.any(String));

    let discarded = true;
    await act(async () => {
      discarded = await ref.current!.discardChanges();
    });

    expect(discarded).toBe(false);
    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      concurrentTombstone,
    ]);
    expect(ref.current!.hasPendingMutation).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Conflict',
      'This expense changed elsewhere. Review the latest version before leaving.',
    );

    (Alert.alert as jest.Mock).mockClear();
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Stale resurrection');
    });
    await act(async () => {
      await ref.current!.handleSubmit();
    });
    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      concurrentTombstone,
    ]);
    expect(router.back).not.toHaveBeenCalled();
    expect(ref.current!.canSubmit).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Save Conflict',
      'This expense changed elsewhere. Cancel and reopen it to review the latest version.',
    );

    await act(async () => {
      discarded = await ref.current!.discardChanges();
    });
    expect(discarded).toBe(true);
    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      concurrentTombstone,
    ]);
  });

  it('does not claim a pending edit was saved after its expense disappears', async () => {
    const originalExpense: Expense = {
      id: 'expense-save-missing',
      title: 'Opening title',
      amountMinor: 2500,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      sync: {
        mutationId: 'opening-save-missing',
        serverVersion: 4,
        localRevision: 2,
        status: 'synced',
        updatedAt: '2026-08-20T00:00:00.000Z',
      },
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [originalExpense] });
      useComposedExpenseStore.setState({ expenses: [originalExpense] });
    });
    await flushExpensePersistence();
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={ref}
          draftSessionId='save-missing-session'
          editingExpense={originalExpense}
        />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Failed local title');
    });
    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await ref.current!.handleSubmit();
    });
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [] });
    });
    await flushExpensePersistence();

    (Alert.alert as jest.Mock).mockClear();
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([]);
    expect(router.back).not.toHaveBeenCalled();
    expect(ref.current!.canSubmit).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Save Conflict',
      'This expense changed elsewhere. Cancel and reopen it to review the latest version.',
    );
    let discarded = false;
    await act(async () => {
      discarded = await ref.current!.discardChanges();
    });
    expect(discarded).toBe(true);
    expect(useExpenseFeatureStore.getState().expenses).toEqual([]);
  });

  it('stays on the form when rollback persistence fails', async () => {
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={ref}
          draftSessionId='rollback-failure-session'
          editingExpense={null}
        />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Rollback coffee');
      ref.current!.handleUpdateFormState('amount', '4.00');
    });
    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('initial save failed'));
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    storage.setItem.mockRejectedValueOnce(new Error('rollback failed'));
    let discarded = true;
    await act(async () => {
      discarded = await ref.current!.discardChanges();
    });
    expect(discarded).toBe(false);
    expect(ref.current!.isRollbackPending).toBe(true);
    expect(ref.current!.canSubmit).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Failed',
      'The draft could not be removed from this device. Please try again.',
    );

    storage.setItem.mockResolvedValue(undefined);
    await act(async () => {
      discarded = await ref.current!.discardChanges();
    });
    expect(discarded).toBe(true);
    expect(useExpenseFeatureStore.getState().expenses).toEqual([]);
  });

  it('keeps the latest owner draft when an older submit finishes after remount', async () => {
    let resolveFirstWrite: (() => void) | undefined;
    storage.setItem.mockResolvedValueOnce(undefined).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstWrite = resolve;
        }),
    );

    const firstRef = createRef<ReturnType<typeof useExpenseForm>>();
    let firstRenderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      firstRenderer = TestRenderer.create(
        <HookHarness
          ref={firstRef}
          draftSessionId='owner-race-session'
          editingExpense={null}
        />,
      );
    });
    act(() => {
      firstRef.current!.handleUpdateFormState('title', 'First owner');
      firstRef.current!.handleUpdateFormState('amount', '5.00');
    });
    let firstSubmission!: Promise<void>;
    act(() => {
      firstSubmission = firstRef.current!.handleSubmit();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(firstRef.current!.isSubmitting).toBe(true);
    const expenseId = useExpenseFeatureStore.getState().expenses[0].id;
    act(() => firstRenderer.unmount());

    const secondRef = createRef<ReturnType<typeof useExpenseForm>>();
    let secondRenderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      secondRenderer = TestRenderer.create(
        <HookHarness
          ref={secondRef}
          draftSessionId='owner-race-session'
          editingExpense={null}
        />,
      );
    });
    expect(secondRef.current!.formState.title).toBe('First owner');

    await act(async () => {
      resolveFirstWrite?.();
      await firstSubmission;
    });
    act(() => {
      secondRef.current!.handleUpdateFormState('title', 'Latest owner');
    });
    storage.setItem.mockRejectedValueOnce(new Error('retry failed'));
    await act(async () => {
      await secondRef.current!.handleSubmit();
    });
    act(() => secondRenderer.unmount());

    const thirdRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={thirdRef}
          draftSessionId='owner-race-session'
          editingExpense={null}
        />,
      );
    });
    expect(thirdRef.current!.formState.title).toBe('Latest owner');
    storage.setItem.mockResolvedValue(undefined);
    await act(async () => {
      await thirdRef.current!.handleSubmit();
    });
    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      id: expenseId,
      title: 'Latest owner',
    });
  });

  it('lets the latest owner hard-discard while an older create write finishes', async () => {
    let resolveOlderWrite: (() => void) | undefined;
    storage.setItem.mockResolvedValueOnce(undefined).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveOlderWrite = resolve;
        }),
    );

    const firstRef = createRef<ReturnType<typeof useExpenseForm>>();
    let firstRenderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      firstRenderer = TestRenderer.create(
        <HookHarness
          ref={firstRef}
          draftSessionId='discard-owner-race'
          editingExpense={null}
        />,
      );
    });
    act(() => {
      firstRef.current!.handleUpdateFormState('title', 'Abandoned coffee');
      firstRef.current!.handleUpdateFormState('amount', '5.00');
    });
    let olderSubmission!: Promise<void>;
    act(() => {
      olderSubmission = firstRef.current!.handleSubmit();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    act(() => firstRenderer.unmount());

    const latestRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={latestRef}
          draftSessionId='discard-owner-race'
          editingExpense={null}
        />,
      );
    });
    let discardResult = false;
    let discardPromise!: Promise<boolean>;
    act(() => {
      discardPromise = latestRef.current!.discardChanges();
    });
    expect(useExpenseFeatureStore.getState().expenses).toEqual([]);

    await act(async () => {
      resolveOlderWrite?.();
      [discardResult] = await Promise.all([
        discardPromise,
        olderSubmission.then(() => false),
      ]);
    });
    expect(discardResult).toBe(true);
    expect(useExpenseFeatureStore.getState().expenses).toEqual([]);
    expect(storage.setItem).toHaveBeenLastCalledWith(
      'expense-mobile-expenses-v2',
      expect.stringContaining('"expenses":[]'),
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  it('persists the anonymous identity before creating its first expense', async () => {
    let resolveIdentityWrite: (() => void) | undefined;
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveIdentityWrite = resolve;
        }),
    );

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(<HookHarness ref={ref} editingExpense={null} />);
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Ordered coffee');
      ref.current!.handleUpdateFormState('amount', '5.00');
    });

    let submission!: Promise<void>;
    act(() => {
      submission = ref.current!.handleSubmit();
    });
    await Promise.resolve();

    expect(storage.setItem).toHaveBeenCalledWith(
      'expense-mobile-user-v2',
      expect.any(String),
    );
    expect(useExpenseFeatureStore.getState().expenses).toEqual([]);

    await act(async () => {
      resolveIdentityWrite?.();
      await submission;
    });

    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      'expense-mobile-expenses-v2',
      expect.stringContaining('Ordered coffee'),
    );
  });

  it('does not create an expense when anonymous identity persistence fails', async () => {
    storage.setItem.mockRejectedValueOnce(new Error('identity unavailable'));

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(<HookHarness ref={ref} editingExpense={null} />);
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Unsafe coffee');
      ref.current!.handleUpdateFormState('amount', '5.00');
    });

    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalledWith(
      'expense-mobile-expenses-v2',
      expect.any(String),
    );
    expect(router.back).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Storage Error',
      'The expense could not be saved to this device. Please try again.',
    );
  });

  it('persists the latest form snapshot when save is pressed during an in-flight write', async () => {
    let resolveFirstWrite: (() => void) | undefined;
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstWrite = resolve;
        }),
    );

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(<HookHarness ref={ref} editingExpense={null} />);
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'First snapshot');
      ref.current!.handleUpdateFormState('amount', '5.00');
    });

    let firstSubmit!: Promise<void>;
    act(() => {
      firstSubmit = ref.current!.handleSubmit();
    });
    await Promise.resolve();

    act(() => {
      ref.current!.handleUpdateFormState('title', 'Latest snapshot');
      ref.current!.handleUpdateFormState('amount', '7.50');
    });
    let secondSubmit!: Promise<void>;
    act(() => {
      secondSubmit = ref.current!.handleSubmit();
    });

    await act(async () => {
      resolveFirstWrite?.();
      await Promise.all([firstSubmit, secondSubmit]);
    });

    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      title: 'Latest snapshot',
      amountMinor: 750,
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('does not apply a queued edit over a newer in-flight mutation', async () => {
    const originalExpense: Expense = {
      id: 'queued-edit-conflict',
      title: 'Opening title',
      amountMinor: 500,
      currency: 'USD',
      date: '2026-08-24',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 500 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 500 }],
      sync: {
        mutationId: 'queued-opening-mutation',
        serverVersion: 2,
        localRevision: 0,
        status: 'synced',
        updatedAt: '2026-08-24T00:00:00.000Z',
      },
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [originalExpense] });
      useComposedExpenseStore.setState({ expenses: [originalExpense] });
    });
    await flushExpensePersistence();
    storage.setItem.mockClear();

    let resolveAttemptedWrite: (() => void) | undefined;
    let markAttemptedWriteStarted: (() => void) | undefined;
    const attemptedWriteStarted = new Promise<void>((resolve) => {
      markAttemptedWriteStarted = resolve;
    });
    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(() => {
        markAttemptedWriteStarted?.();
        return new Promise<void>((resolve) => {
          resolveAttemptedWrite = resolve;
        });
      });
    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness
          ref={ref}
          draftSessionId='queued-edit-conflict-session'
          editingExpense={originalExpense}
        />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'First local edit');
    });
    let firstSubmit!: Promise<void>;
    act(() => {
      firstSubmit = ref.current!.handleSubmit();
    });
    await act(async () => {
      await attemptedWriteStarted;
    });
    const attemptedExpense = useExpenseFeatureStore.getState().expenses[0];
    expect(attemptedExpense.title).toBe('First local edit');

    act(() => {
      ref.current!.handleUpdateFormState('title', 'Queued stale edit');
    });
    let queuedSubmit!: Promise<void>;
    act(() => {
      queuedSubmit = ref.current!.handleSubmit();
    });
    act(() => {
      useExpenseFeatureStore.getState().updateExpense({
        ...attemptedExpense,
        title: 'External latest title',
      });
    });
    const externalExpense = useExpenseFeatureStore.getState().expenses[0];

    await act(async () => {
      resolveAttemptedWrite?.();
      await Promise.all([firstSubmit, queuedSubmit]);
    });

    expect(useExpenseFeatureStore.getState().expenses).toEqual([
      externalExpense,
    ]);
    expect(router.back).not.toHaveBeenCalled();
    expect(ref.current!.canSubmit).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Save Conflict',
      'This expense changed elsewhere. Cancel and reopen it to review the latest version.',
    );
  });

  it('does not navigate after the form unmounts during persistence', async () => {
    let resolveWrite: (() => void) | undefined;
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        }),
    );

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HookHarness ref={ref} editingExpense={null} />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Leaving screen');
      ref.current!.handleUpdateFormState('amount', '5.00');
    });

    let submission!: Promise<void>;
    act(() => {
      submission = ref.current!.handleSubmit();
    });
    await Promise.resolve();
    act(() => {
      renderer.unmount();
    });

    await act(async () => {
      resolveWrite?.();
      await submission;
    });

    expect(router.back).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('retries the same edit without advancing its revision twice', async () => {
    const existingExpense: Expense = {
      id: 'expense-storage-rollback',
      title: 'Original title',
      amountMinor: 2500,
      currency: 'AUD',
      date: '2026-08-20',
      category: 'Other',
      spaceId: 'personal-space',
      spaceKind: 'personal',
      payments: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      shares: [{ participantId: 'personal-participant', amountMinor: 2500 }],
      sync: {
        mutationId: 'original-mutation',
        serverVersion: 4,
        localRevision: 2,
        status: 'synced',
        updatedAt: '2026-08-20T00:00:00.000Z',
      },
    };
    act(() => {
      useExpenseFeatureStore.setState({ expenses: [existingExpense] });
      useComposedExpenseStore.setState({ expenses: [existingExpense] });
    });
    await flushExpensePersistence();

    const ref = createRef<ReturnType<typeof useExpenseForm>>();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Unpersisted title');
    });

    storage.setItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    const failedEdit = useExpenseFeatureStore.getState().expenses[0];
    expect(failedEdit).toMatchObject({
      id: existingExpense.id,
      title: 'Unpersisted title',
      sync: { localRevision: 3 },
    });
    expect(router.back).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Storage Error',
      'The expense could not be saved to this device. Please try again.',
    );

    (Alert.alert as jest.Mock).mockClear();
    act(() => {
      renderer.unmount();
    });
    const retryRef = createRef<ReturnType<typeof useExpenseForm>>();
    act(() => {
      TestRenderer.create(
        <HookHarness ref={retryRef} editingExpense={failedEdit} />,
      );
    });
    await act(async () => {
      await retryRef.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses[0]).toEqual(failedEdit);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
