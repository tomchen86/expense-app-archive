jest.mock('react-native', () => ({
  DynamicColorIOS: jest.fn((colors: { dark: string; light: string }) => colors),
  PlatformColor: jest.fn((name: string) => `platform:${name}`),
}));

import { PlatformColor } from 'react-native';
import appConfig from '../../../app.json';
import { mobileTheme } from '../tokens.ios';

describe('iOS dynamic theme adapter', () => {
  it('uses native semantic roles for iOS canvas, content, and chrome', () => {
    expect(mobileTheme.colors.background).toBe(
      'platform:systemGroupedBackgroundColor',
    );
    expect(mobileTheme.colors.surface).toBe(
      'platform:secondarySystemGroupedBackgroundColor',
    );
    expect(mobileTheme.colors.surfaceElevated).toBe(
      'platform:tertiarySystemGroupedBackgroundColor',
    );
    expect(mobileTheme.colors.surfaceVariant).toBe(
      'platform:secondarySystemFillColor',
    );
    expect(mobileTheme.colors.text).toBe('platform:labelColor');
    expect(mobileTheme.colors.textMuted).toBe('platform:secondaryLabelColor');
    expect(mobileTheme.colors.destructive).toBe('platform:systemRedColor');
    expect(mobileTheme.colors.success).toBe('platform:systemGreenColor');
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
        shadowColor: { light: '#000000', dark: '#000000' },
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      }),
    );
    expect(mobileTheme.shadows.card).not.toHaveProperty('boxShadow');
  });

  it('allows native screens and controls to follow the selected appearance', () => {
    expect(appConfig.expo.userInterfaceStyle).toBe('automatic');
  });
});
