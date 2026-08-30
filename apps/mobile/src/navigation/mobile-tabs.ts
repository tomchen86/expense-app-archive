export const MOBILE_TABS = [
  {
    name: 'history',
    label: 'Groups',
    testID: 'tab-groups',
    sf: { default: 'person.3', selected: 'person.3.fill' },
    md: 'groups',
  },
  {
    name: 'index',
    label: 'Expenses',
    testID: 'tab-expenses',
    sf: { default: 'creditcard', selected: 'creditcard.fill' },
    md: 'payments',
  },
  {
    name: 'settings',
    label: 'Settings',
    testID: 'tab-settings',
    sf: { default: 'gearshape', selected: 'gearshape.fill' },
    md: 'settings',
  },
] as const;
