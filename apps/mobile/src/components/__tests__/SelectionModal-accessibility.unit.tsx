import React from 'react';
import { render } from '@testing-library/react-native';

import SelectionModal from '../SelectionModal';

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
    FlatList: ({ data, renderItem, ...props }: any) =>
      React.createElement(
        'View',
        props,
        data.map((item: unknown, index: number) =>
          React.createElement(
            React.Fragment,
            { key: index },
            renderItem({ item, index }),
          ),
        ),
      ),
    KeyboardAvoidingView: host('View'),
    Modal: host('View'),
    SafeAreaView: host('View'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
      hairlineWidth: 1,
    },
    Text: host('Text'),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

describe('SelectionModal accessibility', () => {
  it('exposes real option roles and selected state for multi select', () => {
    const screen = render(
      <SelectionModal
        visible
        title='Split Between'
        data={['Tom', 'Sharon']}
        keyExtractor={(item) => item}
        renderItemContent={(item) => React.createElement('Text', null, item)}
        isSelected={(item) => item === 'Tom'}
        onSelect={jest.fn()}
        onClose={jest.fn()}
        multiSelect
      />,
    );

    expect(screen.getByRole('header', { name: 'Split Between' })).toBeTruthy();
    expect(screen.getByTestId('selection-modal-content')).toHaveProp(
      'accessibilityViewIsModal',
      true,
    );
    expect(
      screen.getByRole('button', { name: 'Tom' }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      screen.getByRole('button', { name: 'Sharon' }).props.accessibilityState,
    ).toEqual({ selected: false });
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  });

  it('exposes the same selected option semantics for single select', () => {
    const screen = render(
      <SelectionModal
        visible
        title='Select Group'
        data={['Brisbane', 'Melbourne']}
        keyExtractor={(item) => item}
        renderItemContent={(item) => React.createElement('Text', null, item)}
        isSelected={(item) => item === 'Melbourne'}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Brisbane' }).props.accessibilityState,
    ).toEqual({ selected: false });
    expect(
      screen.getByRole('button', { name: 'Melbourne' }).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });
});
