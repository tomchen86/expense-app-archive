import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { useCategoryManager } from '../src/hooks/useCategoryManager';
import CategoryForm from '../src/components/categories/CategoryForm';
import CategoryListItem from '../src/components/categories/CategoryListItem';
import SelectionModal from '../src/components/SelectionModal';
import { AdaptiveGroupedScreen } from '../src/components/ui/adaptive-grouped-list';
import { AdaptiveGroupedSection } from '../src/components/ui/adaptive-grouped-list';
import { semanticColors } from '../src/theme/semantic-colors';
import { mobileTheme } from '../src/theme/tokens';

const ManageCategoriesScreen = () => {
  const params = useLocalSearchParams<{
    scopeKind?: string | string[];
    spaceId?: string | string[];
  }>();
  const spaceId =
    typeof params.spaceId === 'string' ? params.spaceId : undefined;
  const isGroupScope = params.scopeKind === 'group' && Boolean(spaceId);
  const categoryManager = useCategoryManager({
    scopeKind: isGroupScope ? 'group' : 'personal',
    spaceId,
  });
  const showCategoryInfo = () =>
    Alert.alert(
      'About Categories',
      'Tap a category to edit it. Swipe left to remove a custom category. Categories used by expenses can be archived or moved, so historical classifications stay intact. Uncategorized is reserved and cannot be renamed or removed.',
    );

  return (
    <AdaptiveGroupedScreen>
      <Stack.Screen
        options={{
          title: isGroupScope ? 'Group Categories' : 'Manage Categories',
        }}
      />
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>CATEGORIES</Text>
          <TouchableOpacity
            accessibilityLabel='About categories'
            accessibilityRole='button'
            hitSlop={mobileTheme.spacing.sm}
            onPress={showCategoryInfo}
            style={styles.infoButton}
          >
            <Ionicons
              color={semanticColors.primary}
              name='information-circle-outline'
              size={18}
            />
          </TouchableOpacity>
        </View>
        <AdaptiveGroupedSection>
          {categoryManager.activeCategories.map((category, index) => (
            <CategoryListItem
              canDelete={categoryManager.canDeleteCategory(category)}
              canEdit={categoryManager.canEditCategory(category)}
              category={category}
              isLast={index === categoryManager.activeCategories.length - 1}
              key={category.id}
              onDelete={categoryManager.deleteCategory}
              onEdit={categoryManager.openEditModal}
            />
          ))}
        </AdaptiveGroupedSection>
        {categoryManager.archivedCategories.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, styles.archivedSectionLabel]}>
              ARCHIVED
            </Text>
            <AdaptiveGroupedSection>
              {categoryManager.archivedCategories.map((category, index) => (
                <CategoryListItem
                  archived
                  canDelete={categoryManager.canPermanentlyDeleteCategory(
                    category,
                  )}
                  canEdit={false}
                  category={category}
                  isLast={
                    index === categoryManager.archivedCategories.length - 1
                  }
                  key={category.id}
                  onDelete={categoryManager.deleteCategory}
                  onEdit={categoryManager.openEditModal}
                  onRestore={categoryManager.restoreCategory}
                />
              ))}
            </AdaptiveGroupedSection>
            <Text style={styles.footerText}>
              Archived categories remain on historical expenses and in Insights.
            </Text>
          </>
        ) : null}
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

      <SelectionModal
        data={categoryManager.moveTargetCategories}
        isSelected={() => false}
        keyExtractor={(category) => category.id}
        onClose={categoryManager.closeMoveExpenses}
        onSelect={categoryManager.moveExpensesToCategory}
        renderItemContent={(category) => (
          <Text style={styles.moveTargetText}>{category.name}</Text>
        )}
        title={`Move ${categoryManager.movingCategory?.name ?? ''} Expenses`}
        visible={Boolean(categoryManager.movingCategory)}
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
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.md,
  },
  infoButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    marginLeft: mobileTheme.spacing.xs,
    width: 28,
  },
  footerText: {
    color: semanticColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.sm,
  },
  archivedSectionLabel: {
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.xxl,
  },
  moveTargetText: {
    color: semanticColors.text,
    fontSize: 16,
  },
});

export default ManageCategoriesScreen;
