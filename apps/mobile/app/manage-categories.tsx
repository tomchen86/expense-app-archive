import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import { useCategoryManager } from '../src/hooks/useCategoryManager';
import CategoryForm from '../src/components/categories/CategoryForm';
import CategoryListItem from '../src/components/categories/CategoryListItem';
import { AdaptiveGroupedScreen } from '../src/components/ui/adaptive-grouped-list';
import { AdaptiveGroupedSection } from '../src/components/ui/adaptive-grouped-list';
import { semanticColors } from '../src/theme/semantic-colors';
import { mobileTheme } from '../src/theme/tokens';

const ManageCategoriesScreen = () => {
  const categoryManager = useCategoryManager();

  return (
    <AdaptiveGroupedScreen>
      <Stack.Toolbar placement='right'>
        <Stack.Toolbar.Button
          accessibilityLabel='Add category'
          icon='plus'
          onPress={categoryManager.openAddModal}
        />
      </Stack.Toolbar>

      <ScrollView
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>CATEGORIES</Text>
        <AdaptiveGroupedSection>
          {categoryManager.categories.map((category, index) => (
            <CategoryListItem
              canDelete={categoryManager.canDeleteCategory(category)}
              category={category}
              isLast={index === categoryManager.categories.length - 1}
              key={category.id}
              onDelete={categoryManager.deleteCategory}
              onEdit={categoryManager.openEditModal}
            />
          ))}
        </AdaptiveGroupedSection>
        <Text style={styles.footerText}>
          Tap a category to edit. Swipe left on custom categories to delete.
        </Text>

        <Text style={styles.footerText}>
          Default categories can be edited but not deleted.
        </Text>
      </ScrollView>

      <CategoryForm
        editingCategory={categoryManager.isEditing}
        onClose={categoryManager.closeModal}
        onSave={categoryManager.saveCategory}
        usedColors={categoryManager.categories.map(
          (category) => category.color,
        )}
        visible={categoryManager.modalVisible}
      />
    </AdaptiveGroupedScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.lg,
    paddingBottom: mobileTheme.spacing.xxxl,
  },
  sectionLabel: {
    color: semanticColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.md,
  },
  footerText: {
    color: semanticColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.sm,
  },
});

export default ManageCategoriesScreen;
