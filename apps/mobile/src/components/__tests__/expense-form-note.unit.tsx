import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { BasicInfoSection } from '../ExpenseForm/BasicInfoSection';

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
    Animated: {
      Value: class AnimatedValue {
        value: number;

        constructor(value: number) {
          this.value = value;
        }

        setValue(value: number) {
          this.value = value;
        }
      },
      View: host('AnimatedView'),
      timing: (value: { setValue: (next: number) => void }, config: any) => ({
        start: () => value.setValue(config.toValue),
      }),
    },
    PlatformColor: (name: string) => name,
    StyleSheet: {
      absoluteFillObject: {
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
      },
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
      hairlineWidth: 1,
    },
    Text: host('Text'),
    TextInput: host('TextInput', true),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

jest.mock('../DatePicker', () => () => null);

const baseProps = {
  amount: '',
  caption: 'Birthday dinner with friends',
  category: 'Food & Dining',
  currency: 'USD',
  date: new Date(2026, 7, 25),
  onAmountChange: jest.fn(),
  onCaptionChange: jest.fn(),
  onCategoryPress: jest.fn(),
  onDateChange: jest.fn(),
  onTitleChange: jest.fn(),
  title: 'Dinner',
};

describe('Expense note field', () => {
  it('focuses and expands on the first tap, then collapses to a summary row on blur', () => {
    const screen = render(<BasicInfoSection {...baseProps} />);
    let noteInput = screen.getByTestId('expense-caption-input');

    expect(noteInput).toHaveProp('multiline', true);
    expect(screen.getByText('Note')).toBeTruthy();

    fireEvent(noteInput, 'focus');
    noteInput = screen.getByTestId('expense-caption-input');
    expect(noteInput).toHaveProp('multiline', true);
    expect(screen.queryByText('Note')).toBeNull();
    expect(screen.getByTestId('expense-note-container').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 54 })]),
    );

    fireEvent(noteInput, 'blur');
    expect(screen.getByTestId('expense-caption-input')).toHaveProp(
      'multiline',
      true,
    );
    expect(screen.getByText('Note')).toBeTruthy();
  });
});
