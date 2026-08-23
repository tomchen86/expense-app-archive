import { Expense, ExpenseCategory, Category } from '../../types';
import {
  getExpenseAmountMinor,
  getExpenseCurrency,
  getExpenseSpaceId,
  getPersonalExpenseProjection,
  isExpenseDeleted,
} from '../expenseDomain';
import { minorUnitsToMajor, parseLocalCalendarDate } from '../money';

export interface ChartDataPoint {
  value: number;
  label: string;
  text: string;
  color: string;
  category: ExpenseCategory;
  categoryId?: string;
  amountMinor: number;
  absoluteValue: number;
  percentage: number;
  currency?: string;
}

export type InsightChartPreference = 'auto' | 'donut' | 'bar';
export type InsightChartKind = 'empty' | 'progress' | 'donut' | 'bar';

export interface CurrencyInsight {
  currency: string;
  totalMinor: number;
  priorTotalMinor: number;
  deltaMinor: number;
  deltaPercentage: number | null;
  exactCategories: ChartDataPoint[];
  chartCategories: ChartDataPoint[];
  chartKind: InsightChartKind;
}

interface BuildCurrencyInsightsOptions {
  currentExpenses: Expense[];
  priorExpenses: Expense[];
  categories: Category[];
  preference: InsightChartPreference;
  amountMinorSelector?: (expense: Expense) => number;
  defaultColor?: string;
}

export interface CategoryTotals {
  [key: string]: number;
}

/**
 * Calculate category totals from a list of expenses
 */
export const calculateCategoryTotals = (
  expenses: Expense[],
): { totals: CategoryTotals; total: number } => {
  const totals: CategoryTotals = {};
  let totalAmount = 0;

  expenses.forEach((expense) => {
    const amount = minorUnitsToMajor(
      getExpenseAmountMinor(expense),
      getExpenseCurrency(expense),
    );
    totals[expense.category] = (totals[expense.category] || 0) + amount;
    totalAmount += amount;
  });

  return { totals, total: totalAmount };
};

/**
 * Generate chart data for category visualization
 */
export const generateCategoryChartData = (
  expenses: Expense[],
  categories: Category[],
  defaultColor: string = '#808080',
  amountMinorSelector?: (expense: Expense) => number,
): ChartDataPoint[] => {
  if (expenses.length === 0) {
    return [];
  }

  const totals = new Map<
    string,
    {
      category: ExpenseCategory;
      categoryId?: string;
      color: string;
      currency: string;
      amountMinor: number;
    }
  >();
  const currencyTotals = new Map<string, number>();
  expenses.forEach((expense) => {
    const amountMinor = (amountMinorSelector ?? getExpenseAmountMinor)(expense);
    if (amountMinor <= 0) {
      return;
    }
    const currency = getExpenseCurrency(expense);
    const categoryDetails = expense.categoryId
      ? categories.find((category) => category.id === expense.categoryId)
      : categories.find((category) => category.name === expense.category);
    const categoryId = expense.categoryId ?? categoryDetails?.id;
    const category = categoryDetails?.name ?? expense.category;
    const key = `${currency}\u0000${
      categoryId ? `id:${categoryId}` : `legacy:${category}`
    }`;
    const existing = totals.get(key);
    totals.set(key, {
      category,
      ...(categoryId ? { categoryId } : {}),
      color: categoryDetails?.color ?? defaultColor,
      currency,
      amountMinor: (existing?.amountMinor ?? 0) + amountMinor,
    });
    currencyTotals.set(
      currency,
      (currencyTotals.get(currency) ?? 0) + amountMinor,
    );
  });

  if (totals.size === 0) {
    return [];
  }

  return [...totals.values()]
    .map(({ category, categoryId, color, currency, amountMinor }) => {
      const absoluteValue = minorUnitsToMajor(amountMinor, currency);

      return {
        value: absoluteValue,
        label: category,
        text: category,
        color,
        category,
        ...(categoryId ? { categoryId } : {}),
        currency,
        amountMinor,
        absoluteValue,
        percentage: (amountMinor / (currencyTotals.get(currency) ?? 1)) * 100,
      };
    })
    .sort(
      (left, right) =>
        right.amountMinor - left.amountMinor ||
        left.category.localeCompare(right.category),
    );
};

export const resolveInsightChartKind = (
  preference: InsightChartPreference,
  categoryCount: number,
): InsightChartKind => {
  if (categoryCount === 0) {
    return 'empty';
  }
  if (preference === 'donut') {
    return 'donut';
  }
  if (preference === 'bar') {
    return 'bar';
  }
  if (categoryCount === 1) {
    return 'progress';
  }
  return categoryCount <= 5 ? 'donut' : 'bar';
};

const createOthersPoint = (
  categories: ChartDataPoint[],
  totalMinor: number,
  currency: string,
  defaultColor: string,
): ChartDataPoint => {
  const amountMinor = categories.reduce(
    (sum, category) => sum + category.amountMinor,
    0,
  );
  const absoluteValue = minorUnitsToMajor(amountMinor, currency);
  return {
    value: absoluteValue,
    label: 'Others',
    text: 'Others',
    color: defaultColor,
    category: 'Others',
    currency,
    amountMinor,
    absoluteValue,
    percentage: totalMinor > 0 ? (amountMinor / totalMinor) * 100 : 0,
  };
};

