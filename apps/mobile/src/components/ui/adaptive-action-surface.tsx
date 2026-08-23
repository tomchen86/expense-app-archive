import React from 'react';
import { StyleSheet, View } from 'react-native';

import { mobileTheme } from '../../theme/tokens';
import type { AdaptiveActionSurfaceProps } from './adaptive-action-surface.types';

export type { AdaptiveActionSurfaceProps } from './adaptive-action-surface.types';

export const AdaptiveActionSurface = ({
  children,
  interactive,
  style,
  tone = 'neutral',
  ...viewProps
}: AdaptiveActionSurfaceProps) => (
  <View
    {...viewProps}
    style={[
      styles.base,
      tone === 'primary' ? styles.primary : styles.neutral,
      interactive && styles.interactive,
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
    boxShadow: '0 8px 22px rgba(32, 55, 88, 0.18)',
  },
  primary: {
    backgroundColor: mobileTheme.colors.primaryContainer,
    borderColor: 'transparent',
  },
  neutral: {
    backgroundColor: mobileTheme.colors.surfaceElevated,
    borderColor: mobileTheme.colors.border,
  },
  interactive: mobileTheme.shadows.action,
});
