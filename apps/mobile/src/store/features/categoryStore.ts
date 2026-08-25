import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '../../types';
import { DEFAULT_CATEGORIES } from '../../constants/expenses';
import { normalizeCategoryColor } from '../../theme/category-palette';
import { createUuid } from '../../utils/ids';
import { useExpenseStore } from './expenseStore';

const isProtectedDefault = (category: Category): boolean =>
  category.isDefault === true ||
  DEFAULT_CATEGORIES.some((candidate) => candidate.id === category.id);

const findColorConflict = (
  categories: Category[],
  color: string,
  excludedCategoryId?: string,
): Category | undefined =>
  categories.find(
    (category) =>
      category.id !== excludedCategoryId &&
      normalizeCategoryColor(category.color) === normalizeCategoryColor(color),
  );

const assertUniqueColor = (
  categories: Category[],
  color: string,
  excludedCategoryId?: string,
): void => {
  const conflict = findColorConflict(categories, color, excludedCategoryId);
  if (conflict) {
    throw new Error(`${conflict.name} already uses this color.`);
  }
};

export interface CategoryState {
  categories: Category[];

  // Actions
  addCategory: (categoryData: Omit<Category, 'id'>) => Category;
  updateCategory: (category: Category) => void;
  archiveCategory: (categoryId: string) => void;
  restoreCategory: (categoryId: string) => void;
  deleteCategory: (categoryId: string) => void;
  getCategoryByName: (name: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,

      addCategory: (categoryData) => {
        const { name, color } = categoryData;
        const existingCategory = get().categories.find((c) => c.name === name);

        if (existingCategory) {
          // Optionally update color if name exists, or throw error/return existing
          console.warn(`Category with name "${name}" already exists.`);
          // For now, let's update the color if it's different
          if (existingCategory.color !== color) {
            assertUniqueColor(get().categories, color, existingCategory.id);
            const updatedCategory = { ...existingCategory, color };
            set((state) => ({
              categories: state.categories.map((c) =>
                c.id === existingCategory.id ? updatedCategory : c,
              ),
            }));
            return updatedCategory;
          }
          return existingCategory;
        }

        assertUniqueColor(get().categories, color);

        const newCategory: Category = {
          id: createUuid(),
          name,
          color,
          isDefault: false,
          scopeKind: categoryData.scopeKind ?? 'personal',
          ...(categoryData.spaceId ? { spaceId: categoryData.spaceId } : {}),
          ...(categoryData.createdByUserId
            ? { createdByUserId: categoryData.createdByUserId }
            : {}),
        };

        set((state) => ({
          categories: [...state.categories, newCategory],
        }));

        return newCategory;
      },

      updateCategory: (updatedCategory) => {
        const currentCategory = get().categories.find(
          (category) => category.id === updatedCategory.id,
        );
        if (
          currentCategory?.isSystem &&
          currentCategory.name === 'Uncategorized' &&
          updatedCategory.name !== currentCategory.name
        ) {
          throw new Error('Uncategorized cannot be renamed.');
        }
        assertUniqueColor(
          get().categories,
          updatedCategory.color,
          updatedCategory.id,
        );
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category,
          ),
        }));
      },

      archiveCategory: (categoryId) =>
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === categoryId && !isProtectedDefault(category)
              ? { ...category, archivedAt: new Date().toISOString() }
              : category,
          ),
        })),

      restoreCategory: (categoryId) =>
        set((state) => ({
          categories: state.categories.map((category) => {
            if (category.id !== categoryId || !category.archivedAt) {
              return category;
            }
            const { archivedAt: _archivedAt, ...activeCategory } = category;
            return activeCategory;
          }),
        })),

      deleteCategory: (categoryId) =>
        set((state) => {
          const categoryToDelete = state.categories.find(
            (c) => c.id === categoryId,
          );
          if (categoryToDelete && isProtectedDefault(categoryToDelete)) {
            console.warn(
              `Cannot delete the default category "${categoryToDelete.name}".`,
            );
            return state;
          }
          if (
            categoryToDelete &&
            useExpenseStore
              .getState()
              .expenses.some(
                (expense) =>
                  !expense.sync?.deletedAt &&
                  (expense.categoryId === categoryId ||
                    (!expense.categoryId &&
                      expense.category === categoryToDelete.name)),
              )
          ) {
            console.warn(
              `Cannot delete category "${categoryToDelete.name}" while active expenses use it.`,
            );
            return state;
          }
          return {
            categories: state.categories.filter(
              (category) => category.id !== categoryId,
            ),
          };
        }),

      getCategoryByName: (name) =>
        get().categories.find((category) => category.name === name),
    }),
    {
      name: 'expense-mobile-categories-v2',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ categories: state.categories }),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<CategoryState>;
        const existingCategories = state.categories ?? [];
        const defaultById = new Map(
          DEFAULT_CATEGORIES.map((category) => [category.id, category]),
        );
        const legacyDefaultColors = new Map([
          ['Food & Dining', '#FF6384'],
          ['Transportation', '#36A2EB'],
          ['Shopping', '#FFCE56'],
          ['Entertainment', '#4BC0C0'],
          ['Bills & Utilities', '#9966FF'],
          ['Health', '#FF9F40'],
          ['Travel', '#C9CBCF'],
          ['Other', '#61C0BF'],
        ]);
        const migratedCategories: Category[] = existingCategories.map(
          (category) => {
            const systemDefault = defaultById.get(category.id);
            if (!systemDefault) {
              return {
                ...category,
                scopeKind: category.scopeKind ?? ('personal' as const),
              };
            }
            const shouldRefreshColor =
              normalizeCategoryColor(category.color) ===
              normalizeCategoryColor(
                legacyDefaultColors.get(category.id) ?? category.color,
              );
            return {
              ...category,
              color: shouldRefreshColor ? systemDefault.color : category.color,
              isDefault: true,
              isSystem: true,
              scopeKind: 'system' as const,
            };
          },
        );
        DEFAULT_CATEGORIES.forEach((category) => {
          if (!migratedCategories.some(({ id }) => id === category.id)) {
            migratedCategories.push({ ...category });
          }
        });
        return { ...state, categories: migratedCategories } as CategoryState;
      },
    },
  ),
);