export const buildCurrencyInsights = ({
  currentExpenses,
  priorExpenses,
  categories,
  preference,
  amountMinorSelector,
  defaultColor = '#808080',
}: BuildCurrencyInsightsOptions): CurrencyInsight[] => {
  const current = generateCategoryChartData(
    currentExpenses,
    categories,
    defaultColor,
    amountMinorSelector,
  );
  const prior = generateCategoryChartData(
    priorExpenses,
    categories,
    defaultColor,
    amountMinorSelector,
  );
  const currencies = Array.from(
    new Set(
      [...current, ...prior].map((category) => category.currency ?? 'USD'),
    ),
  ).sort();

  return currencies.map((currency) => {
    const exactCategories = current.filter(
      (category) => (category.currency ?? 'USD') === currency,
    );
    const priorCategories = prior.filter(
      (category) => (category.currency ?? 'USD') === currency,
    );
    const totalMinor = exactCategories.reduce(
      (sum, category) => sum + category.amountMinor,
      0,
    );
    const priorTotalMinor = priorCategories.reduce(
      (sum, category) => sum + category.amountMinor,
      0,
    );
    const deltaMinor = totalMinor - priorTotalMinor;
    const chartKind = resolveInsightChartKind(
      preference,
      exactCategories.length,
    );
    const chartCategories =
      preference === 'donut' && exactCategories.length > 5
        ? [
            ...exactCategories.slice(0, 5),
            createOthersPoint(
              exactCategories.slice(5),
              totalMinor,
              currency,
              defaultColor,
            ),
          ]
        : exactCategories;

    return {
      currency,
      totalMinor,
      priorTotalMinor,
      deltaMinor,
      deltaPercentage:
        priorTotalMinor > 0 ? (deltaMinor / priorTotalMinor) * 100 : null,
      exactCategories,
      chartCategories,
      chartKind,
    };
  });
};

/**
 * Filter expenses by date range
 */
export const filterExpensesByDate = (
  expenses: Expense[],
  aggregation: 'month' | 'year',
  selectedYear: number,
  selectedMonth?: number,
): Expense[] => {
  return expenses.filter((expense) => {
    const expenseDate = parseLocalCalendarDate(expense.date);
    if (!expenseDate) {
      return false;
    }

    if (aggregation === 'year') {
      return expenseDate.getFullYear() === selectedYear;
    } else {
      // month aggregation
      return (
        expenseDate.getFullYear() === selectedYear &&
        expenseDate.getMonth() === selectedMonth
      );
    }
  });
};

/**
 * Get expenses relevant to the context (personal or group)
 */
export const getRelevantExpenses = (
  allExpenses: Expense[],
  contextType: 'personal' | 'group',
  contextId: string,
  internalUserId: string | null,
  personalSpaceId?: string,
  participantIds: string[] = internalUserId ? [internalUserId] : [],
): Expense[] => {
  if (contextType === 'personal' && internalUserId) {
    return allExpenses.filter(
      (expense) =>
        !isExpenseDeleted(expense) &&
        ((expense.spaceKind === 'personal' &&
          getExpenseSpaceId(expense) === personalSpaceId) ||
          participantIds.some(
            (participantId) =>
              getPersonalExpenseProjection(expense, participantId) !== null,
          )),
    );
  } else if (contextType === 'group') {
    return allExpenses.filter(
      (expense) =>
        !isExpenseDeleted(expense) && getExpenseSpaceId(expense) === contextId,
    );
  }

  return [];
};

/**
 * Check if next period navigation should be disabled
 */
export const isNextPeriodDisabled = (
  selectedYear: number,
  selectedMonth: number,
  aggregation: 'month' | 'year',
): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (aggregation === 'month') {
    return (
      selectedYear > currentYear ||
      (selectedYear === currentYear && selectedMonth >= currentMonth)
    );
  }

  return selectedYear >= currentYear;
};

/**
 * Get display text for current period
 */
export const getDisplayPeriodText = (
  selectedYear: number,
  selectedMonth: number,
  aggregation: 'month' | 'year',
  monthNames: string[],
): string => {
  if (aggregation === 'month') {
    return `${monthNames[selectedMonth]} ${selectedYear}`;
  }
  return selectedYear.toString();
};

/**
 * Navigate to previous period
 */
export const getPreviousPeriod = (
  selectedYear: number,
  selectedMonth: number,
  aggregation: 'month' | 'year',
): { year: number; month: number } => {
  if (aggregation === 'month') {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;

    if (newMonth < 0) {
      newMonth = 11; // December
      newYear -= 1;
    }

    return { year: newYear, month: newMonth };
  } else {
    return { year: selectedYear - 1, month: selectedMonth };
  }
};

/**
 * Navigate to next period (with bounds checking)
 */
export const getNextPeriod = (
  selectedYear: number,
  selectedMonth: number,
  aggregation: 'month' | 'year',
): { year: number; month: number } | null => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (aggregation === 'month') {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;

    if (newMonth > 11) {
      newMonth = 0; // January
      newYear += 1;
    }

    // Prevent going past current month/year
    if (
      newYear > currentYear ||
      (newYear === currentYear && newMonth > currentMonth)
    ) {
      return null; // Cannot navigate to future
    }

    return { year: newYear, month: newMonth };
  } else {
    const newYear = selectedYear + 1;

    // Prevent going past current year
    if (newYear > currentYear) {
      return null; // Cannot navigate to future
    }

    return { year: newYear, month: selectedMonth };
  }
};
