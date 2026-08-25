import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import DatePickerModal from '../insights/DatePickerModal';
import type { InsightPeriod } from '../../hooks/useInsightsData';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };
  return {
    ScrollView: host('ScrollView'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
      hairlineWidth: 1,
    },
    Text: host('Text'),
    TouchableOpacity: host('TouchableOpacity'),
    View: host('View'),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Ionicons: (props: Record<string, unknown>) =>
      React.createElement('Ionicons', props),
  };
});

jest.mock('../ui/adaptive-popover', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptivePopover: ({ children, ...props }: any) =>
      React.createElement(
        'View',
        { ...props, testID: 'period-selection-popover' },
        children,
      ),
  };
});

jest.mock('../ui/adaptive-grouped-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptiveGroupedSection: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

const periods: InsightPeriod[] = [
  { key: 'month:2025-11', label: 'December 2025', month: 11, year: 2025 },
  { key: 'month:2026-4', label: 'May 2026', month: 4, year: 2026 },
  { key: 'month:2026-7', label: 'August 2026', month: 7, year: 2026 },
];

describe('Insights period picker', () => {
  it('shows only populated months in the browsed year and modern data-only year choices', () => {
    const onClose = jest.fn();
    const onSelectPeriod = jest.fn();
    const screen = render(
      <DatePickerModal
        aggregation='month'
        availablePeriods={periods}
        onClose={onClose}
        onSelectPeriod={onSelectPeriod}
        selectedMonth={7}
        selectedYear={2026}
        visible
      />,
    );

    const popover = screen.getByTestId('period-selection-popover');
    expect(popover).toHaveProp('title', 'Select Month');
    expect(popover).toHaveProp('visible', true);
    expect(screen.getByText('May')).toBeTruthy();
    expect(screen.getByText('August')).toBeTruthy();
    expect(screen.queryByText('December')).toBeNull();
    expect(screen.getByLabelText('Year 2026')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );

    fireEvent.press(screen.getByLabelText('Year 2025'));

    expect(screen.getByText('December')).toBeTruthy();
    expect(screen.queryByText('May')).toBeNull();
    expect(screen.queryByText('August')).toBeNull();
    fireEvent.press(screen.getByLabelText('December 2025'));
    expect(onSelectPeriod).toHaveBeenCalledWith(periods[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not open a redundant picker when only one period exists', () => {
    const screen = render(
      <DatePickerModal
        aggregation='month'
        availablePeriods={[periods[2]]}
        onClose={jest.fn()}
        onSelectPeriod={jest.fn()}
        selectedMonth={7}
        selectedYear={2026}
        visible
      />,
    );

    expect(screen.getByTestId('period-selection-popover')).toHaveProp(
      'visible',
      false,
    );
  });
});
