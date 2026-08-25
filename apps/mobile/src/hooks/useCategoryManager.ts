import { useState } from 'react';
import { Alert } from 'react-native';
import { useExpenseStore } from '../store/expenseStore';
import { normalizeCategoryColor } from '../theme/category-palette';
import { Category } from '../types';
import { isExpenseDeleted } from '../utils/expenseDomain';
import { isUuid } from '../utils/ids';

interface UseCategoryManagerReturn {
  // Store data
  categories: Category[];
  activeCategories: Category[];
  archivedCategories: Category[];

  // Modal state
  modalVisible: boolean;
  isEditing: Category | null;
  movingCategory: Category | null;

  // Modal actions
  openAddModal: () => void;
  openEditModal: (category: Category) => void;
  closeModal: () => void;

  // Category operations
  saveCategory: (name: string, color: string) => boolean;
  deleteCategory: (categoryId: string) => void;
  restoreCategory: (categoryId: string) => void;
  closeMoveExpenses: () => void;
  moveExpensesToCategory: (category: Category) => void;
  moveTargetCategories: Category[];

  // Helper functions
  canDeleteCategory: (category: Category) => boolean;
  canEditCategory: (category: Category) => boolean;
  canPermanentlyDeleteCategory: (category: Category) => boolean;
}

interface UseCategoryManagerOptions {
  scopeKind?: 'personal' | 'group';
  spaceId?: string;
}

export const useCategoryManager = ({
  scopeKind = 'personal',
  spaceId,
}: UseCategoryManagerOptions = {}): UseCategoryManagerReturn => {
  // Store state and actions
  const categories = useExpenseStore((state) => state.categories);
  const expenses = useExpenseStore((state) => state.expenses);
  const addCategory = useExpenseStore((state) => state.addCategory);
  const updateCategory = useExpenseStore((state) => state.updateCategory);
  const updateExpense = useExpenseStore((state) => state.updateExpense);
  const archiveCategory = useExpenseStore((state) => state.archiveCategory);
  const restoreCategoryFromStore = useExpenseStore(
    (state) => state.restoreCategory,
  );
  const deleteCategoryFromStore = useExpenseStore(
    (state) => state.deleteCategory,
  );
  const personalSpaceId = useExpenseStore((state) => state.personalSpaceId);
  const currentUserId = useExpenseStore(
    (state) => state.user?.id ?? state.internalUserId,
  );

  // Local state for modal management
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState<Category | null>(null);
  const [movingCategory, setMovingCategory] = useState<Category | null>(null);
  const managedScopeKind =
    scopeKind === 'group' && spaceId ? 'group' : 'personal';
  const isCategoryInManagedScope = (category: Category) =>
    category.scopeKind === 'system' ||
    (managedScopeKind === 'group'
      ? category.scopeKind === 'group' && category.spaceId === spaceId
      : !category.scopeKind || category.scopeKind === 'personal');
  const activeCategories = categories.filter(
    (category) => !category.archivedAt && isCategoryInManagedScope(category),
  );
  const archivedCategories = categories.filter(
    (category) =>
      Boolean(category.archivedAt) && isCategoryInManagedScope(category),
  );

  const expensesUsingCategory = (category: Category) =>
    expenses.filter(
      (expense) =>
        !isExpenseDeleted(expense) &&
        (expense.categoryId === category.id ||
          (!expense.categoryId && expense.category === category.name)),
    );

  // Modal actions
  const openAddModal = () => {
    setIsEditing(null);
    setModalVisible(true);
  };

  const openEditModal = (category: Category) => {
    if (!canEditCategory(category)) {
      Alert.alert(
        'System Category',
        'Uncategorized cannot be renamed or deleted.',
      );
      return;
    }
    setIsEditing(category);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setIsEditing(null);
  };

  // Category operations
  const saveCategory = (name: string, color: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Category name cannot be empty.');
      return false;
    }

    const existingCategory = categories.find(
      (category) =>
        category.id !== isEditing?.id &&
        category.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (existingCategory) {
      Alert.alert('Error', 'A category with this name already exists.');
      return false;
    }

    const colorConflict = categories.find(
      (category) =>
        category.id !== isEditing?.id &&
        normalizeCategoryColor(category.color) ===
          normalizeCategoryColor(color),
    );
    if (colorConflict) {
      Alert.alert('Error', 'A category already uses this color.');
      return false;
    }

    if (isEditing) {
      // Update existing category
      const updatedCategory: Category = {
        ...isEditing,
        name: trimmedName,
        color,
      };

      updateCategory(updatedCategory);
    } else {
      // Create new category
      addCategory({
        name: trimmedName,
        color,
        scopeKind: managedScopeKind,
        spaceId: managedScopeKind === 'group' ? spaceId : personalSpaceId,
        ...(currentUserId ? { createdByUserId: currentUserId } : {}),
      });
    }

    return true;
  };

  const deleteCategory = (categoryId: string) => {
    const categoryToDelete = categories.find((c) => c.id === categoryId);

    if (!categoryToDelete) {
      return;
    }

    if (!canDeleteCategory(categoryToDelete)) {
      Alert.alert('Error', 'Default categories cannot be deleted.');
      return;
    }

    const usageCount = expensesUsingCategory(categoryToDelete).length;
    if (usageCount > 0) {
      Alert.alert(
        `Archive “${categoryToDelete.name}”?`,
        `This category is used by ${usageCount} ${usageCount === 1 ? 'expense' : 'expenses'}. Existing expenses will keep their category, but it will no longer appear for new expenses.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Move Expenses…',
            onPress: () => setMovingCategory(categoryToDelete),
          },
          {
            text: 'Archive',
            onPress: () => archiveCategory(categoryId),
          },
        ],
      );
      return;
    }

    Alert.alert('Delete Category?', 'This permanently removes the category.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCategoryFromStore(categoryId),
      },
    ]);
  };

  const closeMoveExpenses = () => setMovingCategory(null);

  const moveTargetCategories = activeCategories.filter(
    (category) => category.id !== movingCategory?.id,
  );

  const moveExpensesToCategory = (targetCategory: Category) => {
    if (!movingCategory || targetCategory.archivedAt) {
      return;
    }
    expensesUsingCategory(movingCategory).forEach((expense) => {
      updateExpense({
        ...expense,
        category: targetCategory.name,
        categoryId: isUuid(targetCategory.id) ? targetCategory.id : undefined,
        categorySnapshot: {
          name: targetCategory.name,
          color: targetCategory.color,
        },
      });
    });
    archiveCategory(movingCategory.id);
    setMovingCategory(null);
  };

  const restoreCategory = (categoryId: string) => {
    restoreCategoryFromStore(categoryId);
  };

  // Helper functions
  const canDeleteCategory = (category: Category): boolean => {
    return category.isDefault !== true;
  };

  const canEditCategory = (category: Category): boolean =>
    !(category.isSystem && category.name === 'Uncategorized');

  const canPermanentlyDeleteCategory = (category: Category): boolean =>
    canDeleteCategory(category) && expensesUsingCategory(category).length === 0;

  return {
    // Store data
    categories,
    activeCategories,
    archivedCategories,

    // Modal state
    modalVisible,
    isEditing,
    movingCategory,

    // Modal actions
    openAddModal,
    openEditModal,
    closeModal,

    // Category operations
    saveCategory,
    deleteCategory,
    restoreCategory,
    closeMoveExpenses,
    moveExpensesToCategory,
    moveTargetCategories,

    // Helper functions
    canDeleteCategory,
    canEditCategory,
    canPermanentlyDeleteCategory,
  };
};
