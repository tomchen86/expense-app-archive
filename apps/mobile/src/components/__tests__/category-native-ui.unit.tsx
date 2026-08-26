import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import ManageCategoriesScreen from '../../../app/manage-categories';
import { semanticColors } from '../../theme/semantic-colors';
import type { Category } from '../../types';
import CategoryListItem from '../categories/CategoryListItem';

const mockOpenAddModal = jest.fn();
const mockOpenEditModal = jest.fn();
const mockDeleteCategory = jest.fn();
const mockRestoreCategory = jest.fn();

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
    Alert: { alert: jest.fn() },
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
    Pressable: host('Pressable', true),
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

jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Ionicons: (props: Record<string, unknown>) =>
      React.createElement('Ionicons', props),
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Screen = () => null;
  const Toolbar = ({ children, ...props }: any) =>
    React.createElement('Toolbar', props, children);
  Toolbar.Button = ({ children, ...props }: any) =>
    React.createElement(
      'ToolbarButton',
      { accessible: true, ...props },
      children,
    );

  return { Stack: { Screen, Toolbar }, useLocalSearchParams: () => ({}) };
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
    canDeleteCategory: (category: Category) =>
      category.name !== 'Uncategorized',
    categories: mockCategories,
    activeCategories: mockCategories,
    archivedCategories: [],
    canEditCategory: () => true,
    canPermanentlyDeleteCategory: () => false,
    closeMoveExpenses: jest.fn(),
    closeModal: jest.fn(),
    deleteCategory: mockDeleteCategory,
    isEditing: null,
    moveExpensesToCategory: jest.fn(),
    moveTargetCategories: [],
    modalVisible: false,
    movingCategory: null,
    openAddModal: mockOpenAddModal,
    openEditModal: mockOpenEditModal,
    restoreCategory: mockRestoreCategory,
    saveCategory: jest.fn(),
  }),
}));

jest.mock('../categories/CategoryForm', () => () => null);
jest.mock('../SelectionModal', () => () => null);

describe('native category management UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the native navigation title once and exposes Add in the toolbar', () => {
    const screen = render(<ManageCategoriesScreen />);

    expect(screen.queryByText('Manage Categories')).toBeNull();
    expect(screen.queryByText('+ Add New Category')).toBeNull();
    expect(
      screen.queryByText(
        'Tap a category to edit. Removing a category in use will offer Archive or explicit reclassification.',
      ),
    ).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'About categories' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'About Categories',
      expect.stringContaining('Uncategorized is reserved'),
    );

    fireEvent.press(screen.getByLabelText('Add category'));
    expect(mockOpenAddModal).toHaveBeenCalledTimes(1);
  });

  it('does not expose administration labels on a reserved system row', () => {
    const screen = render(
      <CategoryListItem
        canDelete={false}
        category={{
          id: 'Uncategorized',
          name: 'Uncategorized',
          color: '#888888',
          isDefault: true,
          isSystem: true,
        }}
        isLast
        onDelete={mockDeleteCategory}
        onEdit={mockOpenEditModal}
      />,
    );

    expect(screen.getByText('Uncategorized')).toBeTruthy();
    expect(screen.queryByText('Protected')).toBeNull();
    expect(screen.queryByTestId('category-swipeable-Uncategorized')).toBeNull();
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

  it('keeps the row separator independent from pressed content opacity', () => {
    const screen = render(
      <CategoryListItem
        canDelete
        category={mockCategories[1]}
        onDelete={mockDeleteCategory}
        onEdit={mockOpenEditModal}
      />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('category-row-custom-category').props.style,
      ),
    ).not.toHaveProperty('borderBottomWidth');
    expect(
      screen.getByTestId('category-separator-custom-category'),
    ).toHaveStyle({
      backgroundColor: semanticColors.separator,
      height: StyleSheet.hairlineWidth,
    });
  });

  it('makes an archived category explicitly restorable', () => {
    const archivedCategory: Category = {
      id: 'archived-category',
      name: 'Coffee',
      color: '#111111',
      archivedAt: '2026-08-25T00:00:00.000Z',
    };
    const screen = render(
      <CategoryListItem
        archived
        canDelete={false}
        category={archivedCategory}
        isLast
        onDelete={mockDeleteCategory}
        onEdit={mockOpenEditModal}
        onRestore={mockRestoreCategory}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', { name: 'Restore Coffee category' }),
    );
    expect(mockRestoreCategory).toHaveBeenCalledWith(archivedCategory.id);
    expect(mockOpenEditModal).not.toHaveBeenCalled();
  });
});
