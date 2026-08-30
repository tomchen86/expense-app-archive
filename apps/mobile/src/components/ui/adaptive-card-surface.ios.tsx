import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import { mobileTheme } from '../../theme/tokens';
import type { AdaptiveCardSurfaceProps } from './adaptive-card-surface.types';
import { useReduceTransparencyPreference } from './transparency-preference.ios';

export type { AdaptiveCardSurfaceProps } from './adaptive-card-surface.types';

export const AdaptiveCardSurface = ({
  children,
  interactive: _interactive = false,
  style,
  tone = 'neutral',
  variant = 'card',
  ...viewProps
}: AdaptiveCardSurfaceProps) => {
  const reduceTransparency = useReduceTransparencyPreference();

  const overlay =
    tone === 'shared'
      ? styles.sharedOverlay
      : tone === 'muted'
        ? styles.mutedOverlay
        : null;
  const materialTestID = viewProps.testID
    ? `${viewProps.testID}-material`
    : undefined;
  const radiusStyle =
    variant === 'section' ? styles.sectionRadius : styles.cardRadius;

  return (
    <View
      {...viewProps}
      style={[
        styles.materialFrame,
        radiusStyle,
        variant === 'card' ? styles.cardShadow : null,
        style,
      ]}
    >
      <View
        pointerEvents='none'
        style={[
          styles.materialClip,
          radiusStyle,
          reduceTransparency ? styles.fallback : null,
        ]}
        testID={materialTestID}
      >
        {reduceTransparency ? null : (
          <BlurView
            intensity={100}
            style={StyleSheet.absoluteFill}
            tint='systemMaterial'
          />
        )}
        {overlay ? <View style={[StyleSheet.absoluteFill, overlay]} /> : null}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  materialFrame: {
    borderCurve: 'continuous',
    borderColor: semanticColors.separator,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardShadow: {
    ...mobileTheme.shadows.card,
  },
  materialClip: {
    borderCurve: 'continuous',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  cardRadius: {
    borderRadius: mobileTheme.radii.card,
  },
  sectionRadius: {
    borderRadius: mobileTheme.radii.control,
  },
  fallback: {
    backgroundColor: semanticColors.surface,
  },
  sharedOverlay: {
    backgroundColor: semanticColors.primary,
    opacity: 0.06,
  },
  mutedOverlay: {
    backgroundColor: semanticColors.fill,
  },
});
