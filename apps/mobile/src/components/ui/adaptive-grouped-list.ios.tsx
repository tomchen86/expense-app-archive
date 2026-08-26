import React from 'react';
import { StyleSheet, View } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import type {
  AdaptiveGroupedScreenProps,
  AdaptiveGroupedSectionProps,
} from './adaptive-grouped-list.types';
import { AdaptiveCardSurface } from './adaptive-card-surface.ios';

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
  children,
  style,
  ...props
}: AdaptiveGroupedSectionProps) => (
  <AdaptiveCardSurface {...props} style={style} variant='section'>
    {children}
  </AdaptiveCardSurface>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: semanticColors.background,
  },
});
