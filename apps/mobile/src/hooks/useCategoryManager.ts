import { useState } from 'react';
import { Alert } from 'react-native';
import { useExpenseStore } from '../store/expenseStore';
import { normalizeCategoryColor } from '../theme/category-palette';
import { Category } from '../types';

interface UseCategoryManagerReturn {
  // Store data
  categories: Category[];

  // Modal state
  modalVisible: boolean;
  isEditing: Category | null;

  // Modal actions
  openAddModal: () => void;
  openEditModal: (category: Category) => void;
  closeModal: () => void;

  // Category operations
  saveCategory: (name: string, color: string) => boolean;
  deleteCategory: (categoryId: string) => void;

  // Helper functions
  canDeleteCategory: (category: Category) => boolean;
}

export const useCategoryManager = (): UseCategoryManagerReturn => {
  // Store state and actions
  const categories = useExpenseStore((state) => state.categories);
  const addCategory = useExpenseStore((state) => state.addCategory);
  const updateCategory = useExpenseStore((state) => state.updateCategory);
  const deleteCategoryFromStore = useExpenseStore(
    (state) => state.deleteCategory,
  );

  // Local state for modal management
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState<Category | null>(null);

  // Modal actions
  const openAddModal = () => {
    setIsEditing(null);
    setModalVisible(true);
  };

  const openEditModal = (category: Category) => {
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
      addCategory({ name: trimmedName, color });
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

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${categoryToDelete.name}"? Expenses using this category might be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategoryFromStore(categoryId),
        },
      ],
    );
  };

  // Helper functions
  const canDeleteCategory = (category: Category): boolean => {
    return category.isDefault !== true;
  };

  return {
    // Store data
    categories,

    // Modal state
    modalVisible,
    isEditing,

    // Modal actions
    openAddModal,
    openEditModal,
    closeModal,

    // Category operations
    saveCategory,
    deleteCategory,

    // Helper functions
    canDeleteCategory,
  };
};
