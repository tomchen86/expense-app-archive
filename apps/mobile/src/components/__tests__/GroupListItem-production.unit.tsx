import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import GroupListItem from '../GroupListItem';
import type { ExpenseGroup } from '../../types';
import { formatMinorUnits } from '../../utils/money';

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
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

jest.mock('../ui/adaptive-card-surface', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AdaptiveCardSurface: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

const group: ExpenseGroup = {
  id: 'group-1',
  name: 'Weekend Trip',
  participants: [
    { id: 'participant-alex', name: 'Alex' },
    { id: 'participant-blake', name: 'Blake' },
  ],
  createdAt: '2026-08-20T00:00:00.000Z',
};

describe('GroupListItem production behavior', () => {
  it('makes the whole active card navigable without management controls', () => {
    const onPress = jest.fn();
    const screen = render(
      <GroupListItem
        group={group}
        onArchiveGroup={jest.fn()}
        onPress={onPress}
        onRestoreGroup={jest.fn()}
        summary={[
          {
            currency: 'AUD',
            myNetBalanceMinor: 4_000,
            myShareMinor: 6_000,
          },
        ]}
      />,
    );

    const card = screen.getByRole('button', { name: `Open ${group.name}` });
    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledWith(group.id);
    expect(card.props.accessibilityValue).toEqual({
      text: `Your share: ${formatMinorUnits(6_000, 'AUD')}. You're owed: ${formatMinorUnits(4_000, 'AUD')}`,
    });
    expect(
      screen.getByText(`Your share: ${formatMinorUnits(6_000, 'AUD')}`),
    ).toBeTruthy();
    expect(
      screen.getByText(`You're owed: ${formatMinorUnits(4_000, 'AUD')}`),
    ).toBeTruthy();
    expect(screen.queryByText('View details')).toBeNull();
    expect(screen.queryByText('Group Total')).toBeNull();
    expect(screen.queryByText('Participants:')).toBeNull();
    expect(screen.queryByText('Alex')).toBeNull();
    expect(screen.queryByText('Blake')).toBeNull();
    expect(screen.getByTestId(`group-card-surface-${group.id}`)).toHaveProp(
      'tone',
      'shared',
    );
    expect(screen.getByTestId(`group-card-surface-${group.id}`)).toHaveProp(
      'interactive',
      true,
    );
    const swipeable = screen.getByTestId(`group-swipeable-${group.id}`);
    expect(swipeable.props.containerStyle).toEqual(
      expect.objectContaining({ overflow: 'visible' }),
    );
    expect(swipeable.props.childrenContainerStyle).toEqual(
      expect.objectContaining({ overflow: 'visible' }),
    );
  });

  it('exposes Archive only through the left-swipe action', () => {
    const onArchiveGroup = jest.fn();
    const close = jest.fn();
    const screen = render(
      <GroupListItem
        group={group}
        onArchiveGroup={onArchiveGroup}
        onPress={jest.fn()}
        onRestoreGroup={jest.fn()}
        summary={[]}
      />,
    );

    expect(screen.queryByText('Archive')).toBeNull();
    expect(screen.getByText('No spending yet')).toBeTruthy();

    const swipeable = screen.getByTestId(`group-swipeable-${group.id}`);
    const rightAction = swipeable.props.renderRightActions(
      undefined,
      undefined,
      { close },
    );
    const actions = render(rightAction);

    fireEvent.press(
      actions.getByRole('button', { name: `Archive ${group.name}` }),
    );

    expect(close).toHaveBeenCalledTimes(1);
    expect(onArchiveGroup).toHaveBeenCalledWith(group.id);
  });

  it('keeps archived cards readable and offers an explicit Restore action', () => {
    const archivedGroup: ExpenseGroup = {
      ...group,
      archivedAt: '2026-08-24T00:00:00.000Z',
    };
    const onRestoreGroup = jest.fn();
    const screen = render(
      <GroupListItem
        group={archivedGroup}
        onArchiveGroup={jest.fn()}
        onPress={jest.fn()}
        onRestoreGroup={onRestoreGroup}
        summary={null}
      />,
    );

    expect(screen.queryByTestId(`group-swipeable-${group.id}`)).toBeNull();
    expect(screen.getByText('Archived group')).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', { name: `Restore ${group.name}` }),
    );
    expect(onRestoreGroup).toHaveBeenCalledWith(group.id);
  });

  it('does not confuse an unresolved account identity with an empty group', () => {
    const screen = render(
      <GroupListItem
        group={group}
        onArchiveGroup={jest.fn()}
        onPress={jest.fn()}
        onRestoreGroup={jest.fn()}
        summary={null}
      />,
    );

    expect(screen.getByText('Your balance is unavailable')).toBeTruthy();
    expect(screen.queryByText('No spending yet')).toBeNull();
  });
});
