export const CATEGORY_PALETTE = {
  foodDining: '#FF6384',
  transportation: '#36A2EB',
  shopping: '#FFCE56',
  entertainment: '#4BC0C0',
  billsUtilities: '#9966FF',
  health: '#FF9F40',
  travel: '#C9CBCF',
  other: '#61C0BF',
  coral: '#F7464A',
  teal: '#46BFBD',
  amber: '#FDB45C',
  slate: '#949FB1',
} as const;

export const CATEGORY_COLOR_OPTIONS = Object.values(CATEGORY_PALETTE);

export const normalizeCategoryColor = (color: string): string =>
  color.trim().toUpperCase();

export const isCategoryColorAvailable = (
  color: string,
  usedColors: readonly string[],
): boolean => {
  const normalizedColor = normalizeCategoryColor(color);
  return !usedColors.some(
    (usedColor) => normalizeCategoryColor(usedColor) === normalizedColor,
  );
};

export const getFirstAvailableCategoryColor = (
  usedColors: readonly string[],
  colors: readonly string[] = CATEGORY_COLOR_OPTIONS,
): string | null =>
  colors.find((color) => isCategoryColorAvailable(color, usedColors)) ?? null;
