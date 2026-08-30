import { DynamicColorIOS, PlatformColor } from 'react-native';

const dynamicColor = (light: string, dark: string) =>
  DynamicColorIOS({ light, dark });

export const iosPrimaryGlassTint = {
  light: 'rgba(0, 122, 255, 0.10)',
  dark: 'rgba(10, 132, 255, 0.12)',
} as const;

export const iosGroupedGlassTint = {
  light: 'rgba(255, 255, 255, 0.44)',
  dark: 'rgba(44, 44, 46, 0.64)',
} as const;

export const iosSelectionGlassTint = {
  light: 'rgba(120, 120, 128, 0.18)',
  dark: 'rgba(255, 255, 255, 0.10)',
} as const;

export const mobileTheme = {
  colors: {
    background: PlatformColor('systemGroupedBackgroundColor'),
    surface: PlatformColor('secondarySystemGroupedBackgroundColor'),
    surfaceElevated: PlatformColor('tertiarySystemGroupedBackgroundColor'),
    surfaceVariant: PlatformColor('secondarySystemFillColor'),
    sharedSurface: dynamicColor('#F2F7FF', '#1A2839'),
    sharedBorder: dynamicColor(
      'rgba(0, 122, 255, 0.18)',
      'rgba(10, 132, 255, 0.26)',
    ),
    sharedBadge: dynamicColor(
      'rgba(0, 122, 255, 0.08)',
      'rgba(10, 132, 255, 0.14)',
    ),
    sharedBadgeText: PlatformColor('systemBlueColor'),
    text: PlatformColor('labelColor'),
    textMuted: PlatformColor('secondaryLabelColor'),
    primary: PlatformColor('systemBlueColor'),
    primaryGlassTint: dynamicColor(
      iosPrimaryGlassTint.light,
      iosPrimaryGlassTint.dark,
    ),
    primaryContainer: dynamicColor(
      'rgba(0, 122, 255, 0.14)',
      'rgba(10, 132, 255, 0.20)',
    ),
    onPrimary: PlatformColor('lightTextColor'),
    onPrimaryContainer: PlatformColor('systemBlueColor'),
    success: PlatformColor('systemGreenColor'),
    destructive: PlatformColor('systemRedColor'),
    border: PlatformColor('separatorColor'),
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
      shadowColor: dynamicColor('#000000', '#000000'),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 2,
    },
    action: {
      shadowColor: dynamicColor('#000000', '#000000'),
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
    },
  },
} as const;

export type MobileTheme = typeof mobileTheme;
