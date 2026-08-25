import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentRoot = resolve(__dirname, '..');

describe('iOS expense form semantic adapter contract', () => {
  it.each(['ExpenseForm/BasicInfoSection.tsx', 'ExpenseForm/GroupSection.tsx'])(
    '%s delegates grouped surfaces to the shared adapter',
    (path) => {
      const source = readFileSync(resolve(componentRoot, path), 'utf8');

      expect(source).toContain('ui/adaptive-grouped-list');
      expect(source).toContain('semantic-colors');
    },
  );

  it.each([
    'DatePicker.tsx',
    'ExpenseForm/ExpenseModals.tsx',
    'FormInput.tsx',
    'SelectInput.tsx',
    'ParticipantTag.tsx',
  ])('%s uses semantic colors instead of private web colors', (path) => {
    const source = readFileSync(resolve(componentRoot, path), 'utf8');

    expect(source).toContain('semantic-colors');
    expect(source).not.toMatch(
      /#333\b|#ccc\b|#fff\b|#000\b|#999\b|#e3f2fd\b|#1976d2\b/i,
    );
  });
});
