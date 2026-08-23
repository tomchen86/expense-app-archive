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
    View: host('View'),
  };
});

const mockUseInsightsData = jest.fn((_props: unknown) => ({
  aggregation: 'month' as const,
  availableYears: [2025, 2026],
  chartData: [],
  chartPreference: 'auto' as const,
  currencyInsights: [],
  currentMonth: 7,
  currentYear: 2026,
  displayPeriodText: 'January 2025',
  handleNextPeriod: jest.fn(),
  handlePreviousPeriod: jest.fn(),
  isNextDisabled: false,
  monthNames: [],
  previousPeriodText: 'December 2024',
  screenTitle: 'Insights',
  selectedMonth: 0,
  selectedYear: 2025,
  setAggregation: jest.fn(),
  setChartPreference: jest.fn(),
  setSelectedMonth: jest.fn(),
  setSelectedYear: jest.fn(),
  setShowDatePickers: jest.fn(),
  showDatePickers: false,
}));

jest.mock('../../hooks/useInsightsData', () => ({
  useInsightsData: (props: unknown) => mockUseInsightsData(props),
}));
jest.mock('../../components/insights/CategoryChart', () => () => null);
jest.mock('../../components/insights/DatePickerModal', () => () => null);
jest.mock('../../components/insights/InsightsHeader', () => () => null);
jest.mock('../../components/insights/InsightsSummary', () => () => null);
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
  });
});
