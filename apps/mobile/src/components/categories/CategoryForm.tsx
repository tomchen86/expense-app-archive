import React, { useState, useEffect } from 'react';
import { Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import ColorPicker, { DEFAULT_COLORS } from './ColorPicker';
import { Category } from '../../types';
import { semanticColors } from '../../theme/semantic-colors';
import {
  getFirstAvailableCategoryColor,
  normalizeCategoryColor,
} from '../../theme/category-palette';
import { mobileTheme } from '../../theme/tokens';
import { AdaptiveGroupedSection } from '../ui/adaptive-grouped-list';
import { AdaptiveSheet } from '../ui/adaptive-sheet';

interface CategoryFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => boolean | void;
  editingCategory?: Category | null;
  title?: string;
  usedColors?: readonly string[];
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  visible,
  onClose,
  onSave,
  editingCategory,
  title,
  usedColors = [],
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLORS[0]);

  useEffect(() => {
    if (editingCategory) {
      setCategoryName(editingCategory.name);
      setSelectedColor(editingCategory.color);
    } else {
      setCategoryName('');
      setSelectedColor(getFirstAvailableCategoryColor(usedColors) ?? '');
    }
  }, [editingCategory, usedColors, visible]);

  const unavailableColors = usedColors.filter(
    (color) =>
      !editingCategory ||
      normalizeCategoryColor(color) !==
        normalizeCategoryColor(editingCategory.color),
  );

  const handleSave = () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName || !selectedColor) {
      return;
    }

    if (onSave(trimmedName, selectedColor) !== false) {
      handleClose();
    }
  };

  const handleClose = () => {
    setCategoryName('');
    setSelectedColor(DEFAULT_COLORS[0]);
    onClose();
  };

  const modalTitle = title || `${editingCategory ? 'Edit' : 'New'} Category`;

  return (
    <AdaptiveSheet
      leadingAction={{ label: 'Cancel', onPress: handleClose }}
      onClose={handleClose}
      testID='category-form-sheet'
      title={modalTitle}
      trailingAction={{
        disabled: !categoryName.trim() || !selectedColor,
        label: editingCategory ? 'Save' : 'Add',
        onPress: handleSave,
        testID: 'category-save-action',
      }}
      visible={visible}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
      >
        <Text style={styles.sectionLabel}>NAME</Text>
        <AdaptiveGroupedSection>
          <TextInput
            accessibilityLabel='Category name'
            style={styles.input}
            placeholder='Category name'
            placeholderTextColor={semanticColors.placeholder}
            value={categoryName}
            onChangeText={setCategoryName}
            autoFocus
            maxLength={50}
            testID='category-name-input'
          />
        </AdaptiveGroupedSection>

        <Text style={styles.sectionLabel}>COLOR</Text>
        <AdaptiveGroupedSection style={styles.colorSection}>
          <ColorPicker
            label={null}
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            unavailableColors={unavailableColors}
          />
        </AdaptiveGroupedSection>
        {!selectedColor ? (
          <Text accessibilityLiveRegion='polite' style={styles.helperText}>
            All category colors are already in use.
          </Text>
        ) : null}
      </ScrollView>
    </AdaptiveSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: mobileTheme.spacing.xl,
    paddingBottom: mobileTheme.spacing.xxxl,
  },
  sectionLabel: {
    color: semanticColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.lg,
  },
  input: {
    minHeight: 54,
    color: semanticColors.text,
    paddingHorizontal: mobileTheme.spacing.lg,
    fontSize: 16,
  },
  colorSection: {
    padding: mobileTheme.spacing.md,
  },
  helperText: {
    color: semanticColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.sm,
  },
});

export default CategoryForm;
