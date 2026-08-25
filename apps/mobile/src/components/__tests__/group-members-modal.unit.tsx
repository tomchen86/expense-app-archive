import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import GroupMembersModal from '../groups/GroupMembersModal';
import type { ExpenseGroup } from '../../types';

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
    FlatList: ({
      ListEmptyComponent,
      ListFooterComponent,
      data,
      renderItem,
      ...props
    }: any) =>
      React.createElement(
        'FlatList',
        props,
        data.length === 0
          ? ListEmptyComponent
          : data.map((item: any, index: number) =>
              React.createElement(
                React.Fragment,
                { key: item.id },
                renderItem({ item, index }),
              ),
            ),
        ListFooterComponent,
      ),
    KeyboardAvoidingView: host('KeyboardAvoidingView'),
    Modal: ({ children, visible, ...props }: any) =>
      visible ? React.createElement('Modal', props, children) : null,
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

const group: ExpenseGroup = {
  id: 'group-1',
  name: 'Household',
  participants: [
    {
      id: 'participant-alex',
      name: 'Alex',
      userId: 'account-alex',
    },
    { id: 'participant-blake', name: 'Blake' },
  ],
  createdAt: '2026-08-20T00:00:00.000Z',
};

describe('GroupMembersModal', () => {
  it('starts read-only and shows mutations only after Edit', () => {
    const onAddMember = jest.fn();
    const onRemoveMember = jest.fn();
    const screen = render(
      <GroupMembersModal
        currentParticipantId='participant-alex'
        group={group}
        onAddMember={onAddMember}
        onClose={jest.fn()}
        onRemoveMember={onRemoveMember}
        visible
      />,
    );

    expect(screen.getByText(/Alex/)).toBeTruthy();
    expect(screen.getByText('Blake')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove Blake' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add member' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Edit members' }));

    expect(screen.getByRole('button', { name: 'Add member' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Blake' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove Alex' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Remove Blake' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add member' }));
    expect(onRemoveMember).toHaveBeenCalledWith('participant-blake');
    expect(onAddMember).toHaveBeenCalledTimes(1);
  });

  it('keeps archived membership read-only', () => {
    const screen = render(
      <GroupMembersModal
        currentParticipantId='participant-alex'
        group={{
          ...group,
          archivedAt: '2026-08-24T00:00:00.000Z',
        }}
        onAddMember={jest.fn()}
        onClose={jest.fn()}
        onRemoveMember={jest.fn()}
        visible
      />,
    );

    expect(screen.queryByRole('button', { name: 'Edit members' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add member' })).toBeNull();
    expect(screen.queryByLabelText(/Remove /)).toBeNull();
  });

  it('keeps membership read-only when the signed-in participant cannot be resolved', () => {
    const screen = render(
      <GroupMembersModal
        currentParticipantId={null}
        group={group}
        onAddMember={jest.fn()}
        onClose={jest.fn()}
        onRemoveMember={jest.fn()}
        visible
      />,
    );

    expect(screen.queryByRole('button', { name: 'Edit members' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add member' })).toBeNull();
    expect(screen.queryByLabelText(/Remove /)).toBeNull();
  });
});
