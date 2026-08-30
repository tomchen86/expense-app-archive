import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import ColorPicker from '../categories/ColorPicker';
import {
  CATEGORY_PALETTE,
  getFirstAvailableCategoryColor,
  isCategoryColorAvailable,
} from '../../theme/category-palette';

const colorDistance = (left: string, right: string): number => {
  const toRgb = (color: string) =>
    [1, 3, 5].map((index) =>
      Number.parseInt(color.slice(index, index + 2), 16),
    );
  const leftRgb = toRgb(left);
  const rightRgb = toRgb(right);
  return Math.hypot(
    leftRgb[0] - rightRgb[0],
    leftRgb[1] - rightRgb[1],
    leftRgb[2] - rightRgb[2],
  );
};

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
    expect(getFirstAvailableCategoryColor(['#d81b60', '#1E88E5'])).toBe(
      '#FBC02D',
    );
    expect(isCategoryColorAvailable('#D81B60', ['#d81b60'])).toBe(false);
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

  it('keeps the built-in category colors visually separated', () => {
    const defaultColors = [
      CATEGORY_PALETTE.foodDining,
      CATEGORY_PALETTE.transportation,
      CATEGORY_PALETTE.shopping,
      CATEGORY_PALETTE.entertainment,
      CATEGORY_PALETTE.billsUtilities,
      CATEGORY_PALETTE.health,
      CATEGORY_PALETTE.travel,
      CATEGORY_PALETTE.other,
    ];

    defaultColors.forEach((color, index) => {
      defaultColors.slice(index + 1).forEach((otherColor) => {
        expect(colorDistance(color, otherColor)).toBeGreaterThan(60);
      });
    });
  });
});
