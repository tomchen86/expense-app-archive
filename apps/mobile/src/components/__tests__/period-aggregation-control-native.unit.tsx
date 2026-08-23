import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import PeriodAggregationControlAndroid from '../insights/period-aggregation-control.android';
import PeriodAggregationControlIOS from '../insights/period-aggregation-control.ios';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown) => style,
  },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('@expo/ui/community/segmented-control', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const segmentedControlMock = jest.requireMock(
  '@expo/ui/community/segmented-control',
).default as jest.Mock;

describe.each([
  ['iOS', PeriodAggregationControlIOS],
  ['Android', PeriodAggregationControlAndroid],
])('PeriodAggregationControl %s native adapter', (_platform, Control) => {
  beforeEach(() => {
    segmentedControlMock.mockClear();
  });

  it('maps the selected period to the official native segmented control', () => {
    const onChange = jest.fn();

    const screen = render(<Control aggregation='year' onChange={onChange} />);

    expect(
      screen.getByTestId('period-aggregation-segmented-control'),
    ).toBeTruthy();
    expect(segmentedControlMock).toHaveBeenCalledTimes(1);
    const nativeProps = segmentedControlMock.mock.calls[0][0];
    expect(nativeProps.values).toEqual(['Month', 'Year']);
    expect(nativeProps.selectedIndex).toBe(1);
    expect(nativeProps.testID).toBe(
      'period-aggregation-segmented-control-native',
    );
    expect(StyleSheet.flatten(nativeProps.style)).toEqual(
      expect.objectContaining({ minHeight: 44 }),
    );

    nativeProps.onValueChange('Month');
    expect(onChange).toHaveBeenCalledWith('month');
    nativeProps.onValueChange('Year');
    expect(onChange).toHaveBeenCalledWith('year');
  });
});
