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
import { useExpenseForm } from '../useExpenseForm';
import { useExpenseStore as useComposedExpenseStore } from '../../store/expenseStore';
import { useCategoryStore } from '../../store/features/categoryStore';
import {
  flushExpensePersistence,
  useExpenseStore as useExpenseFeatureStore,
} from '../../store/features/expenseStore';
import { useGroupStore } from '../../store/features/groupStore';
import { useParticipantStore } from '../../store/features/participantStore';
import { useUserStore } from '../../store/features/userStore';
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
  editingExpense?: Expense | null;
  initialSpaceId?: string;
}

const HookHarness = forwardRef(
  ({ editingExpense, initialSpaceId }: HookHarnessProps, ref) => {
    const hookValue = useExpenseForm({ editingExpense, initialSpaceId });
    useImperativeHandle(ref, () => hookValue, [hookValue]);
    return null;
  },
);
HookHarness.displayName = 'HookHarness';

describe('useExpenseForm', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    storage.setItem.mockResolvedValue(undefined);
    resetAllStores();
    await flushExpensePersistence();
    (Alert.alert as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    });
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

  it('changes only the payer when custom shares are otherwise untouched', async () => {
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
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      payments: [{ participantId: 'p2', amountMinor: 10000 }],
      shares: existingExpense.shares,
    });
    expect(Alert.alert).not.toHaveBeenCalled();
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

    storage.setItem.mockRejectedValueOnce(new Error('disk unavailable'));
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    const failedCreate = useExpenseFeatureStore.getState().expenses[0];
    expect(useExpenseFeatureStore.getState().expenses).toHaveLength(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Storage Error',
      'The expense could not be saved to this device. Please try again.',
    );
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
    act(() => {
      TestRenderer.create(
        <HookHarness ref={ref} editingExpense={existingExpense} />,
      );
    });
    act(() => {
      ref.current!.handleUpdateFormState('title', 'Unpersisted title');
    });

    storage.setItem.mockRejectedValueOnce(new Error('disk unavailable'));
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
    await act(async () => {
      await ref.current!.handleSubmit();
    });

    expect(useExpenseFeatureStore.getState().expenses[0]).toEqual(failedEdit);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
