import React from 'react';
import { render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import ExpenseInsightsScreen from '../../../app/insights';

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
    },
    Text: host('Text'),
    View: host('View'),
  };
});

const baseInsightsData = {
  aggregation: 'month' as const,
  availablePeriods: [
    {
      key: 'month:2025-0',
      label: 'January 2025',
      month: 0,
      year: 2025,
    },
  ],
  availableYears: [2025, 2026],
  chartData: [],
  chartPreference: 'auto' as const,
  currencyInsights: [],
  currentMonth: 7,
  currentYear: 2026,
  displayPeriodText: 'January 2025',
  handleNextPeriod: jest.fn(),
  handlePreviousPeriod: jest.fn(),
  hasAvailablePeriods: true,
  hasMultiplePeriods: false,
  isNextDisabled: false,
  isPreviousDisabled: true,
  monthNames: [],
  previousPeriodText: 'December 2024' as string | null,
  screenTitle: 'Insights',
  selectedMonth: 0,
  selectedYear: 2025,
  setAggregation: jest.fn(),
  setChartPreference: jest.fn(),
  setSelectedMonth: jest.fn(),
  setSelectedYear: jest.fn(),
  selectPeriod: jest.fn(),
  setShowDatePickers: jest.fn(),
  showDatePickers: false,
};

const mockUseInsightsData = jest.fn((_props: unknown) => baseInsightsData);

jest.mock('../../hooks/useInsightsData', () => ({
  useInsightsData: (props: unknown) => mockUseInsightsData(props),
}));
jest.mock('../../components/insights/CategoryChart', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'category-chart' });
});
jest.mock('../../components/insights/DatePickerModal', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'period-picker-sheet' });
});
jest.mock('../../components/insights/InsightsHeader', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'insights-header' });
});
jest.mock('../../components/insights/InsightsSummary', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return (props: Record<string, unknown>) =>
    React.createElement('View', { ...props, testID: 'insights-summary' });
});
jest.mock('../../components/insights/ChartPreferenceControl', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return () =>
    React.createElement('View', {
      testID: 'persistent-chart-preference-control',
    });
});

describe('InsightsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      contextId: 'personal-space',
      contextType: 'personal',
      initialDate: '2025-01-01',
    });
  });

  it('keeps the route calendar-only value intact and removes persistent chart buttons', () => {
    const screen = render(<ExpenseInsightsScreen />);

    expect(mockUseInsightsData).toHaveBeenCalledWith({
      contextId: 'personal-space',
      contextType: 'personal',
      initialDate: '2025-01-01',
    });
    expect(
      screen.queryByTestId('persistent-chart-preference-control'),
    ).toBeNull();
    expect(screen.getByLabelText(/Chart visualization/)).toBeTruthy();
    expect(screen.getByTestId('insights-header')).toBeTruthy();
    expect(screen.getByTestId('category-chart')).toBeTruthy();
    expect(screen.getByTestId('period-picker-sheet')).toBeTruthy();
  });

  it('hides period controls, chart controls, and charts when there is no data', () => {
    mockUseInsightsData.mockReturnValueOnce({
      ...baseInsightsData,
      availablePeriods: [],
      availableYears: [],
      currencyInsights: [],
      hasAvailablePeriods: false,
      hasMultiplePeriods: false,
      previousPeriodText: null,
    });

    const screen = render(<ExpenseInsightsScreen />);

    expect(screen.queryByLabelText(/Chart visualization/)).toBeNull();
    expect(screen.queryByTestId('insights-header')).toBeNull();
    expect(screen.queryByTestId('insights-summary')).toBeNull();
    expect(screen.queryByTestId('category-chart')).toBeNull();
    expect(screen.queryByTestId('period-picker-sheet')).toBeNull();
    expect(screen.getByText('No expenses yet')).toBeTruthy();
  });
});
