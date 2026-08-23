import { resolvePlatformMaterial } from '../platform-material';

describe('resolvePlatformMaterial', () => {
  it('uses native Liquid Glass only when every iOS capability is available', () => {
    expect(
      resolvePlatformMaterial({
        platform: 'ios',
        glassApiAvailable: true,
        liquidGlassAvailable: true,
        reduceTransparency: false,
      }),
    ).toBe('liquid-glass');
  });

  it.each([
    { glassApiAvailable: false, liquidGlassAvailable: true },
    { glassApiAvailable: true, liquidGlassAvailable: false },
  ])(
    'falls back to a solid iOS surface when native glass is unavailable',
    ({ glassApiAvailable, liquidGlassAvailable }) => {
      expect(
        resolvePlatformMaterial({
          platform: 'ios',
          glassApiAvailable,
          liquidGlassAvailable,
          reduceTransparency: false,
        }),
      ).toBe('solid');
    },
  );

  it('honors the iOS Reduce Transparency accessibility setting', () => {
    expect(
      resolvePlatformMaterial({
        platform: 'ios',
        glassApiAvailable: true,
        liquidGlassAvailable: true,
        reduceTransparency: true,
      }),
    ).toBe('solid');
  });

  it('uses a Material surface on Android instead of imitating iOS glass', () => {
    expect(
      resolvePlatformMaterial({
        platform: 'android',
        glassApiAvailable: true,
        liquidGlassAvailable: true,
        reduceTransparency: false,
      }),
    ).toBe('material');
  });
});
