import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import ColorPicker from '../categories/ColorPicker';
import {
  getFirstAvailableCategoryColor,
  isCategoryColorAvailable,
} from '../../theme/category-palette';

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
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) =>
        Array.isArray(style)
          ? Object.assign({}, ...style.flat().filter(Boolean))
          : style,
    },
    Text: host('Text'),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

describe('category color uniqueness', () => {
  it('chooses the first palette color that is not already in use', () => {
    expect(getFirstAvailableCategoryColor(['#ff6384', '#36A2EB'])).toBe(
      '#FFCE56',
    );
    expect(isCategoryColorAvailable('#FF6384', ['#ff6384'])).toBe(false);
  });

  it('exposes used colors as disabled and does not select them', () => {
    const onColorSelect = jest.fn();
    const screen = render(
      <ColorPicker
        colors={['#FF6384', '#36A2EB']}
        onColorSelect={onColorSelect}
        selectedColor='#36A2EB'
        unavailableColors={['#FF6384']}
      />,
    );

    const unavailable = screen.getByRole('button', {
      name: 'Color #FF6384 already in use',
    });
    expect(unavailable).toBeDisabled();
    fireEvent.press(unavailable);
    expect(onColorSelect).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByRole('button', { name: 'Select color #36A2EB' }),
    );
    expect(onColorSelect).toHaveBeenCalledWith('#36A2EB');
  });
});
