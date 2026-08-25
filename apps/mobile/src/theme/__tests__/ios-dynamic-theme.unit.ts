jest.mock('react-native', () => ({
  DynamicColorIOS: jest.fn((colors: { dark: string; light: string }) => colors),
}));

import { DynamicColorIOS } from 'react-native';
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
