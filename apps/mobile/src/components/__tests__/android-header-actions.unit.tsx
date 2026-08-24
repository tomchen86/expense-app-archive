import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ExpenseFormHeaderActions } from '../ExpenseForm/expense-form-header-actions.android';
import { ExpenseDetailHeaderActions } from '../navigation/expense-detail-header-actions.android';
import { GroupDetailHeaderActions } from '../navigation/group-detail-header-actions.android';
import InsightsChartHeaderAction from '../insights/insights-chart-header-action.android';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string, accessible = false) =>
    function HostComponent({ children, style, ...props }: any) {
      return React.createElement(
        name,
        accessible
          ? { accessible: true, ...props, style }
          : { ...props, style },
        children,
      );
    };

  return {
    Alert: { alert: jest.fn() },
    Pressable: ({ children, style, ...props }: any) =>
      React.createElement(
        'View',
        {
          accessible: true,
          ...props,
          style:
            typeof style === 'function' ? style({ pressed: false }) : style,
        },
        children,
      ),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    View: host('View'),
  };
});

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return ({ name, ...props }: { name: string }) =>
    React.createElement('Text', {
      ...props,
      testID: `material-icon-${name}`,
    });
});

describe('Android native-stack header actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps Cancel and Add reachable in the expense modal top app bar', () => {
    const onCancel = jest.fn();
    const onSubmit = jest.fn();
    const screen = render(
      <ExpenseFormHeaderActions
        isEditing={false}
        isSubmitting={false}
        canSubmit
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId('material-icon-close', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(
      screen.getByTestId('material-icon-check', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
  });

  it('exposes a disabled Save action while an edit is persisting', () => {
    const screen = render(
      <ExpenseFormHeaderActions
        isEditing
        isSubmitting
        canSubmit
        onCancel={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('keeps Edit and overflow Delete reachable on expense details', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const screen = render(
      <ExpenseDetailHeaderActions
        deleteDisabled={false}
        editDisabled={false}
        onDelete={onDelete}
        onEdit={onEdit}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Edit expense' }));
    fireEvent.press(screen.getByRole('button', { name: 'Expense actions' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Expense actions',
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
    );
    const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    actions
      .find((action: { text: string }) => action.text === 'Delete')
      .onPress();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('keeps archived expense actions visible but disabled', () => {
    const screen = render(
      <ExpenseDetailHeaderActions
        deleteDisabled
        editDisabled
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit expense' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Expense actions' }),
    ).toBeDisabled();
  });

  it('opens the group Members action from a visible overflow button', () => {
    const onOpenMembers = jest.fn();
    const screen = render(
      <GroupDetailHeaderActions onOpenMembers={onOpenMembers} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Group actions' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Group actions',
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Members' }),
      ]),
    );
    const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    actions
      .find((action: { text: string }) => action.text === 'Members')
      .onPress();
    expect(onOpenMembers).toHaveBeenCalledTimes(1);
  });

  it('opens the persisted Insights visualization choices', () => {
    const onChange = jest.fn();
    const screen = render(
      <InsightsChartHeaderAction onChange={onChange} preference='auto' />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Chart visualization, auto selected',
      }),
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      'Chart visualization',
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Auto, selected' }),
        expect.objectContaining({ text: 'Donut' }),
        expect.objectContaining({ text: 'Bar' }),
      ]),
    );
    const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    actions.find((action: { text: string }) => action.text === 'Bar').onPress();
    expect(onChange).toHaveBeenCalledWith('bar');
  });
});
