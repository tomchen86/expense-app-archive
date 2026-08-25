export const mobileTheme = {
  colors: {
    background: '#F3F6FA',
    surface: '#FFFFFF',
    surfaceElevated: '#F8FBFF',
    surfaceVariant: '#E8EEF6',
    sharedSurface: '#F2F6FF',
    sharedBorder: '#C9D8FA',
    sharedBadge: '#DFE9FF',
    sharedBadgeText: '#315AA8',
    text: '#122033',
    textMuted: '#5F6B7A',
    primary: '#0A66D9',
    primaryGlassTint: 'rgba(10, 102, 217, 0.20)',
    primaryContainer: '#DCEBFF',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#083B78',
    success: '#187A55',
    destructive: '#C9362B',
    border: 'rgba(18, 32, 51, 0.12)',
    glassBorder: 'rgba(255, 255, 255, 0.58)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    xxxl: 36,
  },
  radii: {
    control: 14,
    card: 20,
    pill: 999,
  },
  shadows: {
    card: {
      boxShadow: '0 3px 12px rgba(32, 55, 88, 0.07)',
      elevation: 2,
    },
    action: {
      boxShadow: '0 10px 28px rgba(10, 102, 217, 0.24)',
      elevation: 6,
    },
  },
} as const;

export type MobileTheme = typeof mobileTheme;
