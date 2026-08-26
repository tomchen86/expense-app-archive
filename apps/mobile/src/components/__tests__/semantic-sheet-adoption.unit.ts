import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentRoot = resolve(__dirname, '..');
const mobileRoot = resolve(componentRoot, '../..');

const activeSheetSources = [
  'SelectionModal.tsx',
  'TextInputModal.tsx',
  'GroupBalancesOverlay.tsx',
  'groups/GroupMembersModal.tsx',
  'categories/CategoryForm.tsx',
];

describe('active modal semantic adapter contract', () => {
  it.each(activeSheetSources)(
    '%s delegates presentation to AdaptiveSheet',
    (path) => {
      const source = readFileSync(resolve(componentRoot, path), 'utf8');

      expect(source).toContain('ui/adaptive-sheet');
      expect(source).not.toMatch(/<Modal\b/);
    },
  );

  it.each([...activeSheetSources, 'insights/DatePickerModal.ios.tsx'])(
    '%s uses transparent sheet rows instead of nesting another GlassView',
    (path) => {
      const source = readFileSync(resolve(componentRoot, path), 'utf8');

      expect(source).toContain('adaptive-sheet-section');
      expect(source).not.toContain("testID='period-picker-glass-rows'");
    },
  );

  it('keeps the native New Group form sheet on one glass layer', () => {
    const source = readFileSync(
      resolve(mobileRoot, 'app/new-group.tsx'),
      'utf8',
    );

    expect(source).toContain('adaptive-sheet-section');
    expect(source).toContain('semanticColors.sheetBackground');
    expect(source).not.toContain('adaptive-grouped-list');
    expect(source).not.toContain('paddingTop: 72');
  });

  it('lets the native SwiftUI sheet own the Period background material', () => {
    const adapterSource = readFileSync(
      resolve(componentRoot, 'ui/adaptive-sheet.ios.tsx'),
      'utf8',
    );
    const periodSource = readFileSync(
      resolve(componentRoot, 'insights/DatePickerModal.ios.tsx'),
      'utf8',
    );

    expect(adapterSource).toContain('@expo/ui/community/bottom-sheet');
    expect(adapterSource).not.toContain('backgroundStyle=');
    expect(periodSource).toContain("surface='system'");
    expect(periodSource).not.toContain("surface='glass'");
  });

  it('uses explicit native action hierarchy without app-owned sheet shadows', () => {
    const adapterSource = readFileSync(
      resolve(componentRoot, 'ui/adaptive-sheet.ios.tsx'),
      'utf8',
    );
    const contractSource = readFileSync(
      resolve(componentRoot, 'ui/adaptive-sheet.types.ts'),
      'utf8',
    );

    expect(contractSource).toContain("variant: 'plain' | 'prominent'");
    expect(adapterSource).toContain('@expo/ui/swift-ui');
    expect(adapterSource).toContain("buttonStyle('glassProminent')");
    expect(adapterSource).toContain("buttonStyle('glass')");
    expect(adapterSource).not.toContain('AdaptiveActionSurface');
    expect(adapterSource).not.toContain('mobileTheme.shadows.action');
    expect(adapterSource).not.toMatch(
      /shadowColor|shadowOffset|shadowOpacity|shadowRadius|boxShadow|elevation/,
    );
  });

  it('presents the Insights period chooser through AdaptivePopover', () => {
    const source = readFileSync(
      resolve(componentRoot, 'insights/DatePickerModal.tsx'),
      'utf8',
    );

    expect(source).toContain('ui/adaptive-popover');
    expect(source).not.toContain('ui/adaptive-sheet');
    expect(source).not.toMatch(/<Modal\b/);
  });

  it('keeps iOS popover chrome on the Liquid Glass adapter without a redundant Done action', () => {
    const source = readFileSync(
      resolve(componentRoot, 'ui/adaptive-popover.ios.tsx'),
      'utf8',
    );

    expect(source).toContain('./adaptive-action-surface');
    expect(source).not.toMatch(/>\s*Done\s*</);
  });

  it.each(activeSheetSources)(
    '%s does not reintroduce legacy web colors',
    (path) => {
      const source = readFileSync(resolve(componentRoot, path), 'utf8');

      expect(source).not.toMatch(
        /#007bff|#6c757d|#2196F3|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.5\s*\)/i,
      );
    },
  );
});
