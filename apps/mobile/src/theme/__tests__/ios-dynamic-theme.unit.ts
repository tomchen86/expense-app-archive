jest.mock('react-native', () => ({
  DynamicColorIOS: jest.fn((colors: { dark: string; light: string }) => colors),
  PlatformColor: jest.fn((name: string) => `platform:${name}`),
}));

import { DynamicColorIOS, PlatformColor } from 'react-native';
import appConfig from '../../../app.json';
import { mobileTheme } from '../tokens.ios';

describe('iOS dynamic theme adapter', () => {
  it('provides native light and dark variants for shared mobile tokens', () => {
    expect(DynamicColorIOS).toHaveBeenCalledWith({
      light: '#F3F6FA',
      dark: '#000000',
    });
    expect(mobileTheme.colors.background).toEqual({
      light: '#F3F6FA',
      dark: '#000000',
    });
    expect(mobileTheme.colors.destructive).toEqual({
      light: '#C9362B',
      dark: '#FF453A',
    });
    expect(PlatformColor).toHaveBeenCalledWith('systemBlueColor');
    expect(mobileTheme.colors.primary).toBe('platform:systemBlueColor');
    expect(mobileTheme.colors.sharedBadgeText).toBe('platform:systemBlueColor');
    expect(mobileTheme.colors.sharedSurface).toEqual({
      light: '#F2F7FF',
      dark: '#1A2839',
    });
    expect(mobileTheme.colors.sharedBorder).toEqual({
      light: 'rgba(0, 122, 255, 0.18)',
      dark: 'rgba(10, 132, 255, 0.26)',
    });
    expect(mobileTheme.colors.primaryGlassTint).toEqual({
      light: 'rgba(0, 122, 255, 0.10)',
      dark: 'rgba(10, 132, 255, 0.12)',
    });
    expect(mobileTheme.shadows.card).toEqual(
      expect.objectContaining({
        shadowColor: { light: '#203758', dark: '#000000' },
        shadowOpacity: 0.1,
      }),
    );
    expect(mobileTheme.shadows.card).not.toHaveProperty('boxShadow');
  });

  it('allows native screens and controls to follow the selected appearance', () => {
    expect(appConfig.expo.userInterfaceStyle).toBe('automatic');
  });
});
