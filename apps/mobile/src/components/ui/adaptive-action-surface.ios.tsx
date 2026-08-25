import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';

import { resolvePlatformMaterial } from '../../theme/platform-material';
import {
  iosGroupedGlassTint,
  iosPrimaryGlassTint,
  iosSelectionGlassTint,
  mobileTheme,
} from '../../theme/tokens.ios';
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
  const colorScheme = useColorScheme();
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
  const appearance = colorScheme === 'dark' ? 'dark' : 'light';
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
        style={[styles.base, style]}
        tintColor={
          tone === 'primary'
            ? iosPrimaryGlassTint[appearance]
            : tone === 'grouped'
              ? iosGroupedGlassTint[appearance]
              : tone === 'selection'
                ? iosSelectionGlassTint[appearance]
                : undefined
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
        tone === 'primary'
          ? styles.primary
          : tone === 'grouped'
            ? styles.grouped
            : tone === 'selection'
              ? styles.selection
              : styles.neutral,
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
  },
  primary: {
    backgroundColor: mobileTheme.colors.surfaceElevated,
    borderColor: mobileTheme.colors.glassBorder,
    borderWidth: 1,
  },
  neutral: {
    backgroundColor: mobileTheme.colors.surfaceElevated,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
  },
  grouped: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
  },
  selection: {
    backgroundColor: mobileTheme.colors.surfaceVariant,
  },
  interactive: mobileTheme.shadows.action,
});
