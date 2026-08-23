import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const mobileRoot = resolve(__dirname, '../../..');

const collectFiles = (directory: string, matcher: RegExp): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectFiles(path, matcher);
    }
    return matcher.test(entry.name) ? [path] : [];
  });

const readFiles = (paths: string[]): string =>
  paths.map((path) => readFileSync(path, 'utf8')).join('\n');

describe('Detox selector contract', () => {
  it('only uses literal test IDs exposed by the production UI', () => {
    const e2eSource = readFiles(
      collectFiles(join(mobileRoot, 'e2e'), /\.(?:e2e\.)?(?:test\.)?js$/),
    );
    const productionSource = readFiles([
      ...collectFiles(join(mobileRoot, 'app'), /\.tsx?$/),
      ...collectFiles(join(mobileRoot, 'src'), /\.tsx?$/),
    ]);

    const usedIds = [...e2eSource.matchAll(/by\.id\(['"]([^'"]+)['"]\)/g)].map(
      (match) => match[1],
    );
    const exposedIds = new Set(
      [
        ...productionSource.matchAll(
          /(?:testID|inputTestID|submitButtonTestID)(?:=|:)\s*['"]([^'"]+)['"]/g,
        ),
      ].map((match) => match[1]),
    );

    expect([...new Set(usedIds)].filter((id) => !exposedIds.has(id))).toEqual(
      [],
    );
  });

  it('resets persisted state instead of treating a React reload as isolation', () => {
    const e2eSource = readFiles(
      collectFiles(join(mobileRoot, 'e2e'), /\.(?:e2e\.)?(?:test\.)?js$/),
    );

    expect(e2eSource).not.toContain('reloadReactNative');
    expect(e2eSource).toContain('resetAppState: true');
  });

  it('does not assert settings or analytics features the UI does not expose', () => {
    const e2eSource = readFiles(
      collectFiles(join(mobileRoot, 'e2e'), /\.(?:e2e\.)?(?:test\.)?js$/),
    );

    expect(e2eSource).not.toMatch(
      /display-name-input|Currency: (?:USD|EUR)|Theme: (?:Light|Dark)|pie-chart/,
    );
  });
});
