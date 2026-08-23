import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

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
    TouchableOpacity: host('TouchableOpacity'),
    View: host('View'),
  };
});

import CategoryChart from '../insights/CategoryChart';
import InsightsHeader from '../insights/InsightsHeader';
import InsightsSummary from '../insights/InsightsSummary';
import type {
  ChartDataPoint,
  CurrencyInsight,
  InsightChartKind,
} from '../../utils/calculations/insightCalculations';
import { formatMinorUnits } from '../../utils/money';

const point = (
  index: number,
  amountMinor: number,
  currency = 'AUD',
): ChartDataPoint => ({
  absoluteValue: amountMinor / (currency === 'JPY' ? 1 : 100),
  amountMinor,
  category: `Category ${index}`,
  categoryId: `category-${index}`,
  color: `#${`${index}`.repeat(6)}`,
  currency,
  label: `Category ${index}`,
  percentage: 100,
  text: `Category ${index}`,
  value: amountMinor / (currency === 'JPY' ? 1 : 100),
});

const insight = (
  chartKind: InsightChartKind,
  exactCategories: ChartDataPoint[],
  chartCategories = exactCategories,
): CurrencyInsight => ({
  chartCategories,
  chartKind,
  currency: exactCategories[0]?.currency ?? 'AUD',
  deltaMinor: exactCategories.reduce(
    (sum, category) => sum + category.amountMinor,
    0,
  ),
  deltaPercentage: null,
  exactCategories,
  priorTotalMinor: 0,
  totalMinor: exactCategories.reduce(
    (sum, category) => sum + category.amountMinor,
    0,
  ),
});

