import React from 'react';
import { StyleSheet, View } from 'react-native';

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
    borderCurve: 'continuous',
    borderRadius: mobileTheme.radii.control,
    overflow: 'hidden',
  },
});
