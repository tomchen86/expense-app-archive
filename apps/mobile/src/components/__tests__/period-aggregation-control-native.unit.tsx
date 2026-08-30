import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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

describe('PeriodAggregationControl platform adapters', () => {
  beforeEach(() => {
    segmentedControlMock.mockClear();
  });

  it('maps iOS to the official native segmented control', () => {
    const onChange = jest.fn();

    const screen = render(
      <PeriodAggregationControlIOS aggregation='year' onChange={onChange} />,
    );

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

  it('uses the dependency-safe Material-style control on Android', () => {
    const onChange = jest.fn();

    const screen = render(
      <PeriodAggregationControlAndroid
        aggregation='year'
        onChange={onChange}
      />,
    );

    expect(segmentedControlMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Month').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(screen.getByLabelText('Year').props.accessibilityState).toEqual({
      selected: true,
    });

    fireEvent.press(screen.getByLabelText('Month'));
    expect(onChange).toHaveBeenCalledWith('month');
  });
});
