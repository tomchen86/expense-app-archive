export const PERIOD_MENU_MAX_OPTIONS = 8;
export const PERIOD_WHEEL_MAX_OPTIONS = 24;

export type PeriodPickerPresentation = 'static' | 'menu' | 'wheel' | 'list';

export const resolvePeriodPickerPresentation = (
  optionCount: number,
): PeriodPickerPresentation => {
  if (optionCount <= 1) {
    return 'static';
  }
  if (optionCount <= PERIOD_MENU_MAX_OPTIONS) {
    return 'menu';
  }
  if (optionCount <= PERIOD_WHEEL_MAX_OPTIONS) {
    return 'wheel';
  }
  return 'list';
};
