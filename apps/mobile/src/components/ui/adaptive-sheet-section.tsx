import React from 'react';
import { StyleSheet, View } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';
import type { AdaptiveSheetSectionProps } from './adaptive-sheet-section.types';

export type { AdaptiveSheetSectionProps } from './adaptive-sheet-section.types';

export const AdaptiveSheetSection = ({
  style,
  ...props
}: AdaptiveSheetSectionProps) => (
  <View {...props} style={[styles.section, style]} />
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: semanticColors.surface,
    borderColor: semanticColors.separator,
    borderRadius: mobileTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
