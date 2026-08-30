import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

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

  it('prevents duplicate submit and dismissal while an async submission is pending', async () => {
    let resolveSubmission: ((value: void) => void) | undefined;
    const submission = new Promise<void>((resolve) => {
      resolveSubmission = resolve;
    });
    const onClose = jest.fn();
    const onSubmit = jest.fn(() => submission);
    const screen = render(
      <TextInputModal
        inputTestID='member-name-input'
        onClose={onClose}
        onSubmit={onSubmit}
        placeholder='Enter member name'
        submitButtonTestID='add-member-submit'
        submitButtonText='Add'
        title='Add Member'
        visible
      />,
    );

    fireEvent.changeText(screen.getByTestId('member-name-input'), 'Casey');
    fireEvent.press(screen.getByTestId('add-member-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('add-member-submit')).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ busy: true, disabled: true }),
      );
    });

    fireEvent.press(screen.getByTestId('add-member-submit'));
    fireEvent.press(screen.getByTestId('text-input-modal-cancel'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Casey');
    expect(onClose).not.toHaveBeenCalled();

    resolveSubmission?.();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('keeps the modal open when the submission reports failure', async () => {
    const onClose = jest.fn();
    const screen = render(
      <TextInputModal
        inputTestID='member-name-input'
        onClose={onClose}
        onSubmit={jest.fn(() => false)}
        placeholder='Enter member name'
        submitButtonTestID='add-member-submit'
        submitButtonText='Add'
        title='Add Member'
        visible
      />,
    );

    fireEvent.changeText(screen.getByTestId('member-name-input'), 'Casey');
    fireEvent.press(screen.getByTestId('add-member-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('add-member-submit')).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ busy: false, disabled: false }),
      );
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes after a successful synchronous submission', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    const screen = render(
      <TextInputModal
        inputTestID='member-name-input'
        onClose={onClose}
        onSubmit={onSubmit}
        placeholder='Enter member name'
        submitButtonTestID='add-member-submit'
        submitButtonText='Add'
        title='Add Member'
        visible
      />,
    );

    fireEvent.changeText(screen.getByTestId('member-name-input'), 'Casey');
    fireEvent.press(screen.getByTestId('add-member-submit'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith('Casey');
  });

  it('keeps the modal open when an async submission rejects', async () => {
    const onClose = jest.fn();
    const screen = render(
      <TextInputModal
        inputTestID='member-name-input'
        onClose={onClose}
        onSubmit={jest.fn().mockRejectedValue(new Error('write failed'))}
        placeholder='Enter member name'
        submitButtonTestID='add-member-submit'
        submitButtonText='Add'
        title='Add Member'
        visible
      />,
    );

    fireEvent.changeText(screen.getByTestId('member-name-input'), 'Casey');
    fireEvent.press(screen.getByTestId('add-member-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('add-member-submit')).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ busy: false, disabled: false }),
      );
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
