import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Category } from '../../types';
import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';
import { AdaptiveSwipeAction } from '../ui/adaptive-swipe-action';

interface CategoryListItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onRestore?: (categoryId: string) => void;
  archived?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  isLast?: boolean;
}

const CategoryListItem: React.FC<CategoryListItemProps> = ({
  category,
  onEdit,
  onDelete,
  onRestore,
  archived = false,
  canDelete = true,
  canEdit = true,
  isLast = false,
}) => {
  const displayName = category.name.trim() || 'Unnamed Category';
  const renderRightActions = (
    _progress: unknown,
    _translation: unknown,
    swipeable: SwipeableMethods,
  ) => (
    <AdaptiveSwipeAction
      accessibilityLabel={
        archived
          ? `Permanently delete ${displayName} category`
          : `Delete ${displayName} category`
      }
      accessibilityRole='button'
      label={archived ? 'Delete' : 'Remove'}
      onPress={() => {
        swipeable.close();
        onDelete(category.id);
      }}
      tone='destructive'
    />
  );

  const renderContent = () => (
    <TouchableOpacity
      accessibilityActions={
        canDelete ? [{ label: 'Delete category', name: 'delete' }] : undefined
      }
      accessibilityHint={
        archived
          ? 'Restores this category for new expenses.'
          : canDelete
            ? 'Opens the category editor. Swipe left to delete.'
            : canEdit
              ? 'Opens the category editor.'
              : 'This system category cannot be edited or deleted.'
      }
      accessibilityLabel={
        archived
          ? `Restore ${displayName} category`
          : canEdit
            ? `Edit ${displayName} category`
            : `${displayName} system category`
      }
      accessibilityRole={archived || canEdit ? 'button' : 'text'}
      disabled={!archived && !canEdit}
      onAccessibilityAction={(event) => {
        if (canDelete && event.nativeEvent.actionName === 'delete') {
          onDelete(category.id);
        }
      }}
      onPress={() => {
        if (archived) {
          onRestore?.(category.id);
        } else if (canEdit) {
          onEdit(category);
        }
      }}
      activeOpacity={0.7}
      style={[styles.itemContainer, isLast && styles.lastItem]}
      testID={`category-row-${category.id}`}
    >
      <View style={[styles.colorDot, { backgroundColor: category.color }]} />
      <Text numberOfLines={1} style={styles.itemName}>
        {displayName}
      </Text>
      {archived ? <Text style={styles.restoreText}>Restore</Text> : null}
    </TouchableOpacity>
  );

  // The reserved Uncategorized row has no destructive swipe action.
  if (!canDelete) {
    return renderContent();
  }

  return (
    <ReanimatedSwipeable
      overshootRight={false}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      testID={`category-swipeable-${category.id}`}
    >
      {renderContent()}
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: semanticColors.separator,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 15,
    borderWidth: 1,
    borderColor: semanticColors.separator,
  },
  itemName: {
    fontSize: 16,
    color: semanticColors.text,
    flex: 1,
  },
  restoreText: {
    color: semanticColors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CategoryListItem;
