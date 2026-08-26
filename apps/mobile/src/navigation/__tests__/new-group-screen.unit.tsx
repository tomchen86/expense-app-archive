import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';

import NewGroupScreen from '../../../app/new-group';
import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';

const mockAddGroup = jest.fn();

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
    Alert: { alert: jest.fn() },
    PlatformColor: (name: string) => name,
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
      hairlineWidth: 1,
    },
    ScrollView: host('ScrollView'),
    Text: host('Text'),
    TextInput: host('TextInput', true),
    View: host('View'),
  };
});

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector: (state: { addGroup: jest.Mock }) => unknown) =>
    selector({ addGroup: mockAddGroup }),
}));

describe('NewGroupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddGroup.mockResolvedValue('group-1');
  });

  it('uses a compact grouped form with native toolbar actions', async () => {
    const screen = render(<NewGroupScreen />);

    expect(screen.getByText('GROUP DETAILS')).toBeTruthy();
    expect(
      screen.getByText('Members can be added after the group is created.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProp(
      'variant',
      'plain',
    );
    expect(screen.getByRole('button', { name: 'Create' })).toHaveProp(
      'variant',
      'prominent',
    );

    fireEvent.changeText(screen.getByTestId('group-name-input'), ' Brisbane ');
    fireEvent.press(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(mockAddGroup).toHaveBeenCalledWith('Brisbane'));
    expect(router.back).toHaveBeenCalledTimes(1);
    const latestScreenOptions = (
      Stack.Screen as unknown as jest.Mock
    ).mock.calls.at(-1)?.[0]?.options;
    expect(latestScreenOptions).toEqual(
      expect.objectContaining({
        contentStyle: { backgroundColor: semanticColors.background },
      }),
    );
  });

  it('lets the native sheet calculate its toolbar inset without a magic spacer', () => {
    const screen = render(<NewGroupScreen />);
    const sheet = screen.getByTestId('new-group-screen');
    const content = screen.getByTestId('new-group-content');

    expect(sheet.props.style).toEqual(
      expect.objectContaining({
        flex: 1,
      }),
    );
    expect(sheet).toHaveProp('collapsable', false);
    expect(content).toHaveProp('automaticallyAdjustKeyboardInsets', false);
    expect(content).toHaveProp('contentInsetAdjustmentBehavior', 'automatic');
    expect(content.props.contentContainerStyle).toEqual(
      expect.objectContaining({
        paddingBottom: mobileTheme.spacing.xxl,
        paddingHorizontal: mobileTheme.spacing.xl,
        paddingTop: mobileTheme.spacing.lg,
      }),
    );
  });

  it('keeps the sheet open and retryable when durable creation fails', async () => {
    mockAddGroup.mockRejectedValueOnce(new Error('identity unavailable'));
    const screen = render(<NewGroupScreen />);

    fireEvent.changeText(
      screen.getByTestId('group-name-input'),
      'Durable group',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to Create Group',
        'Your group could not be saved. Please try again.',
      ),
    );
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByTestId('group-name-input')).toHaveProp(
      'value',
      'Durable group',
    );
    expect(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled();
  });

  it('returns direct-link sheets to Groups without dispatching an invalid back action', () => {
    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    const screen = render(<NewGroupScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/history');
  });

  it('locks dismissal while creation is in flight', () => {
    mockAddGroup.mockReturnValue(new Promise(() => undefined));
    const screen = render(<NewGroupScreen />);

    fireEvent.changeText(screen.getByTestId('group-name-input'), 'Trip');
    fireEvent.press(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    const latestScreenOptions = (
      Stack.Screen as unknown as jest.Mock
    ).mock.calls.at(-1)?.[0]?.options;
    expect(latestScreenOptions).toEqual(
      expect.objectContaining({ gestureEnabled: false, title: 'New Group' }),
    );
  });
});
