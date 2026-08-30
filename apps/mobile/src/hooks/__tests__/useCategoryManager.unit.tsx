jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';

import { DEFAULT_CATEGORIES } from '../../constants/expenses';
import { useCategoryManager } from '../useCategoryManager';
import { useExpenseStore as useComposedExpenseStore } from '../../store/expenseStore';
import { useCategoryStore } from '../../store/features/categoryStore';
import { useExpenseStore as useExpenseFeatureStore } from '../../store/features/expenseStore';
import type { Category, Expense } from '../../types';

const customCategory: Category = {
  id: '8a30b5fa-5e8e-448d-8df8-4aa46385269c',
  name: 'Coffee',
  color: '#111111',
  scopeKind: 'personal',
};

const coffeeExpense: Expense = {
  id: '91ad2a3e-0d69-437a-a1af-0df06953932b',
  title: 'Flat white',
  amountMinor: 500,
  currency: 'USD',
  date: '2026-08-25',
  category: customCategory.name,
  categoryId: customCategory.id,
  categorySnapshot: {
    name: customCategory.name,
    color: customCategory.color,
  },
  spaceId: 'personal-space',
  spaceKind: 'personal',
  payments: [{ participantId: 'personal-participant', amountMinor: 500 }],
  shares: [{ participantId: 'personal-participant', amountMinor: 500 }],
};

type HookValue = ReturnType<typeof useCategoryManager>;
type HarnessProps = NonNullable<Parameters<typeof useCategoryManager>[0]>;

const Harness = forwardRef<HookValue, HarnessProps>((props, ref) => {
  const value = useCategoryManager(props);
  useImperativeHandle(ref, () => value, [value]);
  return null;
});

describe('useCategoryManager archive lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const categories = [
      ...DEFAULT_CATEGORIES.map((category) => ({ ...category })),
      { ...customCategory },
    ];
    useCategoryStore.setState({ categories });
    useExpenseFeatureStore.setState({ expenses: [{ ...coffeeExpense }] });
    useComposedExpenseStore.setState({
      categories,
      expenses: [{ ...coffeeExpense }],
    });
  });

  it('offers Archive and Move Expenses for a referenced category', () => {
    const ref = createRef<HookValue>();
    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });

    act(() => ref.current!.deleteCategory(customCategory.id));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Archive “Coffee”?',
      expect.stringContaining('1 expense'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Archive' }),
        expect.objectContaining({ text: 'Move Expenses…' }),
        expect.objectContaining({ text: 'Cancel' }),
      ]),
    );

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    act(() =>
      buttons
        .find(({ text }: { text: string }) => text === 'Archive')
        .onPress(),
    );

    expect(
      useCategoryStore
        .getState()
        .categories.find(({ id }) => id === customCategory.id)?.archivedAt,
    ).toEqual(expect.any(String));
    expect(useExpenseFeatureStore.getState().expenses[0].category).toBe(
      'Coffee',
    );
  });

  it('allows ordinary defaults to be removed but reserves Uncategorized', () => {
    const ref = createRef<HookValue>();
    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });
    const food = ref.current!.categories.find(
      ({ name }) => name === 'Food & Dining',
    )!;
    const uncategorized = ref.current!.categories.find(
      ({ name }) => name === 'Uncategorized',
    )!;

    expect(ref.current!.canDeleteCategory(food)).toBe(true);
    expect(ref.current!.canDeleteCategory(uncategorized)).toBe(false);
    expect(ref.current!.canEditCategory(uncategorized)).toBe(false);
  });

  it('moves referenced expenses only after an explicit destination choice', () => {
    const ref = createRef<HookValue>();
    act(() => {
      TestRenderer.create(<Harness ref={ref} />);
    });
    act(() => ref.current!.deleteCategory(customCategory.id));
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    act(() =>
      buttons
        .find(({ text }: { text: string }) => text === 'Move Expenses…')
        .onPress(),
    );

    expect(ref.current!.movingCategory?.id).toBe(customCategory.id);
    const uncategorized = DEFAULT_CATEGORIES.find(
      ({ name }) => name === 'Uncategorized',
    )!;
    act(() => ref.current!.moveExpensesToCategory(uncategorized));

    expect(useExpenseFeatureStore.getState().expenses[0]).toMatchObject({
      category: 'Uncategorized',
      categorySnapshot: {
        name: 'Uncategorized',
        color: uncategorized.color,
      },
    });
    expect(useExpenseFeatureStore.getState().expenses[0]).not.toHaveProperty(
      'categoryId',
    );
    expect(
      useCategoryStore
        .getState()
        .categories.find(({ id }) => id === customCategory.id)?.archivedAt,
    ).toEqual(expect.any(String));
  });

  it('creates a group-owned category and hides personal categories in group scope', () => {
    const ref = createRef<HookValue>();
    act(() => {
      TestRenderer.create(
        <Harness ref={ref} scopeKind='group' spaceId='group-brisbane' />,
      );
    });

    expect(
      ref.current!.activeCategories.some(
        (category) => category.id === customCategory.id,
      ),
    ).toBe(false);

    act(() => {
      expect(ref.current!.saveCategory('Road Trip', '#010203')).toBe(true);
    });

    expect(
      useCategoryStore
        .getState()
        .categories.find((category) => category.name === 'Road Trip'),
    ).toMatchObject({
      scopeKind: 'group',
      spaceId: 'group-brisbane',
    });
  });
});
