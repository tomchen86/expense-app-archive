import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import ArchivedGroupsScreen from '../../screens/archived-groups-screen';
import SettingsScreen from '../../screens/settings-screen';
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
    Alert: { alert: jest.fn() },
    FlatList: ({ ListEmptyComponent, data, renderItem, ...props }: any) =>
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
      ),
    ScrollView: host('ScrollView'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    TextInput: host('TextInput'),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

const activeGroup: ExpenseGroup = {
  id: 'active-group',
  name: 'Current household',
  participants: [],
  createdAt: '2026-08-20T00:00:00.000Z',
};
const archivedGroup: ExpenseGroup = {
  id: 'archived-group',
  name: 'Past trip',
  participants: [],
  createdAt: '2026-08-10T00:00:00.000Z',
  archivedAt: '2026-08-24T00:00:00.000Z',
};

const mockMobileState = {
  groups: [activeGroup, archivedGroup],
  restoreGroup: jest.fn(),
  updateUserSettings: jest.fn(),
  userSettings: { name: 'Alex' },
};

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector?: (state: typeof mockMobileState) => unknown) =>
    selector ? selector(mockMobileState) : mockMobileState,
}));

describe('Settings archived groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileState.restoreGroup.mockResolvedValue(true);
    mockMobileState.updateUserSettings.mockResolvedValue(true);
  });

  it('provides a persistent Settings entry with the archived count', () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Archived groups, 1' }));

    expect(screen.getByText('Archived Groups')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith('/settings/archived-groups');
  });

  it('lists only archived groups and restores them without rewriting history', () => {
    const screen = render(<ArchivedGroupsScreen />);

    expect(screen.getByText(archivedGroup.name)).toBeTruthy();
    expect(screen.queryByText(activeGroup.name)).toBeNull();
    fireEvent.press(
      screen.getByRole('button', { name: `Restore ${archivedGroup.name}` }),
    );
    expect(mockMobileState.restoreGroup).toHaveBeenCalledWith(archivedGroup.id);
  });

  it('reports a durable restore failure instead of silently succeeding', async () => {
    mockMobileState.restoreGroup.mockRejectedValueOnce(
      new Error('restore write failed'),
    );
    const screen = render(<ArchivedGroupsScreen />);

    fireEvent.press(
      screen.getByRole('button', { name: `Restore ${archivedGroup.name}` }),
    );

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to Restore Group',
        expect.stringMatching(/could not be restored/i),
      ),
    );
  });

  it('keeps the archive destination useful when it is empty', () => {
    const previousGroups = mockMobileState.groups;
    mockMobileState.groups = [activeGroup];

    try {
      const screen = render(<ArchivedGroupsScreen />);
      expect(screen.getByText('No archived groups.')).toBeTruthy();
    } finally {
      mockMobileState.groups = previousGroups;
    }
  });

  it('waits for durable profile persistence and prevents duplicate saves', async () => {
    let resolveSave: ((saved: boolean) => void) | undefined;
    mockMobileState.updateUserSettings.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const screen = render(<SettingsScreen />);
    const saveButton = screen.getByRole('button', { name: 'Save settings' });

    fireEvent.press(saveButton);
    fireEvent.press(saveButton);

    await waitFor(() =>
      expect(saveButton).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ busy: true, disabled: true }),
      ),
    );
    expect(mockMobileState.updateUserSettings).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalledWith('Success', expect.anything());

    act(() => resolveSave?.(true));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Settings saved successfully',
      ),
    );
  });

  it('does not report success when profile persistence rejects', async () => {
    mockMobileState.updateUserSettings.mockRejectedValueOnce(
      new Error('profile write failed'),
    );
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to Save Settings',
        expect.stringMatching(/could not be saved/i),
      ),
    );
    expect(Alert.alert).not.toHaveBeenCalledWith('Success', expect.anything());
  });
});
