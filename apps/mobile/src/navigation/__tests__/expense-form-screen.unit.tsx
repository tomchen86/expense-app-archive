import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import {
  router,
  Stack,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';

import AddExpenseScreen from '../../../app/add-expense';
import type { Expense } from '../../types';

const mockScrollNoteIntoView = jest.fn();
let keyboardDidShowListener: (() => void) | undefined;

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
    Animated: {
      Value: class AnimatedValue {
        value: number;

        constructor(value: number) {
          this.value = value;
        }

        setValue(value: number) {
          this.value = value;
        }
      },
      View: host('AnimatedView'),
      timing: (value: { setValue: (next: number) => void }, config: any) => ({
        start: (callback?: (result: { finished: boolean }) => void) => {
          value.setValue(config.toValue);
          callback?.({ finished: true });
        },
      }),
    },
    Button: ({ title, ...props }: any) =>
      React.createElement(
        'View',
        {
          accessible: true,
          accessibilityLabel: title,
          accessibilityRole: 'button',
          ...props,
        },
        title,
      ),
    Keyboard: {
      addListener: (eventName: string, listener: () => void) => {
        if (eventName === 'keyboardDidShow') {
          keyboardDidShowListener = listener;
        }
        return { remove: jest.fn() };
      },
    },
    Platform: {
      OS: 'ios',
      select: (selection: Record<string, unknown>) =>
        selection.ios ?? selection.default,
    },
    ScrollView: React.forwardRef(function MockScrollView(
      { children, ...props }: any,
      ref: React.ForwardedRef<unknown>,
    ) {
      React.useImperativeHandle(ref, () => ({
        scrollTo: mockScrollNoteIntoView,
      }));
      return React.createElement('ScrollView', props, children);
    }),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
      hairlineWidth: 1,
    },
    Switch: host('Switch', true),
    Text: host('Text'),
    TextInput: host('TextInput', true),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

jest.mock('../../components/ExpenseForm/ExpenseModals', () => ({
  ExpenseModals: () => null,
}));

const mockHandleSubmit = jest.fn();
const mockDiscardChanges = jest.fn(async () => true);
const mockHandleSharingChange = jest.fn();
const mockUseExpenseForm = jest.fn();
const mockSetShowGroupModal = jest.fn();
const mockHandleGroupClear = jest.fn();
const mockNavigationDispatch = jest.fn();
const mockNavigationAddListener = jest.fn();
const mockExpenses: Expense[] = [];
let beforeRemoveListener:
  | ((event: { data: { action: unknown }; preventDefault: jest.Mock }) => void)
  | undefined;

jest.mock('../../hooks/useExpenseForm', () => ({
  useExpenseForm: (...args: unknown[]) => mockUseExpenseForm(...args),
}));

jest.mock('../../hooks/useExpenseModals', () => ({
  useExpenseModals: () => ({
    showCategoryModal: false,
    setShowCategoryModal: jest.fn(),
    showGroupModal: false,
    setShowGroupModal: mockSetShowGroupModal,
    showPaidByModal: false,
    setShowPaidByModal: jest.fn(),
    showSplitModal: false,
    setShowSplitModal: jest.fn(),
    availableParticipants: [],
    categoryModalData: ['Other'],
    handleCategorySelect: jest.fn(),
    handleGroupSelect: jest.fn(),
    handleGroupClear: mockHandleGroupClear,
    handleParticipantSelect: jest.fn(),
    ADD_NEW_CATEGORY_ACTION: '+ Add New Category',
  }),
}));

jest.mock('../../store/expenseStore', () => ({
  useExpenseStore: (selector: (state: unknown) => unknown) =>
    selector({ expenses: mockExpenses, settings: { currency: 'USD' } }),
}));

const baseFormState = {
  title: '',
  amount: '',
  date: new Date(2026, 7, 24),
  caption: '',
  category: 'Other',
  selectedGroup: null,
  paidByParticipant: null,
  selectedParticipants: [],
};