describe('Insights visualization', () => {
  it('uses a decorative progress visual for one Auto category and keeps the exact row accessible', () => {
    const screen = render(
      <CategoryChart insights={[insight('progress', [point(1, 500)])]} />,
    );

    expect(
      screen.getByTestId('insight-progress-visual', {
        includeHiddenElements: true,
      }).props.accessible,
    ).toBe(false);
    expect(
      screen.getByLabelText(
        `Category 1, ${formatMinorUnits(500, 'AUD')}, 100.0 percent`,
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('insight-category-aud-category-1')).toBeTruthy();
    expect(screen.queryByTestId('pie-chart')).toBeNull();
    expect(screen.queryByTestId('bar-chart')).toBeNull();
  });

  it('generates the stable Detox selector for a localized currency row', () => {
    const foodCategory = {
      ...point(1, 3_330, 'USD'),
      category: 'Food & Dining',
      label: 'Food & Dining',
      text: 'Food & Dining',
    };
    const screen = render(
      <CategoryChart insights={[insight('progress', [foodCategory])]} />,
    );

    expect(screen.getByTestId('insight-category-usd-food-dining')).toBeTruthy();
  });

  it('renders donut and horizontal bar charts as decorative visuals', () => {
    const donut = render(
      <CategoryChart
        insights={[insight('donut', [point(1, 500), point(2, 300)])]}
      />,
    );
    expect(
      donut.getByTestId('pie-chart', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      donut.getByTestId('insight-chart-visual', {
        includeHiddenElements: true,
      }).props.accessible,
    ).toBe(false);
    donut.unmount();

    const bar = render(
      <CategoryChart
        insights={[
          insight(
            'bar',
            [1, 2, 3, 4, 5, 6].map((index) => point(index, 700 - index)),
          ),
        ]}
      />,
    );
    expect(
      bar.getByTestId('bar-chart', { includeHiddenElements: true }).props
        .horizontal,
    ).toBe(true);
    expect(
      bar.getByTestId('insight-chart-visual', {
        includeHiddenElements: true,
      }).props.accessible,
    ).toBe(false);
  });

  it('grows a horizontal bar chart with its category count', () => {
    const sixCategories = render(
      <CategoryChart
        insights={[
          insight(
            'bar',
            [1, 2, 3, 4, 5, 6].map((index) => point(index, 700 - index)),
          ),
        ]}
      />,
    );
    const sixBar = sixCategories.getByTestId('bar-chart', {
      includeHiddenElements: true,
    });
    const sixHeight = sixBar.props.height;
    expect(sixBar.props.barWidth + sixBar.props.spacing).toBe(44);
    sixCategories.unmount();

    const twelveCategories = render(
      <CategoryChart
        insights={[
          insight(
            'bar',
            Array.from({ length: 12 }, (_, index) =>
              point(index + 1, 1_000 - index),
            ),
          ),
        ]}
      />,
    );
    const twelveHeight = twelveCategories.getByTestId('bar-chart', {
      includeHiddenElements: true,
    }).props.height;

    expect(sixHeight).toBeGreaterThanOrEqual(6 * 44);
    expect(twelveHeight).toBeGreaterThanOrEqual(12 * 44);
    expect(twelveHeight).toBeGreaterThan(sixHeight);
  });

  it('keeps the exact accessible list even when a donut groups chart data', () => {
    const exactCategories = [1, 2, 3, 4, 5, 6, 7].map((index) =>
      point(index, (8 - index) * 100),
    );
    exactCategories.forEach((category) => {
      category.percentage =
        (category.amountMinor /
          exactCategories.reduce((sum, item) => sum + item.amountMinor, 0)) *
        100;
    });
    const others: ChartDataPoint = {
      ...point(8, 300),
      category: 'Others',
      categoryId: undefined,
      label: 'Others',
      text: 'Others',
    };
    const screen = render(
      <CategoryChart
        insights={[
          insight('donut', exactCategories, [
            ...exactCategories.slice(0, 5),
            others,
          ]),
        ]}
      />,
    );

    expect(
      screen
        .getByTestId('pie-chart', { includeHiddenElements: true })
        .props.data.map((item: ChartDataPoint) => item.category),
    ).toEqual([
      'Category 1',
      'Category 2',
      'Category 3',
      'Category 4',
      'Category 5',
      'Others',
    ]);
    exactCategories.forEach((category) => {
      expect(
        screen.getByLabelText(
          `${category.category}, ${formatMinorUnits(
            category.amountMinor,
            'AUD',
          )}, ${category.percentage.toFixed(1)} percent`,
        ),
      ).toBeTruthy();
    });
    expect(screen.queryByLabelText(/Others,/)).toBeNull();
  });

  it('renders the normative empty state when the current period has no data', () => {
    const screen = render(<CategoryChart insights={[]} />);
    expect(
      screen.getByText('No expense data for the selected period.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('pie-chart')).toBeNull();
    expect(screen.queryByTestId('bar-chart')).toBeNull();
  });
});

describe('Insights controls accessibility', () => {
  it('exposes compact selected Month/Year controls and explicit disabled state', () => {
    const onAggregationChange = jest.fn();
    const screen = render(
      <InsightsHeader
        aggregation='month'
        displayPeriodText='August 2026'
        isNextDisabled
        onAggregationChange={onAggregationChange}
        onNextPeriod={jest.fn()}
        onPeriodPress={jest.fn()}
        onPreviousPeriod={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('period-aggregation-segmented-control'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Month').props.style[0].minHeight).toBe(44);

    expect(screen.getByLabelText('Month').props.accessibilityRole).toBe(
      'radio',
    );
    expect(screen.getByLabelText('Month').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByLabelText('Year').props.accessibilityRole).toBe('radio');
    expect(screen.getByLabelText('Year').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(
      screen.getByLabelText('Next period').props.accessibilityState,
    ).toEqual({ disabled: true });
    fireEvent.press(screen.getByLabelText('Year'));
    expect(onAggregationChange).toHaveBeenCalledWith('year');
  });
});

describe('Insights period summary', () => {
  it('shows TOTAL SPENT and a finite zero-prior comparison per currency', () => {
    const current = insight('progress', [point(1, 500)]);
    const screen = render(
      <InsightsSummary insights={[current]} priorPeriodText='July 2026' />,
    );

    expect(screen.getByText('TOTAL SPENT')).toBeTruthy();
    expect(screen.getByText(formatMinorUnits(500, 'AUD'))).toBeTruthy();
    expect(screen.getByText('No spending in July 2026.')).toBeTruthy();
    expect(screen.queryByText(/Infinity/)).toBeNull();
  });

  it('announces the exact prior-period change', () => {
    const current = {
      ...insight('progress', [point(1, 1_200)]),
      deltaMinor: 400,
      deltaPercentage: 50,
      priorTotalMinor: 800,
    };
    const screen = render(
      <InsightsSummary insights={[current]} priorPeriodText='July 2026' />,
    );

    expect(
      screen.getByLabelText(
        `AUD total spent ${formatMinorUnits(
          1_200,
          'AUD',
        )}. ${formatMinorUnits(400, 'AUD')} more than July 2026, 50.0 percent.`,
      ),
    ).toBeTruthy();
  });
});
