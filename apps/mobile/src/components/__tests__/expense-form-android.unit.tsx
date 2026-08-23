import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { BasicInfoSection } from '../ExpenseForm/BasicInfoSection.android';
import { GroupSection } from '../ExpenseForm/GroupSection.android';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown) =>
      Array.isArray(style)
        ? Object.assign({}, ...style.flat().filter(Boolean))
        : style,
  },
  Switch: 'Switch',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('../DatePicker', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return function MockDatePicker({ testID = 'date-picker', ...props }: any) {
    return React.createElement('View', { testID, ...props });
  };
});

const dateChange = jest.fn();

describe('Android expense form presentation', () => {
  it('uses Material-style outlined fields without changing the shared contract', () => {
    const screen = render(
      <BasicInfoSection
        amount='24.00'
        caption='Team dinner'
        category='Food & Dining'
        currency='USD'
        date={new Date(2026, 7, 24)}
        onAmountChange={jest.fn()}
        onCaptionChange={jest.fn()}
        onCategoryPress={jest.fn()}
        onDateChange={dateChange}
        onTitleChange={jest.fn()}
        title='Dinner'
      />,
    );

    expect(screen.getByTestId('expense-amount-input')).toHaveProp(
      'keyboardType',
      'decimal-pad',
    );
    expect(
      StyleSheet.flatten(screen.getByTestId('expense-title-input').props.style),
    ).toEqual(expect.objectContaining({ borderWidth: 1 }));
    expect(
      StyleSheet.flatten(
        screen.getByTestId('expense-caption-input').props.style,
      ),
    ).toEqual(expect.objectContaining({ borderWidth: 1 }));
    expect(screen.getByTestId('category-picker')).toHaveProp(
      'accessibilityRole',
      'button',
    );
    expect(screen.getByTestId('category-picker')).toHaveProp(
      'accessibilityLabel',
      'Category, Food & Dining',
    );
    expect(screen.getByTestId('date-picker')).toBeTruthy();
  });

  it('keeps progressive sharing and disabled semantics in the Android adapter', () => {
    const onSharingChange = jest.fn();
    const props = {
      financialControlsDisabled: false,
      interactionDisabled: false,
      onGroupPress: jest.fn(),
      onPaidByPress: jest.fn(),
      onSharingChange,
      onSplitPress: jest.fn(),
      paidByParticipant: null,
      selectedGroup: null,
      selectedParticipants: [],
      sharingEnabled: false,
      sharingLocked: false,
    };
    const screen = render(<GroupSection {...props} />);

    const toggle = screen.getByTestId('sharing-toggle');
    expect(toggle).toHaveProp('accessibilityRole', 'switch');
    expect(toggle).toHaveProp('accessibilityLabel', 'Split with others');
    expect(screen.queryByTestId('group-picker')).toBeNull();
    fireEvent(toggle, 'valueChange', true);
    expect(onSharingChange).toHaveBeenCalledWith(true);

    screen.rerender(<GroupSection {...props} sharingEnabled />);
    expect(screen.getByTestId('group-picker')).toHaveProp('disabled', false);

    screen.rerender(
      <GroupSection
        {...props}
        interactionDisabled
        sharingEnabled
        sharingLocked
      />,
    );
    expect(screen.getByTestId('sharing-toggle')).toBeDisabled();
    expect(screen.getByTestId('group-picker')).toBeDisabled();
  });
});
