import React from 'react';
import { render } from '@testing-library/react-native';

import DatePickerModal from '../insights/DatePickerModal';
import type { InsightPeriod } from '../../hooks/useInsightsData';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };
  return {
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    View: host('View'),
  };
});

jest.mock('../SelectionModal', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return (props: Record<string, unknown>) =>
    React.createElement('View', {
      ...props,
      testID: 'period-selection-sheet',
    });
});

const periods: InsightPeriod[] = [
  { key: 'month:2026-4', label: 'May 2026', month: 4, year: 2026 },
  { key: 'month:2026-7', label: 'August 2026', month: 7, year: 2026 },
];

describe('Insights period picker', () => {
  it('uses one adaptive selection sheet containing only data periods', () => {
    const onSelectPeriod = jest.fn();
    const screen = render(
      <DatePickerModal
        aggregation='month'
        availablePeriods={periods}
        onClose={jest.fn()}
        onSelectPeriod={onSelectPeriod}
        selectedMonth={7}
        selectedYear={2026}
        visible
      />,
    );

    const sheet = screen.getByTestId('period-selection-sheet');
    expect(sheet).toHaveProp('title', 'Select Month');
    expect(
      sheet.props.data.map((period: InsightPeriod) => period.label),
    ).toEqual(['August 2026', 'May 2026']);
    expect(sheet.props.isSelected(periods[1])).toBe(true);
    sheet.props.onSelect(periods[0]);
    expect(onSelectPeriod).toHaveBeenCalledWith(periods[0]);
  });

  it('does not open a redundant picker when only one period exists', () => {
    const screen = render(
      <DatePickerModal
        aggregation='month'
        availablePeriods={[periods[1]]}
        onClose={jest.fn()}
        onSelectPeriod={jest.fn()}
        selectedMonth={7}
        selectedYear={2026}
        visible
      />,
    );

    expect(screen.getByTestId('period-selection-sheet')).toHaveProp(
      'visible',
      false,
    );
  });
});
