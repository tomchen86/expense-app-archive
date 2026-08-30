import React from 'react';
import { render } from '@testing-library/react-native';

import { ExpenseModals } from '../ExpenseForm/ExpenseModals';

jest.mock('react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) =>
    function HostComponent({ children, ...props }: any) {
      return React.createElement(name, props, children);
    };
  return {
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (style: unknown) => style,
    },
    Text: host('Text'),
    View: host('View'),
  };
});

jest.mock('../SelectionModal', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return function MockSelectionModal(props: Record<string, unknown>) {
    return React.createElement('View', {
      ...props,
      testID: `selection-${String(props.title)}`,
    });
  };
});

describe('Expense modal copy', () => {
  it('uses a concise native title for category selection', () => {
    const screen = render(
      <ExpenseModals
        ADD_NEW_CATEGORY_ACTION='+ Add New Category'
        availableParticipants={[]}
        categoryModalData={['Food & Dining']}
        groups={[]}
        onCategorySelect={jest.fn()}
        onCloseCategoryModal={jest.fn()}
        onCloseGroupModal={jest.fn()}
        onClosePaidByModal={jest.fn()}
        onCloseSplitModal={jest.fn()}
        onGroupClear={jest.fn()}
        onGroupSelect={jest.fn()}
        onPaidBySelect={jest.fn()}
        onParticipantToggle={jest.fn()}
        selectedCategory='Food & Dining'
        selectedGroup={null}
        selectedPaidBy={null}
        selectedParticipants={[]}
        showCategoryModal
        showGroupModal={false}
        showPaidByModal={false}
        showSplitModal={false}
      />,
    );

    expect(screen.getByTestId('selection-Category')).toBeTruthy();
    expect(screen.queryByTestId('selection-Select Category')).toBeNull();
  });
});
