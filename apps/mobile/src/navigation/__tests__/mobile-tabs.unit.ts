import { MOBILE_TABS } from '../mobile-tabs';

describe('MOBILE_TABS', () => {
  it('preserves the three existing routes and their order', () => {
    expect(MOBILE_TABS.map((tab) => tab.name)).toEqual([
      'history',
      'index',
      'settings',
    ]);
    expect(new Set(MOBILE_TABS.map((tab) => tab.name)).size).toBe(3);
  });

  it('provides native icon semantics for both iOS and Android', () => {
    expect(MOBILE_TABS).toEqual([
      expect.objectContaining({
        name: 'history',
        label: 'Groups',
        testID: 'tab-groups',
        sf: expect.objectContaining({ selected: 'person.3.fill' }),
        md: 'groups',
      }),
      expect.objectContaining({
        name: 'index',
        label: 'Expenses',
        testID: 'tab-expenses',
        sf: expect.objectContaining({ selected: 'creditcard.fill' }),
        md: 'payments',
      }),
      expect.objectContaining({
        name: 'settings',
        label: 'Settings',
        testID: 'tab-settings',
        sf: expect.objectContaining({ selected: 'gearshape.fill' }),
        md: 'settings',
      }),
    ]);
  });
});
