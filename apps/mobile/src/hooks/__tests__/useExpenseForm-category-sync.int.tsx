import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  resetExpenseFormDraftSessionsForTests,
  useExpenseForm,
} from '../useExpenseForm';
import { useExpenseStore } from '../../store/expenseStore';
import { useCategoryStore } from '../../store/features/categoryStore';
import type { Expense } from '../../types';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
}));

describe('useExpenseForm - Category Sync Integration', () => {
  const TEST_CATEGORIES = [
    { id: 'food', name: 'Food', color: '#FF6B6B' },
    { id: 'transport', name: 'Transport', color: '#4ECDC4' },
    { id: 'other', name: 'Other', color: '#95E1D3' },
  ];

  beforeEach(() => {
    resetExpenseFormDraftSessionsForTests();
    // Reset category store first (source of truth)
    useCategoryStore.setState({
      categories: TEST_CATEGORIES,
    });

    // Give time for subscription to propagate
    const initialState = useExpenseStore.getState();
    useExpenseStore.setState({
      ...initialState,
      expenses: [],
      groups: [],
      participants: [],
      categories: TEST_CATEGORIES,
      user: {
        ...initialState.user,
        id: 'test-user-id',
        displayName: 'Test User',
      },
    });
  });

  it('should reflect categories from store', () => {
    const { result } = renderHook(() =>
      useExpenseForm({ draftSessionId: 'category-sync', editingExpense: null }),
    );

    expect(result.current.categories).toHaveLength(3);
    expect(result.current.categories.map((c) => c.name)).toEqual([
      'Food',
      'Transport',
      'Other',
    ]);
  });

  it('should update when category is deleted from store', async () => {
    const { result, rerender } = renderHook(() =>
      useExpenseForm({ draftSessionId: 'category-sync', editingExpense: null }),
    );

    // Initial state: 3 categories
    expect(result.current.categories).toHaveLength(3);
    expect(
      result.current.categories.find((c) => c.name === 'Transport'),
    ).toBeDefined();

    // Delete "Transport" category from category store (source of truth)
    act(() => {
      useCategoryStore.getState().deleteCategory('transport');
    });

    // Wait for store subscription to propagate and re-render
    await waitFor(() => {
      expect(result.current.categories).toHaveLength(2);
    });

    // Assert: "Transport" is no longer available
    expect(
      result.current.categories.find((c) => c.name === 'Transport'),
    ).toBeUndefined();
    expect(result.current.categories.map((c) => c.name)).toEqual([
      'Food',
      'Other',
    ]);
  });

  it('should update when category is added to store', async () => {
    const { result } = renderHook(() =>
      useExpenseForm({ draftSessionId: 'category-sync', editingExpense: null }),
    );

    // Initial state: 3 categories
    expect(result.current.categories).toHaveLength(3);

    // Add new category to category store (source of truth)
    act(() => {
      useCategoryStore.getState().addCategory({
        name: 'Entertainment',
        color: '#FFD93D',
      });
    });

    // Wait for store subscription to propagate and re-render
    await waitFor(() => {
      expect(result.current.categories).toHaveLength(4);
    });

    // Assert: New category is available
    expect(
      result.current.categories.find((c) => c.name === 'Entertainment'),
    ).toBeDefined();
  });

  it('does not reset an in-progress form when categories change', async () => {
    const { result } = renderHook(() =>
      useExpenseForm({ draftSessionId: 'category-sync', editingExpense: null }),
    );
    act(() => {
      result.current.handleUpdateFormState('title', 'Movie tickets');
      result.current.handleUpdateFormState('amount', '42.00');
    });

    act(() => {
      useCategoryStore.getState().addCategory({
        name: 'New category',
        color: '#123456',
      });
    });
    await waitFor(() => {
      expect(result.current.categories).toHaveLength(4);
    });

    expect(result.current.formState.title).toBe('Movie tickets');
    expect(result.current.formState.amount).toBe('42.00');
    expect(result.current.isDirty).toBe(true);
  });

  it('should use first available category as default when form is reset', () => {
    const { result } = renderHook(() =>
      useExpenseForm({ draftSessionId: 'category-sync', editingExpense: null }),
    );

    // Default category should be the first one
    expect(result.current.formState.category).toBe('Food');
  });

  it('should fallback to "Uncategorized" if categories array is empty', () => {
    // Set store to have no categories (edge case)
    act(() => {
      useExpenseStore.setState({
        categories: [],
      });
    });

    const { result } = renderHook(() =>
      useExpenseForm({ draftSessionId: 'category-sync', editingExpense: null }),
    );

    expect(result.current.formState.category).toBe('Uncategorized');
  });

  it('should reset to first category when editingExpense becomes null', () => {
    const mockExpense = {
      id: 'exp-1',
      title: 'Test Expense',
      amountMinor: 5000,
      currency: 'USD',
      date: '2025-09-30',
      category: 'Transport',
      caption: '',
      spaceId: 'personal-space',
      spaceKind: 'personal' as const,
      payments: [{ participantId: 'test-user-id', amountMinor: 5000 }],
      shares: [{ participantId: 'test-user-id', amountMinor: 5000 }],
    } satisfies Expense;

    const { result, rerender } = renderHook<
      ReturnType<typeof useExpenseForm>,
      { editingExpense: Expense | null }
    >(
      ({ editingExpense }) =>
        useExpenseForm({ draftSessionId: 'category-sync', editingExpense }),
      {
        initialProps: { editingExpense: mockExpense },
      },
    );

    // Initially editing expense with "Transport" category
    expect(result.current.formState.category).toBe('Transport');

    // Stop editing (set to null)
    rerender({ editingExpense: null });

    // Should reset to first category
    expect(result.current.formState.category).toBe('Food');
  });

  it('should preserve category in form state even if that category is deleted after editing starts', async () => {
    const mockExpense = {
      id: 'exp-1',
      title: 'Test Expense',
      amountMinor: 5000,
      currency: 'USD',
      date: '2025-09-30',
      category: 'Transport',
      caption: '',
      spaceId: 'personal-space',
      spaceKind: 'personal' as const,
      payments: [{ participantId: 'test-user-id', amountMinor: 5000 }],
      shares: [{ participantId: 'test-user-id', amountMinor: 5000 }],
    } satisfies Expense;

    const { result } = renderHook(() =>
      useExpenseForm({
        draftSessionId: 'category-sync',
        editingExpense: mockExpense,
      }),
    );

    // Editing expense with "Transport" category
    expect(result.current.formState.category).toBe('Transport');

    // Delete "Transport" category from category store
    act(() => {
      useCategoryStore.getState().deleteCategory('transport');
    });

    // Wait for store subscription to propagate
    await waitFor(() => {
      expect(
        result.current.categories.find((c) => c.name === 'Transport'),
      ).toBeUndefined();
    });

    // Form state should still have "Transport" (historical data preserved)
    expect(result.current.formState.category).toBe('Transport');
  });
});
