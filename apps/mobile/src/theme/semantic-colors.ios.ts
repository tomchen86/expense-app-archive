import { PlatformColor } from 'react-native';

import type { SemanticColors } from './semantic-colors.types';

export const semanticColors: SemanticColors = {
  background: PlatformColor('systemGroupedBackgroundColor'),
  surface: PlatformColor('secondarySystemGroupedBackgroundColor'),
  surfaceElevated: PlatformColor('tertiarySystemGroupedBackgroundColor'),
  groupedRow: 'transparent',
  sheetBackground: 'transparent',
  fill: PlatformColor('secondarySystemFillColor'),
  text: PlatformColor('labelColor'),
  textMuted: PlatformColor('secondaryLabelColor'),
  placeholder: PlatformColor('placeholderTextColor'),
  separator: PlatformColor('separatorColor'),
  primary: PlatformColor('systemBlueColor'),
  destructive: PlatformColor('systemRedColor'),
  success: PlatformColor('systemGreenColor'),
  onAccent: PlatformColor('lightTextColor'),
  dimOverlay: 'rgba(0, 0, 0, 0.32)',
};
