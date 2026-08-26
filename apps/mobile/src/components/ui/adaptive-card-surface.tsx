import React from 'react';
import { StyleSheet, View } from 'react-native';

import { mobileTheme } from '../../theme/tokens';
import type { AdaptiveCardSurfaceProps } from './adaptive-card-surface.types';

export type { AdaptiveCardSurfaceProps } from './adaptive-card-surface.types';

export const AdaptiveCardSurface = ({
  children,
  interactive = false,
  style,
  tone = 'neutral',
  variant = 'card',
  ...viewProps
}: AdaptiveCardSurfaceProps) => (
  <View
    {...viewProps}
    style={[
      styles.card,
      tone === 'shared'
        ? styles.shared
        : tone === 'muted'
          ? styles.muted
          : styles.neutral,
      variant === 'section' ? styles.sectionRadius : styles.cardRadius,
      interactive && styles.interactive,
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardRadius: {
    borderRadius: mobileTheme.radii.card,
  },
  sectionRadius: {
    borderRadius: mobileTheme.radii.control,
  },
  neutral: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
  },
  shared: {
    backgroundColor: mobileTheme.colors.sharedSurface,
    borderColor: mobileTheme.colors.sharedBorder,
  },
  muted: {
    backgroundColor: mobileTheme.colors.surfaceVariant,
    borderColor: mobileTheme.colors.border,
  },
  interactive: mobileTheme.shadows.card,
});
