import React from 'react';
import { render } from '@testing-library/react-native';

import TextInputModal from '../TextInputModal';

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
    KeyboardAvoidingView: host('KeyboardAvoidingView'),
    Modal: host('Modal'),
    Platform: { OS: 'ios' },
    StyleSheet: {
      absoluteFill: {},
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    TextInput: host('TextInput'),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

describe('TextInputModal automation contract', () => {
  it('forwards semantic test IDs to the input and submit control', () => {
    const screen = render(
      <TextInputModal
        inputTestID='group-name-input'
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        placeholder='Enter group name'
        submitButtonTestID='create-group-submit'
        submitButtonText='Create'
        title='Create New Group'
        visible
      />,
    );

    expect(screen.getByTestId('group-name-input')).toHaveProp(
      'accessibilityLabel',
      'Enter group name',
    );
    expect(screen.getByTestId('create-group-submit')).toHaveProp(
      'accessibilityRole',
      'button',
    );
  });
});