const buildHookResult = (overrides: Record<string, unknown> = {}) => ({
  formState: baseFormState,
  setFormState: jest.fn(),
  handleUpdateFormState: jest.fn(),
  handleRemoveParticipant: jest.fn(),
  onChangeDate: jest.fn(),
  handleSubmit: mockHandleSubmit,
  discardChanges: mockDiscardChanges,
  handleSharingChange: mockHandleSharingChange,
  isEditing: false,
  isDirty: false,
  hasPendingMutation: false,
  isRollbackPending: false,
  isSubmitting: false,
  canSubmit: false,
  financialEditingDisabled: false,
  financialEditingReason: undefined,
  groups: [],
  participants: [],
  sharingEnabled: false,
  sharingLocked: false,
  ...overrides,
});

describe('AddExpenseScreen native task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    keyboardDidShowListener = undefined;
    beforeRemoveListener = undefined;
    mockExpenses.splice(0);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      draftSessionId: 'screen-draft-session',
    });
    mockNavigationAddListener.mockImplementation(
      (eventName: string, listener: typeof beforeRemoveListener) => {
        if (eventName === 'beforeRemove') {
          beforeRemoveListener = listener;
        }
        return jest.fn();
      },
    );
    (useNavigation as jest.Mock).mockReturnValue({
      addListener: mockNavigationAddListener,
      dispatch: mockNavigationDispatch,
    });
    mockUseExpenseForm.mockReturnValue(buildHookResult());
  });

  it('keeps one non-collapsible native root across form-sheet reopens', () => {
    const firstOpen = render(<AddExpenseScreen />);

    expect(firstOpen.getByTestId('expense-form-screen')).toHaveProp(
      'collapsable',
      false,
    );
    firstOpen.unmount();

    const secondOpen = render(<AddExpenseScreen />);
    expect(secondOpen.getByTestId('expense-form-screen')).toHaveProp(
      'collapsable',
      false,
    );
  });

  it('keeps the expanded note above the keyboard after its first focus', () => {
    const screen = render(<AddExpenseScreen />);

    fireEvent(screen.getByTestId('expense-note-section'), 'layout', {
      nativeEvent: { layout: { y: 320 } },
    });
    fireEvent(screen.getByTestId('expense-caption-input'), 'focus');

    expect(mockScrollNoteIntoView).toHaveBeenCalledWith({
      animated: true,
      y: 304,
    });

    act(() => keyboardDidShowListener?.());
    expect(mockScrollNoteIntoView).toHaveBeenCalledTimes(2);

    fireEvent(screen.getByTestId('expense-caption-input'), 'blur');
    act(() => keyboardDidShowListener?.());
    expect(mockScrollNoteIntoView).toHaveBeenCalledTimes(2);
  });

  it('uses modal navigation actions and progressive sharing', () => {
    const screen = render(<AddExpenseScreen />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProp(
      'variant',
      'plain',
    );
    expect(screen.getByRole('button', { name: 'Add' })).toHaveProp(
      'disabled',
      true,
    );
    expect(screen.getByRole('button', { name: 'Add' })).toHaveProp(
      'variant',
      'prominent',
    );
    expect(screen.getByTestId('expense-amount-input')).toHaveProp(
      'keyboardType',
      'decimal-pad',
    );
    const sharingToggle = screen.getByRole('switch', {
      name: 'Split with others',
    });
    expect(sharingToggle).toHaveProp('value', false);
    expect(screen.queryByText('Group')).toBeNull();
    expect(screen.queryByText('Add Expense')).toBeNull();
    expect(screen.queryByText('2026-08-24')).toBeNull();
    expect(screen.queryByTestId('native-date-picker')).toBeNull();
    expect(screen.getByTestId('date-picker')).toHaveProp(
      'accessibilityLabel',
      'Date, Aug 24, 2026',
    );

    fireEvent.press(screen.getByTestId('date-picker'));
    expect(screen.getByTestId('native-date-picker')).toHaveProp(
      'maximumDate',
      expect.any(Date),
    );

    fireEvent(sharingToggle, 'valueChange', true);
    expect(mockHandleSharingChange).toHaveBeenCalledWith(true);
    expect(mockSetShowGroupModal).toHaveBeenCalledWith(true);

    mockUseExpenseForm.mockReturnValue(
      buildHookResult({ sharingEnabled: true }),
    );
    screen.rerender(<AddExpenseScreen />);
    expect(screen.getByText('Group')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockDiscardChanges).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);

    const latestScreenOptions = (
      Stack.Screen as unknown as jest.Mock
    ).mock.calls.at(-1)?.[0]?.options;
    expect(latestScreenOptions).toEqual(
      expect.objectContaining({
        gestureEnabled: true,
        title: 'New Expense',
      }),
    );
  });

  it('locks shared editing controls and disables dismissal while submitting', () => {
    const editingExpense: Expense = {
      id: 'expense-shared',
      title: 'Shared dinner',
      amountMinor: 2400,
      currency: 'USD',
      date: '2026-08-24',
      category: 'Other',
      spaceKind: 'shared',
      spaceId: 'group-1',
      payments: [{ participantId: 'me', amountMinor: 2400 }],
      shares: [{ participantId: 'me', amountMinor: 2400 }],
    };
    mockExpenses.push(editingExpense);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      draftSessionId: `edit:${editingExpense.id}`,
      expenseId: editingExpense.id,
    });
    mockUseExpenseForm.mockReturnValue(
      buildHookResult({
        formState: {
          ...baseFormState,
          selectedGroup: { id: 'group-1', name: 'Trip', participants: [] },
        },
        isEditing: true,
        isSubmitting: true,
        sharingEnabled: true,
        sharingLocked: true,
      }),
    );

    const screen = render(<AddExpenseScreen />);
    expect(
      screen.getByRole('switch', { name: 'Split with others' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    const latestScreenOptions = (
      Stack.Screen as unknown as jest.Mock
    ).mock.calls.at(-1)?.[0]?.options;
    expect(latestScreenOptions.gestureEnabled).toBe(false);
  });

  it('locks form interactions while persistence is in flight', () => {
    mockUseExpenseForm.mockReturnValue(
      buildHookResult({ isDirty: true, isSubmitting: true }),
    );
    const screen = render(<AddExpenseScreen />);

    expect(screen.getByTestId('expense-title-input')).toHaveProp(
      'editable',
      false,
    );
    expect(screen.getByTestId('expense-amount-input')).toHaveProp(
      'editable',
      false,
    );
    expect(screen.getByTestId('category-picker')).toBeDisabled();
    expect(screen.getByTestId('date-picker')).toBeDisabled();
    expect(screen.getByTestId('sharing-toggle')).toBeDisabled();
  });

  it('uses Save for editing and confirms a dirty cancellation', () => {
    const editingExpense: Expense = {
      id: 'expense-1',
      title: 'Dinner',
      amountMinor: 2400,
      currency: 'USD',
      date: '2026-08-24',
      category: 'Other',
      spaceKind: 'personal',
      spaceId: 'personal-space',
      payments: [{ participantId: 'me', amountMinor: 2400 }],
      shares: [{ participantId: 'me', amountMinor: 2400 }],
    };
    mockExpenses.push(editingExpense);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      expenseId: editingExpense.id,
    });
    mockUseExpenseForm.mockReturnValue(
      buildHookResult({
        canSubmit: true,
        formState: {
          ...baseFormState,
          title: editingExpense.title,
          amount: '24.00',
        },
        isDirty: true,
        isEditing: true,
      }),
    );
    const screen = render(<AddExpenseScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Changes?',
      'Your changes will not be saved.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Keep Editing' }),
        expect.objectContaining({ text: 'Discard', style: 'destructive' }),
      ]),
    );
    expect(router.back).not.toHaveBeenCalled();

    const latestScreenOptions = (
      Stack.Screen as unknown as jest.Mock
    ).mock.calls.at(-1)?.[0]?.options;
    expect(latestScreenOptions).toEqual(
      expect.objectContaining({
        gestureEnabled: false,
        title: 'Edit Expense',
      }),
    );
  });

  it('rolls back a dirty draft before dispatching a non-toolbar removal', async () => {
    mockUseExpenseForm.mockReturnValue(buildHookResult({ isDirty: true }));
    render(<AddExpenseScreen />);
    const action = { type: 'GO_BACK' };
    const event = { data: { action }, preventDefault: jest.fn() };

    beforeRemoveListener?.(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockNavigationDispatch).not.toHaveBeenCalled();

    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      onPress?: () => void;
      text: string;
    }>;
    await act(async () => {
      buttons.find((button) => button.text === 'Discard')?.onPress?.();
      await Promise.resolve();
    });

    expect(mockDiscardChanges).toHaveBeenCalledTimes(1);
    expect(mockNavigationDispatch).toHaveBeenCalledWith(action);
  });

  it('ends a clean draft session without blocking native removal', () => {
    render(<AddExpenseScreen />);
    const event = {
      data: { action: { type: 'GO_BACK' } },
      preventDefault: jest.fn(),
    };

    beforeRemoveListener?.(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockDiscardChanges).toHaveBeenCalledTimes(1);
    expect(mockNavigationDispatch).not.toHaveBeenCalled();
  });

  it('keeps the route when rollback persistence fails', async () => {
    mockDiscardChanges.mockResolvedValueOnce(false);
    mockUseExpenseForm.mockReturnValue(buildHookResult({ isDirty: true }));
    render(<AddExpenseScreen />);
    const event = {
      data: { action: { type: 'GO_BACK' } },
      preventDefault: jest.fn(),
    };

    beforeRemoveListener?.(event);
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      onPress?: () => void;
      text: string;
    }>;
    await act(async () => {
      buttons.find((button) => button.text === 'Discard')?.onPress?.();
      await Promise.resolve();
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockNavigationDispatch).not.toHaveBeenCalled();
  });

  it('treats a pending mutation as unsaved even if React dirty state is false', async () => {
    mockDiscardChanges.mockResolvedValueOnce(false);
    mockUseExpenseForm.mockReturnValue(
      buildHookResult({ hasPendingMutation: true, isDirty: false }),
    );
    render(<AddExpenseScreen />);
    const event = {
      data: { action: { type: 'GO_BACK' } },
      preventDefault: jest.fn(),
    };

    beforeRemoveListener?.(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockDiscardChanges).not.toHaveBeenCalled();
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      onPress?: () => void;
      text: string;
    }>;
    await act(async () => {
      buttons.find((button) => button.text === 'Discard')?.onPress?.();
      await Promise.resolve();
    });

    expect(mockDiscardChanges).toHaveBeenCalledTimes(1);
    expect(mockNavigationDispatch).not.toHaveBeenCalled();
  });

  it('blocks removal during submission and bypasses the guard after save', () => {
    mockUseExpenseForm.mockReturnValue(
      buildHookResult({ canSubmit: true, isDirty: true, isSubmitting: true }),
    );
    render(<AddExpenseScreen />);
    const blockedEvent = {
      data: { action: { type: 'GO_BACK' } },
      preventDefault: jest.fn(),
    };
    beforeRemoveListener?.(blockedEvent);
    expect(blockedEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();

    const onSaved = mockUseExpenseForm.mock.calls.at(-1)?.[0]?.onSaved as
      (() => void) | undefined;
    onSaved?.();
    const successfulEvent = {
      data: { action: { type: 'GO_BACK' } },
      preventDefault: jest.fn(),
    };
    beforeRemoveListener?.(successfulEvent);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(successfulEvent.preventDefault).not.toHaveBeenCalled();
  });
});
