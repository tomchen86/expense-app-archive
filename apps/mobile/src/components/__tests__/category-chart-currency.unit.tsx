import React from 'react';
import { render } from '@testing-library/react-native';

import CategoryChart from '../insights/CategoryChart';
import type { ChartDataPoint } from '../../utils/calculations/insightCalculations';

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
        currencies: Array.from(
          new Set(data.map((item) => item.currency ?? 'USD')),
        ),
        testID: 'currency-pie',
      }),
  };
});

const point = (
  category: string,
  currency: string,
  absoluteValue: number,
): ChartDataPoint => ({
  absoluteValue,
  category,
  color: currency === 'AUD' ? '#0057B8' : '#A30000',
  currency,
  label: category,
  percentage: 100,
  text: category,
  value: absoluteValue,
});

describe('CategoryChart currency isolation', () => {
  it('renders a separately labelled pie for every currency', () => {
    const screen = render(
      <CategoryChart
        data={[
          point('Food & Dining', 'AUD', 10),
          point('Transportation', 'JPY', 2_000),
        ]}
      />,
    );

    expect(screen.getByText('AUD spending')).toBeTruthy();
    expect(screen.getByText('JPY spending')).toBeTruthy();
    expect(
      screen.getAllByTestId('currency-pie').map((pie) => pie.props.currencies),
    ).toEqual([['AUD'], ['JPY']]);
  });
});
