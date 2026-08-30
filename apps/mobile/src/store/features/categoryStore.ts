import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '../../types';
import { DEFAULT_CATEGORIES } from '../../constants/expenses';
import { normalizeCategoryColor } from '../../theme/category-palette';
import { isReservedUncategorizedCategory } from '../../utils/categoryDomain';
import { createUuid } from '../../utils/ids';
import { useExpenseStore } from './expenseStore';
import {
  createVersionedMigrator,
  MOBILE_PERSISTENCE_SCHEMAS,
} from '../persistence/versioned-migration';

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
          currentCategory &&
          isReservedUncategorizedCategory(currentCategory) &&
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
            category.id === categoryId &&
            !isReservedUncategorizedCategory(category)
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
          if (
            categoryToDelete &&
            isReservedUncategorizedCategory(categoryToDelete)
          ) {
            console.warn(
              `Cannot delete the reserved category "${categoryToDelete.name}".`,
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
      name: MOBILE_PERSISTENCE_SCHEMAS.categories.storageKey,
      version: MOBILE_PERSISTENCE_SCHEMAS.categories.currentVersion,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ categories: state.categories }),
      migrate: createVersionedMigrator<CategoryState>(
        MOBILE_PERSISTENCE_SCHEMAS.categories,
        {},
      ),
    },
  ),
);
