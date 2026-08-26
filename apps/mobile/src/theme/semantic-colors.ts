import { mobileTheme } from './tokens';
import type { SemanticColors } from './semantic-colors.types';

export const semanticColors: SemanticColors = {
  background: mobileTheme.colors.background,
  surface: mobileTheme.colors.surface,
  surfaceElevated: mobileTheme.colors.surfaceElevated,
  groupedRow: mobileTheme.colors.surface,
  sheetBackground: mobileTheme.colors.background,
  fill: mobileTheme.colors.surfaceVariant,
  text: mobileTheme.colors.text,
  textMuted: mobileTheme.colors.textMuted,
  placeholder: mobileTheme.colors.textMuted,
  separator: mobileTheme.colors.border,
  primary: mobileTheme.colors.primary,
  destructive: mobileTheme.colors.destructive,
  success: mobileTheme.colors.success,
  onAccent: mobileTheme.colors.onPrimary,
  dimOverlay: 'rgba(0, 0, 0, 0.42)',
};
