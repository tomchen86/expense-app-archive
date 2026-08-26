import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };
  return {
    Animated: {
      Value: class AnimatedValue {
        value: number;

        constructor(value: number) {
          this.value = value;
        }

        interpolate() {
          return this;
        }

        setValue(value: number) {
          this.value = value;
        }
      },
      View: host('AnimatedView'),
      parallel: (animations: Array<{ start: () => void }>) => ({
        start: (callback?: () => void) => {
          animations.forEach((animation) => animation.start());
          callback?.();
        },
      }),
      timing: (value: { setValue: (next: number) => void }, config: any) => ({
        start: (callback?: () => void) => {
          value.setValue(config.toValue);
          callback?.();
        },
      }),
    },
    PanResponder: {
      create: (handlers: any) => ({
        panHandlers: {
          onMoveShouldSetResponderCapture:
            handlers.onMoveShouldSetPanResponderCapture,
          onMoveShouldSetResponder: handlers.onMoveShouldSetPanResponder,
          onResponderGrant: handlers.onPanResponderGrant,
          onResponderMove: handlers.onPanResponderMove,
          onResponderRelease: handlers.onPanResponderRelease,
          onResponderTerminate: handlers.onPanResponderTerminate,
          onResponderTerminationRequest:
            handlers.onPanResponderTerminationRequest,
        },
      }),
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    TouchableOpacity: host('TouchableOpacity'),
    View: host('View'),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Ionicons: (props: any) => React.createElement('Ionicons', props),
  };
});

