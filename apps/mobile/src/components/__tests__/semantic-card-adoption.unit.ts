import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mobileRoot = resolve(__dirname, '../../..');
const repositoryRoot = resolve(mobileRoot, '../..');

const standaloneCardSources = [
  'app/expense-detail.tsx',
  'app/group-detail.tsx',
  'src/components/ExpenseListItem.tsx',
  'src/components/GroupListItem.tsx',
  'src/components/insights/CategoryChart.tsx',
  'src/components/insights/InsightsHeader.tsx',
  'src/components/insights/InsightsSummary.tsx',
  'src/screens/expenses-screen.tsx',
];

describe('standalone card surface adoption', () => {
  it.each(standaloneCardSources)(
    '%s delegates card material to the adaptive card adapter',
    (path) => {
      const source = readFileSync(resolve(mobileRoot, path), 'utf8');

      expect(source).toContain('adaptive-card-surface');
    },
  );

  it('uses system material for iOS content cards instead of the Liquid Glass action adapter', () => {
    const source = readFileSync(
      resolve(mobileRoot, 'src/components/ui/adaptive-card-surface.ios.tsx'),
      'utf8',
    );

    expect(source).toContain("from 'expo-blur'");
    expect(source).toContain("tint='systemMaterial'");
    expect(source).toContain('styles.materialFrame');
    expect(source).toContain('styles.materialClip');
    expect(source).toContain('StyleSheet.hairlineWidth');
    expect(source).toContain('mobileTheme.shadows.card');
    expect(source).toContain('useReduceTransparencyPreference');
    expect(source).not.toContain('AccessibilityInfo');
    expect(source).not.toContain('adaptive-action-surface');
    expect(source).not.toContain('GlassView');
  });

  it('uses the content-card adapter for custom iOS grouped sections', () => {
    const source = readFileSync(
      resolve(mobileRoot, 'src/components/ui/adaptive-grouped-list.ios.tsx'),
      'utf8',
    );

    expect(source).toContain('adaptive-card-surface');
    expect(source).toContain("variant='section'");
    expect(source).not.toContain("overflow: 'hidden'");
    expect(source).not.toContain('adaptive-action-surface');
  });

  it('shares the app-level transparency preference across Cards and controls', () => {
    const actionSource = readFileSync(
      resolve(mobileRoot, 'src/components/ui/adaptive-action-surface.ios.tsx'),
      'utf8',
    );
    const rootLayoutSource = readFileSync(
      resolve(mobileRoot, 'app/_layout.tsx'),
      'utf8',
    );

    expect(actionSource).toContain('useReduceTransparencyPreference');
    expect(actionSource).not.toContain('AccessibilityInfo');
    expect(rootLayoutSource).toContain('TransparencyPreferenceProvider');
    expect(rootLayoutSource).toContain('useResolvedTransparencyPreference');
  });

  it('keeps the content, sheet, and control material boundaries documented', () => {
    const reference = readFileSync(
      resolve(repositoryRoot, 'docs/design/mobile-surface-material-system.md'),
      'utf8',
    );

    expect(reference).toContain('Layer 3  Navigation and controls');
    expect(reference).toContain('Layer 1  Content cards and grouped sections');
    expect(reference).toContain('AdaptiveCardSurface');
    expect(reference).toContain('AdaptiveSheetSection');
    expect(reference).toContain('AdaptiveActionSurface');
    expect(reference).toContain('outer frame');
    expect(reference).toMatch(/system\s+separator hairline/);
  });
});
