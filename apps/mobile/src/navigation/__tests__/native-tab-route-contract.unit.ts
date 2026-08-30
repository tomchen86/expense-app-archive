import { readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { getReactNavigationConfig } from 'expo-router/build/getReactNavigationConfig';
import { getRoutes } from 'expo-router/build/getRoutes';

const appRoot = resolve(__dirname, '../../../app');

const collectRouteFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectRouteFiles(absolutePath);
    }
    if (!/\.[jt]sx?$/.test(entry.name)) {
      return [];
    }
    return [`./${relative(appRoot, absolutePath).split(sep).join('/')}`];
  });

describe('native tab route contract', () => {
  it('preserves tab identities and public URLs while nesting a Stack per tab', () => {
    const routeFiles = collectRouteFiles(appRoot);
    const contextModule = Object.assign(() => ({ default: () => null }), {
      id: 'native-tab-route-contract',
      keys: () => routeFiles,
      resolve: (key: string) => key,
    });
    const routeTree = getRoutes(contextModule, {
      ignoreEntryPoints: true,
      skipGenerated: true,
    });
    expect(routeTree).not.toBeNull();

    const tabs = routeTree?.children.find((route) => route.route === '(tabs)');
    expect(tabs).toBeDefined();

    const expectedTabs = [
      { name: 'index', path: '' },
      { name: 'history', path: 'history' },
      { name: 'settings', path: 'settings' },
    ];

    for (const expected of expectedTabs) {
      const tab = tabs?.children.find((route) => route.route === expected.name);
      expect(tab?.contextKey).toBe(`./(tabs)/${expected.name}/_layout.tsx`);
      expect(tab?.children).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            contextKey: `./(tabs)/${expected.name}/index.tsx`,
            route: 'index',
          }),
        ]),
      );
    }
    const settingsTab = tabs?.children.find(
      (route) => route.route === 'settings',
    );
    expect(settingsTab?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contextKey: './(tabs)/settings/archived-groups.tsx',
          route: 'archived-groups',
        }),
      ]),
    );

    const linkingConfig = getReactNavigationConfig(routeTree, true);
    const tabScreens = linkingConfig.screens['(tabs)'];
    expect(typeof tabScreens).toBe('object');
    if (typeof tabScreens !== 'object') {
      throw new Error('Expected the tabs layout to contain nested screens');
    }

    for (const expected of expectedTabs) {
      const tabScreen = tabScreens.screens[expected.name];
      expect(tabScreen).toEqual(
        expect.objectContaining({
          path: expected.path,
          screens: expect.objectContaining({ index: '' }),
        }),
      );
    }
    const settingsScreen = tabScreens.screens.settings;
    expect(typeof settingsScreen).toBe('object');
    if (typeof settingsScreen !== 'object') {
      throw new Error('Expected Settings to contain nested screens');
    }
    expect(settingsScreen.screens).toEqual(
      expect.objectContaining({
        'archived-groups': 'archived-groups',
      }),
    );
  });
});
