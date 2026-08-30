import {
  resolveAndroidFloatingActionOffset,
  resolveFallbackFloatingActionOffset,
  resolveIOSFloatingActionOffset,
} from '../ui/floating-action-offset-policy';

describe('floating action offset policy', () => {
  it('adds a visual gap above the iOS native tab-bar inset', () => {
    expect(resolveIOSFloatingActionOffset(83, 16)).toBe(99);
  });

  it('uses a fixed gap on Android because NativeTabs already insets content', () => {
    expect(resolveAndroidFloatingActionOffset(24, 16, true)).toBe(16);
  });

  it('adds the system inset on standalone Android screens', () => {
    expect(resolveAndroidFloatingActionOffset(24, 16, false)).toBe(40);
  });

  it('adds a visual gap above the system inset in the generic fallback', () => {
    expect(resolveFallbackFloatingActionOffset(24, 16)).toBe(40);
  });
});
