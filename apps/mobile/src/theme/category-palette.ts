export const CATEGORY_PALETTE = {
  foodDining: '#D81B60',
  transportation: '#1E88E5',
  shopping: '#FBC02D',
  entertainment: '#00897B',
  billsUtilities: '#8E24AA',
  health: '#F4511E',
  travel: '#3949AB',
  other: '#6D4C41',
  uncategorized: '#757575',
  green: '#43A047',
  cyan: '#00ACC1',
  red: '#C62828',
  olive: '#9E9D24',
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
