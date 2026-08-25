import { CATEGORY_PALETTE } from '../theme/category-palette';
import type { Category, Expense } from '../types';

export interface ExpenseCategoryPresentation {
  archived: boolean;
  color: string;
  label: string;
  name: string;
}

export const resolveExpenseCategoryPresentation = (
  expense: Expense,
  categories: Category[] = [],
): ExpenseCategoryPresentation => {
  const currentCategory = expense.categoryId
    ? categories.find((category) => category.id === expense.categoryId)
    : categories.find((category) => category.name === expense.category);
  const name =
    currentCategory?.name ??
    expense.categorySnapshot?.name ??
    expense.category ??
    'Uncategorized';
  const color =
    currentCategory?.color ??
    expense.categorySnapshot?.color ??
    CATEGORY_PALETTE.uncategorized;
  const archived = Boolean(currentCategory?.archivedAt);

  return {
    archived,
    color,
    label: archived ? `${name} (Archived)` : name,
    name,
  };
};
