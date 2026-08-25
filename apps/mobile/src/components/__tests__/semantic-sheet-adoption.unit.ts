import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentRoot = resolve(__dirname, '..');

const activeSheetSources = [
  'SelectionModal.tsx',
  'TextInputModal.tsx',
  'GroupBalancesOverlay.tsx',
  'groups/GroupMembersModal.tsx',
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
