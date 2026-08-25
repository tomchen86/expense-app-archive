import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import ManageCategoriesScreen from '../../../app/manage-categories';
import { semanticColors } from '../../theme/semantic-colors';
import type { Category } from '../../types';
import CategoryListItem from '../categories/CategoryListItem';

const mockOpenAddModal = jest.fn();
const mockOpenEditModal = jest.fn();
const mockDeleteCategory = jest.fn();

const mockCategories: Category[] = [
  {
    id: 'Food & Dining',
    name: 'Food & Dining',
    color: '#FF6384',
    isDefault: true,
  },
  {
    id: 'custom-category',
    name: 'Fitness',
    color: '#36A2EB',
    isDefault: false,
  },
];

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
        'FlatList',
        props,
        data?.map((item: Category, index: number) =>
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
      flatten: (style: unknown): Record<string, unknown> | undefined => {
        if (!style) return undefined;
        if (Array.isArray(style)) {
          return Object.assign({}, ...style.flat().filter(Boolean));
        }
        return style as Record<string, unknown>;
      },
      hairlineWidth: 1,
    },
    Text: host('Text'),
    TouchableOpacity: host('View', true),
    View: host('View'),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Toolbar = ({ children, ...props }: any) =>
    React.createElement('Toolbar', props, children);
  Toolbar.Button = ({ children, ...props }: any) =>
    React.createElement(
      'ToolbarButton',
      { accessible: true, ...props },
      children,
    );

  return { Stack: { Toolbar } };
});

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { Text: 'Text' },
  interpolate: jest.fn(() => 0),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Swipeable: ({ children, ...props }: any) =>
      React.createElement('Swipeable', props, children),
  };
});

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement('Swipeable', props, children),
  };
});

jest.mock('../../hooks/useCategoryManager', () => ({
  useCategoryManager: () => ({
    canDeleteCategory: (category: Category) => !category.isDefault,
    categories: mockCategories,
    closeModal: jest.fn(),
    deleteCategory: mockDeleteCategory,
    isEditing: null,
    modalVisible: false,
    openAddModal: mockOpenAddModal,
    openEditModal: mockOpenEditModal,
    saveCategory: jest.fn(),
  }),
}));

jest.mock('../categories/CategoryForm', () => () => null);

describe('native category management UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the native navigation title once and exposes Add in the toolbar', () => {
    const screen = render(<ManageCategoriesScreen />);

    expect(screen.queryByText('Manage Categories')).toBeNull();
    expect(screen.queryByText('+ Add New Category')).toBeNull();
    expect(
      screen.getByText(
        'Tap a category to edit. Swipe left on custom categories to delete.',
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Add category'));
    expect(mockOpenAddModal).toHaveBeenCalledTimes(1);
  });

  it('does not expose administration labels on protected default rows', () => {
    const screen = render(
      <CategoryListItem
        canDelete={false}
        category={mockCategories[0]}
        isLast
        onDelete={mockDeleteCategory}
        onEdit={mockOpenEditModal}
      />,
    );

    expect(screen.getByText('Food & Dining')).toBeTruthy();
    expect(screen.queryByText('Protected')).toBeNull();
    expect(screen.queryByTestId('category-swipeable-Food & Dining')).toBeNull();
  });

  it('uses the semantic destructive swipe action for custom categories', () => {
    const screen = render(
      <CategoryListItem
        canDelete
        category={mockCategories[1]}
        isLast
        onDelete={mockDeleteCategory}
        onEdit={mockOpenEditModal}
      />,
    );
    const swipeable = screen.getByTestId('category-swipeable-custom-category');
    const close = jest.fn();
    const action = render(
      swipeable.props.renderRightActions(undefined, undefined, { close }),
    );
    const deleteButton = action.getByRole('button', {
      name: 'Delete Fitness category',
    });

    expect(deleteButton).toHaveStyle({
      backgroundColor: semanticColors.destructive,
    });
    fireEvent.press(deleteButton);
    expect(close).toHaveBeenCalledTimes(1);
    expect(mockDeleteCategory).toHaveBeenCalledWith('custom-category');
  });
});
