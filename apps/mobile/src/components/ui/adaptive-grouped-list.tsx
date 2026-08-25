import React from 'react';
import { StyleSheet, View } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';
import type {
  AdaptiveGroupedScreenProps,
  AdaptiveGroupedSectionProps,
} from './adaptive-grouped-list.types';

export type {
  AdaptiveGroupedScreenProps,
  AdaptiveGroupedSectionProps,
} from './adaptive-grouped-list.types';

export const AdaptiveGroupedScreen = ({
  style,
  ...props
}: AdaptiveGroupedScreenProps) => (
  <View {...props} style={[styles.screen, style]} />
);

export const AdaptiveGroupedSection = ({
  style,
  ...props
}: AdaptiveGroupedSectionProps) => (
  <View {...props} style={[styles.section, style]} />
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: semanticColors.background,
  },
  section: {
    overflow: 'hidden',
    backgroundColor: semanticColors.surface,
    borderColor: semanticColors.separator,
    borderRadius: mobileTheme.radii.control,
    borderWidth: 1,
  },
});
