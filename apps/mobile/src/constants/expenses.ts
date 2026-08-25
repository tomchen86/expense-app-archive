// Centralized constants related to expenses
import { Category } from '../types'; // Import the Category type
import { CATEGORY_PALETTE } from '../theme/category-palette';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'Food & Dining',
    name: 'Food & Dining',
    color: CATEGORY_PALETTE.foodDining,
    isDefault: true,
  },
  {
    id: 'Transportation',
    name: 'Transportation',
    color: CATEGORY_PALETTE.transportation,
    isDefault: true,
  },
  {
    id: 'Shopping',
    name: 'Shopping',
    color: CATEGORY_PALETTE.shopping,
    isDefault: true,
  },
  {
    id: 'Entertainment',
    name: 'Entertainment',
    color: CATEGORY_PALETTE.entertainment,
    isDefault: true,
  },
  {
    id: 'Bills & Utilities',
    name: 'Bills & Utilities',
    color: CATEGORY_PALETTE.billsUtilities,
    isDefault: true,
  },
  {
    id: 'Health',
    name: 'Health',
    color: CATEGORY_PALETTE.health,
    isDefault: true,
  },
  {
    id: 'Travel',
    name: 'Travel',
    color: CATEGORY_PALETTE.travel,
    isDefault: true,
  },
  {
    id: 'Other',
    name: 'Other',
    color: CATEGORY_PALETTE.other,
    isDefault: true,
  },
];