jest.mock('../ui/adaptive-action-surface', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptiveActionSurface: ({ children, ...props }: any) =>
      React.createElement('AdaptiveActionSurface', props, children),
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
import { mobileTheme } from '../../theme/tokens';

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

  it('renders donut and bounded horizontal bars as decorative visuals', () => {
    const donut = render(
      <CategoryChart
        insights={[insight('donut', [point(1, 500), point(2, 300)])]}
      />,
    );
    expect(
      donut.getByTestId('pie-chart', { includeHiddenElements: true }),
    ).toHaveProp('innerCircleColor', mobileTheme.colors.surface);
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
    const barVisual = bar.getByTestId('insight-bar-visual', {
      includeHiddenElements: true,
    });
    expect(barVisual.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ overflow: 'hidden', width: '100%' }),
      ]),
    );
    expect(
      bar.getAllByTestId(/insight-bar-track-/, {
        includeHiddenElements: true,
      }),
    ).toHaveLength(6);
    expect(bar.queryByTestId('bar-chart')).toBeNull();
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
    const sixBar = sixCategories.getByTestId('insight-bar-visual', {
      includeHiddenElements: true,
    });
    const sixHeight = sixBar.props.style
      .flat()
      .find((style: any) => style?.height)?.height;
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
    const twelveHeight = twelveCategories
      .getByTestId('insight-bar-visual', {
        includeHiddenElements: true,
      })
      .props.style.flat()
      .find((style: any) => style?.height)?.height;

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
  const periods = [
    { key: 'month:2026-6', label: 'July 2026', month: 6, year: 2026 },
    { key: 'month:2026-7', label: 'August 2026', month: 7, year: 2026 },
  ];

  it('exposes compact selected Month/Year controls and explicit disabled state', () => {
    const onAggregationChange = jest.fn();
    const screen = render(
      <InsightsHeader
        aggregation='month'
        availablePeriods={periods}
        displayPeriodText='August 2026'
        hasMultiplePeriods
        isNextDisabled
        isPreviousDisabled={false}
        onAggregationChange={onAggregationChange}
        onNextPeriod={jest.fn()}
        onPeriodPress={jest.fn()}
        onPeriodSelect={jest.fn()}
        onPreviousPeriod={jest.fn()}
        selectedPeriodKey={periods[1].key}
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
    expect(screen.getByLabelText('Previous period').props.style).toEqual(
      expect.objectContaining({ height: 44, width: 44 }),
    );
    expect(screen.getByTestId('previous-period-surface')).toBeTruthy();
    expect(screen.getByTestId('period-picker-surface')).toBeTruthy();
    expect(screen.getByTestId('period-picker-chevron').props.name).toBe(
      'chevron-down',
    );
    fireEvent.press(screen.getByLabelText('Year'));
    expect(onAggregationChange).toHaveBeenCalledWith('year');
  });

  it('changes period from the centered picker without competing with the navigation edge', () => {
    const onNextPeriod = jest.fn();
    const onPreviousPeriod = jest.fn();
    const screen = render(
      <InsightsHeader
        aggregation='month'
        availablePeriods={periods}
        displayPeriodText='July 2026'
        hasMultiplePeriods
        isNextDisabled={false}
        isPreviousDisabled={false}
        onAggregationChange={jest.fn()}
        onNextPeriod={onNextPeriod}
        onPeriodPress={jest.fn()}
        onPeriodSelect={jest.fn()}
        onPreviousPeriod={onPreviousPeriod}
        selectedPeriodKey={periods[0].key}
      />,
    );
    const navigator = screen.getByTestId('period-navigator');
    const swipeTarget = screen.getByTestId('period-swipe-target');

    expect(navigator.props.onMoveShouldSetResponder).toBeUndefined();
    expect(
      swipeTarget.props.onMoveShouldSetResponder(undefined, {
        dx: 2,
        dy: 1,
      }),
    ).toBe(true);
    expect(
      swipeTarget.props.onMoveShouldSetResponder(undefined, {
        dx: 32,
        dy: 24,
      }),
    ).toBe(true);
    expect(
      swipeTarget.props.onMoveShouldSetResponder(undefined, {
        dx: 5,
        dy: 56,
      }),
    ).toBe(false);
    expect(swipeTarget.props.onResponderTerminationRequest()).toBe(false);
    expect(screen.getByTestId('period-transition')).toBeTruthy();
    swipeTarget.props.onResponderMove(undefined, { dx: 3, dy: 80 });
    swipeTarget.props.onResponderRelease(undefined, {
      dx: 3,
      dy: 80,
      vx: 0.1,
    });
    swipeTarget.props.onResponderRelease(undefined, {
      dx: -14,
      dy: 4,
      vx: -0.45,
    });

    expect(onNextPeriod).toHaveBeenCalledTimes(1);
    expect(onPreviousPeriod).toHaveBeenCalledTimes(1);
  });

  it('does not swipe into a disabled future period', () => {
    const onNextPeriod = jest.fn();
    const screen = render(
      <InsightsHeader
        aggregation='month'
        availablePeriods={periods}
        displayPeriodText='August 2026'
        hasMultiplePeriods
        isNextDisabled
        isPreviousDisabled={false}
        onAggregationChange={jest.fn()}
        onNextPeriod={onNextPeriod}
        onPeriodPress={jest.fn()}
        onPeriodSelect={jest.fn()}
        onPreviousPeriod={jest.fn()}
        selectedPeriodKey={periods[1].key}
      />,
    );

    screen
      .getByTestId('period-swipe-target')
      .props.onResponderRelease(undefined, { dx: -80, dy: 4, vx: -0.8 });

    expect(onNextPeriod).not.toHaveBeenCalled();
  });

  it('hides navigation and picker affordances when only one period has data', () => {
    const onPeriodPress = jest.fn();
    const screen = render(
      <InsightsHeader
        aggregation='month'
        availablePeriods={[periods[1]]}
        displayPeriodText='August 2026'
        hasMultiplePeriods={false}
        isNextDisabled
        isPreviousDisabled
        onAggregationChange={jest.fn()}
        onNextPeriod={jest.fn()}
        onPeriodPress={onPeriodPress}
        onPeriodSelect={jest.fn()}
        onPreviousPeriod={jest.fn()}
        selectedPeriodKey={periods[1].key}
      />,
    );

    expect(screen.queryByLabelText('Previous period')).toBeNull();
    expect(screen.queryByLabelText('Next period')).toBeNull();
    expect(screen.queryByTestId('period-picker-chevron')).toBeNull();
    expect(screen.queryByTestId('period-swipe-target')).toBeNull();
    expect(screen.getByText('August 2026')).toBeTruthy();
    expect(onPeriodPress).not.toHaveBeenCalled();
  });
});

describe('Insights period summary', () => {
  it('shows TOTAL SPENT and a finite zero-prior comparison per currency', () => {
    const current = insight('progress', [point(1, 500)]);
    const screen = render(
      <InsightsSummary insights={[current]} priorPeriodText='July 2026' />,
    );

    expect(screen.getByText('TOTAL SPENT')).toBeTruthy();
    expect(screen.queryByText('AUD')).toBeNull();
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
        `Total spent ${formatMinorUnits(
          1_200,
          'AUD',
        )}. ${formatMinorUnits(400, 'AUD')} more than July 2026, 50.0 percent.`,
      ),
    ).toBeTruthy();
  });
});
