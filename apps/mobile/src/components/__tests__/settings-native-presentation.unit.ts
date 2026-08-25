import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Settings native presentation contract', () => {
  it('uses grouped semantic surfaces and a native navigation action', () => {
    const source = readFileSync(
      resolve(__dirname, '../../screens/settings-screen.tsx'),
      'utf8',
    );

    expect(source).toContain('ui/adaptive-grouped-list');
    expect(source).toContain('semantic-colors');
    expect(source).toContain('<Stack.Toolbar');
    expect(source).not.toMatch(/styles\.(?:card|saveButton)\b/);
  });

  it('does not use the deprecated danger alias in active screens', () => {
    const groupDetailSource = readFileSync(
      resolve(__dirname, '../../../app/group-detail.tsx'),
      'utf8',
    );

    expect(groupDetailSource).not.toContain('mobileTheme.colors.danger');

    const tokenSource = readFileSync(
      resolve(__dirname, '../../theme/tokens.ts'),
      'utf8',
    );
    expect(tokenSource).not.toMatch(/\bdanger\s*:/);
  });
});
