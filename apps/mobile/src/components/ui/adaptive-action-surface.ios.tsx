import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { resolvePlatformMaterial } from '../../theme/platform-material';
import { mobileTheme } from '../../theme/tokens';
import type { AdaptiveActionSurfaceProps } from './adaptive-action-surface.types';

export type { AdaptiveActionSurfaceProps } from './adaptive-action-surface.types';

const getGlassCapabilities = () => {
  try {
    const glassApiAvailable = isGlassEffectAPIAvailable();
    return {
      glassApiAvailable,
      liquidGlassAvailable: glassApiAvailable && isLiquidGlassAvailable(),
    };
  } catch {
    return { glassApiAvailable: false, liquidGlassAvailable: false };
  }
};

export const AdaptiveActionSurface = ({
  children,
  interactive = false,
  style,
  tone = 'neutral',
  ...viewProps
}: AdaptiveActionSurfaceProps) => {
  const [reduceTransparency, setReduceTransparency] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((isEnabled) => {
        if (isMounted) {
          setReduceTransparency(isEnabled);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReduceTransparency(true);
        }
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const capabilities = getGlassCapabilities();
  const useLiquidGlass =
    resolvePlatformMaterial({
      platform: 'ios',
      ...capabilities,
      reduceTransparency: reduceTransparency ?? true,
    }) === 'liquid-glass';

  if (useLiquidGlass) {
    return (
      <GlassView
        {...viewProps}
        colorScheme='auto'
        glassEffectStyle='regular'
        isInteractive={interactive}
        style={[styles.base, styles.glass, style]}
        tintColor={
          tone === 'primary' ? mobileTheme.colors.primaryGlassTint : undefined
        }
      >
        {children}
      </GlassView>
    );
  }

  return (
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
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  glass: {
    borderColor: mobileTheme.colors.glassBorder,
  },
  primary: {
    backgroundColor: mobileTheme.colors.primaryContainer,
    borderColor: 'transparent',
  },
  neutral: {
    backgroundColor: mobileTheme.colors.surfaceElevated,
    borderColor: mobileTheme.colors.border,
  },
  interactive: {
    boxShadow: '0 8px 22px rgba(32, 55, 88, 0.18)',
  },
});
