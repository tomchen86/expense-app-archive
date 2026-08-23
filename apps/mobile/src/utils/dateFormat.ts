import { parseLocalCalendarDate } from './money';

export const formatLocalDateForDisplay = (
  value: string | Date,
  locales?: Intl.LocalesArgument,
): string => {
  const date =
    value instanceof Date ? value : (parseLocalCalendarDate(value) ?? null);

  if (!date) {
    return typeof value === 'string' ? value : '';
  }

  return new Intl.DateTimeFormat(locales, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};
