export type PlatformMaterial = 'liquid-glass' | 'material' | 'solid';

interface PlatformMaterialCapabilities {
  platform: string;
  glassApiAvailable: boolean;
  liquidGlassAvailable: boolean;
  reduceTransparency: boolean;
}

export const resolvePlatformMaterial = ({
  platform,
  glassApiAvailable,
  liquidGlassAvailable,
  reduceTransparency,
}: PlatformMaterialCapabilities): PlatformMaterial => {
  if (platform === 'android') {
    return 'material';
  }

  if (
    platform === 'ios' &&
    glassApiAvailable &&
    liquidGlassAvailable &&
    !reduceTransparency
  ) {
    return 'liquid-glass';
  }

  return 'solid';
};
