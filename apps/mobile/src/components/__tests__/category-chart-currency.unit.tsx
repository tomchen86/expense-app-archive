import React from 'react';
import { render } from '@testing-library/react-native';

import CategoryChart from '../insights/CategoryChart';
import type {
  ChartDataPoint,
  CurrencyInsight,
} from '../../utils/calculations/insightCalculations';
import { formatMinorUnits } from '../../utils/money';

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

jest.mock('react-native-gifted-charts', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    PieChart: ({ data }: { data: ChartDataPoint[] }) =>
      React.createElement('PieChart', {
        data,
        testID: 'currency-pie',
      }),
    BarChart: ({
      data,
      horizontal,
    }: {
      data: ChartDataPoint[];
      horizontal?: boolean;
    }) =>
      React.createElement('BarChart', {
        data,
        horizontal,
        testID: 'currency-bar',
      }),
  };
});

const point = (
  category: string,
  currency: string,
  absoluteValue: number,
): ChartDataPoint => ({
  absoluteValue,
  amountMinor: Math.round(absoluteValue * (currency === 'JPY' ? 1 : 100)),
  category,
  categoryId: `category-${category}`,
  color: currency === 'AUD' ? '#0057B8' : '#A30000',
  currency,
  label: category,
  percentage: 100,
  text: category,
  value: absoluteValue,
});

const currencyInsight = (
  currency: string,
  category: ChartDataPoint,
): CurrencyInsight => ({
  chartCategories: [category],
  chartKind: 'donut',
  currency,
  deltaMinor: category.amountMinor,
  deltaPercentage: null,
  exactCategories: [category],
  priorTotalMinor: 0,
  totalMinor: category.amountMinor,
});

describe('CategoryChart currency isolation', () => {
  it('renders a separately labelled pie for every currency', () => {
    const screen = render(
      <CategoryChart
        insights={[
          currencyInsight('AUD', point('Food & Dining', 'AUD', 10)),
          currencyInsight('JPY', point('Transportation', 'JPY', 2_000)),
        ]}
      />,
    );

    expect(screen.getByText('AUD categories')).toBeTruthy();
    expect(screen.getByText('JPY categories')).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Food & Dining, ${formatMinorUnits(1_000, 'AUD')}, 100.0 percent`,
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByTestId('currency-pie', { includeHiddenElements: true }),
    ).toHaveLength(2);
  });
});
