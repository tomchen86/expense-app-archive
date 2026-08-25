import { DynamicColorIOS } from 'react-native';

const dynamicColor = (light: string, dark: string) =>
  DynamicColorIOS({ light, dark });

export const mobileTheme = {
  colors: {
    background: dynamicColor('#F3F6FA', '#000000'),
    surface: dynamicColor('#FFFFFF', '#1C1C1E'),
    surfaceElevated: dynamicColor('#F8FBFF', '#2C2C2E'),
    surfaceVariant: dynamicColor('#E8EEF6', '#3A3A3C'),
    sharedSurface: dynamicColor('#F2F6FF', '#20283A'),
    sharedBorder: dynamicColor('#C9D8FA', '#3B4B70'),
    sharedBadge: dynamicColor('#DFE9FF', '#2C3D63'),
    sharedBadgeText: dynamicColor('#315AA8', '#B5C9FF'),
    text: dynamicColor('#122033', '#F2F2F7'),
    textMuted: dynamicColor('#5F6B7A', '#AEAEB2'),
    primary: dynamicColor('#0A66D9', '#0A84FF'),
    primaryGlassTint: dynamicColor(
      'rgba(10, 102, 217, 0.20)',
      'rgba(10, 132, 255, 0.24)',
    ),
    primaryContainer: dynamicColor('#DCEBFF', '#12345D'),
    onPrimary: dynamicColor('#FFFFFF', '#FFFFFF'),
    onPrimaryContainer: dynamicColor('#083B78', '#D6E8FF'),
    success: dynamicColor('#187A55', '#30D158'),
    destructive: dynamicColor('#C9362B', '#FF453A'),
    border: dynamicColor('rgba(18, 32, 51, 0.12)', 'rgba(255, 255, 255, 0.16)'),
    glassBorder: dynamicColor(
      'rgba(255, 255, 255, 0.58)',
      'rgba(255, 255, 255, 0.18)',
    ),
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
      shadowColor: dynamicColor('#203758', '#000000'),
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    action: {
      shadowColor: dynamicColor('#0A66D9', '#000000'),
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
    },
  },
} as const;

export type MobileTheme = typeof mobileTheme;
