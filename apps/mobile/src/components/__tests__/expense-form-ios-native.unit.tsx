import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';

import DatePicker from '../DatePicker';
import { GroupSection } from '../ExpenseForm/GroupSection';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string, accessible = false) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(
        name,
        accessible ? { accessible: true, ...props } : props,
        children,
      );
    };

  return {
    Platform: { OS: 'ios' },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.flat().filter(Boolean))
          : style,
      hairlineWidth: 0.5,
    },
    Switch: host('Switch', true),
    Text: host('Text'),
    TextInput: host('TextInput', true),
    TouchableOpacity: host('TouchableOpacity', true),
    View: host('View'),
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement('DateTimePicker', props),
  };
});

describe('iOS expense form native controls', () => {
  it('uses the compact native date control so the calendar opens as a popover', () => {
    const onChange = jest.fn();
    const date = new Date(2026, 7, 18);
    const nextDate = new Date(2026, 7, 20);
    const screen = render(
      <DatePicker
        date={date}
        label='Date'
        onChange={onChange}
        testID='date-picker'
      />,
    );

    const nativePicker = screen.getByTestId('native-date-picker');
    expect(
      StyleSheet.flatten(screen.getByTestId('date-picker').props.style),
    ).toEqual(expect.objectContaining({ paddingRight: 16 }));
    expect(screen.getByTestId('date-picker')).not.toBeDisabled();
    expect(nativePicker).toHaveProp('display', 'compact');
    expect(nativePicker.props.onChange).toBeUndefined();
    expect(nativePicker.props.onValueChange).toEqual(expect.any(Function));
    expect(screen.queryByText('Done')).toBeNull();
    expect(screen.queryByText('›')).toBeNull();

    const nativeEvent = {
      nativeEvent: { timestamp: nextDate.getTime(), utcOffset: 600 },
    };
    act(() => {
      nativePicker.props.onValueChange(nativeEvent, nextDate);
    });
    expect(onChange).toHaveBeenCalledWith(
      { ...nativeEvent, type: 'set' },
      nextDate,
    );
  });

  it('exposes the disabled state on both the row and native picker', () => {
    const screen = render(
      <DatePicker
        date={new Date(2026, 7, 18)}
        disabled
        label='Date'
        onChange={jest.fn()}
        testID='date-picker'
      />,
    );

    expect(screen.getByTestId('date-picker')).toBeDisabled();
    expect(screen.getByTestId('native-date-picker')).toBeDisabled();
  });

  it('uses the native switch dimensions so its visible track is row-centered', () => {
    const screen = render(
      <GroupSection
        onGroupPress={jest.fn()}
        onPaidByPress={jest.fn()}
        onSharingChange={jest.fn()}
        onSplitPress={jest.fn()}
        paidByParticipant={null}
        selectedGroup={null}
        selectedParticipants={[]}
        sharingEnabled={false}
      />,
    );

    expect(
      StyleSheet.flatten(screen.getByTestId('sharing-toggle').props.style),
    ).toEqual(
      expect.objectContaining({
        alignSelf: 'center',
        height: 31,
        marginRight: 8,
        width: 51,
      }),
    );
  });
});
