export const MOBILE_TABS = [
  {
    name: 'history',
    label: 'Groups',
    sf: { default: 'person.3', selected: 'person.3.fill' },
    md: 'groups',
  },
  {
    name: 'index',
    label: 'Expenses',
    sf: { default: 'creditcard', selected: 'creditcard.fill' },
    md: 'payments',
  },
  {
    name: 'settings',
    label: 'Settings',
    sf: { default: 'gearshape', selected: 'gearshape.fill' },
    md: 'settings',
  },
] as const;
