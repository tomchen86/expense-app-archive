import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import type { InsightPeriod } from '../../hooks/useInsightsData';
import DatePickerModal from '../insights/DatePickerModal.ios';
import PeriodPickerControl from '../insights/period-picker-control.ios';
import {
  PERIOD_MENU_MAX_OPTIONS,
  PERIOD_WHEEL_MAX_OPTIONS,
  resolvePeriodPickerPresentation,
} from '../insights/period-picker-policy';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };
  return {
    PlatformColor: (name: string) => `platform:${name}`,
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

jest.mock('@expo/ui/swift-ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };
  return {
    Host: host('SwiftUIHost'),
    Picker: host('SwiftUIPicker'),
    Text: host('SwiftUIText'),
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  labelsHidden: () => ({ type: 'labelsHidden' }),
  pickerStyle: (style: string) => ({ style, type: 'pickerStyle' }),
  tag: (value: string | number) => ({ type: 'tag', value }),
}));

jest.mock('../ui/adaptive-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptiveSheet: ({ children, ...props }: any) =>
      React.createElement('AdaptiveSheet', props, children),
  };
});

jest.mock('../ui/adaptive-grouped-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptiveGroupedSection: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

const makePeriods = (count: number): InsightPeriod[] =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(2024, index, 1);
    return {
      key: `month:${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en-AU', {
        month: 'long',
        year: 'numeric',
      }),
      month: date.getMonth(),
      year: date.getFullYear(),
    };
  });

describe('iOS native Insights period picker', () => {
  it('selects the adaptive presentation from the number of populated periods', () => {
    expect(resolvePeriodPickerPresentation(0)).toBe('static');
    expect(resolvePeriodPickerPresentation(1)).toBe('static');
    expect(resolvePeriodPickerPresentation(2)).toBe('menu');
    expect(resolvePeriodPickerPresentation(PERIOD_MENU_MAX_OPTIONS)).toBe(
      'menu',
    );
    expect(resolvePeriodPickerPresentation(PERIOD_MENU_MAX_OPTIONS + 1)).toBe(
      'wheel',
    );
    expect(resolvePeriodPickerPresentation(PERIOD_WHEEL_MAX_OPTIONS)).toBe(
      'wheel',
    );
    expect(resolvePeriodPickerPresentation(PERIOD_WHEEL_MAX_OPTIONS + 1)).toBe(
      'list',
    );
  });

  it('uses a true SwiftUI menu Picker for a short data-only period list', () => {
    const periods = makePeriods(3);
    const onSelectPeriod = jest.fn();
    const onOpen = jest.fn();
    const screen = render(
      <PeriodPickerControl
        availablePeriods={periods}
        displayPeriodText={periods[2].label}
        onOpen={onOpen}
        onSelectPeriod={onSelectPeriod}
        selectedPeriodKey={periods[2].key}
      />,
    );

    const picker = screen.getByTestId('native-period-menu');
    expect(picker).toHaveProp('selection', periods[2].key);
    expect(picker.props.modifiers).toEqual(
      expect.arrayContaining([
        { style: 'menu', type: 'pickerStyle' },
        { type: 'labelsHidden' },
      ]),
    );
    expect(screen.getAllByTestId(/native-period-option-/)).toHaveLength(3);
    expect(screen.queryByTestId('period-picker-button')).toBeNull();

    act(() => picker.props.onSelectionChange(periods[0].key));

    expect(onSelectPeriod).toHaveBeenCalledWith(periods[0]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('uses a SwiftUI wheel in a draggable sheet for a medium period list', () => {
    const periods = makePeriods(PERIOD_MENU_MAX_OPTIONS + 1);
    const onClose = jest.fn();
    const onSelectPeriod = jest.fn();
    const screen = render(
      <DatePickerModal
        aggregation='month'
        availablePeriods={periods}
        onClose={onClose}
        onSelectPeriod={onSelectPeriod}
        selectedMonth={periods[0].month}
        selectedPeriodKey={periods[0].key}
        selectedYear={periods[0].year}
        visible
      />,
    );

    const sheet = screen.getByTestId('period-picker-sheet');
    expect(sheet).toHaveProp('sizing', 'content');
    expect(sheet).toHaveProp('title', 'Period');
    const picker = screen.getByTestId('native-period-wheel');
    expect(picker.props.modifiers).toEqual(
      expect.arrayContaining([
        { style: 'wheel', type: 'pickerStyle' },
        { type: 'labelsHidden' },
      ]),
    );

    act(() => picker.props.onSelectionChange(periods[4].key));
    act(() => sheet.props.trailingAction.onPress());

    expect(onSelectPeriod).toHaveBeenCalledWith(periods[4]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses one flat grouped period list only when the native choices are large', () => {
    const periods = makePeriods(PERIOD_WHEEL_MAX_OPTIONS + 1);
    const onClose = jest.fn();
    const onSelectPeriod = jest.fn();
    const screen = render(
      <DatePickerModal
        aggregation='month'
        availablePeriods={periods}
        onClose={onClose}
        onSelectPeriod={onSelectPeriod}
        selectedMonth={periods[0].month}
        selectedPeriodKey={periods[0].key}
        selectedYear={periods[0].year}
        visible
      />,
    );

    expect(screen.getByTestId('period-picker-sheet')).toHaveProp(
      'sizing',
      'resizable',
    );
    expect(screen.queryByTestId('native-period-wheel')).toBeNull();
    expect(screen.queryByLabelText(/^Year /)).toBeNull();
    expect(screen.getByText(periods.at(-1)!.label)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(periods.at(-1)!.label));

    expect(onSelectPeriod).toHaveBeenCalledWith(periods.at(-1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
